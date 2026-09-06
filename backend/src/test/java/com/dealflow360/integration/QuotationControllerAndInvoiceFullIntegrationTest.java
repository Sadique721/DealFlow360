package com.dealflow360.integration;

import com.dealflow360.approval.ApprovalRequest;
import com.dealflow360.approval.ApprovalService;
import com.dealflow360.approval.ApprovalSlaEscalationScheduler;
import com.dealflow360.approval.ApprovalStep;
import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.catalog.Customer;
import com.dealflow360.discount.RiskCalculationResult;
import com.dealflow360.invoice.Invoice;
import com.dealflow360.invoice.InvoiceController;
import com.dealflow360.invoice.InvoiceService;
import com.dealflow360.negotiation.NegotiationService;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationController;
import com.dealflow360.quotation.QuotationService;
import com.dealflow360.subscription.SubscriptionService;
import com.dealflow360.upsell.UpsellService;
import com.dealflow360.warehouse.FulfillmentPlan;
import com.dealflow360.warehouse.FulfillmentService;
import com.dealflow360.warehouse.dto.ManualSplitRequest;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("QuotationController & Commercial Invoice End-to-End Integration Unit Test Suite")
public class QuotationControllerAndInvoiceFullIntegrationTest {

    private QuotationService quotationService;
    private ApprovalService approvalService;
    private FulfillmentService fulfillmentService;
    private UpsellService upsellService;
    private SubscriptionService subscriptionService;
    private NegotiationService negotiationService;
    private InvoiceService invoiceService;
    private ApprovalStepRepository approvalStepRepository;
    private AuditService auditService;
    private WebSocketPublisher webSocketPublisher;
    private ApprovalSlaEscalationScheduler slaScheduler;

    private QuotationController quotationController;
    private InvoiceController invoiceController;

    private Quotation testQuotation;
    private Customer testCustomer;
    private User testSalesRep;

    @BeforeEach
    void setUp() {
        quotationService = mock(QuotationService.class);
        approvalService = mock(ApprovalService.class);
        fulfillmentService = mock(FulfillmentService.class);
        upsellService = mock(UpsellService.class);
        subscriptionService = mock(SubscriptionService.class);
        negotiationService = mock(NegotiationService.class);

        quotationController = new QuotationController(
                quotationService,
                approvalService,
                fulfillmentService,
                upsellService,
                subscriptionService,
                negotiationService
        );

        invoiceService = mock(InvoiceService.class);
        invoiceController = new InvoiceController(invoiceService);

        approvalStepRepository = mock(ApprovalStepRepository.class);
        auditService = mock(AuditService.class);
        webSocketPublisher = mock(WebSocketPublisher.class);
        slaScheduler = new ApprovalSlaEscalationScheduler(approvalStepRepository, auditService, webSocketPublisher);

        testCustomer = Customer.builder().id(1L).name("Acme Corp").build();
        testSalesRep = User.builder().id(2L).name("Jay Rao").email("j.rao@dealflow360.com").role("SALES_REP").build();

        testQuotation = Quotation.builder()
                .id(101L)
                .quoteNumber("Q-2026-0101")
                .customer(testCustomer)
                .salesRep(testSalesRep)
                .status("APPROVED")
                .totalAmount(BigDecimal.valueOf(10000.00))
                .marginPercentage(BigDecimal.valueOf(32.50))
                .blendedRiskScore(BigDecimal.valueOf(14.00))
                .build();
    }

    @Test
    @DisplayName("GET /api/quotations/{id}/approval returns complete governance details")
    void testGetQuotationApproval() {
        when(quotationService.getQuotationById(101L)).thenReturn(testQuotation);
        when(approvalService.getRequestByQuotationId(101L)).thenReturn(Optional.of(
                ApprovalRequest.builder().id(50L).quotation(testQuotation).status("PENDING").build()
        ));
        when(approvalService.getStepsForQuotation(101L)).thenReturn(List.of(
                ApprovalStep.builder().id(1L).quotation(testQuotation).level("STAGE_1_MANAGER").requiredRole("SALES_MANAGER").status("APPROVED").build()
        ));
        when(quotationService.getQuotationRiskBreakdown(101L)).thenReturn(
                RiskCalculationResult.builder().blendedRiskScore(BigDecimal.valueOf(14.00)).build()
        );

        ResponseEntity<Map<String, Object>> resp = quotationController.getQuotationApproval(101L);
        assertNotNull(resp);
        assertEquals(200, resp.getStatusCode().value());

        Map<String, Object> body = resp.getBody();
        assertNotNull(body);
        assertEquals(101L, body.get("quotationId"));
        assertEquals("Q-2026-0101", body.get("quoteNumber"));
        assertEquals("APPROVED", body.get("status"));
        assertNotNull(body.get("approvalRequest"));
        assertNotNull(body.get("steps"));
        assertNotNull(body.get("riskBreakdown"));
    }

