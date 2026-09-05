package com.dealflow360.warehouse;

import com.dealflow360.catalog.Product;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class SplitOptimizer {

    public static class OptimizationResult {
        public List<FulfillmentSplit> splits = new ArrayList<>();
        public BigDecimal totalShippingCost = BigDecimal.ZERO;
        public int shipmentCount = 1;
        public boolean hasBackorder = false;
        public String summaryText;
    }

    public OptimizationResult optimizeFulfillment(Quotation quotation,
                                                  List<Warehouse> warehouses,
                                                  List<WarehouseStock> allStocks) {
        OptimizationResult result = new OptimizationResult();
        Set<Long> utilizedWarehouseIds = new HashSet<>();
        BigDecimal totalCost = BigDecimal.ZERO;

        if (warehouses == null || warehouses.isEmpty() || quotation.getLines() == null || quotation.getLines().isEmpty()) {
            return result;
        }

        // Defensive copy and sort warehouses by base freight * weight ascending
        List<Warehouse> sortedWarehouses = new ArrayList<>(warehouses);
        sortedWarehouses.sort(Comparator.comparing(w ->
                (w.getBaseFreight() != null ? w.getBaseFreight() : BigDecimal.valueOf(20.00))
                        .multiply(w.getShippingCostWeight() != null ? w.getShippingCostWeight() : BigDecimal.ONE)));

        // Index available stock dynamically: warehouseId:productId -> available count
        Map<String, Integer> availableMap = new HashMap<>();
        for (WarehouseStock stock : allStocks) {
            String key = stock.getWarehouse().getId() + ":" + stock.getProduct().getId();
            availableMap.put(key, stock.getAvailable() != null ? stock.getAvailable() : 0);
        }

        for (QuotationLine line : quotation.getLines()) {
            Product product = line.getProduct();

            // Skip non-physical items (e.g. pure consulting services or subscriptions without physical units)
            if (product.getIsSubscription() != null && product.getIsSubscription()) {
                continue;
            }
            if (product.getCategory() != null && "Services".equalsIgnoreCase(product.getCategory().getName())) {
                continue;
            }

            int requiredQty = line.getQuantity() != null && line.getQuantity() > 0 ? line.getQuantity() : 1;
            int remainingQty = requiredQty;

            // 1. Check if any single warehouse can fulfill the full quantity
            Warehouse fullCoverageWarehouse = null;
            for (Warehouse wh : sortedWarehouses) {
                String key = wh.getId() + ":" + product.getId();
                int avail = availableMap.getOrDefault(key, 0);
                if (avail >= requiredQty) {
                    fullCoverageWarehouse = wh;
                    break;
                }
            }

            if (fullCoverageWarehouse != null) {
                // Fulfill entirely from this warehouse
                String key = fullCoverageWarehouse.getId() + ":" + product.getId();
                availableMap.put(key, availableMap.get(key) - requiredQty);

                BigDecimal baseFreight = fullCoverageWarehouse.getBaseFreight() != null ? fullCoverageWarehouse.getBaseFreight() : BigDecimal.valueOf(20.00);
                BigDecimal weight = fullCoverageWarehouse.getShippingCostWeight() != null ? fullCoverageWarehouse.getShippingCostWeight() : BigDecimal.ONE;
                BigDecimal freight = baseFreight.multiply(weight);

                FulfillmentSplit split = FulfillmentSplit.builder()
                        .quotationId(quotation.getId())
                        .warehouse(fullCoverageWarehouse)
                        .product(product)
                        .quantity(requiredQty)
                        .isBackorder(false)
                        .estimatedCost(freight.setScale(2, RoundingMode.HALF_UP))
                        .shipmentGroup("SHIP-" + fullCoverageWarehouse.getName().replace(" ", "-").toUpperCase())
                        .status("ALLOCATED")
                        .build();

                result.splits.add(split);
                utilizedWarehouseIds.add(fullCoverageWarehouse.getId());
            } else {
                // Greedily split across candidate warehouses sorted by freight cost
                for (Warehouse wh : sortedWarehouses) {
                    if (remainingQty <= 0) break;

                    String key = wh.getId() + ":" + product.getId();
                    int avail = availableMap.getOrDefault(key, 0);
                    if (avail > 0) {
                        int allocatable = Math.min(avail, remainingQty);
                        availableMap.put(key, avail - allocatable);

                        BigDecimal baseFreight = wh.getBaseFreight() != null ? wh.getBaseFreight() : BigDecimal.valueOf(20.00);
                        BigDecimal weight = wh.getShippingCostWeight() != null ? wh.getShippingCostWeight() : BigDecimal.ONE;
                        BigDecimal freight = baseFreight.multiply(weight);

                        FulfillmentSplit split = FulfillmentSplit.builder()
                                .quotationId(quotation.getId())
                                .warehouse(wh)
                                .product(product)
                                .quantity(allocatable)
                                .isBackorder(false)
                                .estimatedCost(freight.setScale(2, RoundingMode.HALF_UP))
                                .shipmentGroup("SHIP-" + wh.getName().replace(" ", "-").toUpperCase())
                                .status("ALLOCATED")
                                .build();

                        result.splits.add(split);
                        utilizedWarehouseIds.add(wh.getId());
                        remainingQty -= allocatable;
                    }
                }

                // If stock is exhausted across all warehouses, create a backorder split
                if (remainingQty > 0) {
                    result.hasBackorder = true;
                    Warehouse primaryWh = sortedWarehouses.get(0);

                    FulfillmentSplit backorderSplit = FulfillmentSplit.builder()
                            .quotationId(quotation.getId())
                            .warehouse(primaryWh)
                            .product(product)
                            .quantity(remainingQty)
                            .isBackorder(true)
                            .estimatedCost(BigDecimal.ZERO)
                            .shipmentGroup("BACKORDER-" + primaryWh.getName().replace(" ", "-").toUpperCase())
                            .status("BACKORDERED")
                            .build();

                    result.splits.add(backorderSplit);
                }
            }
        }

        // Calculate total freight across utilized warehouses
        for (Warehouse wh : warehouses) {
            if (utilizedWarehouseIds.contains(wh.getId())) {
                totalCost = totalCost.add(wh.getBaseFreight().multiply(wh.getShippingCostWeight()));
            }
        }

        result.shipmentCount = Math.max(1, utilizedWarehouseIds.size());
        result.totalShippingCost = totalCost.setScale(2, RoundingMode.HALF_UP);

        if (utilizedWarehouseIds.size() > 1) {
            result.summaryText = String.format("Greedy Split Optimizer: Stock distributed across %d warehouses (%d shipments) to minimize shipping cost ($%.2f total freight).",
                    utilizedWarehouseIds.size(), result.shipmentCount, result.totalShippingCost.doubleValue());
        } else {
            result.summaryText = String.format("Single Warehouse Fulfillment: Entire order consolidated to 1 warehouse (0 split shipments). Freight: $%.2f.",
                    result.totalShippingCost.doubleValue());
        }

        if (result.hasBackorder) {
            result.summaryText += " Partial stock exhausted - Backorder created for remaining units.";
        }

        return result;
    }
}
