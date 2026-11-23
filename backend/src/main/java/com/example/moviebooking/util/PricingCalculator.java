package com.example.moviebooking.util;

import com.example.moviebooking.model.PopularityCategory;
import com.example.moviebooking.model.TheatreType;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class PricingCalculator {

    public static final BigDecimal SINGLE_SCREEN_MAX_CAP = new BigDecimal("350.00");
    public static final BigDecimal MULTIPLEX_MAX_CAP = new BigDecimal("450.00");
    public static final BigDecimal PREMIUM_SEAT_SURCHARGE = new BigDecimal("50.00");

    private PricingCalculator() {
    }

    public static BigDecimal calculateRecommendedPrice(
            BigDecimal basePrice,
            PopularityCategory category,
            BigDecimal minPrice,
            BigDecimal maxCap) {

        BigDecimal raw = basePrice.multiply(category.getDefaultMultiplier())
                .setScale(2, RoundingMode.HALF_UP);

        if (minPrice != null && raw.compareTo(minPrice) < 0) {
            raw = minPrice.setScale(2, RoundingMode.HALF_UP);
        }
        if (maxCap != null && raw.compareTo(maxCap) > 0) {
            raw = maxCap.setScale(2, RoundingMode.HALF_UP);
        }
        return raw;
    }

    public static BigDecimal resolveMaxCapForTheatreType(
            TheatreType theatreType,
            BigDecimal theatreMaxTicketPrice) {

        BigDecimal typeLimit = (theatreType == TheatreType.SINGLE_SCREEN)
                ? SINGLE_SCREEN_MAX_CAP
                : MULTIPLEX_MAX_CAP;

        if (theatreMaxTicketPrice == null) {
            return typeLimit;
        }
        return theatreMaxTicketPrice.min(typeLimit).setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal enforceTheatreCap(
            BigDecimal candidatePrice,
            TheatreType theatreType,
            BigDecimal theatreMaxTicketPrice,
            BigDecimal minPrice) {

        BigDecimal effectiveMax = resolveMaxCapForTheatreType(theatreType, theatreMaxTicketPrice);
        BigDecimal capped = candidatePrice.min(effectiveMax);
        if (minPrice != null && capped.compareTo(minPrice) < 0) {
            capped = minPrice.min(effectiveMax);
        }
        return capped.setScale(2, RoundingMode.HALF_UP);
    }
}