    @Test
    @DisplayName("POST /api/quotations/{id}/fulfillment-plan/accept invokes fulfillment acceptance")
    void testAcceptFulfillmentPlanForQuotation() {
        FulfillmentPlan plan = FulfillmentPlan.builder().id(77L).quotation(testQuotation).status("ALLOCATION_SUGGESTED").build();
        FulfillmentPlan acceptedPlan = FulfillmentPlan.builder().id(77L).quotation(testQuotation).status("FULFILLED").build();

        when(fulfillmentService.generateOrGetPlan(101L)).thenReturn(plan);
        when(fulfillmentService.acceptSuggestedPlan(77L)).thenReturn(acceptedPlan);

        ResponseEntity<FulfillmentPlan> resp = quotationController.acceptFulfillmentPlanForQuotation(101L);
        assertNotNull(resp);
        assertEquals(200, resp.getStatusCode().value());
        assertEquals("FULFILLED", resp.getBody().getStatus());
        verify(fulfillmentService).acceptSuggestedPlan(77L);
    }

    @Test
    @DisplayName("POST /api/quotations/{id}/fulfillment-plan/override applies manual allocations")
    void testOverrideFulfillmentPlanForQuotation() {
        FulfillmentPlan plan = FulfillmentPlan.builder().id(88L).quotation(testQuotation).status("ALLOCATION_SUGGESTED").build();
        FulfillmentPlan overriddenPlan = FulfillmentPlan.builder().id(88L).quotation(testQuotation).status("OVERRIDDEN").build();

        when(fulfillmentService.generateOrGetPlan(101L)).thenReturn(plan);
        when(fulfillmentService.manualOverride(eq(88L), anyList(), eq("Urgent delivery routing"))).thenReturn(overriddenPlan);

        List<ManualSplitRequest> splits = List.of(
                ManualSplitRequest.builder().warehouseId(1L).productId(10L).quantity(5).build()
        );

        ResponseEntity<FulfillmentPlan> resp = quotationController.overrideFulfillmentPlanForQuotation(101L, splits, "Urgent delivery routing");
        assertNotNull(resp);
        assertEquals(200, resp.getStatusCode().value());
        assertEquals("OVERRIDDEN", resp.getBody().getStatus());
    }

    @Test
    @DisplayName("GET /api/quotations/{id}/billing returns Capex vs Opex breakdown")
    void testGetQuotationBilling() {
        Map<String, Object> billingOverview = new HashMap<>();
        billingOverview.put("quotationId", 101L);
        billingOverview.put("oneTimeTotal", BigDecimal.valueOf(8000.00));
        billingOverview.put("recurringTotal", BigDecimal.valueOf(2000.00));

        when(subscriptionService.getBillingOverviewForQuotation(101L)).thenReturn(billingOverview);

        ResponseEntity<Map<String, Object>> resp = quotationController.getQuotationBilling(101L);
        assertNotNull(resp);
        assertEquals(200, resp.getStatusCode().value());
        assertEquals(BigDecimal.valueOf(8000.00), resp.getBody().get("oneTimeTotal"));
        assertEquals(BigDecimal.valueOf(2000.00), resp.getBody().get("recurringTotal"));
    }

    @Test
    @DisplayName("POST /api/quotations/{id}/billing/proration-preview previews accurate proration")
    void testPreviewProrationForQuotation() {
        Map<String, Object> preview = new HashMap<>();
        preview.put("quotationId", 101L);
        preview.put("newQuantity", 10);
        preview.put("adjustmentAmount", BigDecimal.valueOf(450.00));

        when(subscriptionService.previewProrationForQuotation(eq(101L), eq(10), any())).thenReturn(preview);

        ResponseEntity<Map<String, Object>> resp = quotationController.previewProrationForQuotation(101L, 10, LocalDate.now());
        assertNotNull(resp);
        assertEquals(200, resp.getStatusCode().value());
        assertEquals(BigDecimal.valueOf(450.00), resp.getBody().get("adjustmentAmount"));
    }

