package com.dealflow360.whitebox;

import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.audit.AuditService;
import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Product;
import com.dealflow360.dealhealth.AnomalyDetectionService;
import com.dealflow360.dealhealth.DealHealthFlagRepository;
import com.dealflow360.discount.RiskCalculationResult;
import com.dealflow360.discount.RiskScoreEngine;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.subscription.ProrationEngine;
import com.dealflow360.warehouse.SplitOptimizer;
import com.dealflow360.warehouse.Warehouse;
import com.dealflow360.warehouse.WarehouseStock;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * White-Box Testing Suite:
 * Evaluates internal code execution paths, branches, edge-case math boundaries,
 * and divide-by-zero guards across core algorithmic services.
 */
class WhiteBoxEdgeCaseTest {

    private RiskScoreEngine riskEngine;
    private ProrationEngine prorationEngine;
    private SplitOptimizer splitOptimizer;
    private AnomalyDetectionService anomalyService;

    @BeforeEach
    void setUp() {
        riskEngine = new RiskScoreEngine();
        ReflectionTestUtils.setField(riskEngine, "managerThreshold", 10.0);
        ReflectionTestUtils.setField(riskEngine, "financeThreshold", 15.0);
        ReflectionTestUtils.setField(riskEngine, "singleLineSpikeThreshold", 8.0);

        prorationEngine = new ProrationEngine();
        splitOptimizer = new SplitOptimizer();

        DealHealthFlagRepository flagRepo = Mockito.mock(DealHealthFlagRepository.class);
        QuotationRepository quoteRepo = Mockito.mock(QuotationRepository.class);
        ApprovalStepRepository stepRepo = Mockito.mock(ApprovalStepRepository.class);
        AuditService auditService = Mockito.mock(AuditService.class);
        WebSocketPublisher wsPublisher = Mockito.mock(WebSocketPublisher.class);
        anomalyService = new AnomalyDetectionService(flagRepo, quoteRepo, stepRepo, auditService, wsPublisher);
    }

    @Test
    @DisplayName("White-Box: RiskScoreEngine handles empty order lines without arithmetic errors")
    void testRiskEngineEmptyOrderBranch() {
        RiskCalculationResult result = riskEngine.calculateRisk(BigDecimal.valueOf(10.0), new ArrayList<>());

        assertNotNull(result);
        assertEquals(BigDecimal.ZERO, result.getBlendedRiskScore());
        assertEquals("NONE", result.getRiskLevel());
        assertEquals("AUTO_APPROVED", result.getRoutingDecision());
        assertFalse(result.getRequiresApproval());
        assertFalse(result.getRequiresFinance());
    }

    @Test
    @DisplayName("White-Box: RiskScoreEngine handles zero ceiling with high gamma multiplier")
    void testRiskEngineZeroCeilingWithHighGamma() {
        Category highRiskCat = Category.builder()
                .name("High Volatility")
                .maxDiscountPercent(BigDecimal.ZERO)
                .sensitivityGamma(BigDecimal.valueOf(3.00)) // 3x sensitivity
                .build();

        Product prod = Product.builder()
                .name("Specialty Software")
                .category(highRiskCat)
                .basePrice(BigDecimal.valueOf(1000.00))
                .costPrice(BigDecimal.valueOf(200.00))
                .build();

        // 10% discount given when ceiling is 0% -> overage is 10.0 points
        RiskScoreEngine.LineInput line = new RiskScoreEngine.LineInput(
                1L, prod, BigDecimal.valueOf(10.00), BigDecimal.valueOf(900.00));

        RiskCalculationResult result = riskEngine.calculateRisk(BigDecimal.ZERO, List.of(line));

        assertNotNull(result);
        assertTrue(result.getRequiresApproval());
        assertTrue(result.getRequiresFinance());
        assertEquals("HIGH", result.getRiskLevel());
        assertTrue(result.getBlendedRiskScore().compareTo(BigDecimal.valueOf(30.0)) > 0);
    }

    @Test
    @DisplayName("White-Box: ProrationEngine handles exact zero days remaining boundary")
    void testProrationZeroDaysRemaining() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 10, 1); // 30 days
        LocalDate changeDate = LocalDate.of(2026, 10, 1); // on end date -> 0 days remaining

        ProrationEngine.ProrationResult result = prorationEngine.calculateProration(
                start, end, changeDate, BigDecimal.valueOf(100.00), BigDecimal.valueOf(100.00), 5);

        assertNotNull(result);
        assertEquals(0, result.getDaysRemaining());
        assertEquals(0.0, result.getAdjustmentAmount().doubleValue(), 0.01);
    }

    @Test
    @DisplayName("White-Box: ProrationEngine handles negative delta (seat downgrade credit note)")
    void testProrationSeatDowngradeNegativeDelta() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 10, 1); // 30 days
        LocalDate changeDate = LocalDate.of(2026, 9, 16); // 15 days remaining -> 50%

        // Downgrade: removing 2 seats (-2) at $100 rate -> -2 * 100 * 0.5 = -100 credit
        ProrationEngine.ProrationResult result = prorationEngine.calculateProration(
                start, end, changeDate, BigDecimal.valueOf(100.00), BigDecimal.valueOf(100.00), -2);

        assertNotNull(result);
        assertTrue(result.isCreditNote());
        assertEquals(15, result.getDaysRemaining());
        assertEquals(-100.00, result.getAdjustmentAmount().doubleValue(), 0.01);
    }

    @Test
    @DisplayName("White-Box: SplitOptimizer skips depot nodes with zero available inventory")
    void testSplitOptimizerSkipsDepotsWithZeroStock() {
        Category hw = Category.builder().name("Hardware").build();
        Product server = Product.builder().id(100L).name("Server Unit").category(hw).isSubscription(false).build();

        Quotation quote = Quotation.builder().id(1L).lines(new ArrayList<>()).build();
        quote.getLines().add(QuotationLine.builder().quotation(quote).product(server).quantity(5).build());

        Warehouse emptyDepot = Warehouse.builder().id(1L).name("Empty-Depot").baseFreight(BigDecimal.valueOf(10)).shippingCostWeight(BigDecimal.ONE).build();
        Warehouse stockedDepot = Warehouse.builder().id(2L).name("Stocked-Depot").baseFreight(BigDecimal.valueOf(20)).shippingCostWeight(BigDecimal.ONE).build();

        WarehouseStock stockEmpty = WarehouseStock.builder().warehouse(emptyDepot).product(server).available(0).inStock(0).build();
        WarehouseStock stockFull = WarehouseStock.builder().warehouse(stockedDepot).product(server).available(10).inStock(10).build();

        List<Warehouse> warehouses = new ArrayList<>(List.of(emptyDepot, stockedDepot));
        List<WarehouseStock> stocks = List.of(stockEmpty, stockFull);

        SplitOptimizer.OptimizationResult result = splitOptimizer.optimizeFulfillment(quote, warehouses, stocks);

        assertNotNull(result);
        assertEquals(1, result.splits.size());
        assertEquals("Stocked-Depot", result.splits.get(0).getWarehouse().getName());
        assertEquals(5, result.splits.get(0).getQuantity());
    }
}
