package com.dealflow360.integration;

import com.dealflow360.audit.AuditService;
import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Product;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.warehouse.*;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FulfillmentSplitIntegrationTest {

    @Mock
    private FulfillmentPlanRepository planRepository;

    @Mock
    private FulfillmentSplitRepository splitRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private WarehouseStockRepository stockRepository;

    @Mock
    private com.dealflow360.catalog.ProductRepository productRepository;

    @Mock
    private com.dealflow360.quotation.QuotationRepository quotationRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private WebSocketPublisher webSocketPublisher;

    private SplitOptimizer splitOptimizer;
    private FulfillmentService fulfillmentService;

    private Warehouse whAustin;
    private Warehouse whChicago;
    private Product hardwareProd;
    private Product serviceProd;
    private Quotation testQuote;

    @BeforeEach
    void setUp() {
        splitOptimizer = new SplitOptimizer();
        fulfillmentService = new FulfillmentService(
                planRepository,
                splitRepository,
                warehouseRepository,
                stockRepository,
                productRepository,
                quotationRepository,
                splitOptimizer,
                auditService,
                webSocketPublisher
        );

        whAustin = Warehouse.builder()
                .id(1L)
                .name("Austin Hub")
                .location("Austin, TX")
                .baseFreight(BigDecimal.valueOf(25.00))
                .shippingCostWeight(BigDecimal.valueOf(1.00))
                .build();

        whChicago = Warehouse.builder()
                .id(2L)
                .name("Chicago Depot")
                .location("Chicago, IL")
                .baseFreight(BigDecimal.valueOf(40.00))
                .shippingCostWeight(BigDecimal.valueOf(1.00))
                .build();

        Category catHw = Category.builder().id(1L).name("Hardware").build();
        Category catSrv = Category.builder().id(2L).name("Services").build();

        hardwareProd = Product.builder()
                .id(101L)
                .name("Edge Gateway Server")
                .category(catHw)
                .basePrice(BigDecimal.valueOf(1000.00))
                .costPrice(BigDecimal.valueOf(700.00))
                .isSubscription(false)
                .build();

        serviceProd = Product.builder()
                .id(102L)
                .name("Installation & Setup")
                .category(catSrv)
                .basePrice(BigDecimal.valueOf(300.00))
                .costPrice(BigDecimal.valueOf(100.00))
                .isSubscription(false)
                .build();

        testQuote = Quotation.builder()
                .id(42L)
                .quoteNumber("Q-1042")
                .status("APPROVED")
                .lines(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Single Warehouse Coverage: Entire order fulfilled from Austin with 0 unnecessary splits")
    void testSingleWarehouseCoverage() {
        QuotationLine line = QuotationLine.builder()
                .id(1L)
                .quotation(testQuote)
                .product(hardwareProd)
                .quantity(5)
                .lineTotal(BigDecimal.valueOf(5000.00))
                .build();
        testQuote.getLines().add(line);

        WarehouseStock stockAustin = WarehouseStock.builder()
                .id(1L).warehouse(whAustin).product(hardwareProd).inStock(10).available(10).reserved(0).build();
        WarehouseStock stockChicago = WarehouseStock.builder()
                .id(2L).warehouse(whChicago).product(hardwareProd).inStock(5).available(5).reserved(0).build();

        SplitOptimizer.OptimizationResult result = splitOptimizer.optimizeFulfillment(
                testQuote,
                List.of(whAustin, whChicago),
                List.of(stockAustin, stockChicago)
        );

        assertNotNull(result);
        assertEquals(1, result.splits.size(), "Should produce exactly 1 split allocation");
        assertEquals(1, result.shipmentCount, "Should require only 1 shipment");
        assertFalse(result.hasBackorder, "Should have 0 backorders");
        assertEquals(whAustin.getId(), result.splits.get(0).getWarehouse().getId());
        assertEquals(5, result.splits.get(0).getQuantity());
        assertEquals("ALLOCATED", result.splits.get(0).getStatus());
        assertEquals(BigDecimal.valueOf(25.00).setScale(2), result.totalShippingCost);
    }

    @Test
    @DisplayName("Multi-Warehouse Split: Order for 10 units splits across Austin (6 units) and Chicago (4 units)")
    void testMultiWarehouseSplit() {
        QuotationLine line = QuotationLine.builder()
                .id(1L)
                .quotation(testQuote)
                .product(hardwareProd)
                .quantity(10)
                .lineTotal(BigDecimal.valueOf(10000.00))
                .build();
        testQuote.getLines().add(line);

        WarehouseStock stockAustin = WarehouseStock.builder()
                .id(1L).warehouse(whAustin).product(hardwareProd).inStock(6).available(6).reserved(0).build();
        WarehouseStock stockChicago = WarehouseStock.builder()
                .id(2L).warehouse(whChicago).product(hardwareProd).inStock(4).available(4).reserved(0).build();

        SplitOptimizer.OptimizationResult result = splitOptimizer.optimizeFulfillment(
                testQuote,
                List.of(whAustin, whChicago),
                List.of(stockAustin, stockChicago)
        );

        assertNotNull(result);
        assertEquals(2, result.splits.size(), "Should produce 2 splits");
        assertEquals(2, result.shipmentCount, "Should require 2 shipments");
        assertFalse(result.hasBackorder, "Should satisfy full quantity across warehouses");

        FulfillmentSplit split1 = result.splits.get(0);
        FulfillmentSplit split2 = result.splits.get(1);

        assertEquals(6, split1.getQuantity());
        assertEquals(whAustin.getId(), split1.getWarehouse().getId());

        assertEquals(4, split2.getQuantity());
        assertEquals(whChicago.getId(), split2.getWarehouse().getId());

        // Total freight = 25.00 + 40.00 = 65.00
        assertEquals(BigDecimal.valueOf(65.00).setScale(2), result.totalShippingCost);
    }

    @Test
    @DisplayName("Backorder Flagging: Shortfall across all warehouses is flagged as BACKORDERED")
    void testBackorderFlagging() {
        QuotationLine line = QuotationLine.builder()
                .id(1L)
                .quotation(testQuote)
                .product(hardwareProd)
                .quantity(15)
                .lineTotal(BigDecimal.valueOf(15000.00))
                .build();
        testQuote.getLines().add(line);

        WarehouseStock stockAustin = WarehouseStock.builder()
                .id(1L).warehouse(whAustin).product(hardwareProd).inStock(5).available(5).reserved(0).build();
        WarehouseStock stockChicago = WarehouseStock.builder()
                .id(2L).warehouse(whChicago).product(hardwareProd).inStock(4).available(4).reserved(0).build();

        SplitOptimizer.OptimizationResult result = splitOptimizer.optimizeFulfillment(
                testQuote,
                List.of(whAustin, whChicago),
                List.of(stockAustin, stockChicago)
        );

        assertNotNull(result);
        assertTrue(result.hasBackorder, "Shortfall must set hasBackorder = true");
        assertEquals(3, result.splits.size(), "2 allocated splits + 1 backorder split");

        FulfillmentSplit backorderSplit = result.splits.stream()
                .filter(FulfillmentSplit::getIsBackorder)
                .findFirst()
                .orElse(null);

        assertNotNull(backorderSplit);
        assertEquals(6, backorderSplit.getQuantity(), "Unmet quantity (15 - 9 = 6) must be backordered");
        assertEquals("BACKORDERED", backorderSplit.getStatus());
    }

    @Test
    @DisplayName("Non-Physical Lines Ignored: Services do not consume warehouse stock")
    void testNonPhysicalLinesIgnored() {
        QuotationLine srvLine = QuotationLine.builder()
                .id(1L)
                .quotation(testQuote)
                .product(serviceProd)
                .quantity(3)
                .lineTotal(BigDecimal.valueOf(900.00))
                .build();
        testQuote.getLines().add(srvLine);

        SplitOptimizer.OptimizationResult result = splitOptimizer.optimizeFulfillment(
                testQuote,
                List.of(whAustin, whChicago),
                List.of()
        );

        assertNotNull(result);
        assertTrue(result.splits.isEmpty(), "Pure service line should not create physical splits");
    }

    @Test
    @DisplayName("Plan Acceptance: Inventory stock is reserved in warehouse_stocks")
    void testPlanAcceptanceAndStockReservation() {
        FulfillmentSplit split = FulfillmentSplit.builder()
                .id(101L)
                .warehouse(whAustin)
                .product(hardwareProd)
                .quantity(5)
                .isBackorder(false)
                .status("ALLOCATED")
                .build();

        FulfillmentPlan plan = FulfillmentPlan.builder()
                .id(1L)
                .quotation(testQuote)
                .status("SPLIT_PENDING")
                .splits(new ArrayList<>(List.of(split)))
                .build();

        split.setFulfillmentPlan(plan);

        WarehouseStock stock = WarehouseStock.builder()
                .id(1L)
                .warehouse(whAustin)
                .product(hardwareProd)
                .inStock(20)
                .reserved(0)
                .available(20)
                .build();

        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(stockRepository.findByWarehouseIdAndProductId(1L, 101L)).thenReturn(Optional.of(stock));

        FulfillmentPlan acceptedPlan = fulfillmentService.acceptSuggestedPlan(1L);

        assertEquals("FULFILLED", acceptedPlan.getStatus());
        assertEquals(5, stock.getReserved(), "Reserved quantity must increase by 5");
        assertEquals(15, stock.getAvailable(), "Available quantity must decrease to 15");
        assertEquals("SHIPPED", split.getStatus());
        verify(auditService).log(eq("FULFILLMENT"), eq(42L), eq("SPLIT_ACCEPTED"), anyString(), anyString(), anyString(), anyString(), any());
    }
}