    @Test
    @DisplayName("GET /api/quotations/{id}/status-summary returns unified status summary")
    void testGetStatusSummary() {
        when(quotationService.getQuotationById(101L)).thenReturn(testQuotation);
        when(approvalService.getRequestByQuotationId(101L)).thenReturn(Optional.of(
                ApprovalRequest.builder().id(1L).status("APPROVED").build()
        ));
        when(approvalService.getStepsForQuotation(101L)).thenReturn(Collections.emptyList());
        when(fulfillmentService.findPlanByQuotationId(101L)).thenReturn(Optional.of(
                FulfillmentPlan.builder().id(99L).status("FULFILLED").shipmentCount(2).totalShippingCost(BigDecimal.valueOf(45.00)).build()
        ));
        Map<String, Object> billing = new HashMap<>();
        billing.put("oneTimeTotal", BigDecimal.valueOf(6000.00));
        billing.put("recurringTotal", BigDecimal.valueOf(4000.00));
        when(subscriptionService.getBillingOverviewForQuotation(101L)).thenReturn(billing);

        ResponseEntity<Map<String, Object>> resp = quotationController.getStatusSummary(101L);
        assertNotNull(resp);
        assertEquals(200, resp.getStatusCode().value());

        Map<String, Object> body = resp.getBody();
        assertNotNull(body);
        assertEquals("Q-2026-0101", body.get("quoteNumber"));
        assertEquals("Acme Corp", body.get("customerName"));
        assertEquals("Jay Rao", body.get("salesRepName"));

        Map<String, Object> app = (Map<String, Object>) body.get("approval");
        assertEquals("APPROVED", app.get("status"));

        Map<String, Object> ful = (Map<String, Object>) body.get("fulfillment");
        assertEquals("FULFILLED", ful.get("status"));
        assertEquals(2, ful.get("shipmentCount"));

        Map<String, Object> bill = (Map<String, Object>) body.get("billing");
        assertEquals(BigDecimal.valueOf(6000.00), bill.get("oneTimeTotal"));
    }

    @Test
    @DisplayName("ApprovalSlaEscalationScheduler detects overdue steps, logs audit, and broadcasts via WebSocket")
    void testSlaEscalationScheduler() {
        ApprovalStep overdueStep = ApprovalStep.builder()
                .id(999L)
                .quotation(testQuotation)
                .level("STAGE_2_FINANCE")
                .requiredRole("FINANCE")
                .status("PENDING")
                .slaDeadline(LocalDateTime.now().minusHours(2))
                .build();

        when(approvalStepRepository.findOverdueSteps(any(LocalDateTime.class)))
                .thenReturn(List.of(overdueStep));

        slaScheduler.checkSlaBreaches();

        verify(auditService).log(eq("APPROVAL_SLA"), eq(101L), eq("SLA_BREACH"), eq("SLA Escalation Engine"),
                eq("PENDING"), eq("ESCALATED"), anyString(), eq(BigDecimal.ZERO));
        verify(webSocketPublisher).publishApprovalUpdate(eq(101L), anyMap());
    }

    @Test
    @DisplayName("InvoiceController voidInvoice and recordPayment work seamlessly")
    void testInvoiceControllerVoidAndPay() {
        Invoice inv = Invoice.builder().id(12L).invoiceNumber("INV-2026-0012").status("PAID").build();
        Invoice voided = Invoice.builder().id(13L).invoiceNumber("INV-2026-0013").status("VOID").build();

        when(invoiceService.recordPayment(12L)).thenReturn(inv);
        when(invoiceService.voidInvoice(13L, "Customer cancellation")).thenReturn(voided);

        ResponseEntity<Invoice> payResp = invoiceController.recordPayment(12L);
        assertEquals(200, payResp.getStatusCode().value());
        assertEquals("PAID", payResp.getBody().getStatus());

        ResponseEntity<Invoice> voidResp = invoiceController.voidInvoice(13L, "Customer cancellation");
        assertEquals(200, voidResp.getStatusCode().value());
        assertEquals("VOID", voidResp.getBody().getStatus());
    }
}
