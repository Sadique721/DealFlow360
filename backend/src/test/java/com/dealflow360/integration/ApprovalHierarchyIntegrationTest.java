package com.dealflow360.integration;

import com.dealflow360.approval.ApprovalRequest;
import com.dealflow360.approval.ApprovalRequestRepository;
import com.dealflow360.approval.ApprovalService;
import com.dealflow360.approval.ApprovalStep;
import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.approval.dto.ApprovalActionRequest;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ApprovalHierarchyIntegrationTest {

    private ApprovalService approvalService;
    private ApprovalRequestRepository requestRepository;
    private ApprovalStepRepository stepRepository;
    private QuotationRepository quotationRepository;
    private AuditService auditService;
    private WebSocketPublisher webSocketPublisher;

    @BeforeEach
    void setUp() {
        requestRepository = Mockito.mock(ApprovalRequestRepository.class);
        stepRepository = Mockito.mock(ApprovalStepRepository.class);
        quotationRepository = Mockito.mock(QuotationRepository.class);
        auditService = Mockito.mock(AuditService.class);
        webSocketPublisher = Mockito.mock(WebSocketPublisher.class);

        approvalService = new ApprovalService(
                requestRepository, stepRepository, quotationRepository,
                auditService, webSocketPublisher
        );
    }

    @Test
    @DisplayName("Sequential Approval: Step 1 (Sales Manager) approval advances to Step 2 (Finance Controller)")
    void testSequentialApprovalStepProgression() {
        Quotation quote = Quotation.builder()
                .id(42L)
                .quoteNumber("Q-1042")
                .status("PENDING_APPROVAL")
                .totalAmount(BigDecimal.valueOf(15000.00))
                .marginPercentage(BigDecimal.valueOf(14.50))
                .build();

        ApprovalStep step1 = ApprovalStep.builder()
                .id(101L)
                .quotation(quote)
                .level("STAGE_1_MANAGER")
                .requiredRole("SALES_MANAGER")
                .status("PENDING")
                .assignedAt(LocalDateTime.now().minusHours(1))
                .slaDeadline(LocalDateTime.now().plusHours(2))
                .build();

        ApprovalStep step2 = ApprovalStep.builder()
                .id(102L)
                .quotation(quote)
                .level("STAGE_2_FINANCE")
                .requiredRole("FINANCE")
                .status("PENDING")
                .assignedAt(LocalDateTime.now().minusHours(1).plusMinutes(1))
                .slaDeadline(LocalDateTime.now().plusHours(4))
                .build();

        ApprovalRequest approvalReq = ApprovalRequest.builder()
                .id(501L)
                .quotation(quote)
                .status("PENDING")
                .currentStage("SALES_MANAGER")
                .blendedRiskScore(BigDecimal.valueOf(12.5))
                .riskLevel("HIGH")
                .steps(new ArrayList<>(List.of(step1, step2)))
                .build();

        User manager = User.builder().id(10L).name("Maria Santos").role("SALES_MANAGER").build();
        User finance = User.builder().id(20L).name("David Chen").role("FINANCE").build();

        when(quotationRepository.findById(42L)).thenReturn(Optional.of(quote));
        when(requestRepository.findByQuotationId(42L)).thenReturn(Optional.of(approvalReq));
        when(stepRepository.findByQuotationIdOrderByAssignedAtAsc(42L)).thenReturn(new ArrayList<>(List.of(step1, step2)));
        when(stepRepository.findById(101L)).thenReturn(Optional.of(step1));
        when(stepRepository.findById(102L)).thenReturn(Optional.of(step2));
        when(requestRepository.save(any(ApprovalRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(stepRepository.save(any(ApprovalStep.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        // Act 1: Sales Manager approves Step 1
        ApprovalActionRequest action1 = ApprovalActionRequest.builder()
                .quotationId(42L)
                .stepId(101L)
                .action("APPROVE")
                .comments("Manager margin exception approved for Q3 strategic account")
                .build();

        ApprovalRequest afterStep1 = approvalService.actOnApproval(action1, manager);

        // Verify Step 1 is APPROVED, currentStage escalated to FINANCE, Request remains PENDING, Quote remains PENDING_APPROVAL
        assertEquals("APPROVED", step1.getStatus());
        assertEquals("FINANCE", afterStep1.getCurrentStage());
        assertEquals("PENDING", afterStep1.getStatus());
        assertEquals("PENDING_APPROVAL", quote.getStatus());

        // Act 2: Finance Controller approves Step 2
        ApprovalActionRequest action2 = ApprovalActionRequest.builder()
                .quotationId(42L)
                .stepId(102L)
                .action("APPROVE")
                .comments("Finance validated payment terms, credit limits, and margin variance")
                .build();

        ApprovalRequest afterStep2 = approvalService.actOnApproval(action2, finance);

        // Verify Step 2 is APPROVED, Request is APPROVED, Quote transitions to APPROVED!
        assertEquals("APPROVED", step2.getStatus());
        assertEquals("APPROVED", afterStep2.getStatus());
        assertEquals("COMPLETED", afterStep2.getCurrentStage());
        assertEquals("APPROVED", quote.getStatus());

        verify(auditService, atLeastOnce()).log(eq("APPROVAL"), eq(42L), eq("STAGE_APPROVED"), eq("Maria Santos"), any(), any(), any(), any());
        verify(auditService, atLeastOnce()).log(eq("APPROVAL"), eq(42L), eq("FINAL_APPROVED"), eq("David Chen"), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Approval Rejection: Rejection at Step 1 immediately locks Quote to REJECTED")
    void testApprovalRejectionFlow() {
        Quotation quote = Quotation.builder()
                .id(42L)
                .quoteNumber("Q-1042")
                .status("PENDING_APPROVAL")
                .build();

        ApprovalStep step1 = ApprovalStep.builder()
                .id(101L)
                .quotation(quote)
                .level("STAGE_1_MANAGER")
                .requiredRole("SALES_MANAGER")
                .status("PENDING")
                .assignedAt(LocalDateTime.now())
                .build();

        ApprovalRequest approvalReq = ApprovalRequest.builder()
                .id(501L)
                .quotation(quote)
                .status("PENDING")
                .currentStage("SALES_MANAGER")
                .steps(new ArrayList<>(List.of(step1)))
                .build();

        User manager = User.builder().id(10L).name("Maria Santos").role("SALES_MANAGER").build();

        when(quotationRepository.findById(42L)).thenReturn(Optional.of(quote));
        when(requestRepository.findByQuotationId(42L)).thenReturn(Optional.of(approvalReq));
        when(stepRepository.findByQuotationIdOrderByAssignedAtAsc(42L)).thenReturn(new ArrayList<>(List.of(step1)));
        when(stepRepository.findById(101L)).thenReturn(Optional.of(step1));
        when(requestRepository.save(any(ApprovalRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(stepRepository.save(any(ApprovalStep.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        // Act: Sales Manager rejects
        ApprovalActionRequest rejectAction = ApprovalActionRequest.builder()
                .quotationId(42L)
                .stepId(101L)
                .action("REJECT")
                .comments("Margin 14.5% is below minimum corporate threshold of 18%")
                .build();

        ApprovalRequest rejected = approvalService.actOnApproval(rejectAction, manager);

        assertEquals("REJECTED", rejected.getStatus());
        assertEquals("REJECTED", step1.getStatus());
        assertEquals("REJECTED", quote.getStatus());
        assertEquals("COMPLETED", rejected.getCurrentStage());
    }

    @Test
    @DisplayName("Approval Return: Return for Revision sets Quote and Request to RETURNED")
    void testApprovalReturnFlow() {
        Quotation quote = Quotation.builder()
                .id(42L)
                .quoteNumber("Q-1042")
                .status("PENDING_APPROVAL")
                .build();

        ApprovalStep step1 = ApprovalStep.builder()
                .id(101L)
                .quotation(quote)
                .level("STAGE_1_MANAGER")
                .requiredRole("SALES_MANAGER")
                .status("PENDING")
                .assignedAt(LocalDateTime.now())
                .build();

        ApprovalRequest approvalReq = ApprovalRequest.builder()
                .id(501L)
                .quotation(quote)
                .status("PENDING")
                .currentStage("SALES_MANAGER")
                .steps(new ArrayList<>(List.of(step1)))
                .build();

        User manager = User.builder().id(10L).name("Maria Santos").role("SALES_MANAGER").build();

        when(quotationRepository.findById(42L)).thenReturn(Optional.of(quote));
        when(requestRepository.findByQuotationId(42L)).thenReturn(Optional.of(approvalReq));
        when(stepRepository.findByQuotationIdOrderByAssignedAtAsc(42L)).thenReturn(new ArrayList<>(List.of(step1)));
        when(stepRepository.findById(101L)).thenReturn(Optional.of(step1));
        when(requestRepository.save(any(ApprovalRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(stepRepository.save(any(ApprovalStep.class))).thenAnswer(i -> i.getArgument(0));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        ApprovalActionRequest returnAction = ApprovalActionRequest.builder()
                .quotationId(42L)
                .stepId(101L)
                .action("RETURN")
                .comments("Reduce hardware discount to 10% and resubmit")
                .build();

        ApprovalRequest returned = approvalService.actOnApproval(returnAction, manager);

        assertEquals("RETURNED", returned.getStatus());
        assertEquals("RETURNED", step1.getStatus());
        assertEquals("RETURNED", quote.getStatus());
    }

    @Test
    @DisplayName("Sequencing Block: Finance cannot act on Step 2 while Step 1 (Sales Manager) is still PENDING")
    void testFinanceBlockedWhenManagerStepPending() {
        Quotation quote = Quotation.builder()
                .id(42L)
                .quoteNumber("Q-1042")
                .status("PENDING_APPROVAL")
                .build();

        ApprovalStep step1 = ApprovalStep.builder()
                .id(101L)
                .quotation(quote)
                .level("STAGE_1_MANAGER")
                .requiredRole("SALES_MANAGER")
                .status("PENDING")
                .assignedAt(LocalDateTime.now().minusHours(1))
                .build();

        ApprovalStep step2 = ApprovalStep.builder()
                .id(102L)
                .quotation(quote)
                .level("STAGE_2_FINANCE")
                .requiredRole("FINANCE")
                .status("PENDING")
                .assignedAt(LocalDateTime.now().minusHours(1))
                .build();

        ApprovalRequest approvalReq = ApprovalRequest.builder()
                .id(501L)
                .quotation(quote)
                .status("PENDING")
                .currentStage("SALES_MANAGER")
                .steps(new ArrayList<>(List.of(step1, step2)))
                .build();

        User finance = User.builder().id(20L).name("David Chen").role("FINANCE").build();

        when(quotationRepository.findById(42L)).thenReturn(Optional.of(quote));
        when(requestRepository.findByQuotationId(42L)).thenReturn(Optional.of(approvalReq));
        when(stepRepository.findByQuotationIdOrderByAssignedAtAsc(42L)).thenReturn(new ArrayList<>(List.of(step1, step2)));
        when(stepRepository.findById(102L)).thenReturn(Optional.of(step2));

        ApprovalActionRequest financeAction = ApprovalActionRequest.builder()
                .quotationId(42L)
                .stepId(102L)
                .action("APPROVE")
                .comments("Finance premature sign-off attempt")
                .build();

        assertThrows(IllegalStateException.class, () -> {
            approvalService.actOnApproval(financeAction, finance);
        }, "Must throw IllegalStateException when Finance acts before Manager approves Stage 1");
    }

    @Test
    @DisplayName("RBAC Security: Sales Rep is denied signing authority (AccessDeniedException)")
    void testSalesRepDeniedSigningAuthority() {
        Quotation quote = Quotation.builder().id(42L).status("PENDING_APPROVAL").build();
        User rep = User.builder().id(2L).name("Jay Rao").role("SALES_REP").build();

        ApprovalActionRequest repAction = ApprovalActionRequest.builder()
                .quotationId(42L)
                .action("APPROVE")
                .comments("Rep approving own quote")
                .build();

        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> {
            approvalService.actOnApproval(repAction, rep);
        }, "Sales Rep must be denied signing authority");
    }
}
