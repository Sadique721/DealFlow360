package com.dealflow360.catalog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalChainRequest {

    @NotNull(message = "Minimum score is required")
    @DecimalMin(value = "0.00", message = "Minimum score must be non-negative")
    private BigDecimal minScore;

    @NotNull(message = "Maximum score is required")
    @DecimalMin(value = "0.00", message = "Maximum score must be non-negative")
    private BigDecimal maxScore;

    @NotBlank(message = "Required level is required (e.g. MANAGER, MANAGER_THEN_FINANCE)")
    private String requiredLevel;

    private String description;
}
