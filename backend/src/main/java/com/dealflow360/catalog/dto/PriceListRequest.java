package com.dealflow360.catalog.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceListRequest {
    private String customerTier; // BRONZE, SILVER, GOLD
    private String currency;
    private BigDecimal discountAdjustmentPercent;
}
