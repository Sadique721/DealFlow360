package com.dealflow360.catalog.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerTierRequest {

    @NotBlank(message = "Tier name is required (e.g. BRONZE, SILVER, GOLD)")
    private String tierName;

    @NotNull(message = "Max discount percent is required")
    @DecimalMin(value = "0.00", message = "Max discount must be non-negative")
    @DecimalMax(value = "100.00", message = "Max discount cannot exceed 100%")
    private BigDecimal maxDiscountPercent;

    private String description;
}
