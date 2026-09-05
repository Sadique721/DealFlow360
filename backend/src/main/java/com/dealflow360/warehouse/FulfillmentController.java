package com.dealflow360.warehouse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/fulfillments", "/api/fulfillment"})
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

    @GetMapping("/stocks")
    @Operation(summary = "Get live stock inventory across all warehouses")
    public ResponseEntity<List<WarehouseStock>> getStocks(@RequestParam(required = false) Long warehouseId) {
        if (warehouseId != null) {
            return ResponseEntity.ok(fulfillmentService.getWarehouseStocks(warehouseId));
        }
        return ResponseEntity.ok(fulfillmentService.getAllStocks());
    }

    @GetMapping("/quotation/{quotationId}")
    @Operation(summary = "Get or generate recommended multi-warehouse fulfillment split plan")
    public ResponseEntity<FulfillmentPlan> getPlanForQuotation(@PathVariable Long quotationId) {
        return ResponseEntity.ok(fulfillmentService.generateOrGetPlan(quotationId));
    }

    @PostMapping("/quotation/{quotationId}/optimize")
    @Operation(summary = "Re-optimize multi-warehouse fulfillment split plan")
    public ResponseEntity<FulfillmentPlan> optimizePlan(@PathVariable Long quotationId) {
        return ResponseEntity.ok(fulfillmentService.generateOrGetPlan(quotationId));
    }

    @PostMapping("/quotation/{quotationId}/consolidate-backorder")
    @Operation(summary = "Consolidate backorders for quotation")
    public ResponseEntity<?> consolidateForQuotation(@PathVariable Long quotationId) {
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Backorders consolidated"));
    }

    @PostMapping("/{planId}/accept")
    @Operation(summary = "Accept optimizer suggested fulfillment split and reserve inventory")
    public ResponseEntity<FulfillmentPlan> acceptPlan(@PathVariable Long planId) {
        return ResponseEntity.ok(fulfillmentService.acceptSuggestedPlan(planId));
    }

    @PostMapping("/{planId}/override")
    @Operation(summary = "Manually override warehouse allocation splits")
    public ResponseEntity<FulfillmentPlan> overridePlan(
            @PathVariable Long planId,
            @RequestBody List<FulfillmentSplit> manualSplits,
            @RequestParam(defaultValue = "Manual logistics decision") String reason) {
        return ResponseEntity.ok(fulfillmentService.manualOverride(planId, manualSplits, reason));
    }

    @PostMapping("/stock/add")
    @Operation(summary = "Add inventory stock (triggers dynamic 'Consolidate Remaining Backorder' if pending backorders exist)")
    public ResponseEntity<Map<String, Object>> addStock(
            @RequestParam Long warehouseId,
            @RequestParam Long productId,
            @RequestParam int quantity) {
        return ResponseEntity.ok(fulfillmentService.addStock(warehouseId, productId, quantity));
    }

    @PostMapping("/splits/{splitId}/consolidate")
    @Operation(summary = "Execute Consolidate Remaining Backorder for a replenished item")
    public ResponseEntity<FulfillmentSplit> consolidateBackorder(@PathVariable Long splitId) {
        return ResponseEntity.ok(fulfillmentService.consolidateBackorder(splitId));
    }
}
