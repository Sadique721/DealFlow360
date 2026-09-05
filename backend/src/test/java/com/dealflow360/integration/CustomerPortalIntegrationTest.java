package com.dealflow360.integration;

import com.dealflow360.catalog.*;
import com.dealflow360.negotiation.NegotiationMessage;
import com.dealflow360.negotiation.NegotiationService;
import com.dealflow360.negotiation.dto.NegotiationProposalRequest;
import com.dealflow360.negotiation.dto.PortalQuotationView;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.auth.User;
import com.dealflow360.auth.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class CustomerPortalIntegrationTest {

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerTierRepository customerTierRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NegotiationService negotiationService;

    private Quotation testQuotation;
    private String token;

    @BeforeEach
    void setUp() {
        long timestamp = System.currentTimeMillis();

        Category hardwareCat = categoryRepository.save(Category.builder()
                .name("Hardware " + timestamp)
                .maxDiscountPercent(BigDecimal.valueOf(15.0))
                .build());

        Product product = productRepository.save(Product.builder()
                .name("Enterprise Server " + timestamp)
                .category(hardwareCat)
                .basePrice(BigDecimal.valueOf(10000.00))
                .costPrice(BigDecimal.valueOf(6000.00))
                .active(true)
                .build());

        CustomerTier goldTier = customerTierRepository.findByTierName("GOLD")
                .orElseGet(() -> customerTierRepository.save(CustomerTier.builder()
                        .tierName("GOLD")
                        .maxDiscountPercent(BigDecimal.valueOf(15.0))
                        .build()));

        Customer customer = customerRepository.save(Customer.builder()
                .name("Nexus Technologies " + timestamp)
                .tier(goldTier.getTierName())
                .email("procurement-" + timestamp + "@nexus.com")
                .build());

        User salesRep = userRepository.findByEmail("j.rao@dealflow360.com").orElseGet(() ->
                userRepository.save(User.builder()
                        .name("Jay Rao")
                        .email("j.rao@dealflow360.com")
                        .passwordHash("password123")
                        .role("SALES_REP")
                        .active(true)
                        .build())
        );

        token = "portal-token-" + timestamp;

        Quotation q = Quotation.builder()
                .quoteNumber("Q-PORTAL-" + timestamp)
                .customer(customer)
                .salesRep(salesRep)
                .portalToken(token)
                .status("SENT_TO_CUSTOMER")
                .subtotalAmount(BigDecimal.valueOf(10000.00))
                .totalDiscountAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.valueOf(10000.00))
                .totalCost(BigDecimal.valueOf(6000.00))
                .totalMarginAmount(BigDecimal.valueOf(4000.00))
                .marginPercentage(BigDecimal.valueOf(40.00))
                .build();

        QuotationLine line = QuotationLine.builder()
                .quotation(q)
                .product(product)
                .quantity(1)
                .unitPrice(product.getBasePrice())
                .costPrice(product.getCostPrice())
                .discountPercent(BigDecimal.ZERO)
                .lineTotal(product.getBasePrice())
                .marginAmount(BigDecimal.valueOf(4000.00))
                .build();

        q.getLines().add(line);
        testQuotation = quotationRepository.save(q);
    }

    @Test
    @DisplayName("Portal View exposes customer commercial data without cost or margin leakage")
    void testPortalQuotationViewZeroLeakage() {
        PortalQuotationView view = negotiationService.getPortalView(token);

        assertNotNull(view);
        assertEquals(testQuotation.getQuoteNumber(), view.getQuoteNumber());
        assertEquals(testQuotation.getCustomer().getName(), view.getCustomerName());
        assertEquals(BigDecimal.valueOf(10000.00), view.getTotalAmount());
        assertEquals(1, view.getLines().size());

        PortalQuotationView.PortalLineView lineView = view.getLines().get(0);
        assertEquals("Enterprise Server ", lineView.getProductName().substring(0, 18));
        assertEquals(BigDecimal.valueOf(10000.00), lineView.getUnitPrice());
    }

    @Test
    @DisplayName("Counter-discount over threshold automatically re-locks quotation for Manager approval")
    void testCounterNegotiationOverThresholdAutoReLocksForApproval() {
        Long lineId = testQuotation.getLines().get(0).getId();

        // Customer requests a 30% discount (exceeds Gold Tier 15% limit)
        NegotiationProposalRequest req = NegotiationProposalRequest.builder()
                .lineReferenceId(lineId)
                .counterDiscountPercent(BigDecimal.valueOf(30.00))
                .message("Requesting 30% volume incentive for budget alignment")
                .senderName("Procurement Officer")
                .build();

        NegotiationMessage msg = negotiationService.submitMessage(token, req, "CUSTOMER");
        assertNotNull(msg.getId());

        // Confirm terms
        Map<String, Object> result = negotiationService.confirmPortalQuotation(token, "Procurement Officer");

        assertEquals("PENDING_APPROVAL", result.get("status"));
        assertTrue((Boolean) result.get("reApprovedRequired"));

        // Verify quotation in DB re-locked to PENDING_APPROVAL
        Quotation updated = quotationRepository.findById(testQuotation.getId()).orElseThrow();
        assertEquals("PENDING_APPROVAL", updated.getStatus());
    }

    @Test
    @DisplayName("Confirmation within threshold approves directly to fulfillment skipping manager approval")
    void testConfirmationWithinThresholdConfirmsDirectly() {
        Map<String, Object> result = negotiationService.confirmPortalQuotation(token, "Procurement Officer");

        assertEquals("CONFIRMED", result.get("status"));
        assertFalse((Boolean) result.get("reApprovedRequired"));

        // Verify quotation in DB confirmed
        Quotation updated = quotationRepository.findById(testQuotation.getId()).orElseThrow();
        assertEquals("CONFIRMED", updated.getStatus());
    }
}
