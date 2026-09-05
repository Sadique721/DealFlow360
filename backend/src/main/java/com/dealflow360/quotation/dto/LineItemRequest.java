package com.dealflow360.quotation.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineItemRequest {
    private Long id; // null if new line
    private Long productId;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal discountPercent;
    private String lineType; // ONE_TIME, RECURRING
    private Long subscriptionPlanId;
}
