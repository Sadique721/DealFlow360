package com.dealflow360.warehouse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fulfillments")
@Tag(name = "Warehouse & Logistics", description = "Endpoints for inventory management, split fulfillment optimization, and backorder consolidation")
public class FulfillmentController {

    private final FulfillmentService fulfillmentService;

    public FulfillmentController(FulfillmentService fulfillmentService) {
        this.fulfillmentService = fulfillmentService;
    }

    @GetMapping("/warehouses")
    @Operation(summary = "List all physical warehouses with freight parameters")
    public ResponseEntity<List<Warehouse>> getWarehouses() {
        return ResponseEntity.ok(fulfillmentService.getAllWarehouses());
    }

    @GetMapping("/warehouses/{id}")
    @Operation(summary = "Get warehouse by ID")
    public ResponseEntity<Warehouse> getWarehouseById(@PathVariable Long id) {
        return fulfillmentService.getWarehouseById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/warehouses")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new warehouse (ADMIN only)")
    public ResponseEntity<Warehouse> createWarehouse(@RequestBody Warehouse warehouse) {
        return ResponseEntity.ok(fulfillmentService.createWarehouse(warehouse));
    }

    @PutMapping("/warehouses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update warehouse details (ADMIN only)")
    public ResponseEntity<Warehouse> updateWarehouse(@PathVariable Long id, @RequestBody Warehouse warehouse) {
        return ResponseEntity.ok(fulfillmentService.updateWarehouse(id, warehouse));
    }

    @DeleteMapping("/warehouses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete warehouse (ADMIN only)")
    public ResponseEntity<Void> deleteWarehouse(@PathVariable Long id) {
        fulfillmentService.deleteWarehouse(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stocks")
    @Operation(summary = "Get live stock inventory across all warehouses")
    public ResponseEntity<List<WarehouseStock>> getStocks(@RequestParam(required = false) Long warehouseId) {
        if (warehouseId != null) {
            return ResponseEntity.ok(fulfillmentService.getWarehouseStocks(warehouseId));
        }
        return ResponseEntity.ok(fulfillmentService.getAllStocks());
    }

    @PostMapping("/stocks/set")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Set stock levels directly for a warehouse product (ADMIN only)")
    public ResponseEntity<WarehouseStock> setStock(
            @RequestParam Long warehouseId,
            @RequestParam Long productId,
            @RequestParam int inStock,
            @RequestParam(required = false, defaultValue = "0") Integer reserved,
            @RequestParam(required = false) Integer reorderLevel) {
        return ResponseEntity.ok(fulfillmentService.setStock(warehouseId, productId, inStock, reserved, reorderLevel));
    }

    @GetMapping("/quotation/{quotationId}")
    @Operation(summary = "Get or generate recommended multi-warehouse fulfillment split plan")
    public ResponseEntity<FulfillmentPlan> getPlanForQuotation(@PathVariable Long quotationId) {
        return ResponseEntity.ok(fulfillmentService.generateOrGetPlan(quotationId));
    }

    @PostMapping("/quotation/{quotationId}/recompute")
    @Operation(summary = "Recompute greedy split plan for quotation")
    public ResponseEntity<FulfillmentPlan> recomputePlan(@PathVariable Long quotationId) {
        return ResponseEntity.ok(fulfillmentService.generateOrRecomputePlan(quotationId));
    }

    @PostMapping("/{planId}/accept")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE','SALES_MANAGER')")
    @Operation(summary = "Accept optimizer suggested fulfillment split and reserve inventory")
    public ResponseEntity<FulfillmentPlan> acceptPlan(@PathVariable Long planId) {
        return ResponseEntity.ok(fulfillmentService.acceptSuggestedPlan(planId));
    }

    @PostMapping("/{planId}/override")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    @Operation(summary = "Manually override warehouse allocation splits (ADMIN/FINANCE only)")
    public ResponseEntity<FulfillmentPlan> overridePlan(
            @PathVariable Long planId,
            @RequestBody List<FulfillmentSplit> manualSplits,
            @RequestParam(defaultValue = "Manual logistics decision") String reason) {
        return ResponseEntity.ok(fulfillmentService.manualOverride(planId, manualSplits, reason));
    }

    @PostMapping("/stock/add")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    @Operation(summary = "Add inventory stock (triggers dynamic 'Consolidate Remaining Backorder' if pending backorders exist)")
    public ResponseEntity<Map<String, Object>> addStock(
            @RequestParam Long warehouseId,
            @RequestParam Long productId,
            @RequestParam int quantity) {
        return ResponseEntity.ok(fulfillmentService.addStock(warehouseId, productId, quantity));
    }

    @PostMapping("/splits/{splitId}/consolidate")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    @Operation(summary = "Execute Consolidate Remaining Backorder for a replenished item")
    public ResponseEntity<FulfillmentSplit> consolidateBackorder(@PathVariable Long splitId) {
        return ResponseEntity.ok(fulfillmentService.consolidateBackorder(splitId));
    }
}
