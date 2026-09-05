package com.dealflow360.discount;

import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RiskScoreEngineTest {

    private RiskScoreEngine engine;
    private Category hardwareCategory;
    private Category serviceCategory;
    private Product laptopProduct;
    private Product setupProduct;

    @BeforeEach
    void setUp() {
        engine = new RiskScoreEngine();
        ReflectionTestUtils.setField(engine, "managerThreshold", 10.0);
        ReflectionTestUtils.setField(engine, "financeThreshold", 15.0);
        ReflectionTestUtils.setField(engine, "singleLineSpikeThreshold", 8.0);

        hardwareCategory = Category.builder()
                .id(1L)
                .name("Hardware")
                .maxDiscountPercent(BigDecimal.valueOf(15.00))
                .sensitivityGamma(BigDecimal.valueOf(1.00))
                .build();

        serviceCategory = Category.builder()
                .id(2L)
                .name("Services")
                .maxDiscountPercent(BigDecimal.valueOf(10.00))
                .sensitivityGamma(BigDecimal.valueOf(2.00)) // Gamma = 2.0
                .build();

        laptopProduct = Product.builder()
                .id(1L)
                .name("Laptop Pro 14")
                .category(hardwareCategory)
                .basePrice(BigDecimal.valueOf(1200.00))
                .costPrice(BigDecimal.valueOf(850.00))
                .build();

        setupProduct = Product.builder()
                .id(2L)
                .name("Onsite Setup Service")
                .category(serviceCategory)
                .basePrice(BigDecimal.valueOf(450.00))
                .costPrice(BigDecimal.valueOf(300.00))
                .build();
    }

    @Test
    @DisplayName("Gold Tier (15%): Laptop 12% is OK, but Service 18% breaches 10% ceiling by 8pt -> High Risk sequential approval")
    void testJudgeScenario_BreachStricterServiceCeiling() {
        BigDecimal goldTierCeiling = BigDecimal.valueOf(15.00);

        // Laptop: 1 unit @ $1200, 12% discount -> Net = $1056
        RiskScoreEngine.LineInput laptopLine = new RiskScoreEngine.LineInput(
                1L, laptopProduct, BigDecimal.valueOf(12.00), BigDecimal.valueOf(1056.00));

        // Setup Service: 1 unit @ $450, 18% discount -> Net = $369
        RiskScoreEngine.LineInput serviceLine = new RiskScoreEngine.LineInput(
                2L, setupProduct, BigDecimal.valueOf(18.00), BigDecimal.valueOf(369.00));

        RiskCalculationResult result = engine.calculateRisk(goldTierCeiling, List.of(laptopLine, serviceLine));

        assertNotNull(result);
        assertTrue(result.getRequiresApproval(), "Must require approval");
        assertTrue(result.getRequiresFinance(), "Must require Finance due to service overage >= 8pt");
        assertEquals("HIGH", result.getRiskLevel());
        assertEquals("SEQUENTIAL_MANAGER_AND_FINANCE", result.getRoutingDecision());
        assertTrue(result.getBlendedRiskScore().doubleValue() >= 8.0, "Score must reflect weighted overage and penalty");
        assertTrue(result.getCulpritSummary().contains("Onsite Setup Service"), "Culprit must be highlighted");
    }

    @Test
    @DisplayName("Within ceiling discounts result in Blended Risk Score = 0 and AUTO_APPROVED")
    void testWithinLimits_AutoApproved() {
        BigDecimal silverTierCeiling = BigDecimal.valueOf(10.00);

        RiskScoreEngine.LineInput laptopLine = new RiskScoreEngine.LineInput(
                1L, laptopProduct, BigDecimal.valueOf(8.00), BigDecimal.valueOf(1104.00));

        RiskScoreEngine.LineInput serviceLine = new RiskScoreEngine.LineInput(
                2L, setupProduct, BigDecimal.valueOf(5.00), BigDecimal.valueOf(427.50));

        RiskCalculationResult result = engine.calculateRisk(silverTierCeiling, List.of(laptopLine, serviceLine));

        assertNotNull(result);
        assertFalse(result.getRequiresApproval());
        assertEquals("NONE", result.getRiskLevel());
        assertEquals("AUTO_APPROVED", result.getRoutingDecision());
        assertEquals(0.0, result.getBlendedRiskScore().doubleValue());
    }

    @Test
    @DisplayName("Small single-line overage (0.8% over limit) routes to Sales Manager only (1-tier, score = 8.00)")
    void testSmallOverage_RoutesToManagerOnly() {
        BigDecimal goldTierCeiling = BigDecimal.valueOf(15.00);

        // Hardware ceiling is 15%. Discount is 15.8% (0.8% overage). Blended score = 0.8 * 10 = 8.00 <= 10.0.
        RiskScoreEngine.LineInput laptopLine = new RiskScoreEngine.LineInput(
                1L, laptopProduct, BigDecimal.valueOf(15.80), BigDecimal.valueOf(1010.40));

        RiskCalculationResult result = engine.calculateRisk(goldTierCeiling, List.of(laptopLine));

        assertNotNull(result);
        assertTrue(result.getRequiresApproval(), "Must require manager approval");
        assertFalse(result.getRequiresFinance(), "Must NOT require Finance for score <= 10.0");
        assertEquals("SALES_MANAGER_ONLY", result.getRoutingDecision());
        assertEquals(8.0, result.getBlendedRiskScore().doubleValue(), 0.05);
    }

    @Test
    @DisplayName("Multi-line systemic erosion: 3 lines each 2.5% over ceiling accumulates blended score triggering governance")
    void testMultiLineSystemicErosion_CatchesBlendedRisk() {
        BigDecimal silverTierCeiling = BigDecimal.valueOf(10.00);

        // Category ceiling 15%, but Silver customer tier ceiling is 10%.
        // 3 lines with 12.5% discount -> each has 2.5% overage.
        RiskScoreEngine.LineInput line1 = new RiskScoreEngine.LineInput(1L, laptopProduct, BigDecimal.valueOf(12.50), BigDecimal.valueOf(1000.00));
        RiskScoreEngine.LineInput line2 = new RiskScoreEngine.LineInput(2L, laptopProduct, BigDecimal.valueOf(12.50), BigDecimal.valueOf(1000.00));
        RiskScoreEngine.LineInput line3 = new RiskScoreEngine.LineInput(3L, laptopProduct, BigDecimal.valueOf(12.50), BigDecimal.valueOf(1000.00));

        RiskCalculationResult result = engine.calculateRisk(silverTierCeiling, List.of(line1, line2, line3));

        assertNotNull(result);
        assertTrue(result.getRequiresApproval(), "Must require approval");
        // Blended score = 2.5 * 10 = 25.0 > 10.0 threshold
        assertTrue(result.getBlendedRiskScore().doubleValue() > 10.0, "Score must exceed 10.0");
        assertTrue(result.getRequiresFinance(), "Must escalate to Finance due to high cumulative blended score");
        assertEquals("SEQUENTIAL_MANAGER_AND_FINANCE", result.getRoutingDecision());
    }
}
