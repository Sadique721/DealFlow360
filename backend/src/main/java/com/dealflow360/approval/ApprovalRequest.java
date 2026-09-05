package com.dealflow360.approval;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "approval_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "quotation_id", nullable = false, unique = true)
    private Quotation quotation;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, RETURNED, AUTO_APPROVED

    @Column(name = "current_stage", nullable = false, length = 50)
    @Builder.Default
    private String currentStage = "SALES_MANAGER"; // SALES_MANAGER, FINANCE, COMPLETED

    @Column(name = "blended_risk_score", nullable = false, precision = 6, scale = 2)
    private BigDecimal blendedRiskScore;

    @Column(name = "risk_level", nullable = false, length = 20)
    private String riskLevel; // LOW, MEDIUM, HIGH

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "approvalRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<ApprovalStep> steps = new ArrayList<>();

    @JsonProperty("currentLevel")
    public String getCurrentLevel() {
        if ("SALES_MANAGER".equalsIgnoreCase(currentStage)) {
            return "LEVEL_1_MANAGER";
        } else if ("FINANCE".equalsIgnoreCase(currentStage)) {
            return "LEVEL_2_FINANCE";
        }
        return currentStage;
    }

    @JsonProperty("requiredTier")
    public String getRequiredTier() {
        if ("SALES_MANAGER".equalsIgnoreCase(currentStage)) {
            return "Level 1 (Sales Manager)";
        } else if ("FINANCE".equalsIgnoreCase(currentStage)) {
            return "Level 2 (Finance)";
        } else if ("COMPLETED".equalsIgnoreCase(currentStage)) {
            return "Approved / Completed";
        }
        return currentStage;
    }

    @JsonProperty("riskScore")
    public BigDecimal getRiskScore() {
        return blendedRiskScore != null ? blendedRiskScore : BigDecimal.ZERO;
    }

    @JsonProperty("culpritLineBreakdownJson")
    public String getCulpritLineBreakdownJson() {
        if (quotation == null || quotation.getLines() == null || quotation.getLines().isEmpty()) {
            return "[]";
        }
        try {
            List<Map<String, Object>> list = new ArrayList<>();
            BigDecimal totalAmount = quotation.getTotalAmount() != null && quotation.getTotalAmount().compareTo(BigDecimal.ZERO) > 0
                    ? quotation.getTotalAmount() : BigDecimal.ONE;

            for (QuotationLine line : quotation.getLines()) {
                BigDecimal allowedCap = BigDecimal.valueOf(10.0);
                if (line.getProduct() != null && line.getProduct().getCategory() != null && line.getProduct().getCategory().getMaxDiscountPercent() != null) {
                    allowedCap = line.getProduct().getCategory().getMaxDiscountPercent();
                }

                BigDecimal disc = line.getDiscountPercent() != null ? line.getDiscountPercent() : BigDecimal.ZERO;
                BigDecimal overage = line.getOveragePoints() != null && line.getOveragePoints().compareTo(BigDecimal.ZERO) > 0
                        ? line.getOveragePoints()
                        : (disc.compareTo(allowedCap) > 0 ? disc.subtract(allowedCap) : BigDecimal.ZERO);

                boolean isCulprit = overage.compareTo(BigDecimal.ZERO) > 0 || "OVER".equalsIgnoreCase(line.getStatus());

                BigDecimal revWeight = (line.getLineTotal() != null)
                        ? line.getLineTotal().multiply(BigDecimal.valueOf(100)).divide(totalAmount, 2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;

                BigDecimal gamma = (line.getProduct() != null && line.getProduct().getCategory() != null && line.getProduct().getCategory().getSensitivityGamma() != null)
                        ? line.getProduct().getCategory().getSensitivityGamma()
                        : BigDecimal.ONE;

                BigDecimal contrib = overage.multiply(revWeight).multiply(gamma).divide(BigDecimal.valueOf(10), 2, RoundingMode.HALF_UP);

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("productName", line.getProduct() != null ? line.getProduct().getName() : "Item");
                item.put("lineTotal", line.getLineTotal() != null ? line.getLineTotal() : BigDecimal.ZERO);
                item.put("revenueWeightPct", revWeight);
                item.put("appliedDiscountPct", disc);
                item.put("allowedThresholdPct", allowedCap);
                item.put("overagePoints", overage);
                item.put("overagePct", overage);
                item.put("weightedContribution", contrib);
                item.put("isCulprit", isCulprit);
                list.add(item);
            }
            return new ObjectMapper().writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }
}
