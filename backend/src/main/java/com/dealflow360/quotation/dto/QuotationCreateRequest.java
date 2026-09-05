package com.dealflow360.quotation.dto;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuotationCreateRequest {
    private Long customerId;
    private Long salesRepId;
    private LocalDate promisedDeliveryDate;
    private List<LineItemRequest> lines;
}
