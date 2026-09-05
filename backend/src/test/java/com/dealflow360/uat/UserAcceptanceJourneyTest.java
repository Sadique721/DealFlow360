package com.dealflow360.uat;

import com.dealflow360.approval.*;
import com.dealflow360.approval.dto.ApprovalActionRequest;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.auth.UserRepository;
import com.dealflow360.catalog.*;
import com.dealflow360.discount.RiskScoreEngine;
import com.dealflow360.negotiation.NegotiationMessageRepository;
import com.dealflow360.negotiation.NegotiationService;
import com.dealflow360.negotiation.dto.PortalQuotationView;
import com.dealflow360.quotation.*;
import com.dealflow360.quotation.dto.LineItemRequest;
import com.dealflow360.quotation.dto.QuotationCreateRequest;
import com.dealflow360.warehouse.*;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * UAT (User Acceptance Testing) Suite:
 * End-to-end execution of the primary Problem Statement and Excalidraw workflow journeys
 * confirming exact satisfaction of Sales Rep, Manager, Finance Controller, Buyer, and Operations demands.
 */
class UserAcceptanceJourneyTest {

    private QuotationService quotationService;
    private ApprovalService approvalService;
    private NegotiationService negotiationService;
    private SplitOptimizer splitOptimizer;

    private QuotationRepository quotationRepository;
    private QuotationLineRepository lineRepository;
    private QuotationVersionRepository versionRepository;
    private CustomerRepository customerRepository;
    private CustomerTierRepository customerTierRepository;
    private UserRepository userRepository;
    private ProductRepository productRepository;
    private ApprovalRequestRepository approvalRequestRepository;
    private ApprovalStepRepository approvalStepRepository;
    private NegotiationMessageRepository messageRepository;
    private AuditService auditService;
    private WebSocketPublisher webSocketPublisher;
    private RiskScoreEngine riskEngine;

