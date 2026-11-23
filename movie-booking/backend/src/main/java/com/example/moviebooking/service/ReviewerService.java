package com.example.moviebooking.service;

import com.example.moviebooking.dto.PricingAndReviewerDtos.*;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.ConflictException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import com.example.moviebooking.security.OwnershipVerifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class ReviewerService {

    private final MovieRepository movieRepository;
    private final AppUserRepository userRepository;
    private final MovieReviewerAssignmentRepository assignmentRepository;
    private final ReviewerRatingRepository ratingRepository;
    private final AuditLogRepository auditLogRepository;
    private final OwnershipVerifier ownershipVerifier;

    public ReviewerService(MovieRepository movieRepository,
                           AppUserRepository userRepository,
                           MovieReviewerAssignmentRepository assignmentRepository,
                           ReviewerRatingRepository ratingRepository,
                           AuditLogRepository auditLogRepository,
                           OwnershipVerifier ownershipVerifier) {
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
        this.ratingRepository = ratingRepository;
        this.auditLogRepository = auditLogRepository;
        this.ownershipVerifier = ownershipVerifier;
    }

    /**
     * Admin assigns exactly 10 distinct active/approved MOVIE_REVIEWER accounts to a movie.
     */
    @Transactional
    public void assignTenReviewersToMovie(Long movieId, AssignReviewersRequest request, Long adminUserId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + movieId));
        AppUser admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminUserId));

        Set<Long> uniqueIds = new LinkedHashSet<>(request.reviewerIds());
        if (uniqueIds.size() != 10) {
            throw new BadRequestException("Exactly 10 distinct reviewer IDs must be provided.");
        }

        long existingCount = assignmentRepository.countByMovieId(movieId);
        if (existingCount > 0) {
            throw new ConflictException("Reviewers are already assigned to this movie (count=" + existingCount + ").");
        }

        for (Long reviewerId : uniqueIds) {
            AppUser reviewer = userRepository.findById(reviewerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found: " + reviewerId));
            if (reviewer.getRole() != Role.MOVIE_REVIEWER || !reviewer.isActive() || !reviewer.isApproved()) {
                throw new BadRequestException("User " + reviewer.getEmail() + " is not an active, approved MOVIE_REVIEWER.");
            }
            MovieReviewerAssignment assignment = new MovieReviewerAssignment();
            assignment.setMovie(movie);
            assignment.setReviewer(reviewer);
            assignment.setAssignedBy(admin);
            assignmentRepository.save(assignment);
        }

        auditLogRepository.save(new AuditLog(
                "ASSIGN_MOVIE_REVIEWERS",
                "MOVIE",
                movie.getId(),
                admin,
                null,
                "reviewerIds=" + uniqueIds,
                "Assigned 10 official movie reviewers for initial pricing evaluation"
        ));
    }

    /**
     * Reviewer submits their 1-10 rating.
     * Reviewer ID ALWAYS comes from the authenticated JWT principal, never from request body.
     * Once submitted, ratings are strictly read-only for the reviewer.
     */
    @Transactional
    public ReviewerRatingItemDto submitRating(Long movieId, Long authenticatedReviewerId, SubmitReviewerRatingRequest request) {
        if (request.rating() < 1 || request.rating() > 10) {
            throw new BadRequestException("Official rating must be between 1 and 10.");
        }

        ownershipVerifier.verifyReviewerAssignedToMovie(authenticatedReviewerId, movieId);

        if (ratingRepository.existsByMovieIdAndReviewerId(movieId, authenticatedReviewerId)) {
            throw new ConflictException("Rating already submitted for this movie. Submitted ratings cannot be modified by reviewers.");
        }

        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + movieId));
        AppUser reviewer = userRepository.findById(authenticatedReviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found: " + authenticatedReviewerId));

        ReviewerRating rating = new ReviewerRating();
        rating.setMovie(movie);
        rating.setReviewer(reviewer);
        rating.setRating(request.rating());
        rating.setReviewNotes(request.reviewNotes());
        rating = ratingRepository.save(rating);

        return new ReviewerRatingItemDto(
                rating.getId(),
                reviewer.getId(),
                reviewer.getEmail(),
                reviewer.getFullName(),
                rating.getRating(),
                rating.getReviewNotes(),
                rating.getSubmittedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<ReviewerAssignedMovieDto> getAssignedMoviesForReviewer(Long reviewerId) {
        List<MovieReviewerAssignment> assignments = assignmentRepository.findByReviewerId(reviewerId);
        List<ReviewerAssignedMovieDto> result = new ArrayList<>();
        for (MovieReviewerAssignment a : assignments) {
            Movie m = a.getMovie();
            Optional<ReviewerRating> ratingOpt = ratingRepository.findByMovieIdAndReviewerId(m.getId(), reviewerId);
            result.add(new ReviewerAssignedMovieDto(
                    m.getId(),
                    m.getTitle(),
                    m.getGenre(),
                    m.getLanguage(),
                    ratingOpt.isPresent(),
                    ratingOpt.map(ReviewerRating::getRating).orElse(null),
                    ratingOpt.map(ReviewerRating::getReviewNotes).orElse(null),
                    ratingOpt.map(ReviewerRating::getSubmittedAt).orElse(null)
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public MovieRatingProgressDto getMovieRatingProgress(Long movieId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + movieId));
        List<MovieReviewerAssignment> assignments = assignmentRepository.findByMovieId(movieId);
        Map<Long, ReviewerRating> ratingsByReviewer = new HashMap<>();
        for (ReviewerRating r : ratingRepository.findByMovieIdOrderBySubmittedAtAsc(movieId)) {
            ratingsByReviewer.put(r.getReviewer().getId(), r);
        }

        List<ReviewerRatingItemDto> items = assignments.stream().map(a -> {
            AppUser rev = a.getReviewer();
            ReviewerRating r = ratingsByReviewer.get(rev.getId());
            return new ReviewerRatingItemDto(
                    r != null ? r.getId() : null,
                    rev.getId(),
                    rev.getEmail(),
                    rev.getFullName(),
                    r != null ? r.getRating() : null,
                    r != null ? r.getReviewNotes() : null,
                    r != null ? r.getSubmittedAt() : null
            );
        }).toList();

        long assignedCount = assignments.size();
        long submittedCount = ratingsByReviewer.size();
        return new MovieRatingProgressDto(
                movie.getId(),
                movie.getTitle(),
                assignedCount,
                submittedCount,
                assignedCount == 10 && submittedCount == 10,
                items
        );
    }

    /**
     * Admin-controlled audited correction of a submitted reviewer rating.
     */
    @Transactional
    public ReviewerRatingItemDto adminCorrectRating(Long ratingId, AdminCorrectRatingRequest request, Long adminUserId) {
        if (request.newRating() < 1 || request.newRating() > 10) {
            throw new BadRequestException("Corrected rating must be between 1 and 10.");
        }
        ReviewerRating rating = ratingRepository.findById(ratingId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer rating not found: " + ratingId));
        AppUser admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminUserId));

        int oldRating = rating.getRating();
        rating.setRating(request.newRating());
        rating.setUpdatedAt(Instant.now());
        rating = ratingRepository.save(rating);

        auditLogRepository.save(new AuditLog(
                "ADMIN_RATING_CORRECTION",
                "REVIEWER_RATING",
                rating.getId(),
                admin,
                "rating=" + oldRating,
                "rating=" + request.newRating(),
                request.reason()
        ));

        AppUser rev = rating.getReviewer();
        return new ReviewerRatingItemDto(
                rating.getId(),
                rev.getId(),
                rev.getEmail(),
                rev.getFullName(),
                rating.getRating(),
                rating.getReviewNotes(),
                rating.getSubmittedAt()
        );
    }
}
