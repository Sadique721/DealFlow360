package com.dealflow360.approval;

import com.dealflow360.audit.AuditService;
import com.dealflow360.websocket.WebSocketPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ApprovalSlaEscalationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ApprovalSlaEscalationScheduler.class);

    private final ApprovalStepRepository approvalStepRepository;
    private final AuditService auditService;
    private final WebSocketPublisher webSocketPublisher;

    public ApprovalSlaEscalationScheduler(ApprovalStepRepository approvalStepRepository,
                                          AuditService auditService,
                                          WebSocketPublisher webSocketPublisher) {
        this.approvalStepRepository = approvalStepRepository;
        this.auditService = auditService;
        this.webSocketPublisher = webSocketPublisher;
    }

    @Scheduled(fixedRate = 60000)
    public void checkSlaBreaches() {
        LocalDateTime now = LocalDateTime.now();
        List<ApprovalStep> overdueSteps = approvalStepRepository.findOverdueSteps(now);
        for (ApprovalStep step : overdueSteps) {
            String quoteNumber = step.getQuotation() != null ? step.getQuotation().getQuoteNumber() : "N/A";
            Long quoteId = step.getQuotation() != null ? step.getQuotation().getId() : 0L;

            log.warn("SLA BREACH: Step {} ({}) on Quotation {} exceeded deadline {}",
                    step.getId(), step.getLevel(), quoteNumber, step.getSlaDeadline());

            auditService.log("APPROVAL_SLA", quoteId, "SLA_BREACH", "SLA Escalation Engine",
                    "PENDING", "ESCALATED",
                    "Approval step " + step.getLevel() + " (role: " + step.getRequiredRole() + ") for quotation "
                            + quoteNumber + " breached SLA deadline of " + step.getSlaDeadline() + ". Action required.",
                    BigDecimal.ZERO);

            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "SLA_BREACH");
            payload.put("quotationId", quoteId);
            payload.put("quoteNumber", quoteNumber);
            payload.put("stepLevel", step.getLevel());
            payload.put("requiredRole", step.getRequiredRole());
            payload.put("slaDeadline", step.getSlaDeadline() != null ? step.getSlaDeadline().toString() : null);
            payload.put("message", "SLA deadline breached for quotation " + quoteNumber + ". Action required.");

            webSocketPublisher.publishApprovalUpdate(quoteId, payload);
        }
    }
}
