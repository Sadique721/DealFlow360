package com.dealflow360.discount;

import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Product;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class RiskScoreEngine {

    @Value("${dealflow.risk.manager-threshold:10.0}")
    private double managerThreshold;

    @Value("${dealflow.risk.finance-threshold:15.0}")
    private double financeThreshold;

    @Value("${dealflow.risk.single-line-spike-threshold:8.0}")
    private double singleLineSpikeThreshold;

    public static class LineInput {
        public Long lineId;
        public Product product;
        public BigDecimal discountPercent;
        public BigDecimal lineTotal;

        public LineInput(Long lineId, Product product, BigDecimal discountPercent, BigDecimal lineTotal) {
            this.lineId = lineId;
            this.product = product;
            this.discountPercent = discountPercent != null ? discountPercent : BigDecimal.ZERO;
            this.lineTotal = lineTotal != null ? lineTotal : BigDecimal.ZERO;
        }
    }

    public RiskCalculationResult calculateRisk(BigDecimal customerTierCeiling, List<LineInput> lines) {
        if (customerTierCeiling == null) {
            customerTierCeiling = BigDecimal.valueOf(5.00); // Default to Bronze 5%
        }

        BigDecimal orderTotal = lines.stream()
                .map(l -> l.lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (orderTotal.compareTo(BigDecimal.ZERO) <= 0) {
            return RiskCalculationResult.builder()
                    .blendedRiskScore(BigDecimal.ZERO)
                    .riskLevel("NONE")
                    .routingDecision("AUTO_APPROVED")
                    .requiresApproval(false)
                    .requiresFinance(false)
                    .singleLinePenalty(BigDecimal.ZERO)
                    .culpritSummary("Empty order or zero value")
                    .fullExplanation("Order has zero total value. Auto-approved.")
                    .lineDetails(new ArrayList<>())
                    .build();
        }

        List<LineOverageDetail> lineDetails = new ArrayList<>();
        BigDecimal totalWeightedRisk = BigDecimal.ZERO;
        boolean hasSpike = false;
        boolean hasCriticalSingleLine = false;
        String culpritSummary = null;

        for (LineInput line : lines) {
            Product prod = line.product;
            Category cat = prod != null ? prod.getCategory() : null;

            BigDecimal catCeiling = (cat != null && cat.getMaxDiscountPercent() != null)
                    ? cat.getMaxDiscountPercent()
                    : BigDecimal.valueOf(10.00);

            BigDecimal gamma = (cat != null && cat.getSensitivityGamma() != null)
                    ? cat.getSensitivityGamma()
                    : BigDecimal.valueOf(1.00);

            // Stricter ceiling: MIN(CustomerTierCeiling, CategoryCeiling)
            BigDecimal effectiveCeiling = customerTierCeiling.min(catCeiling);

            // Overage: MAX(0, DiscountGiven - EffectiveCeiling)
            BigDecimal overage = line.discountPercent.subtract(effectiveCeiling).max(BigDecimal.ZERO);

            // Revenue weight: LineTotal / OrderTotal
            BigDecimal lineWeight = line.lineTotal.divide(orderTotal, 6, RoundingMode.HALF_UP);
            BigDecimal lineWeightPercent = lineWeight.multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);

            // Risk contribution = Overage * Weight * Gamma
            BigDecimal contribution = overage.multiply(lineWeight).multiply(gamma).setScale(4, RoundingMode.HALF_UP);
            totalWeightedRisk = totalWeightedRisk.add(contribution);

            boolean isCulprit = overage.compareTo(BigDecimal.ZERO) > 0;
            if (overage.doubleValue() >= 5.0) {
                hasSpike = true;
            }
            if (overage.doubleValue() >= singleLineSpikeThreshold || line.discountPercent.doubleValue() >= 20.0) {
                hasCriticalSingleLine = true;
            }

            String statusText = isCulprit
                    ? String.format("OVER (+%.2f pt)", overage.doubleValue())
                    : "OK";

            if (isCulprit && culpritSummary == null) {
                culpritSummary = String.format("Line [%s] breached %s ceiling by %.2f pt (given %.2f%%, limit %.2f%%)",
                        prod != null ? prod.getName() : "Item",
                        cat != null ? cat.getName() : "Category",
                        overage.doubleValue(),
                        line.discountPercent.doubleValue(),
                        effectiveCeiling.doubleValue());
            }

            lineDetails.add(LineOverageDetail.builder()
                    .lineId(line.lineId)
                    .productId(prod != null ? prod.getId() : null)
                    .productName(prod != null ? prod.getName() : "Product")
                    .categoryName(cat != null ? cat.getName() : "General")
                    .customerTierCeiling(customerTierCeiling)
                    .categoryCeiling(catCeiling)
                    .effectiveCeiling(effectiveCeiling)
                    .discountGiven(line.discountPercent)
                    .overagePoints(overage.setScale(2, RoundingMode.HALF_UP))
                    .lineTotal(line.lineTotal)
                    .lineWeightPercentage(lineWeightPercent)
                    .gammaMultiplier(gamma)
                    .riskContribution(contribution)
                    .isCulprit(isCulprit)
                    .statusText(statusText)
                    .build());
        }

        BigDecimal singleLinePenalty = hasSpike ? BigDecimal.valueOf(5.00) : BigDecimal.ZERO;
        BigDecimal blendedRiskScore = totalWeightedRisk.multiply(BigDecimal.valueOf(10))
                .add(singleLinePenalty)
                .setScale(2, RoundingMode.HALF_UP);

        double score = blendedRiskScore.doubleValue();
        String riskLevel;
        String routingDecision;
        boolean requiresApproval;
        boolean requiresFinance;
        String explanation;

        if (score == 0.0) {
            riskLevel = "NONE";
            routingDecision = "AUTO_APPROVED";
            requiresApproval = false;
            requiresFinance = false;
            explanation = "All line item discounts are within category and customer tier allowances. Blended Risk Score = 0.00. Quotation is automatically approved.";
        } else if (score <= managerThreshold && !hasCriticalSingleLine) {
            riskLevel = score <= 5.0 ? "LOW" : "MEDIUM";
            routingDecision = "SALES_MANAGER_ONLY";
            requiresApproval = true;
            requiresFinance = false;
            explanation = String.format("Blended Risk Score is %.2f (<= %.1f threshold). %s. Requires review and sign-off by Sales Manager.",
                    score, managerThreshold, culpritSummary != null ? culpritSummary : "Minor threshold overages detected");
        } else {
            riskLevel = "HIGH";
            routingDecision = "SEQUENTIAL_MANAGER_AND_FINANCE";
            requiresApproval = true;
            requiresFinance = true;
            explanation = String.format("Blended Risk Score is %.2f (> %.1f threshold%s). %s. High margin erosion risk triggers sequential two-tier governance: Sales Manager followed by Finance Controller.",
                    score,
                    financeThreshold,
                    hasCriticalSingleLine ? " or single-line spike > 8pt" : "",
                    culpritSummary != null ? culpritSummary : "Systemic margin erosion across multiple lines");
        }

        return RiskCalculationResult.builder()
                .blendedRiskScore(blendedRiskScore)
                .riskLevel(riskLevel)
                .routingDecision(routingDecision)
                .requiresApproval(requiresApproval)
                .requiresFinance(requiresFinance)
                .singleLinePenalty(singleLinePenalty)
                .culpritSummary(culpritSummary != null ? culpritSummary : "Within limits")
                .fullExplanation(explanation)
                .lineDetails(lineDetails)
                .build();
    }
}
