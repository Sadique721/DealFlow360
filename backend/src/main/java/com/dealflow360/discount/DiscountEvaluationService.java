package com.dealflow360.discount;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Centralized integration point for discount evaluation and risk calculation.
 * Decouples quotation management from the underlying discount engine rules
 * in preparation for the upcoming Discount Governance & Approval module.
 */
@Service
public class DiscountEvaluationService {

    private final RiskScoreEngine riskScoreEngine;

    public DiscountEvaluationService(RiskScoreEngine riskScoreEngine) {
        this.riskScoreEngine = riskScoreEngine;
    }

    /**
     * Evaluate quotation line discounts against customer tier and product category ceilings.
     *
     * @param customerTierCeiling Maximum allowed discount percent for customer tier
     * @param lines               Line inputs containing product, discount percent, and line totals
     * @return Authoritative risk calculation result with culprit line item details
     */
    public RiskCalculationResult evaluate(BigDecimal customerTierCeiling, List<RiskScoreEngine.LineInput> lines) {
        return riskScoreEngine.calculateRisk(customerTierCeiling, lines);
    }
}
