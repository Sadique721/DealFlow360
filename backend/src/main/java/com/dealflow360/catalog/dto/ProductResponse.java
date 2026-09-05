package com.dealflow360.catalog.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductResponse {
    private Long id;
    private String name;
    private Long categoryId;
    private String categoryName;
    private BigDecimal categoryMaxDiscount;
    private BigDecimal basePrice;
    private BigDecimal costPrice;
    private BigDecimal marginPercent;
    private String unitOfMeasure;
    private BigDecimal taxPercentage;
    private Boolean isSubscription;
    private String recurringInterval;
    private Integer stockOnHand;
    private Boolean active;
    private String description;
    private LocalDateTime createdAt;
}
