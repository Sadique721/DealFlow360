package com.dealflow360.blackbox;

import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Product;
import com.dealflow360.discount.RiskCalculationResult;
import com.dealflow360.discount.RiskScoreEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Black-Box Testing Suite:
 * Evaluates system behavior strictly based on specifications, Equivalence Partitioning,
 * and Boundary Value Analysis (BVA) without regard to internal implementation details.
 */
class BlackBoxBoundaryValueTest {

    private RiskScoreEngine engine;
    private Category hardwareCategory;
    private Product standardProduct;

    @BeforeEach
    void setUp() {
        engine = new RiskScoreEngine();
        ReflectionTestUtils.setField(engine, "managerThreshold", 10.0);
        ReflectionTestUtils.setField(engine, "financeThreshold", 15.0);
        ReflectionTestUtils.setField(engine, "singleLineSpikeThreshold", 8.0);

        hardwareCategory = Category.builder()
                .name("Hardware")
                .maxDiscountPercent(BigDecimal.valueOf(10.00)) // 10.0% ceiling
                .sensitivityGamma(BigDecimal.valueOf(1.00))
                .build();

        standardProduct = Product.builder()
                .name("Standard Router")
                .category(hardwareCategory)
                .basePrice(BigDecimal.valueOf(100.00))
                .costPrice(BigDecimal.valueOf(50.00))
                .build();
    }

    @Test
    @DisplayName("BVA 1: Exactly on ceiling boundary (10.00%) -> Zero Overage, Auto Approved")
    void testExactCeilingBoundary() {
        // Equivalence Class 1: Within limits [0.00% - 10.00%]
        RiskScoreEngine.LineInput line = new RiskScoreEngine.LineInput(
                1L, standardProduct, new BigDecimal("10.00"), new BigDecimal("90.00"));

        RiskCalculationResult result = engine.calculateRisk(new BigDecimal("10.00"), List.of(line));

        assertNotNull(result);
        assertEquals(0.0, result.getBlendedRiskScore().doubleValue(), "Score on exact boundary must be 0");
        assertFalse(result.getRequiresApproval());
        assertEquals("AUTO_APPROVED", result.getRoutingDecision());
    }

    @Test
    @DisplayName("BVA 2: Just above ceiling boundary (10.01%) -> Positive Overage, Approval Required")
    void testJustAboveCeilingBoundary() {
        // Boundary + 0.01%: Minor overage
        RiskScoreEngine.LineInput line = new RiskScoreEngine.LineInput(
                1L, standardProduct, new BigDecimal("10.01"), new BigDecimal("89.99"));

        RiskCalculationResult result = engine.calculateRisk(new BigDecimal("10.00"), List.of(line));

        assertNotNull(result);
        assertTrue(result.getBlendedRiskScore().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(result.getRequiresApproval(), "10.01% breaches 10.00% ceiling");
        assertFalse(result.getRequiresFinance(), "Minor breach does not require Finance");
        assertEquals("SALES_MANAGER_ONLY", result.getRoutingDecision());
    }

    @Test
    @DisplayName("BVA 3: Single-line spike threshold below boundary (7.99 pt overage) -> Manager Only")
    void testSpikeThresholdJustBelowBoundary() {
        // Ceiling = 10.00%, Given = 17.99% -> Overage = 7.99 points (< 8.00 spike threshold)
        // With 7.99 pt * 10 multiplier = ~79.9 score which triggers finance by score, but let's test weight dilution:
        Product smallItem = Product.builder().category(hardwareCategory).basePrice(BigDecimal.valueOf(100)).costPrice(BigDecimal.valueOf(50)).build();
        Product largeItem = Product.builder().category(hardwareCategory).basePrice(BigDecimal.valueOf(10000)).costPrice(BigDecimal.valueOf(5000)).build();

        // 7.99% overage on a small $100 line in a $10,100 order (weight ~1%)
        RiskScoreEngine.LineInput line1 = new RiskScoreEngine.LineInput(1L, smallItem, new BigDecimal("17.99"), new BigDecimal("82.01"));
        RiskScoreEngine.LineInput line2 = new RiskScoreEngine.LineInput(2L, largeItem, new BigDecimal("10.00"), new BigDecimal("10000.00"));

        RiskCalculationResult result = engine.calculateRisk(new BigDecimal("10.00"), List.of(line1, line2));

        // Score will be small because line weight is tiny, and single-line spike was NOT reached (< 8.00)
        assertNotNull(result);
        assertTrue(result.getRequiresApproval());
        assertFalse(result.getRequiresFinance(), "7.99% overage must not trigger >= 8.00 single-line spike");
        assertEquals("SALES_MANAGER_ONLY", result.getRoutingDecision());
    }

    @Test
    @DisplayName("BVA 4: Single-line spike threshold on/above boundary (8.00 pt overage) -> Finance Required")
    void testSpikeThresholdOnBoundary() {
        // Ceiling = 10.00%, Given = 18.00% -> Overage = 8.00 points (>= 8.00 spike threshold)
        Product smallItem = Product.builder().category(hardwareCategory).basePrice(BigDecimal.valueOf(100)).costPrice(BigDecimal.valueOf(50)).build();
        Product largeItem = Product.builder().category(hardwareCategory).basePrice(BigDecimal.valueOf(10000)).costPrice(BigDecimal.valueOf(5000)).build();

        RiskScoreEngine.LineInput line1 = new RiskScoreEngine.LineInput(1L, smallItem, new BigDecimal("18.00"), new BigDecimal("82.00"));
        RiskScoreEngine.LineInput line2 = new RiskScoreEngine.LineInput(2L, largeItem, new BigDecimal("10.00"), new BigDecimal("10000.00"));

        RiskCalculationResult result = engine.calculateRisk(new BigDecimal("10.00"), List.of(line1, line2));

        assertNotNull(result);
        assertTrue(result.getRequiresApproval());
        assertTrue(result.getRequiresFinance(), "8.00% overage must trigger Finance escalation regardless of order weighting");
        assertEquals("SEQUENTIAL_MANAGER_AND_FINANCE", result.getRoutingDecision());
    }
}
