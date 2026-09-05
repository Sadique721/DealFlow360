package com.dealflow360.warehouse;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "warehouses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Warehouse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name; // Main Warehouse, East Depot

    @Column(nullable = false, length = 150)
    private String location;

    @Column(name = "shipping_cost_weight", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal shippingCostWeight = BigDecimal.valueOf(1.00);

    @Column(name = "base_freight", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal baseFreight = BigDecimal.valueOf(20.00);
}
