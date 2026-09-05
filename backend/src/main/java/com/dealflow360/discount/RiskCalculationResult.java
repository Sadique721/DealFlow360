package com.dealflow360.discount;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskCalculationResult {
    private BigDecimal blendedRiskScore;
    private String riskLevel; // NONE, LOW, MEDIUM, HIGH
    private String routingDecision; // AUTO_APPROVED, SALES_MANAGER_ONLY, SEQUENTIAL_MANAGER_AND_FINANCE
    private Boolean requiresApproval;
    private Boolean requiresFinance;
    private BigDecimal singleLinePenalty;
    private String culpritSummary;
    private String fullExplanation;
    private List<LineOverageDetail> lineDetails;
}
