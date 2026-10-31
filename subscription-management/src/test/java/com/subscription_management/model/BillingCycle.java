package com.subscriptiq.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

public enum BillingCycle {
    MONTHLY(1), QUARTERLY(3), YEARLY(12);

    private final int months;

    BillingCycle(int months) { this.months = months; }

    public int getMonths() { return months; }

    public LocalDate addTo(LocalDate date) { return date.plusMonths(months); }

    /** Price normalised to a per-month amount (used for MRR). */
    public BigDecimal monthlyEquivalent(BigDecimal price) {
        return price.divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);
    }
}
