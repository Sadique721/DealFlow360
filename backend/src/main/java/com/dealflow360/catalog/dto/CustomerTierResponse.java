package com.dealflow360.catalog.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerTierResponse {

    private Long id;
    private String tierName;
    private BigDecimal maxDiscountPercent;
    private String description;
}
