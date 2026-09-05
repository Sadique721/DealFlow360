package com.dealflow360.integration;

import com.dealflow360.auth.User;
import com.dealflow360.auth.UserRepository;
import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.CategoryRepository;
import com.dealflow360.catalog.Customer;
import com.dealflow360.catalog.CustomerRepository;
import com.dealflow360.catalog.CustomerTier;
import com.dealflow360.catalog.CustomerTierRepository;
import com.dealflow360.catalog.Product;
import com.dealflow360.catalog.ProductRepository;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.upsell.UpsellRule;
import com.dealflow360.upsell.UpsellRuleRepository;
import com.dealflow360.upsell.UpsellService;
import com.dealflow360.upsell.dto.UpsellSuggestion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class UpsellEngineIntegrationTest {

    @Autowired
    private UpsellService upsellService;

    @Autowired
    private UpsellRuleRepository upsellRuleRepository;

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
    private QuotationRepository quotationRepository;

    private Product baseProduct;
    private Product suggestedProduct1;
    private Product suggestedProduct2;
    private Quotation testQuotation;

    @BeforeEach
    void setUp() {
        long timestamp = System.currentTimeMillis();

        Category hardwareCat = categoryRepository.save(Category.builder()
                .name("Hardware Tier 1 " + timestamp)
                .maxDiscountPercent(BigDecimal.valueOf(15.0))
                .build());

        baseProduct = productRepository.save(Product.builder()
                .name("Enterprise Server X100 " + timestamp)
                .category(hardwareCat)
                .basePrice(BigDecimal.valueOf(5000.00))
                .costPrice(BigDecimal.valueOf(3000.00))
                .active(true)
                .build());

        suggestedProduct1 = productRepository.save(Product.builder()
                .name("Rack Rail Mounting Kit " + timestamp)
                .category(hardwareCat)
                .basePrice(BigDecimal.valueOf(250.00))
                .costPrice(BigDecimal.valueOf(100.00))
                .active(true)
                .build());

        suggestedProduct2 = productRepository.save(Product.builder()
                .name("5-Year Onsite Warranty Extension " + timestamp)
                .category(hardwareCat)
                .basePrice(BigDecimal.valueOf(1200.00))
                .costPrice(BigDecimal.valueOf(400.00))
                .active(true)
                .build());

        CustomerTier goldTier = customerTierRepository.findByTierName("GOLD")
                .orElseGet(() -> customerTierRepository.save(CustomerTier.builder()
                        .tierName("GOLD")
                        .maxDiscountPercent(BigDecimal.valueOf(15.0))
                        .build()));

        Customer customer = customerRepository.save(Customer.builder()
                .name("AeroTech Dynamics " + timestamp)
                .tier(goldTier.getTierName())
                .email("procurement-" + timestamp + "@aerotech.com")
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

        Quotation q = Quotation.builder()
                .quoteNumber("Q-UPSELL-" + timestamp)
                .customer(customer)
                .salesRep(salesRep)
                .portalToken("portal-upsell-" + timestamp)
                .status("DRAFT")
                .subtotalAmount(BigDecimal.valueOf(5000.00))
                .totalDiscountAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.valueOf(5000.00))
                .totalCost(BigDecimal.valueOf(3000.00))
                .totalMarginAmount(BigDecimal.valueOf(2000.00))
                .marginPercentage(BigDecimal.valueOf(40.00))
                .lines(new ArrayList<>())
                .build();

        QuotationLine line1 = QuotationLine.builder()
                .quotation(q)
                .product(baseProduct)
                .quantity(1)
                .unitPrice(baseProduct.getBasePrice())
                .costPrice(baseProduct.getCostPrice())
                .discountPercent(BigDecimal.ZERO)
                .lineTotal(baseProduct.getBasePrice())
                .marginAmount(BigDecimal.valueOf(2000.00))
                .build();

        q.getLines().add(line1);
        testQuotation = quotationRepository.save(q);
    }

    @Test
    @DisplayName("Generates ranked upsell suggestions respecting promo boost and margin floor guardrail")
    void testGetRankedUpsellSuggestions() {
        // Rule 1: Rail kit - co-purchase score 0.85, normal
        upsellRuleRepository.save(UpsellRule.builder()
                .baseProduct(baseProduct)
                .suggestedProduct(suggestedProduct1)
                .coPurchaseScore(BigDecimal.valueOf(0.85))
                .isPromoted(false)
                .minMarginThreshold(BigDecimal.valueOf(20.00))
                .build());

        // Rule 2: Warranty extension - co-purchase score 0.70, promoted
        upsellRuleRepository.save(UpsellRule.builder()
                .baseProduct(baseProduct)
                .suggestedProduct(suggestedProduct2)
                .coPurchaseScore(BigDecimal.valueOf(0.70))
                .isPromoted(true)
                .promoTag("RECOMMENDED BUNDLE")
                .promoDiscountPercent(BigDecimal.valueOf(10.00))
                .minMarginThreshold(BigDecimal.valueOf(25.00))
                .build());

        List<UpsellSuggestion> suggestions = upsellService.getSuggestionsForQuotation(testQuotation.getId());

        assertEquals(2, suggestions.size());

        // Promoted rule should rank #1 despite lower co-purchase score
        UpsellSuggestion first = suggestions.get(0);
        assertTrue(first.getIsPromoted());
        assertEquals(suggestedProduct2.getName(), first.getSuggestedProduct().getName());
        assertEquals("RECOMMENDED BUNDLE", first.getPromoTag());

        // Second rule should rank #2
        UpsellSuggestion second = suggestions.get(1);
        assertFalse(second.getIsPromoted());
        assertEquals(suggestedProduct1.getName(), second.getSuggestedProduct().getName());
    }

    @Test
    @DisplayName("Applies upsell suggestion to quotation and recalculates deal financials")
    void testApplyUpsellSuggestion() {
        UpsellRule rule = upsellRuleRepository.save(UpsellRule.builder()
                .baseProduct(baseProduct)
                .suggestedProduct(suggestedProduct1)
                .coPurchaseScore(BigDecimal.valueOf(0.85))
                .isPromoted(true)
                .promoTag("ACCESSSORY SPECIAL")
                .promoDiscountPercent(BigDecimal.valueOf(10.00)) // $250 -> $225 net
                .minMarginThreshold(BigDecimal.valueOf(20.00))
                .build());

        Quotation updatedQuote = upsellService.applyUpsell(testQuotation.getId(), rule.getId());

        assertNotNull(updatedQuote);
        assertEquals(2, updatedQuote.getLines().size());

        // Total amount = $5000 + ($250 - 10%) = $5225.00
        assertEquals(new BigDecimal("5225.00"), updatedQuote.getTotalAmount());
        // Subtotal = $5000 + $250 = $5250.00
        assertEquals(new BigDecimal("5250.00"), updatedQuote.getSubtotalAmount());
        // Discount = $25.00
        assertEquals(new BigDecimal("25.00"), updatedQuote.getTotalDiscountAmount());
    }
}
