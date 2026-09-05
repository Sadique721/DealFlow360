package com.dealflow360.subscription;

import lombok.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
public class ProrationEngine {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProrationResult {
        private long daysRemaining;
        private long totalCycleDays;
        private BigDecimal prorationFactor;
        private BigDecimal adjustmentAmount;
        private boolean isCreditNote;
        private String explanation;
    }

    public ProrationResult calculateProration(LocalDate cycleStart,
                                             LocalDate cycleEnd,
                                             LocalDate changeDate,
                                             BigDecimal oldRate,
                                             BigDecimal newRate,
                                             int quantityDelta) {
        if (cycleStart == null || cycleEnd == null) {
            cycleStart = LocalDate.now();
            cycleEnd = cycleStart.plusMonths(1);
        }
        if (changeDate == null) {
            changeDate = LocalDate.now();
        }

        long totalDays = ChronoUnit.DAYS.between(cycleStart, cycleEnd);
        if (totalDays <= 0) totalDays = 30;

        long daysRemaining = ChronoUnit.DAYS.between(changeDate, cycleEnd);
        if (daysRemaining < 0) daysRemaining = 0;
        if (daysRemaining > totalDays) daysRemaining = totalDays;

        BigDecimal factor = BigDecimal.valueOf(daysRemaining)
                .divide(BigDecimal.valueOf(totalDays), 4, RoundingMode.HALF_UP);

        BigDecimal rateDelta;
        if (quantityDelta != 0) {
            rateDelta = newRate.multiply(BigDecimal.valueOf(quantityDelta));
        } else {
            rateDelta = newRate.subtract(oldRate);
        }

        BigDecimal adjustmentAmount = rateDelta.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        boolean isCreditNote = adjustmentAmount.compareTo(BigDecimal.ZERO) < 0;

        BigDecimal absAdjustment = adjustmentAmount.abs();
        double pct = factor.multiply(BigDecimal.valueOf(100)).doubleValue();

        String explanation = String.format("%d of %d days remaining in billing cycle (%.1f%% prorated). %s of $%.2f generated.",
                daysRemaining, totalDays, pct,
                isCreditNote ? "Credit Note refund" : "Additional prorated invoice",
                absAdjustment.doubleValue());

        return ProrationResult.builder()
                .daysRemaining(daysRemaining)
                .totalCycleDays(totalDays)
                .prorationFactor(factor)
                .adjustmentAmount(adjustmentAmount)
                .isCreditNote(isCreditNote)
                .explanation(explanation)
                .build();
    }
}
