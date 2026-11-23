package com.example.moviebooking.model;

import java.math.BigDecimal;

public enum PopularityCategory {
    FLOP(new BigDecimal("0.75")),
    BELOW_AVERAGE(new BigDecimal("0.90")),
    AVERAGE(new BigDecimal("1.00")),
    HIT(new BigDecimal("1.25")),
    SUPERHIT(new BigDecimal("1.50")),
    BLOCKBUSTER(new BigDecimal("1.65")),
    INDUSTRY_HIT(new BigDecimal("1.80"));

    private final BigDecimal defaultMultiplier;

    PopularityCategory(BigDecimal defaultMultiplier) {
        this.defaultMultiplier = defaultMultiplier;
    }

    public BigDecimal getDefaultMultiplier() {
        return defaultMultiplier;
    }
}
