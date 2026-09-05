package com.dealflow360.approval;

import com.dealflow360.approval.dto.ApprovalActionRequest;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.websocket.WebSocketPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class ApprovalService {

    private final ApprovalRequestRepository approvalRequestRepository;
    private final ApprovalStepRepository approvalStepRepository;
    private final QuotationRepository quotationRepository;
    private final AuditService auditService;
    private final WebSocketPublisher webSocketPublisher;

    public ApprovalService(ApprovalRequestRepository approvalRequestRepository,
                           ApprovalStepRepository approvalStepRepository,
                           QuotationRepository quotationRepository,
                           AuditService auditService,
                           WebSocketPublisher webSocketPublisher) {
        this.approvalRequestRepository = approvalRequestRepository;
        this.approvalStepRepository = approvalStepRepository;
        this.quotationRepository = quotationRepository;
        this.auditService = auditService;
        this.webSocketPublisher = webSocketPublisher;
    }

    public List<ApprovalRequest> listPendingRequests() {
        return approvalRequestRepository.findByStatus("PENDING");
    }

    public Optional<ApprovalRequest> getRequestByQuotationId(Long quotationId) {
        return approvalRequestRepository.findByQuotationId(quotationId);
    }

    public List<ApprovalStep> getStepsForQuotation(Long quotationId) {
        return approvalStepRepository.findByQuotationIdOrderByAssignedAtAsc(quotationId);
    }

    public ApprovalRequest actOnApproval(ApprovalActionRequest request, User approver) {
        Quotation quotation = quotationRepository.findById(request.getQuotationId())
                .orElseThrow(() -> new RuntimeException("Quotation not found: " + request.getQuotationId()));

        ApprovalRequest approvalRequest = approvalRequestRepository.findByQuotationId(request.getQuotationId())
                .orElseThrow(() -> new RuntimeException("Approval request not found for quote: " + request.getQuotationId()));

        List<ApprovalStep> steps = approvalStepRepository.findByQuotationIdOrderByAssignedAtAsc(request.getQuotationId());

        ApprovalStep currentStep = null;
        if (request.getStepId() != null) {
            currentStep = approvalStepRepository.findById(request.getStepId())
                    .orElseThrow(() -> new RuntimeException("Step not found: " + request.getStepId()));
        } else {
            // Find first pending step
            currentStep = steps.stream()
                    .filter(s -> "PENDING".equalsIgnoreCase(s.getStatus()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("No pending approval steps found"));
        }

        String action = request.getAction().toUpperCase();
        currentStep.setActedAt(LocalDateTime.now());
        currentStep.setApprover(approver);
        currentStep.setApproverName(approver.getName());
        currentStep.setComments(request.getComments());

        if ("APPROVE".equalsIgnoreCase(action)) {
            currentStep.setStatus("APPROVED");
            approvalStepRepository.save(currentStep);

            final ApprovalStep activeStep = currentStep;
            Optional<ApprovalStep> nextStepOpt = steps.stream()
                    .filter(s -> "PENDING".equalsIgnoreCase(s.getStatus()) && !s.getId().equals(activeStep.getId()))
                    .findFirst();

            if (nextStepOpt.isPresent()) {
                ApprovalStep nextStep = nextStepOpt.get();
                approvalRequest.setCurrentStage(nextStep.getRequiredRole());
                approvalRequestRepository.save(approvalRequest);

                auditService.log("APPROVAL", quotation.getId(), "STAGE_APPROVED", approver.getName(),
                        currentStep.getLevel(), nextStep.getLevel(),
                        "Approved at " + currentStep.getLevel() + ". Escalated to " + nextStep.getRequiredRole() + ". Comments: " + request.getComments(),
                        BigDecimal.ZERO);
            } else {
                // All steps completed!
                approvalRequest.setStatus("APPROVED");
                approvalRequest.setCurrentStage("COMPLETED");
                approvalRequestRepository.save(approvalRequest);

                quotation.setStatus("APPROVED");
                quotation.setLastActivityAt(LocalDateTime.now());
                quotationRepository.save(quotation);

                auditService.log("APPROVAL", quotation.getId(), "FINAL_APPROVED", approver.getName(),
                        "PENDING_APPROVAL", "APPROVED",
                        "Quotation fully approved across all governance tiers. Comments: " + request.getComments(),
                        BigDecimal.ZERO);
            }
        } else if ("REJECT".equalsIgnoreCase(action)) {
            currentStep.setStatus("REJECTED");
            approvalStepRepository.save(currentStep);

            approvalRequest.setStatus("REJECTED");
            approvalRequest.setCurrentStage("COMPLETED");
            approvalRequestRepository.save(approvalRequest);

            quotation.setStatus("REJECTED");
            quotation.setLastActivityAt(LocalDateTime.now());
            quotationRepository.save(quotation);

            auditService.log("APPROVAL", quotation.getId(), "REJECTED", approver.getName(),
                    "PENDING_APPROVAL", "REJECTED",
                    "Quotation rejected by " + approver.getRole() + ". Reason: " + request.getComments(),
                    BigDecimal.ZERO);
        } else if ("RETURN".equalsIgnoreCase(action) || "REQUEST_MODIFICATION".equalsIgnoreCase(action)) {
            currentStep.setStatus("RETURNED");
            approvalStepRepository.save(currentStep);

            approvalRequest.setStatus("RETURNED");
            approvalRequestRepository.save(approvalRequest);

            quotation.setStatus("RETURNED");
            quotation.setLastActivityAt(LocalDateTime.now());
            quotationRepository.save(quotation);

            auditService.log("APPROVAL", quotation.getId(), "RETURNED_FOR_REVISION", approver.getName(),
                    "PENDING_APPROVAL", "RETURNED",
                    "Quotation returned to Sales Rep for discount adjustment. Reason: " + request.getComments(),
                    BigDecimal.ZERO);
        }

        // Push real-time event to STOMP broker
        webSocketPublisher.publishApprovalUpdate(quotation.getId(), Map.of(
                "quotationId", quotation.getId(),
                "quoteNumber", quotation.getQuoteNumber(),
                "action", action,
                "approver", approver.getName(),
                "requestStatus", approvalRequest.getStatus(),
                "quotationStatus", quotation.getStatus()
        ));

        return approvalRequest;
    }
}
