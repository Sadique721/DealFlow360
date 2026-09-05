package com.dealflow360.catalog.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryResponse {
    private Long id;
    private String name;
    private BigDecimal maxDiscountPercent;
    private BigDecimal sensitivityGamma;
    private String description;
}
