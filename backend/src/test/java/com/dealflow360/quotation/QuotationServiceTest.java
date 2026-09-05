package com.dealflow360.quotation;

import com.dealflow360.approval.ApprovalRequest;
import com.dealflow360.approval.ApprovalRequestRepository;
import com.dealflow360.approval.ApprovalStep;
import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.AuthUser;
import com.dealflow360.auth.User;
import com.dealflow360.auth.UserRepository;
import com.dealflow360.catalog.*;
import com.dealflow360.discount.DiscountEvaluationService;
import com.dealflow360.discount.RiskScoreEngine;
import com.dealflow360.quotation.dto.LineItemRequest;
import com.dealflow360.quotation.dto.QuotationCreateRequest;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class QuotationServiceTest {

    private QuotationService quotationService;
    private QuotationRepository quotationRepository;
    private QuotationLineRepository quotationLineRepository;
    private QuotationVersionRepository quotationVersionRepository;
    private CustomerRepository customerRepository;
    private CustomerTierRepository customerTierRepository;
    private UserRepository userRepository;
    private ProductRepository productRepository;
    private RiskScoreEngine riskScoreEngine;
    private DiscountEvaluationService discountEvaluationService;
    private ApprovalRequestRepository approvalRequestRepository;
    private ApprovalStepRepository approvalStepRepository;
    private AuditService auditService;
    private WebSocketPublisher webSocketPublisher;

    private Customer goldCustomer;
    private User salesRep;
    private Product laptop;
    private Product mouse;

    @BeforeEach
    void setUp() {
        quotationRepository = mock(QuotationRepository.class);
        quotationLineRepository = mock(QuotationLineRepository.class);
        quotationVersionRepository = mock(QuotationVersionRepository.class);
        customerRepository = mock(CustomerRepository.class);
        customerTierRepository = mock(CustomerTierRepository.class);
        userRepository = mock(UserRepository.class);
        productRepository = mock(ProductRepository.class);
        approvalRequestRepository = mock(ApprovalRequestRepository.class);
        approvalStepRepository = mock(ApprovalStepRepository.class);
        auditService = mock(AuditService.class);
        webSocketPublisher = mock(WebSocketPublisher.class);

        riskScoreEngine = new RiskScoreEngine();
        ReflectionTestUtils.setField(riskScoreEngine, "managerThreshold", 10.0);
        ReflectionTestUtils.setField(riskScoreEngine, "financeThreshold", 15.0);
        ReflectionTestUtils.setField(riskScoreEngine, "singleLineSpikeThreshold", 8.0);

        discountEvaluationService = new DiscountEvaluationService(riskScoreEngine);

        quotationService = new QuotationService(
                quotationRepository, quotationLineRepository, quotationVersionRepository,
                customerRepository, customerTierRepository, userRepository,
                productRepository, riskScoreEngine, discountEvaluationService,
                approvalRequestRepository, approvalStepRepository, auditService, webSocketPublisher
        );

        goldCustomer = Customer.builder()
                .id(1L)
                .name("Acme Corp")
                .tier("GOLD")
                .email("contact@acme.com")
                .build();

        CustomerTier goldTier = CustomerTier.builder()
                .id(1L)
                .tierName("GOLD")
                .maxDiscountPercent(BigDecimal.valueOf(15.00))
                .build();

        salesRep = User.builder()
                .id(10L)
                .name("Alice Rep")
                .email("alice@dealflow360.com")
                .role("SALES_REP")
                .build();

        Category catHw = Category.builder()
                .id(1L)
                .name("Hardware")
                .maxDiscountPercent(BigDecimal.valueOf(15.00))
                .sensitivityGamma(BigDecimal.valueOf(1.00))
                .build();

        laptop = Product.builder()
                .id(100L)
                .name("Laptop Pro")
                .category(catHw)
                .basePrice(BigDecimal.valueOf(50000.00))
                .costPrice(BigDecimal.valueOf(40000.00))
                .build();

        mouse = Product.builder()
                .id(101L)
                .name("Wireless Mouse")
                .category(catHw)
                .basePrice(BigDecimal.valueOf(2000.00))
                .costPrice(BigDecimal.valueOf(1000.00))
                .build();

        when(customerRepository.findById(1L)).thenReturn(Optional.of(goldCustomer));
        when(customerTierRepository.findByTierName("GOLD")).thenReturn(Optional.of(goldTier));
        when(userRepository.findById(10L)).thenReturn(Optional.of(salesRep));
        when(userRepository.findByEmail("alice@dealflow360.com")).thenReturn(Optional.of(salesRep));
        when(productRepository.findById(100L)).thenReturn(Optional.of(laptop));
        when(productRepository.findById(101L)).thenReturn(Optional.of(mouse));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> {
            Quotation q = i.getArgument(0);
            if (q.getId() == null) q.setId(123L);
            return q;
        });
    }

    @Test
    @DisplayName("Quotation list must order newest quotations first (createdAt DESC)")
    void testListQuotationsOrdersNewestFirst() {
        Quotation q1 = Quotation.builder().id(1L).quoteNumber("Q-1").build();
        Quotation q2 = Quotation.builder().id(2L).quoteNumber("Q-2").build();

        when(quotationRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(q2, q1));
        when(quotationRepository.findBySalesRepIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(q2, q1));

        AuthUser adminAuth = new AuthUser(User.builder().id(99L).role("ADMIN").build());
        List<Quotation> adminList = quotationService.listQuotations(null, null, adminAuth);
        assertEquals(2, adminList.size());
        assertEquals("Q-2", adminList.get(0).getQuoteNumber());
        verify(quotationRepository).findAllByOrderByCreatedAtDesc();

        AuthUser repAuth = new AuthUser(salesRep);
        List<Quotation> repList = quotationService.listQuotations(null, null, repAuth);
        assertEquals(2, repList.size());
        verify(quotationRepository).findBySalesRepIdOrderByCreatedAtDesc(10L);
    }

    @Test
    @DisplayName("Duplicate product entries must be consolidated by summing quantities (Requirement 15)")
    void testDuplicateProductConsolidation() {
        QuotationCreateRequest request = QuotationCreateRequest.builder()
                .customerId(1L)
                .salesRepId(10L)
                .lines(List.of(
                        LineItemRequest.builder().productId(100L).quantity(2).discountPercent(BigDecimal.valueOf(10.00)).build(),
                        LineItemRequest.builder().productId(100L).quantity(3).discountPercent(BigDecimal.valueOf(10.00)).build()
                ))
                .build();

        Quotation q = quotationService.createQuotation(request, "alice@dealflow360.com");

        assertNotNull(q);
        assertEquals(1, q.getLines().size(), "Duplicate product lines must be consolidated into single line");
        QuotationLine line = q.getLines().get(0);
        assertEquals(5, line.getQuantity(), "Quantities must be summed (2 + 3 = 5)");
        assertEquals(100L, line.getProduct().getId());

        // 5 * 50,000 = 250,000 Gross, 10% disc = 25,000, Net = 225,000
        assertEquals(new BigDecimal("250000.00"), q.getSubtotalAmount());
        assertEquals(new BigDecimal("25000.00"), q.getTotalDiscountAmount());
        assertEquals(new BigDecimal("225000.00"), q.getTotalAmount());
        // Cost: 5 * 40,000 = 200,000
        assertEquals(new BigDecimal("200000.00"), q.getTotalCost());
        // Margin: 225,000 - 200,000 = 25,000
        assertEquals(new BigDecimal("25000.00"), q.getTotalMarginAmount());
        // Margin %: 25,000 / 225,000 = 11.11%
        assertEquals(new BigDecimal("11.11"), q.getMarginPercentage());
    }

    @Test
    @DisplayName("Validation: Missing customer or empty lines must throw IllegalArgumentException")
    void testValidationConstraints() {
        assertThrows(IllegalArgumentException.class, () -> {
            quotationService.createQuotation(null, "alice@dealflow360.com");
        });

        assertThrows(IllegalArgumentException.class, () -> {
            quotationService.createQuotation(QuotationCreateRequest.builder().customerId(null).build(), "alice@dealflow360.com");
        });

        assertThrows(IllegalArgumentException.class, () -> {
            quotationService.createQuotation(QuotationCreateRequest.builder().customerId(1L).lines(List.of()).build(), "alice@dealflow360.com");
        });

        assertThrows(IllegalArgumentException.class, () -> {
            quotationService.createQuotation(QuotationCreateRequest.builder().customerId(1L).lines(List.of(
                    LineItemRequest.builder().productId(100L).quantity(0).build()
            )).build(), "alice@dealflow360.com");
        });

        assertThrows(IllegalArgumentException.class, () -> {
            quotationService.createQuotation(QuotationCreateRequest.builder().customerId(1L).lines(List.of(
                    LineItemRequest.builder().productId(100L).quantity(1).discountPercent(BigDecimal.valueOf(-5.00)).build()
            )).build(), "alice@dealflow360.com");
        });
    }

    @Test
    @DisplayName("Status safety: Cannot edit approved quotation lines")
    void testCannotEditApprovedQuotation() {
        Quotation approvedQuote = Quotation.builder()
                .id(55L)
                .quoteNumber("Q-APPROVED")
                .status("APPROVED")
                .customer(goldCustomer)
                .salesRep(salesRep)
                .build();

        when(quotationRepository.findById(55L)).thenReturn(Optional.of(approvedQuote));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            quotationService.updateQuotationLines(55L, List.of(
                    LineItemRequest.builder().productId(100L).quantity(1).build()
            ), "Alice");
        });

        assertTrue(ex.getMessage().contains("APPROVED"));
    }

    @Test
    @DisplayName("Status safety: Only APPROVED quotations can be confirmed into orders")
    void testCannotConfirmUnapprovedQuotation() {
        Quotation draftQuote = Quotation.builder()
                .id(77L)
                .quoteNumber("Q-DRAFT")
                .status("DRAFT")
                .customer(goldCustomer)
                .salesRep(salesRep)
                .build();

        when(quotationRepository.findById(77L)).thenReturn(Optional.of(draftQuote));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            quotationService.confirmQuotation(77L, "Alice");
        });

        assertTrue(ex.getMessage().contains("Only APPROVED quotations can be converted to orders"));
    }

    @Test
    @DisplayName("Submit for approval: Safe discount within ceiling auto-approves")
    void testSubmitForApprovalAutoApprovesSafeDiscount() {
        Quotation quote = Quotation.builder()
                .id(88L)
                .quoteNumber("Q-SAFE")
                .status("DRAFT")
                .customer(goldCustomer)
                .salesRep(salesRep)
                .build();

        // 10% discount <= 15% Gold ceiling and 15% Category ceiling -> zero overage
        QuotationLine line = QuotationLine.builder()
                .id(1L)
                .quotation(quote)
                .product(laptop)
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(50000.00))
                .costPrice(BigDecimal.valueOf(40000.00))
                .discountPercent(BigDecimal.valueOf(10.00))
                .lineTotal(BigDecimal.valueOf(45000.00))
                .marginAmount(BigDecimal.valueOf(5000.00))
                .build();
        quote.getLines().add(line);

        when(quotationRepository.findById(88L)).thenReturn(Optional.of(quote));
        when(approvalRequestRepository.findByQuotationId(88L)).thenReturn(Optional.empty());

        Map<String, Object> res = quotationService.submitForApproval(88L, "Alice");

        assertEquals("APPROVED", res.get("status"));
        assertEquals(false, res.get("requiresApproval"));
        assertEquals("APPROVED", quote.getStatus());
    }

    @Test
    @DisplayName("Submit for approval: Excessive discount routes to PENDING_APPROVAL")
    void testSubmitForApprovalRoutesExcessiveDiscount() {
        Quotation quote = Quotation.builder()
                .id(99L)
                .quoteNumber("Q-OVER")
                .status("DRAFT")
                .customer(goldCustomer)
                .salesRep(salesRep)
                .build();

        // 25% discount > 15% Gold ceiling -> overage
        QuotationLine line = QuotationLine.builder()
                .id(1L)
                .quotation(quote)
                .product(laptop)
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(50000.00))
                .costPrice(BigDecimal.valueOf(40000.00))
                .discountPercent(BigDecimal.valueOf(25.00))
                .lineTotal(BigDecimal.valueOf(37500.00))
                .marginAmount(BigDecimal.valueOf(-2500.00))
                .build();
        quote.getLines().add(line);

        when(quotationRepository.findById(99L)).thenReturn(Optional.of(quote));
        when(approvalRequestRepository.findByQuotationId(99L)).thenReturn(Optional.empty());
        when(approvalRequestRepository.saveAndFlush(any(ApprovalRequest.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> res = quotationService.submitForApproval(99L, "Alice");

        assertEquals("PENDING_APPROVAL", res.get("status"));
        assertEquals(true, res.get("requiresApproval"));
        assertEquals("PENDING_APPROVAL", quote.getStatus());
        verify(approvalRequestRepository).saveAndFlush(any(ApprovalRequest.class));
    }
}
