package com.subscriptiq;

import com.subscriptiq.model.BillingCycle;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.assertEquals;

class BillingCycleTest {
    @Test
    void addsCorrectNumberOfMonths() {
        LocalDate d = LocalDate.of(2026, 1, 31);
        assertEquals(LocalDate.of(2026, 2, 28), BillingCycle.MONTHLY.addTo(d));
        assertEquals(LocalDate.of(2026, 4, 30), BillingCycle.QUARTERLY.addTo(d));
        assertEquals(LocalDate.of(2027, 1, 31), BillingCycle.YEARLY.addTo(d));
    }

    @Test
    void normalisesPriceToMonthlyRevenue() {
        assertEquals(new BigDecimal("49.00"), BillingCycle.MONTHLY.monthlyEquivalent(new BigDecimal("49.00")));
        assertEquals(new BigDecimal("43.00"), BillingCycle.QUARTERLY.monthlyEquivalent(new BigDecimal("129.00")));
        assertEquals(new BigDecimal("41.58"), BillingCycle.YEARLY.monthlyEquivalent(new BigDecimal("499.00")));
    }
}
