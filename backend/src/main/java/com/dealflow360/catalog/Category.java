package com.dealflow360.catalog;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "max_discount_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxDiscountPercent;

    @Column(name = "sensitivity_gamma", precision = 4, scale = 2)
    @Builder.Default
    private BigDecimal sensitivityGamma = BigDecimal.valueOf(1.00);

    @Column(length = 255)
    private String description;
}
