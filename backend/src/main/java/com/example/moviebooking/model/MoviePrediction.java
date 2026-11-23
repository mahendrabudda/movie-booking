package com.example.moviebooking.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "movie_prediction")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoviePrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "movie_id", nullable = false)
    private Long movieId;

    @Column(name = "average_movie_rating", nullable = false, precision = 3, scale = 1)
    private BigDecimal averageMovieRating;

    @Column(nullable = false, length = 60)
    private String genre;

    @Column(nullable = false, length = 60)
    private String language;

    @Column(name = "days_since_release", nullable = false)
    private Integer daysSinceRelease;

    @Column(name = "movie_duration", nullable = false)
    private Integer movieDuration;

    @Column(name = "expected_demand", nullable = false, precision = 5, scale = 2)
    private BigDecimal expectedDemand;

    @Column(name = "current_occupancy", nullable = false, precision = 5, scale = 2)
    private BigDecimal currentOccupancy;

    @Enumerated(EnumType.STRING)
    @Column(name = "predicted_category", nullable = false, length = 40)
    private PopularityCategory predictedCategory;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal confidence;

    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "recommended_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal recommendedPrice;

    @Column(name = "approved_price", precision = 10, scale = 2)
    private BigDecimal approvedPrice;

    @Column(nullable = false)
    private Boolean approved;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (approved == null) {
            approved = false;
        }
    }
}
