package com.dealflow360.warehouse;

import com.dealflow360.audit.AuditService;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.websocket.WebSocketPublisher;
import com.dealflow360.catalog.Product;
import com.dealflow360.catalog.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class FulfillmentService {

    private final FulfillmentPlanRepository fulfillmentPlanRepository;
    private final FulfillmentSplitRepository fulfillmentSplitRepository;
    private final WarehouseRepository warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final ProductRepository productRepository;
    private final QuotationRepository quotationRepository;
    private final SplitOptimizer splitOptimizer;
    private final AuditService auditService;
    private final WebSocketPublisher webSocketPublisher;

    public FulfillmentService(FulfillmentPlanRepository fulfillmentPlanRepository,
                              FulfillmentSplitRepository fulfillmentSplitRepository,
                              WarehouseRepository warehouseRepository,
                              WarehouseStockRepository warehouseStockRepository,
                              ProductRepository productRepository,
                              QuotationRepository quotationRepository,
                              SplitOptimizer splitOptimizer,
                              AuditService auditService,
                              WebSocketPublisher webSocketPublisher) {
        this.fulfillmentPlanRepository = fulfillmentPlanRepository;
        this.fulfillmentSplitRepository = fulfillmentSplitRepository;
        this.warehouseRepository = warehouseRepository;
        this.warehouseStockRepository = warehouseStockRepository;
        this.productRepository = productRepository;
        this.quotationRepository = quotationRepository;
        this.splitOptimizer = splitOptimizer;
        this.auditService = auditService;
        this.webSocketPublisher = webSocketPublisher;
    }

    public List<Warehouse> getAllWarehouses() {
        return warehouseRepository.findAll();
    }

    public Optional<Warehouse> getWarehouseById(Long id) {
        return warehouseRepository.findById(id);
    }

    public Warehouse createWarehouse(Warehouse warehouse) {
        if (warehouse.getName() == null || warehouse.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Warehouse name is required");
        }
        if (warehouse.getLocation() == null || warehouse.getLocation().trim().isEmpty()) {
            warehouse.setLocation("General Facility");
        }
        if (warehouse.getBaseFreight() == null) {
            warehouse.setBaseFreight(BigDecimal.valueOf(20.00));
        }
        if (warehouse.getShippingCostWeight() == null) {
            warehouse.setShippingCostWeight(BigDecimal.ONE);
        }
        return warehouseRepository.save(warehouse);
    }

    public Warehouse updateWarehouse(Long id, Warehouse updated) {
        Warehouse wh = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found: " + id));
        if (updated.getName() != null) wh.setName(updated.getName().trim());
        if (updated.getLocation() != null) wh.setLocation(updated.getLocation().trim());
        if (updated.getBaseFreight() != null) wh.setBaseFreight(updated.getBaseFreight());
        if (updated.getShippingCostWeight() != null) wh.setShippingCostWeight(updated.getShippingCostWeight());
        return warehouseRepository.save(wh);
    }

    public void deleteWarehouse(Long id) {
        warehouseRepository.deleteById(id);
    }

    public List<WarehouseStock> getWarehouseStocks(Long warehouseId) {
        return warehouseStockRepository.findByWarehouseId(warehouseId);
    }

    public List<WarehouseStock> getAllStocks() {
        return warehouseStockRepository.findAll();
    }

    public WarehouseStock setStock(Long warehouseId, Long productId, int inStock, Integer reserved, Integer reorderLevel) {
        Warehouse wh = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found: " + warehouseId));
        Product prod = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        WarehouseStock stock = warehouseStockRepository.findByWarehouseIdAndProductId(warehouseId, productId)
                .orElseGet(() -> WarehouseStock.builder()
                        .warehouse(wh)
                        .product(prod)
                        .reserved(0)
                        .reorderLevel(reorderLevel != null ? reorderLevel : 10)
                        .build());

        stock.setInStock(inStock);
        stock.setReserved(reserved != null ? reserved : 0);
        stock.setAvailable(Math.max(0, inStock - stock.getReserved()));
        if (reorderLevel != null) {
            stock.setReorderLevel(reorderLevel);
        }
        return warehouseStockRepository.save(stock);
    }

    public FulfillmentPlan generateOrGetPlan(Long quotationId) {
        Optional<FulfillmentPlan> existing = fulfillmentPlanRepository.findByQuotationId(quotationId);
        if (existing.isPresent()) {
            return existing.get();
        }
        return generateOrRecomputePlan(quotationId);
    }

    public FulfillmentPlan generateOrRecomputePlan(Long quotationId) {
        Optional<FulfillmentPlan> existingOpt = fulfillmentPlanRepository.findByQuotationId(quotationId);
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found: " + quotationId));

        List<Warehouse> warehouses = warehouseRepository.findAll();
        List<WarehouseStock> allStocks = warehouseStockRepository.findAll();

        SplitOptimizer.OptimizationResult opt = splitOptimizer.optimizeFulfillment(quotation, warehouses, allStocks);

        FulfillmentPlan plan;
        if (existingOpt.isPresent()) {
            plan = existingOpt.get();
            fulfillmentSplitRepository.deleteAll(plan.getSplits());
            plan.getSplits().clear();
            plan.setStatus("SPLIT_PENDING");
            plan.setShipmentCount(opt.shipmentCount);
            plan.setTotalShippingCost(opt.totalShippingCost);
            plan.setUpdatedAt(LocalDateTime.now());
        } else {
            plan = FulfillmentPlan.builder()
                    .quotation(quotation)
                    .status("SPLIT_PENDING")
                    .shipmentCount(opt.shipmentCount)
                    .totalShippingCost(opt.totalShippingCost)
                    .build();
        }

        plan = fulfillmentPlanRepository.save(plan);

        for (FulfillmentSplit split : opt.splits) {
            split.setFulfillmentPlan(plan);
            split.setQuotationId(quotationId);
            fulfillmentSplitRepository.save(split);
            plan.getSplits().add(split);
        }

        auditService.log("FULFILLMENT", quotationId, "SPLIT_OPTIMIZED", "SplitOptimizer Engine",
                "PENDING", "SPLIT_PENDING", opt.summaryText, BigDecimal.ZERO);

        return plan;
    }

    public FulfillmentPlan acceptSuggestedPlan(Long planId) {
        FulfillmentPlan plan = fulfillmentPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + planId));

        plan.setStatus("FULFILLED");
        plan.setUpdatedAt(LocalDateTime.now());
        fulfillmentPlanRepository.save(plan);

        // Reserve stock in warehouses
        for (FulfillmentSplit split : plan.getSplits()) {
            if (!split.getIsBackorder()) {
                Optional<WarehouseStock> stockOpt = warehouseStockRepository
                        .findByWarehouseIdAndProductId(split.getWarehouse().getId(), split.getProduct().getId());
                if (stockOpt.isPresent()) {
                    WarehouseStock ws = stockOpt.get();
                    ws.setReserved(ws.getReserved() + split.getQuantity());
                    ws.setAvailable(Math.max(0, ws.getInStock() - ws.getReserved()));
                    warehouseStockRepository.save(ws);
                }
                split.setStatus("SHIPPED");
                fulfillmentSplitRepository.save(split);
            }
        }

        auditService.log("FULFILLMENT", plan.getQuotation().getId(), "SPLIT_ACCEPTED", "Finance / Ops User",
                "SPLIT_PENDING", "FULFILLED", "Suggested warehouse allocation confirmed and stock reserved", BigDecimal.ZERO);

        return plan;
    }

    public FulfillmentPlan manualOverride(Long planId, List<FulfillmentSplit> manualSplits, String reason) {
        FulfillmentPlan plan = fulfillmentPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + planId));

        fulfillmentSplitRepository.deleteAll(plan.getSplits());
        plan.getSplits().clear();

        Set<Long> whIds = new HashSet<>();
        BigDecimal totalCost = BigDecimal.ZERO;

        for (FulfillmentSplit s : manualSplits) {
            s.setFulfillmentPlan(plan);
            s.setQuotationId(plan.getQuotation().getId());
            fulfillmentSplitRepository.save(s);
            plan.getSplits().add(s);
            whIds.add(s.getWarehouse().getId());
            totalCost = totalCost.add(s.getEstimatedCost() != null ? s.getEstimatedCost() : BigDecimal.valueOf(30));
        }

        plan.setStatus("OVERRIDDEN");
        plan.setShipmentCount(Math.max(1, whIds.size()));
        plan.setTotalShippingCost(totalCost);
        plan.setUpdatedAt(LocalDateTime.now());
        fulfillmentPlanRepository.save(plan);

        auditService.log("FULFILLMENT", plan.getQuotation().getId(), "MANUAL_OVERRIDE", "Finance Officer",
                "SPLIT_PENDING", "OVERRIDDEN", "Manual warehouse allocation override: " + reason, BigDecimal.ZERO);

        return plan;
    }

    public Map<String, Object> addStock(Long warehouseId, Long productId, int quantityAdded) {
        WarehouseStock stock = warehouseStockRepository.findByWarehouseIdAndProductId(warehouseId, productId)
                .orElseThrow(() -> new RuntimeException("Stock record not found for wh: " + warehouseId + ", prod: " + productId));

        stock.setInStock(stock.getInStock() + quantityAdded);
        stock.setAvailable(stock.getInStock() - stock.getReserved());
        warehouseStockRepository.save(stock);

        // Check if there are active backorders for this product
        List<FulfillmentSplit> backorders = fulfillmentSplitRepository.findByIsBackorderTrueAndStatus("BACKORDERED");
        List<Map<String, Object>> affectedOrders = new ArrayList<>();

        for (FulfillmentSplit bo : backorders) {
            if (bo.getProduct().getId().equals(productId)) {
                affectedOrders.add(Map.of(
                        "splitId", bo.getId(),
                        "quotationId", bo.getQuotationId(),
                        "quantity", bo.getQuantity(),
                        "warehouseName", stock.getWarehouse().getName()
                ));
            }
        }

        boolean triggerPrompt = !affectedOrders.isEmpty();

        Map<String, Object> response = new HashMap<>();
        response.put("newStock", stock.getInStock());
        response.put("available", stock.getAvailable());
        response.put("consolidatePromptTriggered", triggerPrompt);
        response.put("affectedBackorders", affectedOrders);

        if (triggerPrompt) {
            response.put("promptMessage", String.format("Stock replenished at %s (+%d units). %d pending backorders can now be consolidated!",
                    stock.getWarehouse().getName(), quantityAdded, affectedOrders.size()));

            // Broadcast via WebSocket
            webSocketPublisher.publishDealHealthAlert(Map.of(
                    "type", "CONSOLIDATE_BACKORDER_PROMPT",
                    "warehouseId", warehouseId,
                    "productId", productId,
                    "quantityAdded", quantityAdded,
                    "message", response.get("promptMessage")
            ));
        }

        return response;
    }

    public FulfillmentSplit consolidateBackorder(Long splitId) {
        FulfillmentSplit split = fulfillmentSplitRepository.findById(splitId)
                .orElseThrow(() -> new RuntimeException("Split not found: " + splitId));

        split.setIsBackorder(false);
        split.setStatus("ALLOCATED");
        split.setShipmentGroup("CONSOLIDATED-SHIP-01");
        fulfillmentSplitRepository.save(split);

        auditService.log("FULFILLMENT", split.getQuotationId(), "BACKORDER_CONSOLIDATED", "System / Ops",
                "BACKORDERED", "ALLOCATED", "Backordered item consolidated into primary shipment post-replenishment", BigDecimal.ZERO);

        return split;
    }
}
