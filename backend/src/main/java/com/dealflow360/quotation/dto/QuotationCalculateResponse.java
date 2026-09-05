package com.dealflow360.quotation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuotationCalculateResponse {
    private BigDecimal subtotalAmount;
    private BigDecimal totalDiscountAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private BigDecimal totalCost;
    private BigDecimal totalMarginAmount;
    private BigDecimal marginPercentage;
    private BigDecimal blendedRiskScore;
    private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL
    private Boolean requiresApproval;
    private Boolean requiresFinance;
    private String explanation;
    private List<CalculatedLineResponse> lines;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CalculatedLineResponse {
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal costPrice;
        private BigDecimal discountPercent;
        private BigDecimal discountAmount;
        private BigDecimal netPrice;
        private BigDecimal taxPercent;
        private BigDecimal taxAmount;
        private BigDecimal lineTotal;
        private BigDecimal lineCost;
        private BigDecimal marginAmount;
        private BigDecimal marginPercentage;
        private BigDecimal overagePoints;
        private String status; // OK, OVER
        private String lineType;
    }
}
