package com.dealflow360.warehouse;

import com.dealflow360.audit.AuditService;
import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Product;
import com.dealflow360.catalog.ProductRepository;
import com.dealflow360.config.ConflictException;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.warehouse.dto.ManualSplitRequest;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FulfillmentServiceTest {

    @Mock
    private FulfillmentPlanRepository fulfillmentPlanRepository;

    @Mock
    private FulfillmentSplitRepository fulfillmentSplitRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private WarehouseStockRepository warehouseStockRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private QuotationRepository quotationRepository;

    @Spy
    private SplitOptimizer splitOptimizer = new SplitOptimizer();

    @Mock
    private AuditService auditService;

    @Mock
    private WebSocketPublisher webSocketPublisher;

    @InjectMocks
    private FulfillmentService fulfillmentService;

    private Warehouse whMain;
    private Warehouse whEast;
    private Product laptop;
    private Quotation approvedQuote;

    @BeforeEach
    void setUp() {
        whMain = Warehouse.builder()
                .id(1L)
                .name("Main Warehouse")
                .location("Chicago")
                .warehouseCode("WH-CHI-01")
                .baseFreight(BigDecimal.valueOf(40.00))
                .shippingCostWeight(BigDecimal.valueOf(1.00))
                .status("ACTIVE")
                .build();

        whEast = Warehouse.builder()
                .id(2L)
                .name("East Depot")
                .location("New Jersey")
                .warehouseCode("WH-NJ-02")
                .baseFreight(BigDecimal.valueOf(25.00))
                .shippingCostWeight(BigDecimal.valueOf(1.50))
                .status("ACTIVE")
                .build();

        Category hardware = Category.builder().id(1L).name("Hardware").build();
        laptop = Product.builder()
                .id(101L)
                .name("Laptop Pro 14")
                .category(hardware)
                .isSubscription(false)
                .build();

        approvedQuote = Quotation.builder()
                .id(10L)
                .quoteNumber("Q-1045")
                .status("APPROVED")
                .lines(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .build();

        QuotationLine line = QuotationLine.builder()
                .id(1L)
                .quotation(approvedQuote)
                .product(laptop)
                .quantity(5)
                .build();
        approvedQuote.getLines().add(line);
    }

    @Test
    @DisplayName("getAllPlans returns all fulfillment plans ordered newest first")
    void testGetAllPlans() {
        FulfillmentPlan plan1 = FulfillmentPlan.builder().id(1L).quotation(approvedQuote).build();
        FulfillmentPlan plan2 = FulfillmentPlan.builder().id(2L).quotation(approvedQuote).build();

        when(fulfillmentPlanRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(plan2, plan1));

        List<FulfillmentPlan> plans = fulfillmentService.getAllPlans();
        assertNotNull(plans);
        assertEquals(2, plans.size());
        assertEquals(2L, plans.get(0).getId());
        verify(fulfillmentPlanRepository, times(1)).findAllByOrderByCreatedAtDesc();
    }

    @Test
    @DisplayName("Fulfillment generation is rejected if quotation is in DRAFT or unapproved state")
    void testGeneratePlanRejectedForUnapprovedQuotation() {
        Quotation draftQuote = Quotation.builder().id(20L).status("DRAFT").build();
        when(quotationRepository.findById(20L)).thenReturn(Optional.of(draftQuote));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                fulfillmentService.generateOrRecomputePlan(20L)
        );
        assertTrue(ex.getMessage().contains("Fulfillment can only be generated for approved or confirmed quotations"));
    }

    @Test
    @DisplayName("acceptSuggestedPlan throws ConflictException (409) if live stock changed and is insufficient")
    void testAcceptSuggestedPlanFailsOnStockDepletion() {
        FulfillmentPlan plan = FulfillmentPlan.builder()
                .id(100L)
                .quotation(approvedQuote)
                .status("ALLOCATION_SUGGESTED")
                .splits(new ArrayList<>())
                .build();

        FulfillmentSplit split = FulfillmentSplit.builder()
                .id(1L)
                .fulfillmentPlan(plan)
                .warehouse(whMain)
                .product(laptop)
                .quantity(5)
                .isBackorder(false)
                .status("ALLOCATED")
                .build();
        plan.getSplits().add(split);

        when(fulfillmentPlanRepository.findById(100L)).thenReturn(Optional.of(plan));

        // Available stock is only 3, but split requires 5!
        WarehouseStock depletedStock = WarehouseStock.builder()
                .warehouse(whMain)
                .product(laptop)
                .inStock(10)
                .reserved(7)
                .available(3)
                .build();

        when(warehouseStockRepository.findByWarehouseIdAndProductId(1L, 101L)).thenReturn(Optional.of(depletedStock));

        ConflictException ex = assertThrows(ConflictException.class, () ->
                fulfillmentService.acceptSuggestedPlan(100L)
        );
        assertTrue(ex.getMessage().contains("Stock changed"));
        assertTrue(ex.getMessage().contains("only has 3 available"));
    }

    @Test
    @DisplayName("acceptSuggestedPlan successfully reserves live stock and marks plan FULFILLED")
    void testAcceptSuggestedPlanSuccess() {
        FulfillmentPlan plan = FulfillmentPlan.builder()
                .id(100L)
                .quotation(approvedQuote)
                .status("ALLOCATION_SUGGESTED")
                .splits(new ArrayList<>())
                .build();

        FulfillmentSplit split = FulfillmentSplit.builder()
                .id(1L)
                .fulfillmentPlan(plan)
                .warehouse(whMain)
                .product(laptop)
                .quantity(5)
                .isBackorder(false)
                .status("ALLOCATED")
                .build();
        plan.getSplits().add(split);

        when(fulfillmentPlanRepository.findById(100L)).thenReturn(Optional.of(plan));

        WarehouseStock stock = WarehouseStock.builder()
                .warehouse(whMain)
                .product(laptop)
                .inStock(20)
                .reserved(2)
                .available(18)
                .build();

        when(warehouseStockRepository.findByWarehouseIdAndProductId(1L, 101L)).thenReturn(Optional.of(stock));
        when(fulfillmentPlanRepository.save(any(FulfillmentPlan.class))).thenAnswer(i -> i.getArgument(0));

        FulfillmentPlan updatedPlan = fulfillmentService.acceptSuggestedPlan(100L);

        assertEquals("FULFILLED", updatedPlan.getStatus());
        assertEquals(7, stock.getReserved(), "Reserved count should increment by 5 (2 + 5 = 7)");
        assertEquals(13, stock.getAvailable(), "Available count should decrement to 13");
        verify(warehouseStockRepository, times(1)).save(stock);
        verify(fulfillmentPlanRepository, times(1)).save(plan);
    }

    @Test
    @DisplayName("manualOverride validates warehouse available stock and rejects over-allocation")
    void testManualOverrideRejectsOverStock() {
        FulfillmentPlan plan = FulfillmentPlan.builder()
                .id(100L)
                .quotation(approvedQuote)
                .status("ALLOCATION_SUGGESTED")
                .splits(new ArrayList<>())
                .build();

        when(fulfillmentPlanRepository.findById(100L)).thenReturn(Optional.of(plan));
        when(productRepository.findById(101L)).thenReturn(Optional.of(laptop));
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(whMain));

        WarehouseStock stock = WarehouseStock.builder()
                .warehouse(whMain)
                .product(laptop)
                .inStock(5)
                .reserved(3)
                .available(2)
                .build();

        when(warehouseStockRepository.findByWarehouseIdAndProductId(1L, 101L)).thenReturn(Optional.of(stock));

        // User attempts to allocate 4 units when only 2 are available
        ManualSplitRequest req = ManualSplitRequest.builder()
                .warehouseId(1L)
                .productId(101L)
                .quantity(4)
                .isBackorder(false)
                .build();

        ConflictException ex = assertThrows(ConflictException.class, () ->
                fulfillmentService.manualOverride(100L, List.of(req), "Operator manual allocation")
        );
        assertTrue(ex.getMessage().contains("Insufficient available stock"));
    }

    @Test
    @DisplayName("reEvaluateBackorders allocates from replenished stock and clears backorder")
    void testReEvaluateBackorders() {
        FulfillmentPlan plan = FulfillmentPlan.builder()
                .id(100L)
                .quotation(approvedQuote)
                .status("PARTIALLY_FULFILLED")
                .splits(new ArrayList<>())
                .build();

        FulfillmentSplit boSplit = FulfillmentSplit.builder()
                .id(99L)
                .fulfillmentPlan(plan)
                .warehouse(whMain)
                .product(laptop)
                .quantity(3)
                .isBackorder(true)
                .status("BACKORDERED")
                .build();
        plan.getSplits().add(boSplit);

        when(fulfillmentPlanRepository.findById(100L)).thenReturn(Optional.of(plan));
        when(fulfillmentSplitRepository.findByFulfillmentPlanIdAndIsBackorderTrue(100L)).thenReturn(List.of(boSplit));
        when(warehouseRepository.findAll()).thenReturn(new ArrayList<>(List.of(whMain, whEast)));

        // Warehouse Main now has 5 available units
        WarehouseStock replenishedStock = WarehouseStock.builder()
                .warehouse(whMain)
                .product(laptop)
                .inStock(10)
                .reserved(0)
                .available(10)
                .build();

        when(warehouseStockRepository.findByWarehouseIdAndProductId(2L, 101L)).thenReturn(Optional.empty());
        when(warehouseStockRepository.findByWarehouseIdAndProductId(1L, 101L)).thenReturn(Optional.of(replenishedStock));
        when(fulfillmentPlanRepository.save(any(FulfillmentPlan.class))).thenAnswer(i -> i.getArgument(0));

        FulfillmentPlan result = fulfillmentService.reEvaluateBackorders(100L);

        assertEquals("FULFILLED", result.getStatus());
        assertEquals(3, replenishedStock.getReserved());
        assertEquals(7, replenishedStock.getAvailable());
        verify(fulfillmentSplitRepository, times(1)).delete(boSplit);
    }
}
