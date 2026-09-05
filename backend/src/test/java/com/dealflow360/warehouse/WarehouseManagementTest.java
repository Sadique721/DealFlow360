package com.dealflow360.warehouse;

import com.dealflow360.audit.AuditService;
import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Product;
import com.dealflow360.catalog.ProductRepository;
import com.dealflow360.config.ConflictException;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.warehouse.dto.InventoryRequest;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WarehouseManagementTest {

    @Mock
    private FulfillmentPlanRepository planRepository;
    @Mock
    private FulfillmentSplitRepository splitRepository;
    @Mock
    private WarehouseRepository warehouseRepository;
    @Mock
    private WarehouseStockRepository stockRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private QuotationRepository quotationRepository;
    @Mock
    private AuditService auditService;
    @Mock
    private WebSocketPublisher webSocketPublisher;

    private FulfillmentService fulfillmentService;
    private Warehouse whMain;
    private Warehouse whEast;
    private Product laptop;

    @BeforeEach
    void setUp() {
        SplitOptimizer splitOptimizer = new SplitOptimizer();
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

        whMain = Warehouse.builder()
                .id(1L)
                .warehouseCode("WH-001")
                .name("Main Warehouse")
                .location("Chicago, IL")
                .status("ACTIVE")
                .shippingCostWeight(BigDecimal.valueOf(1.00))
                .baseFreight(BigDecimal.valueOf(20.00))
                .createdAt(LocalDateTime.now().minusDays(2))
                .build();

        whEast = Warehouse.builder()
                .id(2L)
                .warehouseCode("WH-002")
                .name("East Depot")
                .location("New Jersey, NJ")
                .status("ACTIVE")
                .shippingCostWeight(BigDecimal.valueOf(1.40))
                .baseFreight(BigDecimal.valueOf(25.00))
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        Category cat = Category.builder().id(1L).name("Hardware").build();
        laptop = Product.builder()
                .id(10L)
                .name("Laptop Pro 14")
                .category(cat)
                .basePrice(BigDecimal.valueOf(1200))
                .costPrice(BigDecimal.valueOf(800))
                .build();
    }

    @Test
    @DisplayName("getAllWarehouses returns warehouses ordered newest first")
    void testGetAllWarehousesNewestFirst() {
        when(warehouseRepository.findAllOrderByNewestFirst()).thenReturn(List.of(whEast, whMain));

        List<Warehouse> result = fulfillmentService.getAllWarehouses();
        assertEquals(2, result.size());
        assertEquals("WH-002", result.get(0).getWarehouseCode());
        assertEquals("WH-001", result.get(1).getWarehouseCode());
        verify(warehouseRepository).findAllOrderByNewestFirst();
    }

    @Test
    @DisplayName("createWarehouse validates unique code and positive shipping weight")
    void testCreateWarehouseValidations() {
        when(warehouseRepository.existsByName("Duplicate Name")).thenReturn(true);
        Warehouse duplicateName = Warehouse.builder().name("Duplicate Name").warehouseCode("WH-009").build();
        assertThrows(ConflictException.class, () -> fulfillmentService.createWarehouse(duplicateName));

        when(warehouseRepository.existsByName("New WH")).thenReturn(false);
        when(warehouseRepository.existsByWarehouseCode("WH-EXISTING")).thenReturn(true);
        Warehouse duplicateCode = Warehouse.builder().name("New WH").warehouseCode("WH-EXISTING").build();
        assertThrows(ConflictException.class, () -> fulfillmentService.createWarehouse(duplicateCode));

        when(warehouseRepository.existsByWarehouseCode("WH-INVALID-WT")).thenReturn(false);
        Warehouse invalidWeight = Warehouse.builder()
                .name("New WH")
                .warehouseCode("WH-INVALID-WT")
                .shippingCostWeight(BigDecimal.valueOf(-0.5))
                .build();
        assertThrows(IllegalArgumentException.class, () -> fulfillmentService.createWarehouse(invalidWeight));
    }

    @Test
    @DisplayName("createWarehouse succeeds and sets defaults")
    void testCreateWarehouseSuccess() {
        when(warehouseRepository.existsByName("West Facility")).thenReturn(false);
        when(warehouseRepository.existsByWarehouseCode("WH-003")).thenReturn(false);
        when(warehouseRepository.save(any(Warehouse.class))).thenAnswer(inv -> inv.getArgument(0));

        Warehouse wh = Warehouse.builder()
                .name("West Facility")
                .warehouseCode("wh-003")
                .location("Seattle, WA")
                .shippingCostWeight(BigDecimal.valueOf(1.25))
                .build();

        Warehouse created = fulfillmentService.createWarehouse(wh);
        assertNotNull(created);
        assertEquals("WH-003", created.getWarehouseCode());
        assertEquals("ACTIVE", created.getStatus());
        assertEquals(BigDecimal.valueOf(1.25), created.getShippingCostWeight());
    }

    @Test
    @DisplayName("deleteWarehouse rejects deletion when active stock reservations exist")
    void testDeleteWarehouseBlockedWhenStockReserved() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(whMain));
        WarehouseStock stock = WarehouseStock.builder()
                .id(100L)
                .warehouse(whMain)
                .product(laptop)
                .inStock(50)
                .reserved(5)
                .available(45)
                .build();
        when(stockRepository.findByWarehouseId(1L)).thenReturn(List.of(stock));

        ConflictException ex = assertThrows(ConflictException.class, () -> fulfillmentService.deleteWarehouse(1L));
        assertTrue(ex.getMessage().contains("reserved for pending orders"));
        verify(warehouseRepository, never()).delete(any());
    }

    @Test
    @DisplayName("createInventory prevents duplicate product in same warehouse and calculates available stock")
    void testCreateInventoryDuplicateCheck() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(whMain));
        when(productRepository.findById(10L)).thenReturn(Optional.of(laptop));
        when(stockRepository.existsByWarehouseIdAndProductId(1L, 10L)).thenReturn(true);

        InventoryRequest req = InventoryRequest.builder()
                .warehouseId(1L)
                .productId(10L)
                .inStock(25)
                .reserved(0)
                .reorderLevel(10)
                .build();

        ConflictException ex = assertThrows(ConflictException.class, () -> fulfillmentService.createInventory(req));
        assertTrue(ex.getMessage().contains("already exists in warehouse"));
    }

    @Test
    @DisplayName("createInventory correctly computes available = inStock - reserved")
    void testCreateInventorySuccess() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(whMain));
        when(productRepository.findById(10L)).thenReturn(Optional.of(laptop));
        when(stockRepository.existsByWarehouseIdAndProductId(1L, 10L)).thenReturn(false);
        when(stockRepository.save(any(WarehouseStock.class))).thenAnswer(inv -> inv.getArgument(0));

        InventoryRequest req = InventoryRequest.builder()
                .warehouseId(1L)
                .productId(10L)
                .inStock(30)
                .reserved(5)
                .reorderLevel(15)
                .build();

        WarehouseStock saved = fulfillmentService.createInventory(req);
        assertEquals(30, saved.getInStock());
        assertEquals(5, saved.getReserved());
        assertEquals(25, saved.getAvailable());
        assertEquals(15, saved.getReorderLevel());
        assertEquals("NORMAL", saved.getStockStatus());
    }

    @Test
    @DisplayName("updateInventory updates stock levels and rejects reserved > inStock")
    void testUpdateInventoryValidation() {
        WarehouseStock existingStock = WarehouseStock.builder()
                .id(50L)
                .warehouse(whMain)
                .product(laptop)
                .inStock(20)
                .reserved(2)
                .available(18)
                .reorderLevel(10)
                .build();
        when(stockRepository.findById(50L)).thenReturn(Optional.of(existingStock));

        // Attempting reserved (25) > inStock (20)
        InventoryRequest badReq = InventoryRequest.builder()
                .inStock(20)
                .reserved(25)
                .build();
        assertThrows(IllegalArgumentException.class, () -> fulfillmentService.updateInventory(50L, badReq));

        // Valid update
        when(stockRepository.save(any(WarehouseStock.class))).thenAnswer(inv -> inv.getArgument(0));
        InventoryRequest validReq = InventoryRequest.builder()
                .inStock(40)
                .reserved(4)
                .reorderLevel(12)
                .build();
        WarehouseStock updated = fulfillmentService.updateInventory(50L, validReq);
        assertEquals(40, updated.getInStock());
        assertEquals(4, updated.getReserved());
        assertEquals(36, updated.getAvailable());
        assertEquals(12, updated.getReorderLevel());
    }

    @Test
    @DisplayName("deleteInventory rejects deletion when reserved > 0")
    void testDeleteInventoryProtected() {
        WarehouseStock reservedStock = WarehouseStock.builder()
                .id(77L)
                .warehouse(whMain)
                .product(laptop)
                .inStock(10)
                .reserved(3)
                .available(7)
                .build();
        when(stockRepository.findById(77L)).thenReturn(Optional.of(reservedStock));

        assertThrows(ConflictException.class, () -> fulfillmentService.deleteInventory(77L));
        verify(stockRepository, never()).delete(any());

        // Unreserved stock can be deleted
        WarehouseStock freeStock = WarehouseStock.builder()
                .id(78L)
                .warehouse(whMain)
                .product(laptop)
                .inStock(10)
                .reserved(0)
                .available(10)
                .build();
        when(stockRepository.findById(78L)).thenReturn(Optional.of(freeStock));
        fulfillmentService.deleteInventory(78L);
        verify(stockRepository).delete(freeStock);
    }
}
