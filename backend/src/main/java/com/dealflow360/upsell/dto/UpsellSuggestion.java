package com.dealflow360.upsell.dto;

import com.dealflow360.catalog.Product;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpsellSuggestion {
    private Long ruleId;
    private Product suggestedProduct;
    private BigDecimal coPurchaseScore;
    private Boolean isPromoted;
    private String promoTag;
    private BigDecimal promoDiscountPercent;
    private BigDecimal marginDelta;
    private BigDecimal simulatedNewMarginPercentage;
    private String rationale;
}
