package com.dealflow360.discount;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineOverageDetail {
    private Long lineId;
    private Long productId;
    private String productName;
    private String categoryName;
    private BigDecimal customerTierCeiling;
    private BigDecimal categoryCeiling;
    private BigDecimal effectiveCeiling;
    private BigDecimal discountGiven;
    private BigDecimal overagePoints;
    private BigDecimal lineTotal;
    private BigDecimal lineWeightPercentage;
    private BigDecimal gammaMultiplier;
    private BigDecimal riskContribution;
    private Boolean isCulprit;
    private String statusText; // "OK" or "OVER (+X.X pt)"
}
