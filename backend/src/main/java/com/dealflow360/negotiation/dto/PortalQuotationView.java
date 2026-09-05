package com.dealflow360.negotiation.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortalQuotationView {
    private Long quotationId;
    private String quoteNumber;
    private String customerName;
    private String customerEmail;
    private String salesRepName;
    private String status;
    private BigDecimal subtotalAmount;
    private BigDecimal totalDiscountAmount;
    private BigDecimal totalAmount;
    private LocalDate promisedDeliveryDate;
    private Integer version;
    private List<PortalLineView> lines;
    private List<PortalMessageView> messages;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PortalLineView {
        private Long lineId;
        private Long productId;
        private String productName;
        private String categoryName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal discountPercent;
        private BigDecimal lineTotal;
        private String lineType; // ONE_TIME, RECURRING
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PortalMessageView {
        private Long id;
        private String senderRole;
        private String senderName;
        private String message;
        private Long lineReferenceId;
        private BigDecimal counterDiscountPercent;
        private LocalDate requestedDeliveryDate;
        private String timestamp;
    }
}
