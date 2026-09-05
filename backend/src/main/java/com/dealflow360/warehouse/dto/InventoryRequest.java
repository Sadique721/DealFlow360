package com.dealflow360.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryRequest {

    private Long warehouseId;

    private Long productId;

    @JsonAlias({"quantity", "inStock", "availableQuantity"})
    private Integer inStock;

    @Builder.Default
    private Integer reserved = 0;

    @Builder.Default
    private Integer reorderLevel = 10;
}
