package com.dealflow360.warehouse;

import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Product;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SplitOptimizerTest {

    private SplitOptimizer optimizer;
    private Warehouse mainWh;
    private Warehouse eastDepot;
    private Product laptopProduct;

    @BeforeEach
    void setUp() {
        optimizer = new SplitOptimizer();

        mainWh = Warehouse.builder()
                .id(1L)
                .name("Main Warehouse")
                .location("Chicago")
                .shippingCostWeight(BigDecimal.valueOf(1.00))
                .baseFreight(BigDecimal.valueOf(42.00))
                .build();

        eastDepot = Warehouse.builder()
                .id(2L)
                .name("East Depot")
                .location("New Jersey")
                .shippingCostWeight(BigDecimal.valueOf(1.40))
                .baseFreight(BigDecimal.valueOf(29.00))
                .build();

        Category hardware = Category.builder().id(1L).name("Hardware").build();
        laptopProduct = Product.builder()
                .id(1L)
                .name("Laptop Pro 14")
                .category(hardware)
                .isSubscription(false)
                .build();
    }

    @Test
    @DisplayName("Single warehouse with full stock is chosen to prevent redundant shipments")
    void testSingleWarehouseFullCoverage() {
        Quotation quote = Quotation.builder().id(1L).lines(new ArrayList<>()).build();
        QuotationLine line = QuotationLine.builder()
                .quotation(quote)
                .product(laptopProduct)
                .quantity(5)
                .build();
        quote.getLines().add(line);

        WarehouseStock mainStock = WarehouseStock.builder()
                .warehouse(mainWh)
                .product(laptopProduct)
                .inStock(20)
                .available(15)
                .build();

        WarehouseStock eastStock = WarehouseStock.builder()
                .warehouse(eastDepot)
                .product(laptopProduct)
                .inStock(10)
                .available(10)
                .build();

        List<Warehouse> warehouses = new ArrayList<>(List.of(mainWh, eastDepot));
        List<WarehouseStock> stocks = List.of(mainStock, eastStock);

        SplitOptimizer.OptimizationResult result = optimizer.optimizeFulfillment(quote, warehouses, stocks);

        assertNotNull(result);
        assertEquals(1, result.shipmentCount);
        assertEquals(1, result.splits.size());
        assertEquals(eastDepot.getId(), result.splits.get(0).getWarehouse().getId(), "Should pick East Depot since 29*1.4=40.6 < 42.0");
        assertEquals(5, result.splits.get(0).getQuantity());
        assertFalse(result.hasBackorder);
    }

    @Test
    @DisplayName("Order splits across 2 warehouses when no single depot has sufficient quantity")
    void testMultiWarehouseSplitAllocation() {
        Quotation quote = Quotation.builder().id(1L).lines(new ArrayList<>()).build();
        QuotationLine line = QuotationLine.builder()
                .quotation(quote)
                .product(laptopProduct)
                .quantity(5)
                .build();
        quote.getLines().add(line);

        // Main WH has 4 available, East Depot has 3 available
        WarehouseStock mainStock = WarehouseStock.builder()
                .warehouse(mainWh)
                .product(laptopProduct)
                .inStock(4)
                .available(4)
                .build();

        WarehouseStock eastStock = WarehouseStock.builder()
                .warehouse(eastDepot)
                .product(laptopProduct)
                .inStock(3)
                .available(3)
                .build();

        List<Warehouse> warehouses = new ArrayList<>(List.of(mainWh, eastDepot));
        List<WarehouseStock> stocks = List.of(mainStock, eastStock);

        SplitOptimizer.OptimizationResult result = optimizer.optimizeFulfillment(quote, warehouses, stocks);

        assertNotNull(result);
        assertEquals(2, result.splits.size());
        int totalAllocated = result.splits.stream().mapToInt(FulfillmentSplit::getQuantity).sum();
        assertEquals(5, totalAllocated);
        assertFalse(result.hasBackorder);
    }

    @Test
    @DisplayName("Creates backorder flag when stock across all warehouses is exhausted")
    void testBackorderCreatedWhenStockExhausted() {
        Quotation quote = Quotation.builder().id(1L).lines(new ArrayList<>()).build();
        QuotationLine line = QuotationLine.builder()
                .quotation(quote)
                .product(laptopProduct)
                .quantity(10)
                .build();
        quote.getLines().add(line);

        // Total available is 3 + 2 = 5 units
        WarehouseStock mainStock = WarehouseStock.builder()
                .warehouse(mainWh)
                .product(laptopProduct)
                .inStock(3)
                .available(3)
                .build();

        WarehouseStock eastStock = WarehouseStock.builder()
                .warehouse(eastDepot)
                .product(laptopProduct)
                .inStock(2)
                .available(2)
                .build();

        List<Warehouse> warehouses = new ArrayList<>(List.of(mainWh, eastDepot));
        List<WarehouseStock> stocks = List.of(mainStock, eastStock);

        SplitOptimizer.OptimizationResult result = optimizer.optimizeFulfillment(quote, warehouses, stocks);

        assertNotNull(result);
        assertTrue(result.hasBackorder);
        boolean hasBackorderSplit = result.splits.stream().anyMatch(FulfillmentSplit::getIsBackorder);
        assertTrue(hasBackorderSplit);
    }
}
