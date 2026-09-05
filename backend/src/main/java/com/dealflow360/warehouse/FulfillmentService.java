package com.dealflow360.warehouse;

import com.dealflow360.audit.AuditService;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.websocket.WebSocketPublisher;
import com.dealflow360.catalog.Product;
import com.dealflow360.catalog.ProductRepository;
import com.dealflow360.config.ConflictException;
import com.dealflow360.warehouse.dto.InventoryRequest;
import com.dealflow360.warehouse.dto.ManualSplitRequest;
import com.dealflow360.quotation.QuotationLine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
        return warehouseRepository.findAllOrderByNewestFirst();
    }

    public Optional<Warehouse> getWarehouseById(Long id) {
        return warehouseRepository.findById(id);
    }

    public Warehouse createWarehouse(Warehouse warehouse) {
        if (warehouse.getName() == null || warehouse.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Warehouse name is required");
        }
        String cleanName = warehouse.getName().trim();
        if (warehouseRepository.existsByName(cleanName)) {
            throw new ConflictException("Warehouse name already exists: " + cleanName);
        }
        warehouse.setName(cleanName);

        String code = warehouse.getWarehouseCode();
        if (code != null && !code.trim().isEmpty()) {
            code = code.trim().toUpperCase();
            if (warehouseRepository.existsByWarehouseCode(code)) {
                throw new ConflictException("Warehouse code already exists: " + code);
            }
            warehouse.setWarehouseCode(code);
        } else {
            warehouse.setWarehouseCode("WH-" + (System.currentTimeMillis() % 10000));
        }

        if (warehouse.getLocation() == null || warehouse.getLocation().trim().isEmpty()) {
            warehouse.setLocation("General Facility");
        } else {
            warehouse.setLocation(warehouse.getLocation().trim());
        }

        if (warehouse.getStatus() == null || warehouse.getStatus().trim().isEmpty()) {
            warehouse.setStatus("ACTIVE");
        } else {
            warehouse.setStatus(warehouse.getStatus().trim().toUpperCase());
        }

        if (warehouse.getBaseFreight() == null) {
            warehouse.setBaseFreight(BigDecimal.valueOf(20.00));
        }
        if (warehouse.getShippingCostWeight() == null) {
            warehouse.setShippingCostWeight(BigDecimal.ONE);
        } else if (warehouse.getShippingCostWeight().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Shipping cost weight must be greater than 0");
        }

        return warehouseRepository.save(warehouse);
    }

    public Warehouse updateWarehouse(Long id, Warehouse updated) {
        Warehouse wh = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found: " + id));

        if (updated.getName() != null && !updated.getName().trim().isEmpty()) {
            String newName = updated.getName().trim();
            if (!newName.equalsIgnoreCase(wh.getName()) && warehouseRepository.existsByName(newName)) {
                throw new ConflictException("Warehouse name already exists: " + newName);
            }
            wh.setName(newName);
        }

        String newCode = updated.getWarehouseCode();
        if (newCode != null && !newCode.trim().isEmpty()) {
            newCode = newCode.trim().toUpperCase();
            if (!newCode.equalsIgnoreCase(wh.getWarehouseCode()) && warehouseRepository.existsByWarehouseCode(newCode)) {
                throw new ConflictException("Warehouse code already exists: " + newCode);
            }
            wh.setWarehouseCode(newCode);
        }

        if (updated.getLocation() != null && !updated.getLocation().trim().isEmpty()) {
            wh.setLocation(updated.getLocation().trim());
        }
        if (updated.getStatus() != null && !updated.getStatus().trim().isEmpty()) {
            wh.setStatus(updated.getStatus().trim().toUpperCase());
        }
        if (updated.getBaseFreight() != null) {
            wh.setBaseFreight(updated.getBaseFreight());
        }
        if (updated.getShippingCostWeight() != null) {
            if (updated.getShippingCostWeight().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Shipping cost weight must be greater than 0");
            }
            wh.setShippingCostWeight(updated.getShippingCostWeight());
        }
        return warehouseRepository.save(wh);
    }

    public void deleteWarehouse(Long id) {
        Warehouse wh = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found: " + id));

        List<WarehouseStock> stocks = warehouseStockRepository.findByWarehouseId(id);
        int totalReserved = stocks.stream().mapToInt(WarehouseStock::getReserved).sum();
        if (totalReserved > 0) {
            throw new ConflictException("Cannot delete warehouse: " + totalReserved + " units are currently reserved for pending orders.");
        }

        List<FulfillmentSplit> activeSplits = fulfillmentSplitRepository.findByIsBackorderTrueAndStatus("BACKORDERED");
        boolean hasAllocations = activeSplits.stream().anyMatch(s -> s.getWarehouse() != null && s.getWarehouse().getId().equals(id));
        if (hasAllocations) {
            throw new ConflictException("Cannot delete warehouse: Active backorder splits are assigned to this warehouse.");
        }

        warehouseRepository.delete(wh);
    }

    public List<WarehouseStock> getWarehouseStocks(Long warehouseId) {
        return warehouseStockRepository.findByWarehouseIdNewestFirst(warehouseId);
    }

    public List<WarehouseStock> getAllStocks() {
        return warehouseStockRepository.findAll();
    }

    public WarehouseStock createInventory(InventoryRequest req) {
        if (req.getWarehouseId() == null) {
            throw new IllegalArgumentException("Warehouse ID is required");
        }
        if (req.getProductId() == null) {
            throw new IllegalArgumentException("Product ID is required");
        }

        Warehouse wh = warehouseRepository.findById(req.getWarehouseId())
                .orElseThrow(() -> new RuntimeException("Warehouse not found: " + req.getWarehouseId()));
        Product prod = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + req.getProductId()));

        if (warehouseStockRepository.existsByWarehouseIdAndProductId(req.getWarehouseId(), req.getProductId())) {
            throw new ConflictException("Product '" + prod.getName() + "' already exists in warehouse '" + wh.getName() + "'. Use Edit to adjust inventory.");
        }

        int inStock = req.getInStock() != null ? Math.max(0, req.getInStock()) : 0;
        int reserved = req.getReserved() != null ? Math.max(0, req.getReserved()) : 0;
        if (reserved > inStock) {
            throw new IllegalArgumentException("Reserved quantity (" + reserved + ") cannot exceed in-stock quantity (" + inStock + ")");
        }
        int reorderLevel = req.getReorderLevel() != null ? Math.max(0, req.getReorderLevel()) : 10;

        WarehouseStock stock = WarehouseStock.builder()
                .warehouse(wh)
                .product(prod)
                .inStock(inStock)
                .reserved(reserved)
                .available(inStock - reserved)
                .reorderLevel(reorderLevel)
                .build();

        return warehouseStockRepository.save(stock);
    }

    public WarehouseStock updateInventory(Long stockId, InventoryRequest req) {
        WarehouseStock stock = warehouseStockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Inventory record not found: " + stockId));

        if (req.getInStock() != null) {
            stock.setInStock(Math.max(0, req.getInStock()));
        }
        if (req.getReserved() != null) {
            stock.setReserved(Math.max(0, req.getReserved()));
        }
        if (stock.getReserved() > stock.getInStock()) {
            throw new IllegalArgumentException("Reserved quantity (" + stock.getReserved() + ") cannot exceed in-stock quantity (" + stock.getInStock() + ")");
        }
        stock.setAvailable(Math.max(0, stock.getInStock() - stock.getReserved()));

        if (req.getReorderLevel() != null) {
            stock.setReorderLevel(Math.max(0, req.getReorderLevel()));
        }

        return warehouseStockRepository.save(stock);
    }

    public void deleteInventory(Long stockId) {
        WarehouseStock stock = warehouseStockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Inventory record not found: " + stockId));

        if (stock.getReserved() != null && stock.getReserved() > 0) {
            throw new ConflictException("Cannot delete inventory: " + stock.getReserved() + " units are currently reserved for pending orders.");
        }

        warehouseStockRepository.delete(stock);
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

    public List<FulfillmentPlan> getAllPlans() {
        return fulfillmentPlanRepository.findAllByOrderByCreatedAtDesc();
    }

    public FulfillmentPlan getPlanById(Long planId) {
        return fulfillmentPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Fulfillment plan not found: " + planId));
    }

    public Optional<FulfillmentPlan> findPlanByQuotationId(Long quotationId) {
        return fulfillmentPlanRepository.findByQuotationId(quotationId);
    }

    public FulfillmentPlan generateOrGetPlan(Long quotationId) {
        Optional<FulfillmentPlan> existing = fulfillmentPlanRepository.findByQuotationId(quotationId);
        if (existing.isPresent()) {
            return existing.get();
        }
        return generateOrRecomputePlan(quotationId);
    }

    public FulfillmentPlan generateOrRecomputePlan(Long quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found: " + quotationId));

        String qStatus = quotation.getStatus() != null ? quotation.getStatus().toUpperCase() : "";
        if (!"APPROVED".equals(qStatus) && !"CONFIRMED".equals(qStatus) && !"FULFILLED".equals(qStatus)) {
            throw new IllegalArgumentException("Fulfillment can only be generated for approved or confirmed quotations. Current quotation status is " + quotation.getStatus());
        }

        Optional<FulfillmentPlan> existingOpt = fulfillmentPlanRepository.findByQuotationId(quotationId);
        List<Warehouse> warehouses = warehouseRepository.findAll();
        List<WarehouseStock> allStocks = warehouseStockRepository.findAll();

        SplitOptimizer.OptimizationResult opt = splitOptimizer.optimizeFulfillment(quotation, warehouses, allStocks);

        String initialStatus = opt.hasBackorder ? "PARTIALLY_FULFILLED" : "ALLOCATION_SUGGESTED";

        FulfillmentPlan plan;
        if (existingOpt.isPresent()) {
            plan = existingOpt.get();
            fulfillmentSplitRepository.deleteAll(plan.getSplits());
            plan.getSplits().clear();
            plan.setStatus(initialStatus);
            plan.setShipmentCount(opt.shipmentCount);
            plan.setTotalShippingCost(opt.totalShippingCost);
            plan.setUpdatedAt(LocalDateTime.now());
        } else {
            plan = FulfillmentPlan.builder()
                    .quotation(quotation)
                    .status(initialStatus)
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
                "PENDING", initialStatus, opt.summaryText, BigDecimal.ZERO);

        return plan;
    }

    public FulfillmentPlan acceptSuggestedPlan(Long planId) {
        FulfillmentPlan plan = fulfillmentPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Fulfillment plan not found: " + planId));

        // CRITICAL REQUIREMENT: Re-verify live available stock right before accepting/reserving
        for (FulfillmentSplit split : plan.getSplits()) {
            if (!Boolean.TRUE.equals(split.getIsBackorder())) {
                WarehouseStock ws = warehouseStockRepository
                        .findByWarehouseIdAndProductId(split.getWarehouse().getId(), split.getProduct().getId())
                        .orElseThrow(() -> new ConflictException("Inventory record not found for product '"
                                + split.getProduct().getName() + "' at warehouse '" + split.getWarehouse().getName() + "'."));

                int available = ws.getAvailable() != null ? ws.getAvailable() : (ws.getInStock() - (ws.getReserved() != null ? ws.getReserved() : 0));
                if (available < split.getQuantity()) {
                    throw new ConflictException("Stock changed: Warehouse '" + ws.getWarehouse().getName()
                            + "' currently only has " + available + " available for '" + ws.getProduct().getName()
                            + "' (allocation requires " + split.getQuantity() + "). Please recalculate the warehouse split.");
                }
            }
        }

        // Live inventory is guaranteed available - transactionally reserve stock
        boolean hasBackorder = false;
        for (FulfillmentSplit split : plan.getSplits()) {
            if (!Boolean.TRUE.equals(split.getIsBackorder())) {
                WarehouseStock ws = warehouseStockRepository
                        .findByWarehouseIdAndProductId(split.getWarehouse().getId(), split.getProduct().getId())
                        .get();
                int curReserved = ws.getReserved() != null ? ws.getReserved() : 0;
                ws.setReserved(curReserved + split.getQuantity());
                ws.setAvailable(Math.max(0, ws.getInStock() - ws.getReserved()));
                warehouseStockRepository.save(ws);

                split.setStatus("SHIPPED");
                fulfillmentSplitRepository.save(split);
            } else {
                hasBackorder = true;
                split.setStatus("BACKORDERED");
                fulfillmentSplitRepository.save(split);
            }
        }

        plan.setStatus(hasBackorder ? "PARTIALLY_FULFILLED" : "FULFILLED");
        plan.setUpdatedAt(LocalDateTime.now());
        fulfillmentPlanRepository.save(plan);

        // Transition quotation to CONFIRMED / FULFILLED if currently APPROVED
        Quotation quotation = plan.getQuotation();
        if (quotation != null && "APPROVED".equalsIgnoreCase(quotation.getStatus())) {
            quotation.setStatus(hasBackorder ? "CONFIRMED" : "FULFILLED");
            quotation.setLastActivityAt(LocalDateTime.now());
            quotationRepository.save(quotation);
        }

        auditService.log("FULFILLMENT", plan.getQuotation().getId(), "SPLIT_ACCEPTED", "Finance / Ops User",
                "ALLOCATION_SUGGESTED", plan.getStatus(), "Suggested warehouse allocation confirmed and stock reserved", BigDecimal.ZERO);

        return plan;
    }

    public FulfillmentPlan manualOverride(Long planId, List<ManualSplitRequest> manualSplits, String reason) {
        FulfillmentPlan plan = fulfillmentPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Fulfillment plan not found: " + planId));

        if (manualSplits == null || manualSplits.isEmpty()) {
            throw new IllegalArgumentException("Manual allocation splits cannot be empty");
        }

        // Release any existing reservations if this plan was already fulfilled/allocated
        if ("FULFILLED".equalsIgnoreCase(plan.getStatus()) || "ALLOCATED".equalsIgnoreCase(plan.getStatus()) || "PARTIALLY_FULFILLED".equalsIgnoreCase(plan.getStatus())) {
            for (FulfillmentSplit s : plan.getSplits()) {
                if (!Boolean.TRUE.equals(s.getIsBackorder()) && s.getWarehouse() != null && s.getProduct() != null) {
                    warehouseStockRepository.findByWarehouseIdAndProductId(s.getWarehouse().getId(), s.getProduct().getId())
                            .ifPresent(ws -> {
                                int curReserved = ws.getReserved() != null ? ws.getReserved() : 0;
                                ws.setReserved(Math.max(0, curReserved - s.getQuantity()));
                                ws.setAvailable(Math.max(0, ws.getInStock() - ws.getReserved()));
                                warehouseStockRepository.save(ws);
                            });
                }
            }
        }

        List<FulfillmentSplit> newSplits = new ArrayList<>();
        Set<Long> whIds = new HashSet<>();
        BigDecimal totalCost = BigDecimal.ZERO;
        boolean hasBackorder = false;
        Map<Long, Integer> allocatedPerProduct = new HashMap<>();

        for (ManualSplitRequest req : manualSplits) {
            if (req.getProductId() == null) {
                throw new IllegalArgumentException("Product ID is required for each split");
            }
            if (req.getQuantity() == null || req.getQuantity() < 0) {
                throw new IllegalArgumentException("Allocation quantity cannot be negative");
            }
            if (req.getQuantity() == 0) {
                continue;
            }

            Product prod = productRepository.findById(req.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + req.getProductId()));

            Warehouse wh;
            if (Boolean.TRUE.equals(req.getIsBackorder())) {
                hasBackorder = true;
                wh = req.getWarehouseId() != null
                        ? warehouseRepository.findById(req.getWarehouseId()).orElseGet(() -> warehouseRepository.findAll().get(0))
                        : warehouseRepository.findAll().get(0);

                FulfillmentSplit split = FulfillmentSplit.builder()
                        .fulfillmentPlan(plan)
                        .quotationId(plan.getQuotation().getId())
                        .warehouse(wh)
                        .product(prod)
                        .quantity(req.getQuantity())
                        .isBackorder(true)
                        .estimatedCost(BigDecimal.ZERO)
                        .shipmentGroup("BACKORDER-" + wh.getName().replace(" ", "-").toUpperCase())
                        .status("BACKORDERED")
                        .build();
                newSplits.add(split);
            } else {
                if (req.getWarehouseId() == null) {
                    throw new IllegalArgumentException("Warehouse ID is required for non-backorder splits");
                }
                wh = warehouseRepository.findById(req.getWarehouseId())
                        .orElseThrow(() -> new RuntimeException("Warehouse not found: " + req.getWarehouseId()));

                WarehouseStock ws = warehouseStockRepository.findByWarehouseIdAndProductId(wh.getId(), prod.getId())
                        .orElseThrow(() -> new ConflictException("No stock record exists for '" + prod.getName() + "' at warehouse '" + wh.getName() + "'"));

                int available = ws.getAvailable() != null ? ws.getAvailable() : (ws.getInStock() - (ws.getReserved() != null ? ws.getReserved() : 0));
                if (available < req.getQuantity()) {
                    throw new ConflictException("Insufficient available stock at '" + wh.getName() + "' for '" + prod.getName()
                            + "'. Requested: " + req.getQuantity() + ", Available: " + available);
                }

                // Reserve immediately
                int curReserved = ws.getReserved() != null ? ws.getReserved() : 0;
                ws.setReserved(curReserved + req.getQuantity());
                ws.setAvailable(Math.max(0, ws.getInStock() - ws.getReserved()));
                warehouseStockRepository.save(ws);

                BigDecimal baseFreight = wh.getBaseFreight() != null ? wh.getBaseFreight() : BigDecimal.valueOf(20.00);
                BigDecimal weight = wh.getShippingCostWeight() != null ? wh.getShippingCostWeight() : BigDecimal.ONE;
                BigDecimal freight = baseFreight.multiply(weight).setScale(2, RoundingMode.HALF_UP);

                FulfillmentSplit split = FulfillmentSplit.builder()
                        .fulfillmentPlan(plan)
                        .quotationId(plan.getQuotation().getId())
                        .warehouse(wh)
                        .product(prod)
                        .quantity(req.getQuantity())
                        .isBackorder(false)
                        .estimatedCost(freight)
                        .shipmentGroup("SHIP-" + wh.getName().replace(" ", "-").toUpperCase())
                        .status("ALLOCATED")
                        .build();
                newSplits.add(split);
                whIds.add(wh.getId());
                totalCost = totalCost.add(freight);
            }

            allocatedPerProduct.put(prod.getId(), allocatedPerProduct.getOrDefault(prod.getId(), 0) + req.getQuantity());
        }

        // Validate allocation limits against quotation lines
        for (QuotationLine line : plan.getQuotation().getLines()) {
            if (line.getProduct() == null) continue;
            if (Boolean.TRUE.equals(line.getProduct().getIsSubscription())) continue;
            if (line.getProduct().getCategory() != null && "Services".equalsIgnoreCase(line.getProduct().getCategory().getName())) continue;

            int required = line.getQuantity() != null ? line.getQuantity() : 1;
            int allocated = allocatedPerProduct.getOrDefault(line.getProduct().getId(), 0);
            if (allocated > required) {
                throw new IllegalArgumentException("Total allocation for product '" + line.getProduct().getName()
                        + "' (" + allocated + ") exceeds requested quotation quantity (" + required + ")");
            } else if (allocated < required) {
                Warehouse defaultWh = !whIds.isEmpty() ? warehouseRepository.findById(whIds.iterator().next()).orElseGet(() -> warehouseRepository.findAll().get(0)) : warehouseRepository.findAll().get(0);
                int deficit = required - allocated;
                hasBackorder = true;
                FulfillmentSplit boSplit = FulfillmentSplit.builder()
                        .fulfillmentPlan(plan)
                        .quotationId(plan.getQuotation().getId())
                        .warehouse(defaultWh)
                        .product(line.getProduct())
                        .quantity(deficit)
                        .isBackorder(true)
                        .estimatedCost(BigDecimal.ZERO)
                        .shipmentGroup("BACKORDER-" + defaultWh.getName().replace(" ", "-").toUpperCase())
                        .status("BACKORDERED")
                        .build();
                newSplits.add(boSplit);
            }
        }

        fulfillmentSplitRepository.deleteAll(plan.getSplits());
        plan.getSplits().clear();

        for (FulfillmentSplit s : newSplits) {
            fulfillmentSplitRepository.save(s);
            plan.getSplits().add(s);
        }

        plan.setStatus(hasBackorder ? "PARTIALLY_FULFILLED" : "OVERRIDDEN");
        plan.setShipmentCount(Math.max(1, whIds.size()));
        plan.setTotalShippingCost(totalCost);
        plan.setUpdatedAt(LocalDateTime.now());
        fulfillmentPlanRepository.save(plan);

        auditService.log("FULFILLMENT", plan.getQuotation().getId(), "MANUAL_OVERRIDE", "Finance Officer",
                "ALLOCATION_SUGGESTED", plan.getStatus(), "Manual warehouse allocation override: " + reason, BigDecimal.ZERO);

        return plan;
    }

    public FulfillmentPlan reEvaluateBackorders(Long planId) {
        FulfillmentPlan plan = fulfillmentPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Fulfillment plan not found: " + planId));

        List<FulfillmentSplit> backorders = fulfillmentSplitRepository.findByFulfillmentPlanIdAndIsBackorderTrue(planId);
        if (backorders.isEmpty()) {
            return plan;
        }

        List<Warehouse> warehouses = warehouseRepository.findAll();
        warehouses.sort(Comparator.comparing(w ->
                (w.getBaseFreight() != null ? w.getBaseFreight() : BigDecimal.valueOf(20.00))
                        .multiply(w.getShippingCostWeight() != null ? w.getShippingCostWeight() : BigDecimal.ONE)));

        boolean anyAllocated = false;

        for (FulfillmentSplit boSplit : new ArrayList<>(backorders)) {
            Long productId = boSplit.getProduct().getId();
            int remainingBackorder = boSplit.getQuantity();

            for (Warehouse wh : warehouses) {
                if (remainingBackorder <= 0) break;

                Optional<WarehouseStock> stockOpt = warehouseStockRepository.findByWarehouseIdAndProductId(wh.getId(), productId);
                if (stockOpt.isPresent()) {
                    WarehouseStock ws = stockOpt.get();
                    int avail = ws.getAvailable() != null ? ws.getAvailable() : (ws.getInStock() - (ws.getReserved() != null ? ws.getReserved() : 0));
                    if (avail > 0) {
                        int toAllocate = Math.min(avail, remainingBackorder);
                        int curReserved = ws.getReserved() != null ? ws.getReserved() : 0;
                        ws.setReserved(curReserved + toAllocate);
                        ws.setAvailable(Math.max(0, ws.getInStock() - ws.getReserved()));
                        warehouseStockRepository.save(ws);

                        BigDecimal baseFreight = wh.getBaseFreight() != null ? wh.getBaseFreight() : BigDecimal.valueOf(20.00);
                        BigDecimal weight = wh.getShippingCostWeight() != null ? wh.getShippingCostWeight() : BigDecimal.ONE;
                        BigDecimal freight = baseFreight.multiply(weight).setScale(2, RoundingMode.HALF_UP);

                        Optional<FulfillmentSplit> existingAlloc = plan.getSplits().stream()
                                .filter(s -> !Boolean.TRUE.equals(s.getIsBackorder())
                                        && s.getWarehouse().getId().equals(wh.getId())
                                        && s.getProduct().getId().equals(productId))
                                .findFirst();

                        if (existingAlloc.isPresent()) {
                            FulfillmentSplit exist = existingAlloc.get();
                            exist.setQuantity(exist.getQuantity() + toAllocate);
                            fulfillmentSplitRepository.save(exist);
                        } else {
                            FulfillmentSplit newSplit = FulfillmentSplit.builder()
                                    .fulfillmentPlan(plan)
                                    .quotationId(plan.getQuotation().getId())
                                    .warehouse(wh)
                                    .product(boSplit.getProduct())
                                    .quantity(toAllocate)
                                    .isBackorder(false)
                                    .estimatedCost(freight)
                                    .shipmentGroup("SHIP-" + wh.getName().replace(" ", "-").toUpperCase())
                                    .status("ALLOCATED")
                                    .build();
                            fulfillmentSplitRepository.save(newSplit);
                            plan.getSplits().add(newSplit);
                        }

                        remainingBackorder -= toAllocate;
                        anyAllocated = true;
                    }
                }
            }

            if (remainingBackorder <= 0) {
                plan.getSplits().remove(boSplit);
                fulfillmentSplitRepository.delete(boSplit);
            } else {
                boSplit.setQuantity(remainingBackorder);
                fulfillmentSplitRepository.save(boSplit);
            }
        }

        if (anyAllocated) {
            Set<Long> utilizedWhs = new HashSet<>();
            BigDecimal totalCost = BigDecimal.ZERO;
            for (FulfillmentSplit s : plan.getSplits()) {
                if (!Boolean.TRUE.equals(s.getIsBackorder()) && s.getWarehouse() != null) {
                    utilizedWhs.add(s.getWarehouse().getId());
                    totalCost = totalCost.add(s.getEstimatedCost() != null ? s.getEstimatedCost() : BigDecimal.ZERO);
                }
            }

            boolean remainingBackordersExist = plan.getSplits().stream().anyMatch(s -> Boolean.TRUE.equals(s.getIsBackorder()));
            plan.setStatus(remainingBackordersExist ? "PARTIALLY_FULFILLED" : "FULFILLED");
            plan.setShipmentCount(Math.max(1, utilizedWhs.size()));
            plan.setTotalShippingCost(totalCost);
            plan.setUpdatedAt(LocalDateTime.now());
            fulfillmentPlanRepository.save(plan);

            auditService.log("FULFILLMENT", plan.getQuotation().getId(), "BACKORDER_REEVALUATED", "System / Ops",
                    "BACKORDERED", plan.getStatus(), "Backorders re-evaluated and allocated from replenished warehouse stock", BigDecimal.ZERO);
        }

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
