package com.example.moviebooking.security;

import com.example.moviebooking.exception.ForbiddenOperationException;
import com.example.moviebooking.model.Booking;
import com.example.moviebooking.model.Role;
import com.example.moviebooking.repository.ManagerTheatreRepository;
import com.example.moviebooking.repository.MovieReviewerAssignmentRepository;
import org.springframework.stereotype.Component;

@Component
public class OwnershipVerifier {

    private final ManagerTheatreRepository managerTheatreRepository;
    private final MovieReviewerAssignmentRepository reviewerAssignmentRepository;

    public OwnershipVerifier(ManagerTheatreRepository managerTheatreRepository,
                             MovieReviewerAssignmentRepository reviewerAssignmentRepository) {
        this.managerTheatreRepository = managerTheatreRepository;
        this.reviewerAssignmentRepository = reviewerAssignmentRepository;
    }

    public void verifyTheatreAccess(AuthenticatedUser user, Long theatreId) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (user.getRole() != Role.THEATRE_MANAGER ||
                !managerTheatreRepository.existsByManagerIdAndTheatreId(user.getId(), theatreId)) {
            throw new ForbiddenOperationException(
                    "Access denied: Manager is not assigned to theatre ID " + theatreId);
        }
    }

    public void verifyBookingOwnership(AuthenticatedUser user, Booking booking) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (!booking.getUser().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("Access denied: You do not own this booking.");
        }
    }

    public void verifyReviewerAssignedToMovie(Long reviewerId, Long movieId) {
        if (!reviewerAssignmentRepository.existsByMovieIdAndReviewerId(movieId, reviewerId)) {
            throw new ForbiddenOperationException(
                    "Access denied: Reviewer is not assigned to movie ID " + movieId);
        }
    }
}
