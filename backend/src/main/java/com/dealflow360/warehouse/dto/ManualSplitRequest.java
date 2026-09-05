package com.dealflow360.warehouse.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManualSplitRequest {
    private Long warehouseId;
    private Long productId;
    private Integer quantity;
    private Boolean isBackorder;
    private String shipmentGroup;
}
