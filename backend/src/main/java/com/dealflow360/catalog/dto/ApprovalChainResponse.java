package com.dealflow360.catalog.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalChainResponse {

    private Long id;
    private BigDecimal minScore;
    private BigDecimal maxScore;
    private String requiredLevel;
    private String description;
}
