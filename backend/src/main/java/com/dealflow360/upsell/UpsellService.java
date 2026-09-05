package com.dealflow360.upsell;

import com.dealflow360.catalog.Product;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.upsell.dto.UpsellSuggestion;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@Transactional
public class UpsellService {

    private final UpsellRuleRepository upsellRuleRepository;
    private final QuotationRepository quotationRepository;

    public UpsellService(UpsellRuleRepository upsellRuleRepository,
                         QuotationRepository quotationRepository) {
        this.upsellRuleRepository = upsellRuleRepository;
        this.quotationRepository = quotationRepository;
    }

    public List<UpsellSuggestion> getSuggestionsForQuotation(Long quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found: " + quotationId));

        Set<Long> currentProductIds = new HashSet<>();
        for (QuotationLine line : quotation.getLines()) {
            currentProductIds.add(line.getProduct().getId());
        }

        List<UpsellSuggestion> suggestions = new ArrayList<>();

        for (QuotationLine line : quotation.getLines()) {
            List<UpsellRule> rules = upsellRuleRepository.findByBaseProductId(line.getProduct().getId());

            for (UpsellRule rule : rules) {
                Product suggested = rule.getSuggestedProduct();

                // Skip if already in cart
                if (currentProductIds.contains(suggested.getId())) {
                    continue;
                }

                // Compute margin delta if added
                BigDecimal unitPrice = suggested.getBasePrice();
                if (rule.getPromoDiscountPercent() != null && rule.getPromoDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal factor = BigDecimal.ONE.subtract(rule.getPromoDiscountPercent().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
                    unitPrice = unitPrice.multiply(factor).setScale(2, RoundingMode.HALF_UP);
                }

                BigDecimal addedCost = suggested.getCostPrice();
                BigDecimal addedMargin = unitPrice.subtract(addedCost);

                BigDecimal newTotalAmount = quotation.getTotalAmount().add(unitPrice);
                BigDecimal newTotalMargin = quotation.getTotalMarginAmount().add(addedMargin);
                BigDecimal newMarginPct = newTotalAmount.compareTo(BigDecimal.ZERO) > 0
                        ? newTotalMargin.divide(newTotalAmount, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;

                // Enforce Gross Margin Floor Guardrail: Never suggest if overall margin falls below threshold
                if (newMarginPct.compareTo(rule.getMinMarginThreshold()) < 0) {
                    continue;
                }

                String rationale = String.format("Co-purchase affinity %.0f%% based on historical cart analytics.",
                        rule.getCoPurchaseScore().multiply(BigDecimal.valueOf(100)).doubleValue());
                if (rule.getIsPromoted() && rule.getPromoTag() != null) {
                    rationale = rule.getPromoTag() + " — " + rationale;
                }

                suggestions.add(UpsellSuggestion.builder()
                        .ruleId(rule.getId())
                        .suggestedProduct(suggested)
                        .coPurchaseScore(rule.getCoPurchaseScore())
                        .isPromoted(rule.getIsPromoted())
                        .promoTag(rule.getPromoTag())
                        .promoDiscountPercent(rule.getPromoDiscountPercent())
                        .marginDelta(addedMargin)
                        .simulatedNewMarginPercentage(newMarginPct)
                        .rationale(rationale)
                        .build());
            }
        }

        // Sort: Promoted items first, then by co-purchase score descending
        suggestions.sort((a, b) -> {
            if (Boolean.TRUE.equals(a.getIsPromoted()) && !Boolean.TRUE.equals(b.getIsPromoted())) return -1;
            if (!Boolean.TRUE.equals(a.getIsPromoted()) && Boolean.TRUE.equals(b.getIsPromoted())) return 1;
            return b.getCoPurchaseScore().compareTo(a.getCoPurchaseScore());
        });

        return suggestions;
    }

    public List<UpsellRule> getAllRules() {
        return upsellRuleRepository.findAll();
    }

    public UpsellRule createRule(UpsellRule rule) {
        return upsellRuleRepository.save(rule);
    }
}
