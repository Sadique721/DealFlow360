package com.dealflow360.subscription;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class ProrationEngineTest {

    private ProrationEngine engine;

    @BeforeEach
    void setUp() {
        engine = new ProrationEngine();
    }

    @Test
    @DisplayName("Mid-cycle quantity addition produces accurate day-based prorated adjustment")
    void testMidCycleAddition_ProratedInvoice() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 10, 1); // 30 days total
        LocalDate change = LocalDate.of(2026, 9, 16); // 15 days remaining -> 50%

        BigDecimal unitRate = BigDecimal.valueOf(50.00);
        int quantityDelta = 2; // Adding 2 seats -> $100 full month rate

        ProrationEngine.ProrationResult result = engine.calculateProration(
                start, end, change, BigDecimal.valueOf(50.00), unitRate, quantityDelta);

        assertNotNull(result);
        assertEquals(15, result.getDaysRemaining());
        assertEquals(30, result.getTotalCycleDays());
        assertEquals(0.5000, result.getProrationFactor().doubleValue(), 0.0001);
        assertEquals(50.00, result.getAdjustmentAmount().doubleValue(), 0.01);
        assertFalse(result.isCreditNote());
        assertTrue(result.getExplanation().contains("15 of 30 days remaining"));
    }

    @Test
    @DisplayName("Mid-cycle downgrade or seat reduction generates a Credit Note refund")
    void testMidCycleReduction_CreditNote() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 10, 1);
        LocalDate change = LocalDate.of(2026, 9, 16); // 15 days remaining

        BigDecimal unitRate = BigDecimal.valueOf(50.00);
        int quantityDelta = -1; // Removing 1 seat

        ProrationEngine.ProrationResult result = engine.calculateProration(
                start, end, change, BigDecimal.valueOf(100.00), unitRate, quantityDelta);

        assertNotNull(result);
        assertTrue(result.isCreditNote());
        assertEquals(-25.00, result.getAdjustmentAmount().doubleValue(), 0.01);
        assertTrue(result.getExplanation().contains("Credit Note refund"));
    }
}
