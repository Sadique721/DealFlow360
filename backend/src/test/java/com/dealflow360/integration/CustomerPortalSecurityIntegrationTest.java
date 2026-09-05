package com.dealflow360.integration;

import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Customer;
import com.dealflow360.catalog.CustomerTier;
import com.dealflow360.catalog.Product;
import com.dealflow360.discount.RiskCalculationResult;
import com.dealflow360.invoice.InvoiceService;
import com.dealflow360.negotiation.NegotiationMessage;
import com.dealflow360.negotiation.NegotiationMessageRepository;
import com.dealflow360.negotiation.NegotiationService;
import com.dealflow360.negotiation.dto.NegotiationProposalRequest;
import com.dealflow360.negotiation.dto.PortalQuotationView;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.quotation.QuotationService;
import com.dealflow360.subscription.SubscriptionService;
import com.dealflow360.warehouse.FulfillmentService;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CustomerPortalSecurityIntegrationTest {

    private NegotiationService negotiationService;
    private NegotiationMessageRepository messageRepository;
    private QuotationRepository quotationRepository;
    private QuotationService quotationService;
    private FulfillmentService fulfillmentService;
    private SubscriptionService subscriptionService;
    private InvoiceService invoiceService;
    private AuditService auditService;
    private WebSocketPublisher webSocketPublisher;

    @BeforeEach
    void setUp() {
        quotationRepository = Mockito.mock(QuotationRepository.class);
        messageRepository = Mockito.mock(NegotiationMessageRepository.class);
        quotationService = Mockito.mock(QuotationService.class);
        fulfillmentService = Mockito.mock(FulfillmentService.class);
        subscriptionService = Mockito.mock(SubscriptionService.class);
        invoiceService = Mockito.mock(InvoiceService.class);
        auditService = Mockito.mock(AuditService.class);
        webSocketPublisher = Mockito.mock(WebSocketPublisher.class);

        negotiationService = new NegotiationService(
                quotationRepository, messageRepository, quotationService,
                fulfillmentService, subscriptionService, invoiceService,
                auditService, webSocketPublisher
        );
    }

    @Test
    @DisplayName("Security Check: Customer Portal completely strips COGS, internal margins, and risk scores")
    void testCustomerPortalDataSanitization() {
        Customer customer = Customer.builder()
                .id(5L)
                .name("Acme Corp")
                .tier("SILVER")
                .email("buyer@acme.com")
                .build();

        User rep = User.builder()
                .id(3L)
                .name("Samir Patel")
                .email("samir@dealflow360.com")
                .role("SALES_REP")
                .build();

        Category cat = Category.builder()
                .id(1L)
                .name("Hardware")
                .maxDiscountPercent(BigDecimal.valueOf(10.00))
                .build();

        Product prod = Product.builder()
                .id(50L)
                .name("Network Switch")
                .basePrice(BigDecimal.valueOf(1000.00))
                .costPrice(BigDecimal.valueOf(600.00)) // Internal proprietary cost
                .category(cat)
                .build();

        QuotationLine line = QuotationLine.builder()
                .id(1L)
                .product(prod)
                .quantity(2)
                .unitPrice(new BigDecimal("1000.00"))
                .costPrice(new BigDecimal("600.00"))
                .discountPercent(new BigDecimal("8.00"))
                .lineTotal(new BigDecimal("1840.00"))
                .marginAmount(new BigDecimal("640.00"))
                .lineType("ONE_TIME")
                .build();

        Quotation quote = Quotation.builder()
                .id(88L)
                .quoteNumber("Q-1088")
                .customer(customer)
                .salesRep(rep)
                .status("SENT_TO_CUSTOMER")
                .portalToken("token-secure-1088")
                .subtotalAmount(new BigDecimal("2000.00"))
                .totalDiscountAmount(new BigDecimal("160.00"))
                .totalAmount(new BigDecimal("1840.00"))
                .totalCost(new BigDecimal("1200.00"))      // Internal COGS
                .totalMarginAmount(new BigDecimal("640.00")) // Internal Margin
                .marginPercentage(new BigDecimal("34.78"))   // Internal Margin %
                .blendedRiskScore(new BigDecimal("2.50"))     // Internal Risk Score
                .lines(new ArrayList<>(List.of(line)))
                .build();

        when(quotationRepository.findByPortalToken("token-secure-1088")).thenReturn(Optional.of(quote));
        when(messageRepository.findByQuotationIdOrderByCreatedAtAsc(88L)).thenReturn(new ArrayList<>());

        // Fetch portal view
        PortalQuotationView portalView = negotiationService.getPortalView("token-secure-1088");

        assertNotNull(portalView);
        assertEquals("Q-1088", portalView.getQuoteNumber());
        assertEquals("Acme Corp", portalView.getCustomerName());
        assertEquals("SENT_TO_CUSTOMER", portalView.getStatus());

        // Verify customer sees customer-facing totals
        assertEquals(new BigDecimal("2000.00"), portalView.getSubtotalAmount());
        assertEquals(new BigDecimal("160.00"), portalView.getTotalDiscountAmount());
        assertEquals(new BigDecimal("1840.00"), portalView.getTotalAmount());

        // Verify line item only contains customer-facing fields
        assertEquals(1, portalView.getLines().size());
        PortalQuotationView.PortalLineView portalLine = portalView.getLines().get(0);
        assertEquals("Network Switch", portalLine.getProductName());
        assertEquals("Hardware", portalLine.getCategoryName());
        assertEquals(2, portalLine.getQuantity());
        assertEquals(new BigDecimal("1000.00"), portalLine.getUnitPrice());
        assertEquals(new BigDecimal("8.00"), portalLine.getDiscountPercent());
        assertEquals(new BigDecimal("1840.00"), portalLine.getLineTotal());
    }

    @Test
    @DisplayName("State Machine: Customer counter exceeding policy automatically re-locks and enters re-approval loop")
    void testCounterOfferTriggersReApprovalLoop() {
        Customer customer = Customer.builder()
                .id(5L)
                .name("Acme Corp")
                .tier("SILVER")
                .email("buyer@acme.com")
                .build();

        User rep = User.builder()
                .id(3L)
                .name("Samir Patel")
                .email("samir@dealflow360.com")
                .role("SALES_REP")
                .build();

        Category cat = Category.builder()
                .id(1L)
                .name("Hardware")
                .maxDiscountPercent(BigDecimal.valueOf(10.00))
                .build();

        Product prod = Product.builder()
                .id(50L)
                .name("Network Switch")
                .basePrice(BigDecimal.valueOf(1000.00))
                .costPrice(BigDecimal.valueOf(600.00))
                .category(cat)
                .build();

        QuotationLine line = QuotationLine.builder()
                .id(1L)
                .product(prod)
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(1000.00))
                .costPrice(BigDecimal.valueOf(600.00))
                .discountPercent(BigDecimal.valueOf(8.00))
                .lineTotal(BigDecimal.valueOf(1840.00))
                .marginAmount(BigDecimal.valueOf(640.00))
                .build();

        Quotation quote = Quotation.builder()
                .id(88L)
                .quoteNumber("Q-1088")
                .customer(customer)
                .salesRep(rep)
                .status("SENT_TO_CUSTOMER")
                .portalToken("token-secure-1088")
                .subtotalAmount(BigDecimal.valueOf(2000.00))
                .totalDiscountAmount(BigDecimal.valueOf(160.00))
                .totalAmount(BigDecimal.valueOf(1840.00))
                .lines(new ArrayList<>(List.of(line)))
                .build();

        when(quotationRepository.findByPortalToken("token-secure-1088")).thenReturn(Optional.of(quote));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));
        when(messageRepository.save(any(NegotiationMessage.class))).thenAnswer(i -> {
            NegotiationMessage m = i.getArgument(0);
            m.setId(101L);
            return m;
        });

        // Customer counters with 18% discount on line 1
        NegotiationProposalRequest counterRequest = NegotiationProposalRequest.builder()
                .senderName("Buyer John")
                .lineReferenceId(1L)
                .counterDiscountPercent(BigDecimal.valueOf(18.00))
                .message("Can you provide 18% discount for quarterly contract?")
                .build();

        negotiationService.submitMessage("token-secure-1088", counterRequest, "CUSTOMER");

        // Status moved to UNDER_NEGOTIATION
        assertEquals("UNDER_NEGOTIATION", quote.getStatus());
        assertEquals(BigDecimal.valueOf(18.00), line.getDiscountPercent());

        // Now customer attempts to confirm quotation with 18% discount
        RiskCalculationResult riskResult = RiskCalculationResult.builder()
                .blendedRiskScore(BigDecimal.valueOf(14.50))
                .riskLevel("HIGH")
                .requiresApproval(true)
                .requiresFinance(true)
                .fullExplanation("Counter-offer discount of 18% exceeds Silver tier policy ceiling (10%) by 8 points.")
                .build();

        when(quotationService.getQuotationRiskBreakdown(88L)).thenReturn(riskResult);
        when(quotationService.submitForApproval(eq(88L), anyString())).thenAnswer(inv -> {
            quote.setStatus("PENDING_APPROVAL");
            return Map.of("status", "PENDING_APPROVAL");
        });

        Map<String, Object> confirmResult = negotiationService.confirmPortalQuotation("token-secure-1088", "Buyer John");

        // Verify: quotation was re-locked to PENDING_APPROVAL and submitForApproval was called!
        assertEquals("PENDING_APPROVAL", quote.getStatus());
        assertEquals(true, confirmResult.get("reApprovedRequired"));
        verify(quotationService, times(1)).submitForApproval(eq(88L), anyString());
        verify(auditService, atLeastOnce()).log(eq("QUOTATION"), eq(88L), eq("COUNTER_RE_APPROVAL_TRIGGERED"), any(), any(), any(), any(), any());
    }
}
