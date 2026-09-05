package com.dealflow360.negotiation.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NegotiationProposalRequest {
    private String senderName;
    private String message;
    private Long lineReferenceId;
    private BigDecimal counterDiscountPercent;
    private LocalDate requestedDeliveryDate;
}
