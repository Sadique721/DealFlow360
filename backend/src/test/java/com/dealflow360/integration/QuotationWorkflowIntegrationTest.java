package com.dealflow360.integration;

import com.dealflow360.approval.ApprovalRequest;
import com.dealflow360.approval.ApprovalRequestRepository;
import com.dealflow360.approval.ApprovalStep;
import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.auth.UserRepository;
import com.dealflow360.catalog.*;
import com.dealflow360.discount.RiskScoreEngine;
import com.dealflow360.quotation.*;
import com.dealflow360.quotation.dto.LineItemRequest;
import com.dealflow360.quotation.dto.QuotationCreateRequest;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class QuotationWorkflowIntegrationTest {

    private QuotationService quotationService;
    private QuotationRepository quotationRepository;
    private QuotationLineRepository lineRepository;
    private QuotationVersionRepository versionRepository;
    private CustomerRepository customerRepository;
    private CustomerTierRepository customerTierRepository;
    private UserRepository userRepository;
    private ProductRepository productRepository;
    private RiskScoreEngine riskScoreEngine;
    private ApprovalRequestRepository approvalRequestRepository;
    private ApprovalStepRepository approvalStepRepository;
    private AuditService auditService;
    private WebSocketPublisher webSocketPublisher;

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
        auditService = Mockito.mock(AuditService.class);
        webSocketPublisher = Mockito.mock(WebSocketPublisher.class);

        riskScoreEngine = new RiskScoreEngine();
        ReflectionTestUtils.setField(riskScoreEngine, "managerThreshold", 10.0);
        ReflectionTestUtils.setField(riskScoreEngine, "financeThreshold", 15.0);
        ReflectionTestUtils.setField(riskScoreEngine, "singleLineSpikeThreshold", 8.0);

        quotationService = new QuotationService(
                quotationRepository, lineRepository, versionRepository,
                customerRepository, customerTierRepository, userRepository,
                productRepository, riskScoreEngine, approvalRequestRepository,
                approvalStepRepository, auditService, webSocketPublisher
        );
    }

    @Test
    @DisplayName("Complete Quotation Creation, Dynamic Margin Calculation, and Automatic Risk Evaluation Flow")
    void testQuotationCreationAndRiskWorkflow() {
        CustomerTier goldTier = CustomerTier.builder()
                .id(1L)
                .tierName("GOLD")
                .maxDiscountPercent(BigDecimal.valueOf(15.00))
                .build();

        Customer customer = Customer.builder()
                .id(10L)
                .name("Zenith Global")
                .tier("GOLD")
                .email("buyer@zenith.com")
                .build();

        User rep = User.builder()
                .id(2L)
                .name("Jay Rao")
                .email("jay@dealflow360.com")
                .role("SALES_REP")
                .build();

        Category hwCategory = Category.builder()
                .id(1L)
                .name("Hardware")
                .maxDiscountPercent(BigDecimal.valueOf(15.00))
                .sensitivityGamma(BigDecimal.valueOf(1.00))
                .build();

        Category srvCategory = Category.builder()
                .id(2L)
                .name("Services")
                .maxDiscountPercent(BigDecimal.valueOf(10.00))
                .sensitivityGamma(BigDecimal.valueOf(2.00))
                .build();

        Product laptop = Product.builder()
                .id(100L)
                .name("Pro Laptop")
                .category(hwCategory)
                .basePrice(BigDecimal.valueOf(1200.00))
                .costPrice(BigDecimal.valueOf(800.00))
                .build();

        Product setupService = Product.builder()
                .id(200L)
                .name("Implementation Consulting")
                .category(srvCategory)
                .basePrice(BigDecimal.valueOf(500.00))
                .costPrice(BigDecimal.valueOf(250.00))
                .build();

        when(customerRepository.findById(10L)).thenReturn(Optional.of(customer));
        when(customerTierRepository.findByTierName("GOLD")).thenReturn(Optional.of(goldTier));
        when(userRepository.findById(2L)).thenReturn(Optional.of(rep));
        when(productRepository.findById(100L)).thenReturn(Optional.of(laptop));
        when(productRepository.findById(200L)).thenReturn(Optional.of(setupService));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> {
            Quotation q = i.getArgument(0);
            if (q.getId() == null) q.setId(99L);
            return q;
        });
        when(quotationRepository.findById(99L)).thenAnswer(i -> {
            Quotation q = Quotation.builder()
                    .id(99L)
                    .quoteNumber("Q-1099")
                    .customer(customer)
                    .salesRep(rep)
                    .status("DRAFT")
                    .build();
            return Optional.of(q);
        });
        when(approvalRequestRepository.save(any(ApprovalRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(approvalStepRepository.save(any(ApprovalStep.class))).thenAnswer(i -> i.getArgument(0));

        // Step 1: Create Quote with 2 lines: Laptop (12% disc <= 15% cap) and Service (18% disc > 10% cap)
        QuotationCreateRequest request = QuotationCreateRequest.builder()
                .customerId(10L)
                .salesRepId(2L)
                .lines(List.of(
                        LineItemRequest.builder().productId(100L).quantity(5).discountPercent(BigDecimal.valueOf(12.00)).build(),
                        LineItemRequest.builder().productId(200L).quantity(2).discountPercent(BigDecimal.valueOf(18.00)).build()
                ))
                .build();

        Quotation created = quotationService.createQuotation(request, "jay@dealflow360.com");

        assertNotNull(created);
        assertEquals("DRAFT", created.getStatus());
        assertEquals(2, created.getLines().size());

        // Step 2: Verify calculations
        // Laptop: 5 * 1200 = 6000 gross, 12% disc = 720 disc, 5280 net, cost = 4000
        // Service: 2 * 500 = 1000 gross, 18% disc = 180 disc, 820 net, cost = 500
        // Total Subtotal = 7000.00, Total Discount = 900.00, Total Net = 6100.00, Total Cost = 4500.00
        assertEquals(new BigDecimal("7000.00"), created.getSubtotalAmount());
        assertEquals(new BigDecimal("900.00"), created.getTotalDiscountAmount());
        assertEquals(new BigDecimal("6100.00"), created.getTotalAmount());
        assertEquals(new BigDecimal("4500.00"), created.getTotalCost());

        // Total Margin = 6100 - 4500 = 1600.00, Margin % = 1600 / 6100 = 26.23%
        assertEquals(new BigDecimal("1600.00"), created.getTotalMarginAmount());
        assertEquals(new BigDecimal("26.23"), created.getMarginPercentage());

        // Step 3: Verify Blended Risk Engine flagged the Service line (18% > 10% ceiling by 8 points)
        assertTrue(created.getBlendedRiskScore().compareTo(BigDecimal.ZERO) > 0,
                "Risk score must be > 0 due to service line overage breach");

        // Line 2 must be flagged as culprit OVER
        QuotationLine serviceLine = created.getLines().get(1);
        assertEquals("OVER", serviceLine.getStatus());
        assertEquals(new BigDecimal("8.00"), serviceLine.getOveragePoints());
    }
}
