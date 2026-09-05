package com.dealflow360.catalog.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceListResponse {
    private Long id;
    private String customerTier;
    private String currency;
    private BigDecimal discountAdjustmentPercent;
}