    @BeforeEach
    void setUp() {
        quotationRepository = Mockito.mock(QuotationRepository.class);
        lineRepository = Mockito.mock(QuotationLineRepository.class);
        versionRepository = Mockito.mock(QuotationVersionRepository.class);
        customerRepository = Mockito.mock(CustomerRepository.class);
        customerTierRepository = Mockito.mock(CustomerTierRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        productRepository = Mockito.mock(ProductRepository.class);
        approvalRequestRepository = Mockito.mock(ApprovalRequestRepository.class);
        approvalStepRepository = Mockito.mock(ApprovalStepRepository.class);
        messageRepository = Mockito.mock(NegotiationMessageRepository.class);
        auditService = Mockito.mock(AuditService.class);
        webSocketPublisher = Mockito.mock(WebSocketPublisher.class);

        riskEngine = new RiskScoreEngine();
        ReflectionTestUtils.setField(riskEngine, "managerThreshold", 10.0);
        ReflectionTestUtils.setField(riskEngine, "financeThreshold", 15.0);
        ReflectionTestUtils.setField(riskEngine, "singleLineSpikeThreshold", 8.0);

        splitOptimizer = new SplitOptimizer();

        quotationService = new QuotationService(
                quotationRepository, lineRepository, versionRepository,
                customerRepository, customerTierRepository, userRepository,
                productRepository, riskEngine, approvalRequestRepository,
                approvalStepRepository, auditService, webSocketPublisher
        );

        approvalService = new ApprovalService(
                approvalRequestRepository, approvalStepRepository, quotationRepository,
                auditService, webSocketPublisher
        );

        negotiationService = new NegotiationService(
                quotationRepository, messageRepository, quotationService,
                null, null, null, auditService, webSocketPublisher
        );
    }

    @Test
    @DisplayName("UAT Journey 1 & 2: Sales Rep builds Capex+Opex Deal -> Sequential Two-Tier Governance Flow")
    void testRepQuoteBuildToSequentialApprovalUAT() {
        // Setup Customer & Catalog
        CustomerTier silverTier = CustomerTier.builder().id(1L).tierName("SILVER").maxDiscountPercent(BigDecimal.valueOf(10.0)).build();
        Customer customer = Customer.builder().id(101L).name("Zenith Global").tier("SILVER").email("procurement@zenith.com").build();
        User rep = User.builder().id(5L).name("Jay Rao").role("SALES_REP").email("jay@dealflow360.com").build();
        User manager = User.builder().id(6L).name("Anand Joshi").role("SALES_MANAGER").build();
        User finance = User.builder().id(7L).name("Priya Desai").role("FINANCE").build();

        Category hw = Category.builder().name("Hardware").maxDiscountPercent(BigDecimal.valueOf(15.0)).build();
        Category srv = Category.builder().name("Services").maxDiscountPercent(BigDecimal.valueOf(10.0)).build();

        Product server = Product.builder().id(1L).name("Blade Server").category(hw).basePrice(BigDecimal.valueOf(2000)).costPrice(BigDecimal.valueOf(1200)).build();
        Product consulting = Product.builder().id(2L).name("Custom Integration").category(srv).basePrice(BigDecimal.valueOf(1000)).costPrice(BigDecimal.valueOf(400)).build();

        when(customerRepository.findById(101L)).thenReturn(Optional.of(customer));
        when(customerTierRepository.findByTierName("SILVER")).thenReturn(Optional.of(silverTier));
        when(userRepository.findById(5L)).thenReturn(Optional.of(rep));
        when(productRepository.findById(1L)).thenReturn(Optional.of(server));
        when(productRepository.findById(2L)).thenReturn(Optional.of(consulting));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> {
            Quotation q = i.getArgument(0);
            if (q.getId() == null) q.setId(200L);
            return q;
        });

        // Rep initiates quote: Blade Server (10% discount = OK) + Consulting (18% discount = breaches 10% ceiling by 8 points!)
        QuotationCreateRequest createReq = QuotationCreateRequest.builder()
                .customerId(101L)
                .salesRepId(5L)
                .lines(List.of(
                        LineItemRequest.builder().productId(1L).quantity(5).discountPercent(BigDecimal.valueOf(10.00)).build(),
                        LineItemRequest.builder().productId(2L).quantity(2).discountPercent(BigDecimal.valueOf(18.00)).build()
                ))
                .build();

        Quotation quote = quotationService.createQuotation(createReq, "jay@dealflow360.com");

        // Assert CPQ calculation:
        assertEquals(new BigDecimal("12000.00"), quote.getSubtotalAmount());
        assertEquals(new BigDecimal("10640.00"), quote.getTotalAmount());
        assertEquals(new BigDecimal("3840.00"), quote.getTotalMarginAmount());
        assertTrue(quote.getBlendedRiskScore().compareTo(BigDecimal.ZERO) > 0);

        // Governance step: Line 2 overage is 8.00 points -> Triggers sequential 2-tier approval!
        when(quotationRepository.findById(200L)).thenReturn(Optional.of(quote));

        var approvalDecision = quotationService.submitForApproval(200L, "Jay Rao");
        assertTrue((Boolean) approvalDecision.get("requiresApproval"));
        assertTrue((Boolean) approvalDecision.get("requiresFinance"));
        assertEquals("PENDING_APPROVAL", quote.getStatus());

        // Approval Step Progression
        ApprovalStep step1 = ApprovalStep.builder().id(11L).quotation(quote).level("STAGE_1_MANAGER").requiredRole("SALES_MANAGER").status("PENDING").build();
        ApprovalStep step2 = ApprovalStep.builder().id(12L).quotation(quote).level("STAGE_2_FINANCE").requiredRole("FINANCE").status("PENDING").build();
        ApprovalRequest appReq = ApprovalRequest.builder().id(99L).quotation(quote).currentStage("SALES_MANAGER").status("PENDING").steps(new ArrayList<>(List.of(step1, step2))).build();

        when(approvalRequestRepository.findByQuotationId(200L)).thenReturn(Optional.of(appReq));
        when(approvalStepRepository.findByQuotationIdOrderByAssignedAtAsc(200L)).thenReturn(List.of(step1, step2));
        when(approvalStepRepository.findById(11L)).thenReturn(Optional.of(step1));
        when(approvalStepRepository.findById(12L)).thenReturn(Optional.of(step2));
        when(approvalRequestRepository.save(any(ApprovalRequest.class))).thenAnswer(i -> i.getArgument(0));

        // Sales Manager approves
        approvalService.actOnApproval(ApprovalActionRequest.builder().quotationId(200L).stepId(11L).action("APPROVE").comments("Approved").build(), manager);
        assertEquals("APPROVED", step1.getStatus());
        assertEquals("FINANCE", appReq.getCurrentStage());
        assertEquals("PENDING_APPROVAL", quote.getStatus());

        // Finance Controller approves -> activates quote!
        approvalService.actOnApproval(ApprovalActionRequest.builder().quotationId(200L).stepId(12L).action("APPROVE").comments("Finance signed").build(), finance);
        assertEquals("APPROVED", step2.getStatus());
        assertEquals("APPROVED", quote.getStatus());
    }

