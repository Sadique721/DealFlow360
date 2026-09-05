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

        // Index stocks by warehouseId:productId
        Map<String, WarehouseStock> stockMap = new HashMap<>();
        for (WarehouseStock stock : allStocks) {
            String key = stock.getWarehouse().getId() + ":" + stock.getProduct().getId();
            stockMap.put(key, stock);
        }

        // Sort warehouses by base freight * weight ascending
        warehouses.sort(Comparator.comparing(w ->
                w.getBaseFreight().multiply(w.getShippingCostWeight())));

        for (QuotationLine line : quotation.getLines()) {
            Product product = line.getProduct();

            // Skip non-physical items (e.g. pure consulting services or subscriptions without physical units)
            if (product.getIsSubscription() != null && product.getIsSubscription()) {
                continue;
            }
            if ("Services".equalsIgnoreCase(product.getCategory().getName())) {
                continue;
            }

            int requiredQty = line.getQuantity();
            int remainingQty = requiredQty;

            // 1. Check if any single warehouse can fulfill the full quantity
            Warehouse fullCoverageWarehouse = null;
            for (Warehouse wh : warehouses) {
                String key = wh.getId() + ":" + product.getId();
                WarehouseStock stock = stockMap.get(key);
                if (stock != null && stock.getAvailable() >= requiredQty) {
                    fullCoverageWarehouse = wh;
                    break;
                }
            }

            if (fullCoverageWarehouse != null) {
                // Fulfill entirely from this warehouse
                BigDecimal freight = fullCoverageWarehouse.getBaseFreight().multiply(fullCoverageWarehouse.getShippingCostWeight());
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
                for (Warehouse wh : warehouses) {
                    if (remainingQty <= 0) break;

                    String key = wh.getId() + ":" + product.getId();
                    WarehouseStock stock = stockMap.get(key);
                    if (stock != null && stock.getAvailable() > 0) {
                        int allocatable = Math.min(stock.getAvailable(), remainingQty);
                        BigDecimal freight = wh.getBaseFreight().multiply(wh.getShippingCostWeight());

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
                    Warehouse primaryWh = warehouses.get(0);

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
