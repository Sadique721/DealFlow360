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

    public Quotation applyUpsell(Long quotationId, Long ruleId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found: " + quotationId));
        UpsellRule rule = upsellRuleRepository.findById(ruleId)
                .orElseThrow(() -> new RuntimeException("UpsellRule not found: " + ruleId));

        Product suggested = rule.getSuggestedProduct();
        BigDecimal promoDiscount = rule.getPromoDiscountPercent() != null ? rule.getPromoDiscountPercent() : BigDecimal.ZERO;

        Optional<QuotationLine> existingLineOpt = quotation.getLines().stream()
                .filter(l -> l.getProduct() != null && l.getProduct().getId().equals(suggested.getId()))
                .findFirst();

        if (existingLineOpt.isPresent()) {
            QuotationLine existing = existingLineOpt.get();
            existing.setQuantity(existing.getQuantity() + 1);
            if (promoDiscount.compareTo(BigDecimal.ZERO) > 0) {
                existing.setDiscountPercent(promoDiscount);
            }
        } else {
            QuotationLine line = QuotationLine.builder()
                    .quotation(quotation)
                    .product(suggested)
                    .quantity(1)
                    .unitPrice(suggested.getBasePrice())
                    .discountPercent(promoDiscount)
                    .costPrice(suggested.getCostPrice())
                    .lineType(Boolean.TRUE.equals(suggested.getIsSubscription()) ? "RECURRING" : "ONE_TIME")
                    .build();
            quotation.getLines().add(line);
        }

        recalculateTotals(quotation);
        return quotationRepository.save(quotation);
    }

    private void recalculateTotals(Quotation quotation) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscountAmount = BigDecimal.ZERO;
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;

        for (QuotationLine line : quotation.getLines()) {
            Product p = line.getProduct();
            int qty = line.getQuantity() != null ? line.getQuantity() : 1;
            BigDecimal unitPrice = line.getUnitPrice() != null ? line.getUnitPrice() : (p != null ? p.getBasePrice() : BigDecimal.ZERO);
            BigDecimal costPrice = line.getCostPrice() != null ? line.getCostPrice() : (p != null && p.getCostPrice() != null ? p.getCostPrice() : BigDecimal.ZERO);
            BigDecimal discountPct = line.getDiscountPercent() != null ? line.getDiscountPercent() : BigDecimal.ZERO;

            BigDecimal gross = unitPrice.multiply(BigDecimal.valueOf(qty));
            BigDecimal discountFactor = discountPct.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            BigDecimal discountAmt = gross.multiply(discountFactor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = gross.subtract(discountAmt).setScale(2, RoundingMode.HALF_UP);

            BigDecimal lineCost = costPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal marginAmt = lineTotal.subtract(lineCost).setScale(2, RoundingMode.HALF_UP);

            line.setLineTotal(lineTotal);
            line.setMarginAmount(marginAmt);

            subtotal = subtotal.add(gross);
            totalDiscountAmount = totalDiscountAmount.add(discountAmt);
            totalAmount = totalAmount.add(lineTotal);
            totalCost = totalCost.add(lineCost);
        }

        BigDecimal totalMarginAmount = totalAmount.subtract(totalCost);
        BigDecimal marginPct = totalAmount.compareTo(BigDecimal.ZERO) > 0
                ? totalMarginAmount.divide(totalAmount, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        quotation.setSubtotalAmount(subtotal.setScale(2, RoundingMode.HALF_UP));
        quotation.setTotalDiscountAmount(totalDiscountAmount.setScale(2, RoundingMode.HALF_UP));
        quotation.setTotalAmount(totalAmount.setScale(2, RoundingMode.HALF_UP));
        quotation.setTotalCost(totalCost.setScale(2, RoundingMode.HALF_UP));
        quotation.setTotalMarginAmount(totalMarginAmount.setScale(2, RoundingMode.HALF_UP));
        quotation.setMarginPercentage(marginPct);
    }
}