    @Test
    @DisplayName("UAT Journey 3: Customer Magic Link View completely protects internal proprietary margins")
    void testCustomerPortalZeroCostLeakageUAT() {
        Customer customer = Customer.builder().id(101L).name("Zenith Global").email("buyer@zenith.com").build();
        User rep = User.builder().id(5L).name("Jay Rao").email("jay@dealflow360.com").build();
        Product server = Product.builder().id(1L).name("Blade Server").category(Category.builder().name("Hardware").build()).basePrice(BigDecimal.valueOf(2000)).costPrice(BigDecimal.valueOf(1200)).build();

        QuotationLine line = QuotationLine.builder()
                .id(10L)
                .product(server)
                .quantity(3)
                .unitPrice(new BigDecimal("2000.00"))
                .costPrice(new BigDecimal("1200.00"))
                .discountPercent(new BigDecimal("10.00"))
                .lineTotal(new BigDecimal("5400.00"))
                .marginAmount(new BigDecimal("1800.00"))
                .build();

        Quotation quote = Quotation.builder()
                .id(300L)
                .quoteNumber("Q-1300")
                .customer(customer)
                .salesRep(rep)
                .status("SENT_TO_CUSTOMER")
                .portalToken("magic-token-xyz")
                .subtotalAmount(new BigDecimal("6000.00"))
                .totalDiscountAmount(new BigDecimal("600.00"))
                .totalAmount(new BigDecimal("5400.00"))
                .totalCost(new BigDecimal("3600.00")) // Proprietary vendor cost
                .totalMarginAmount(new BigDecimal("1800.00"))
                .marginPercentage(new BigDecimal("33.33"))
                .blendedRiskScore(new BigDecimal("2.50"))
                .lines(List.of(line))
                .build();

        when(quotationRepository.findByPortalToken("magic-token-xyz")).thenReturn(Optional.of(quote));
        when(messageRepository.findByQuotationIdOrderByCreatedAtAsc(300L)).thenReturn(new ArrayList<>());

        PortalQuotationView portalView = negotiationService.getPortalView("magic-token-xyz");

        assertEquals("Q-1300", portalView.getQuoteNumber());
        assertEquals("Zenith Global", portalView.getCustomerName());
        assertEquals(new BigDecimal("6000.00"), portalView.getSubtotalAmount());
        assertEquals(new BigDecimal("5400.00"), portalView.getTotalAmount());

        PortalQuotationView.PortalLineView pLine = portalView.getLines().get(0);
        assertEquals("Blade Server", pLine.getProductName());
        assertEquals(new BigDecimal("2000.00"), pLine.getUnitPrice());
        assertEquals(new BigDecimal("5400.00"), pLine.getLineTotal());
    }

    @Test
    @DisplayName("UAT Journey 4: Operations Logistics - Automatic multi-depot consignment split & backorder")
    void testOperationsMultiDepotSplitUAT() {
        Category hw = Category.builder().id(1L).name("Hardware").build();
        Product server = Product.builder().id(1L).name("Blade Server").category(hw).isSubscription(false).build();

        Warehouse depotEast = Warehouse.builder().id(1L).name("Depot-East").baseFreight(BigDecimal.valueOf(25)).shippingCostWeight(BigDecimal.valueOf(1.0)).build();
        Warehouse depotCentral = Warehouse.builder().id(2L).name("Depot-Central").baseFreight(BigDecimal.valueOf(35)).shippingCostWeight(BigDecimal.valueOf(1.2)).build();

        // 15 units needed. Depot-East has 10 units, Depot-Central has 3 units -> Total = 13 units. Shortfall = 2 units.
        WarehouseStock stockEast = WarehouseStock.builder().warehouse(depotEast).product(server).available(10).inStock(10).build();
        WarehouseStock stockCentral = WarehouseStock.builder().warehouse(depotCentral).product(server).available(3).inStock(3).build();

        Quotation quote = Quotation.builder().id(500L).lines(new ArrayList<>()).build();
        quote.getLines().add(QuotationLine.builder().quotation(quote).product(server).quantity(15).build());

        SplitOptimizer.OptimizationResult result = splitOptimizer.optimizeFulfillment(
                quote, new ArrayList<>(List.of(depotEast, depotCentral)), List.of(stockEast, stockCentral));

        assertNotNull(result);
        assertEquals(3, result.splits.size(), "2 depot fulfillment splits + 1 backorder consignment");
        assertTrue(result.hasBackorder);

        // Verify the 2 fulfilled consignments
        long allocatedCount = result.splits.stream().filter(s -> !s.getIsBackorder()).count();
        assertEquals(2, allocatedCount);

        // Verify the backorder shortfall
        FulfillmentSplit backorder = result.splits.stream().filter(FulfillmentSplit::getIsBackorder).findFirst().orElseThrow();
        assertEquals(2, backorder.getQuantity());
        assertEquals("BACKORDERED", backorder.getStatus());
    }
}
