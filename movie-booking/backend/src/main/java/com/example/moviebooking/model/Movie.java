package com.example.moviebooking.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "movie")
public class Movie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 60)
    private String genre;

    @Column(nullable = false, length = 50)
    private String language;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "release_date", nullable = false)
    private LocalDate releaseDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "predicted_category", length = 30)
    private PredictionCategory predictedCategory;

    @Column(name = "predicted_multiplier", precision = 6, scale = 3)
    private BigDecimal predictedMultiplier;

    @Column(name = "override_price", precision = 10, scale = 2)
    private BigDecimal overridePrice;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }
    public LocalDate getReleaseDate() { return releaseDate; }
    public void setReleaseDate(LocalDate releaseDate) { this.releaseDate = releaseDate; }
    public PredictionCategory getPredictedCategory() { return predictedCategory; }
    public void setPredictedCategory(PredictionCategory predictedCategory) { this.predictedCategory = predictedCategory; }
    public BigDecimal getPredictedMultiplier() { return predictedMultiplier; }
    public void setPredictedMultiplier(BigDecimal predictedMultiplier) { this.predictedMultiplier = predictedMultiplier; }
    public BigDecimal getOverridePrice() { return overridePrice; }
    public void setOverridePrice(BigDecimal overridePrice) { this.overridePrice = overridePrice; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
