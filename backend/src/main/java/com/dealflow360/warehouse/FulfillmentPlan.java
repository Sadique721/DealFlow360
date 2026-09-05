package com.dealflow360.warehouse;

import com.dealflow360.quotation.Quotation;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "fulfillment_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FulfillmentPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "quotation_id", nullable = false, unique = true)
    private Quotation quotation;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SPLIT_PENDING, FULFILLED, OVERRIDDEN

    @Column(name = "total_shipping_cost", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalShippingCost = BigDecimal.ZERO;

    @Column(name = "shipment_count")
    @Builder.Default
    private Integer shipmentCount = 1;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "fulfillmentPlan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<FulfillmentSplit> splits = new ArrayList<>();
}
