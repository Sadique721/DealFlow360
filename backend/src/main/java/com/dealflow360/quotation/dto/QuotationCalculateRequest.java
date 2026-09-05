package com.dealflow360.quotation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuotationCalculateRequest {
    private Long customerId;
    private List<LineItemRequest> lines;
}
