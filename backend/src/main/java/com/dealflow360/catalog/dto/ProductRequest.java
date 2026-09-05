package com.dealflow360.catalog.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRequest {
    private String name;
    private Long categoryId;
    private BigDecimal basePrice;
    private BigDecimal costPrice;
    private String unitOfMeasure;
    private BigDecimal taxPercentage;
    private Boolean isSubscription;
    private String recurringInterval; // MONTHLY, QUARTERLY, YEARLY
    private Integer stockOnHand;
    private Boolean active;
    private String description;
}
