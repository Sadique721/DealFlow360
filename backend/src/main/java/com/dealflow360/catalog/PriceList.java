package com.dealflow360.catalog;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "price_lists")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_tier", nullable = false, length = 50)
    private String customerTier; // BRONZE, SILVER, GOLD

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "USD";

    @Column(name = "discount_adjustment_percent", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal discountAdjustmentPercent = BigDecimal.ZERO;
}
