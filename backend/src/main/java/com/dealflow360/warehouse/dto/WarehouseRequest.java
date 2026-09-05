package com.dealflow360.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseRequest {

    @JsonAlias({"code", "warehouseCode"})
    private String warehouseCode;

    @JsonAlias({"name", "warehouseName"})
    private String name;

    private String location;

    private String status;

    private BigDecimal shippingCostWeight;

    private BigDecimal baseFreight;
}
