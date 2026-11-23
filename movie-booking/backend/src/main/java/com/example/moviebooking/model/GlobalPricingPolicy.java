package com.example.moviebooking.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "global_pricing_policy")
public class GlobalPricingPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "min_ticket_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal minTicketPrice = new BigDecimal("100.00");

    @Column(name = "single_screen_max_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal singleScreenMaxPrice = new BigDecimal("350.00");

    @Column(name = "multiplex_max_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal multiplexMaxPrice = new BigDecimal("450.00");

    @Column(name = "flop_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal flopMultiplier = new BigDecimal("0.750");

    @Column(name = "below_average_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal belowAverageMultiplier = new BigDecimal("0.900");

    @Column(name = "average_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal averageMultiplier = new BigDecimal("1.000");

    @Column(name = "hit_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal hitMultiplier = new BigDecimal("1.250");

    @Column(name = "superhit_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal superhitMultiplier = new BigDecimal("1.500");

    @Column(name = "blockbuster_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal blockbusterMultiplier = new BigDecimal("1.650");

    @Column(name = "industry_hit_uses_theatre_max", nullable = false)
    private boolean industryHitUsesTheatreMax = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public BigDecimal getMultiplierForCategory(PredictionCategory category) {
        if (category == null) return BigDecimal.ONE;
        return switch (category) {
            case FLOP -> flopMultiplier;
            case BELOW_AVERAGE -> belowAverageMultiplier;
            case AVERAGE -> averageMultiplier;
            case HIT -> hitMultiplier;
            case SUPERHIT -> superhitMultiplier;
            case BLOCKBUSTER -> blockbusterMultiplier;
            case INDUSTRY_HIT -> BigDecimal.valueOf(-1);
        };
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getMinTicketPrice() { return minTicketPrice; }
    public void setMinTicketPrice(BigDecimal minTicketPrice) { this.minTicketPrice = minTicketPrice; }
    public BigDecimal getSingleScreenMaxPrice() { return singleScreenMaxPrice; }
    public void setSingleScreenMaxPrice(BigDecimal singleScreenMaxPrice) { this.singleScreenMaxPrice = singleScreenMaxPrice; }
    public BigDecimal getMultiplexMaxPrice() { return multiplexMaxPrice; }
    public void setMultiplexMaxPrice(BigDecimal multiplexMaxPrice) { this.multiplexMaxPrice = multiplexMaxPrice; }
    public BigDecimal getFlopMultiplier() { return flopMultiplier; }
    public void setFlopMultiplier(BigDecimal flopMultiplier) { this.flopMultiplier = flopMultiplier; }
    public BigDecimal getBelowAverageMultiplier() { return belowAverageMultiplier; }
    public void setBelowAverageMultiplier(BigDecimal belowAverageMultiplier) { this.belowAverageMultiplier = belowAverageMultiplier; }
    public BigDecimal getAverageMultiplier() { return averageMultiplier; }
    public void setAverageMultiplier(BigDecimal averageMultiplier) { this.averageMultiplier = averageMultiplier; }
    public BigDecimal getHitMultiplier() { return hitMultiplier; }
    public void setHitMultiplier(BigDecimal hitMultiplier) { this.hitMultiplier = hitMultiplier; }
    public BigDecimal getSuperhitMultiplier() { return superhitMultiplier; }
    public void setSuperhitMultiplier(BigDecimal superhitMultiplier) { this.superhitMultiplier = superhitMultiplier; }
    public BigDecimal getBlockbusterMultiplier() { return blockbusterMultiplier; }
    public void setBlockbusterMultiplier(BigDecimal blockbusterMultiplier) { this.blockbusterMultiplier = blockbusterMultiplier; }
    public boolean isIndustryHitUsesTheatreMax() { return industryHitUsesTheatreMax; }
    public void setIndustryHitUsesTheatreMax(boolean industryHitUsesTheatreMax) { this.industryHitUsesTheatreMax = industryHitUsesTheatreMax; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
