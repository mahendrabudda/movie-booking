package com.example.moviebooking.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "movie_prediction")
public class MoviePrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @Column(name = "ratings_snapshot", nullable = false, length = 255)
    private String ratingsSnapshot;

    @Column(name = "mean_rating", nullable = false, precision = 5, scale = 2)
    private BigDecimal meanRating;

    @Column(name = "median_rating", nullable = false, precision = 5, scale = 2)
    private BigDecimal medianRating;

    @Column(name = "std_dev_rating", nullable = false, precision = 5, scale = 2)
    private BigDecimal stdDevRating;

    @Column(name = "min_rating", nullable = false)
    private int minRating;

    @Column(name = "max_rating", nullable = false)
    private int maxRating;

    @Column(name = "count_high_ratings", nullable = false)
    private int countHighRatings;

    @Column(name = "days_since_release", nullable = false)
    private int daysSinceRelease;

    @Enumerated(EnumType.STRING)
    @Column(name = "predicted_class", nullable = false, length = 30)
    private PredictionCategory predictedClass;

    @Column(nullable = false, precision = 5, scale = 4)
    private BigDecimal confidence;

    @Column(name = "model_version", nullable = false, length = 50)
    private String modelVersion;

    @Column(name = "recommended_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal recommendedMultiplier;

    @Column(name = "reference_base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal referenceBasePrice;

    @Column(name = "final_reference_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal finalReferencePrice;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "triggered_by", nullable = false)
    private AppUser triggeredBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Movie getMovie() { return movie; }
    public void setMovie(Movie movie) { this.movie = movie; }
    public String getRatingsSnapshot() { return ratingsSnapshot; }
    public void setRatingsSnapshot(String ratingsSnapshot) { this.ratingsSnapshot = ratingsSnapshot; }
    public BigDecimal getMeanRating() { return meanRating; }
    public void setMeanRating(BigDecimal meanRating) { this.meanRating = meanRating; }
    public BigDecimal getMedianRating() { return medianRating; }
    public void setMedianRating(BigDecimal medianRating) { this.medianRating = medianRating; }
    public BigDecimal getStdDevRating() { return stdDevRating; }
    public void setStdDevRating(BigDecimal stdDevRating) { this.stdDevRating = stdDevRating; }
    public int getMinRating() { return minRating; }
    public void setMinRating(int minRating) { this.minRating = minRating; }
    public int getMaxRating() { return maxRating; }
    public void setMaxRating(int maxRating) { this.maxRating = maxRating; }
    public int getCountHighRatings() { return countHighRatings; }
    public void setCountHighRatings(int countHighRatings) { this.countHighRatings = countHighRatings; }
    public int getDaysSinceRelease() { return daysSinceRelease; }
    public void setDaysSinceRelease(int daysSinceRelease) { this.daysSinceRelease = daysSinceRelease; }
    public PredictionCategory getPredictedClass() { return predictedClass; }
    public void setPredictedClass(PredictionCategory predictedClass) { this.predictedClass = predictedClass; }
    public BigDecimal getConfidence() { return confidence; }
    public void setConfidence(BigDecimal confidence) { this.confidence = confidence; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public BigDecimal getRecommendedMultiplier() { return recommendedMultiplier; }
    public void setRecommendedMultiplier(BigDecimal recommendedMultiplier) { this.recommendedMultiplier = recommendedMultiplier; }
    public BigDecimal getReferenceBasePrice() { return referenceBasePrice; }
    public void setReferenceBasePrice(BigDecimal referenceBasePrice) { this.referenceBasePrice = referenceBasePrice; }
    public BigDecimal getFinalReferencePrice() { return finalReferencePrice; }
    public void setFinalReferencePrice(BigDecimal finalReferencePrice) { this.finalReferencePrice = finalReferencePrice; }
    public AppUser getTriggeredBy() { return triggeredBy; }
    public void setTriggeredBy(AppUser triggeredBy) { this.triggeredBy = triggeredBy; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
