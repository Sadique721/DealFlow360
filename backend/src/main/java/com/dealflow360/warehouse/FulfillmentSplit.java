package com.dealflow360.warehouse;

import com.dealflow360.catalog.Product;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "fulfillment_splits")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FulfillmentSplit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fulfillment_plan_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private FulfillmentPlan fulfillmentPlan;

    @Column(name = "quotation_id", nullable = false)
    private Long quotationId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "is_backorder")
    @Builder.Default
    private Boolean isBackorder = false;

    @Column(name = "estimated_cost", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal estimatedCost = BigDecimal.ZERO;

    @Column(name = "shipment_group", length = 50)
    @Builder.Default
    private String shipmentGroup = "MAIN-SHIP-01";

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "ALLOCATED"; // ALLOCATED, SHIPPED, DELIVERED, BACKORDERED
}
