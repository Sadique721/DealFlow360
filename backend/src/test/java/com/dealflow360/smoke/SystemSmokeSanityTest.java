package com.dealflow360.smoke;

import com.dealflow360.approval.ApprovalRequest;
import com.dealflow360.approval.ApprovalStep;
import com.dealflow360.auth.User;
import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Customer;
import com.dealflow360.catalog.CustomerTier;
import com.dealflow360.catalog.Product;
import com.dealflow360.dealhealth.DealHealthFlag;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.subscription.SubscriptionPlan;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * System Smoke & Sanity Testing Suite:
 * Fast, lightweight verification ensuring all primary domain models, Lombok `@Data` bindings,
 * relational entity builders, and component interfaces instantiate cleanly without regressions.
 */
class SystemSmokeSanityTest {

    @Test
    @DisplayName("Smoke Sanity: Core Domain Models instantiate cleanly with Lombok builders")
    void testCoreEntitiesSmoke() {
        CustomerTier tier = CustomerTier.builder()
                .id(1L)
                .tierName("GOLD")
                .maxDiscountPercent(BigDecimal.valueOf(15.00))
                .build();
        assertNotNull(tier);
        assertEquals("GOLD", tier.getTierName());

        Customer customer = Customer.builder()
                .id(10L)
                .name("Acme Corp")
                .tier("GOLD")
                .email("buyer@acme.com")
                .build();
        assertNotNull(customer);

        User user = User.builder()
                .id(2L)
                .name("Alice Smith")
                .role("SALES_REP")
                .email("alice@dealflow360.com")
                .build();
        assertNotNull(user);

        Category cat = Category.builder()
                .id(1L)
                .name("Hardware")
                .maxDiscountPercent(BigDecimal.valueOf(15.00))
                .sensitivityGamma(BigDecimal.valueOf(1.00))
                .build();
        assertNotNull(cat);

        Product prod = Product.builder()
                .id(100L)
                .name("Enterprise Server")
                .category(cat)
                .basePrice(BigDecimal.valueOf(2500.00))
                .costPrice(BigDecimal.valueOf(1500.00))
                .isSubscription(false)
                .build();
        assertNotNull(prod);

        Quotation quote = Quotation.builder()
                .id(1L)
                .quoteNumber("Q-1001")
                .customer(customer)
                .salesRep(user)
                .status("DRAFT")
                .portalToken("smoke-token-1")
                .subtotalAmount(BigDecimal.valueOf(5000.00))
                .totalAmount(BigDecimal.valueOf(4500.00))
                .marginPercentage(BigDecimal.valueOf(33.33))
                .build();
        assertNotNull(quote);

        QuotationLine line = QuotationLine.builder()
                .id(1L)
                .quotation(quote)
                .product(prod)
                .quantity(2)
                .unitPrice(new BigDecimal("2500.00"))
                .costPrice(new BigDecimal("1500.00"))
                .discountPercent(new BigDecimal("10.00"))
                .lineTotal(new BigDecimal("4500.00"))
                .marginAmount(new BigDecimal("1500.00"))
                .build();
        assertNotNull(line);
        assertEquals(new BigDecimal("4500.00"), line.getLineTotal());

        ApprovalRequest appReq = ApprovalRequest.builder()
                .id(1L)
                .quotation(quote)
                .status("PENDING")
                .currentStage("SALES_MANAGER")
                .blendedRiskScore(BigDecimal.valueOf(8.5))
                .riskLevel("MEDIUM")
                .build();
        assertNotNull(appReq);

        ApprovalStep step = ApprovalStep.builder()
                .id(10L)
                .approvalRequest(appReq)
                .quotation(quote)
                .level("STAGE_1_MANAGER")
                .requiredRole("SALES_MANAGER")
                .status("PENDING")
                .assignedAt(LocalDateTime.now())
                .build();
        assertNotNull(step);

        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(1L)
                .name("Enterprise Cloud Ops")
                .billingCycle("MONTHLY")
                .basePrice(BigDecimal.valueOf(89.00))
                .active(true)
                .build();
        assertNotNull(plan);

        DealHealthFlag flag = DealHealthFlag.builder()
                .id(1L)
                .quotation(quote)
                .flagType("DISCOUNT_ANOMALY")
                .severity("HIGH")
                .description("Rep discount exceeds team average by 2.5 standard deviations")
                .detectedAt(LocalDateTime.now())
                .build();
        assertNotNull(flag);
        assertEquals("DISCOUNT_ANOMALY", flag.getFlagType());
    }
}
