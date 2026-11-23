package com.example.moviebooking.service;

import com.example.moviebooking.dto.CatalogDtos.*;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.ConflictException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import com.example.moviebooking.security.AuthenticatedUser;
import com.example.moviebooking.security.OwnershipVerifier;
import com.example.moviebooking.util.TimeUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class CatalogService {

    private final MovieRepository movieRepository;
    private final TheatreRepository theatreRepository;
    private final ScreenRepository screenRepository;
    private final SeatRepository seatRepository;
    private final ShowRepository showRepository;
    private final ShowSeatRepository showSeatRepository;
    private final CustomerReviewRepository customerReviewRepository;
    private final ManagerTheatreRepository managerTheatreRepository;
    private final AppUserRepository userRepository;
    private final PricingService pricingService;
    private final OwnershipVerifier ownershipVerifier;

    public CatalogService(MovieRepository movieRepository,
                          TheatreRepository theatreRepository,
                          ScreenRepository screenRepository,
                          SeatRepository seatRepository,
                          ShowRepository showRepository,
                          ShowSeatRepository showSeatRepository,
                          CustomerReviewRepository customerReviewRepository,
                          ManagerTheatreRepository managerTheatreRepository,
                          AppUserRepository userRepository,
                          PricingService pricingService,
                          OwnershipVerifier ownershipVerifier) {
        this.movieRepository = movieRepository;
        this.theatreRepository = theatreRepository;
        this.screenRepository = screenRepository;
        this.seatRepository = seatRepository;
        this.showRepository = showRepository;
        this.showSeatRepository = showSeatRepository;
        this.customerReviewRepository = customerReviewRepository;
        this.managerTheatreRepository = managerTheatreRepository;
        this.userRepository = userRepository;
        this.pricingService = pricingService;
        this.ownershipVerifier = ownershipVerifier;
    }

    @Transactional
    public MovieResponse createMovie(MovieRequest request) {
        Movie movie = new Movie();
        movie.setTitle(request.title().trim());
        movie.setDescription(request.description());
        movie.setGenre(request.genre().trim().toUpperCase());
        movie.setLanguage(request.language().trim());
        movie.setDurationMinutes(request.durationMinutes());
        movie.setReleaseDate(request.releaseDate());
        movie.setActive(true);
        movie = movieRepository.save(movie);
        return toMovieResponse(movie);
    }

    @Transactional(readOnly = true)
    public List<MovieResponse> searchMovies(String city, String language, String genre) {
        String c = (city != null && !city.isBlank()) ? city.trim() : null;
        String l = (language != null && !language.isBlank()) ? language.trim() : null;
        String g = (genre != null && !genre.isBlank()) ? genre.trim() : null;
        return movieRepository.searchMovies(c, l, g).stream().map(this::toMovieResponse).toList();
    }

    @Transactional(readOnly = true)
    public MovieResponse getMovie(Long id) {
        Movie m = movieRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + id));
        return toMovieResponse(m);
    }

    @Transactional
    public TheatreResponse createTheatre(TheatreRequest request) {
        GlobalPricingPolicy policy = pricingService.getActivePolicy();
        BigDecimal defaultMax = request.type() == TheatreType.SINGLE_SCREEN
                ? policy.getSingleScreenMaxPrice()
                : policy.getMultiplexMaxPrice();

        Theatre theatre = new Theatre();
        theatre.setName(request.name().trim());
        theatre.setCity(request.city().trim());
        theatre.setAddress(request.address().trim());
        theatre.setType(request.type());
        theatre.setMaxTicketPrice(request.maxTicketPrice() != null ? request.maxTicketPrice() : defaultMax);
        theatre.setActive(true);
        theatre = theatreRepository.save(theatre);
        return toTheatreResponse(theatre);
    }

    @Transactional
    public TheatreResponse updateTheatreStatus(Long theatreId, boolean active, BigDecimal maxTicketPrice) {
        Theatre theatre = theatreRepository.findById(theatreId)
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found: " + theatreId));
        theatre.setActive(active);
        if (maxTicketPrice != null) {
            theatre.setMaxTicketPrice(maxTicketPrice);
        }
        theatre = theatreRepository.save(theatre);
        return toTheatreResponse(theatre);
    }

    @Transactional(readOnly = true)
    public List<TheatreResponse> listTheatres(String city) {
        List<Theatre> theatres = (city != null && !city.isBlank())
                ? theatreRepository.findByCityIgnoreCaseAndActiveTrue(city.trim())
                : theatreRepository.findByActiveTrue();
        return theatres.stream().map(this::toTheatreResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<TheatreResponse> listManagerTheatres(Long managerId) {
        return managerTheatreRepository.findByManagerId(managerId).stream()
                .map(mt -> toTheatreResponse(mt.getTheatre()))
                .toList();
    }

    @Transactional
    public ScreenResponse createScreenWithSeats(Long theatreId, ScreenRequest request, AuthenticatedUser actor) {
        ownershipVerifier.verifyTheatreAccess(actor, theatreId);

        Theatre theatre = theatreRepository.findById(theatreId)
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found: " + theatreId));
        if (screenRepository.existsByTheatreIdAndNameIgnoreCase(theatreId, request.name().trim())) {
            throw new ConflictException("Screen name already exists in this theatre: " + request.name());
        }

        int totalSeats = request.rowsCount() * request.seatsPerRow();
        Screen screen = new Screen();
        screen.setTheatre(theatre);
        screen.setName(request.name().trim());
        screen.setTotalSeats(totalSeats);
        screen = screenRepository.save(screen);

        List<Seat> seats = new ArrayList<>(totalSeats);
        for (int r = 0; r < request.rowsCount(); r++) {
            String rowLabel = String.valueOf((char) ('A' + r));
            SeatCategory category;
            BigDecimal mult;
            if (r == request.rowsCount() - 1 && request.rowsCount() >= 3) {
                category = SeatCategory.RECLINER;
                mult = new BigDecimal("1.30");
            } else if (r >= request.rowsCount() / 2) {
                category = SeatCategory.PREMIUM;
                mult = new BigDecimal("1.15");
            } else {
                category = SeatCategory.REGULAR;
                mult = BigDecimal.ONE;
            }
            for (int s = 1; s <= request.seatsPerRow(); s++) {
                Seat seat = new Seat();
                seat.setScreen(screen);
                seat.setRowLabel(rowLabel);
                seat.setSeatNumber(s);
                seat.setCategory(category);
                seat.setPriceMultiplier(mult);
                seats.add(seat);
            }
        }
        seatRepository.saveAll(seats);

        return new ScreenResponse(screen.getId(), theatre.getId(), theatre.getName(), screen.getName(), screen.getTotalSeats());
    }

    @Transactional(readOnly = true)
    public List<ScreenResponse> listScreensByTheatre(Long theatreId, AuthenticatedUser actor) {
        ownershipVerifier.verifyTheatreAccess(actor, theatreId);
        return screenRepository.findByTheatreId(theatreId).stream()
                .map(s -> new ScreenResponse(s.getId(), s.getTheatre().getId(), s.getTheatre().getName(), s.getName(), s.getTotalSeats()))
                .toList();
    }

    /**
     * Creates a show after verifying manager assignment, base price constraints,
     * and non-overlapping showtimes on the same screen.
     */
    @Transactional
    public ShowResponse createShow(ShowRequest request, AuthenticatedUser actor) {
        Screen screen = screenRepository.findById(request.screenId())
                .orElseThrow(() -> new ResourceNotFoundException("Screen not found: " + request.screenId()));
        Theatre theatre = screen.getTheatre();

        ownershipVerifier.verifyTheatreAccess(actor, theatre.getId());

        Movie movie = movieRepository.findById(request.movieId())
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + request.movieId()));

        GlobalPricingPolicy policy = pricingService.getActivePolicy();
        if (request.basePrice().compareTo(policy.getMinTicketPrice()) < 0
                || request.basePrice().compareTo(theatre.getMaxTicketPrice()) > 0) {
            throw new BadRequestException(String.format(
                    "Base price (%s) must be within admin constraints [%s, %s] for theatre %s",
                    request.basePrice(), policy.getMinTicketPrice(), theatre.getMaxTicketPrice(), theatre.getName()));
        }

        // Include 15 minutes turnaround buffer in show end time
        Instant endTime = request.startTime().plus(movie.getDurationMinutes() + 15L, ChronoUnit.MINUTES);
        if (showRepository.existsOverlappingShow(screen.getId(), request.startTime(), endTime)) {
            throw new ConflictException("Show overlaps with an existing scheduled show on screen " + screen.getName());
        }

        Show show = new Show();
        show.setMovie(movie);
        show.setScreen(screen);
        show.setStartTime(request.startTime());
        show.setEndTime(endTime);
        show.setBasePrice(request.basePrice());
        show.setActive(true);
        show = showRepository.save(show);

        List<Seat> seats = seatRepository.findByScreenIdOrderByRowLabelAscSeatNumberAsc(screen.getId());
        List<ShowSeat> showSeats = new ArrayList<>(seats.size());
        for (Seat seat : seats) {
            ShowSeat ss = new ShowSeat();
            ss.setShow(show);
            ss.setSeat(seat);
            ss.setStatus(ShowSeatStatus.AVAILABLE);
            showSeats.add(ss);
        }
        showSeatRepository.saveAll(showSeats);

        return toShowResponse(show);
    }

    @Transactional(readOnly = true)
    public List<ShowResponse> listShowsForMovie(Long movieId) {
        return showRepository.findByMovieIdAndActiveTrueOrderByStartTimeAsc(movieId)
                .stream().map(this::toShowResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ShowSeatDto> getShowSeatMap(Long showId) {
        Show show = showRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + showId));
        Instant now = Instant.now();
        List<ShowSeat> showSeats = showSeatRepository.findByShowIdOrderBySeatRowLabelAscSeatSeatNumberAsc(showId);

        return showSeats.stream().map(ss -> {
            ShowSeatStatus effectiveStatus = ss.isEffectivelyAvailable(now)
                    ? ShowSeatStatus.AVAILABLE
                    : ss.getStatus();
            BigDecimal price = (effectiveStatus != ShowSeatStatus.AVAILABLE && ss.getLockedPrice() != null)
                    ? ss.getLockedPrice()
                    : pricingService.calculateSeatDynamicPrice(show, ss.getSeat().getPriceMultiplier());
            return new ShowSeatDto(
                    ss.getId(),
                    ss.getSeat().getId(),
                    ss.getSeat().getSeatCode(),
                    ss.getSeat().getRowLabel(),
                    ss.getSeat().getSeatNumber(),
                    ss.getSeat().getCategory(),
                    effectiveStatus,
                    price,
                    effectiveStatus == ShowSeatStatus.HELD ? ss.getHoldExpiresAt() : null
            );
        }).toList();
    }

    @Transactional
    public CustomerReviewResponse addCustomerReview(Long movieId, Long customerUserId, CustomerReviewRequest request) {
        if (customerReviewRepository.existsByMovieIdAndUserId(movieId, customerUserId)) {
            throw new ConflictException("You have already submitted a customer review for this movie.");
        }
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + movieId));
        AppUser user = userRepository.findById(customerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + customerUserId));

        CustomerReview review = new CustomerReview();
        review.setMovie(movie);
        review.setUser(user);
        review.setRating(request.rating());
        review.setComment(request.comment().trim());
        review = customerReviewRepository.save(review);

        return new CustomerReviewResponse(
                review.getId(),
                movie.getId(),
                user.getFullName(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<CustomerReviewResponse> listCustomerReviews(Long movieId) {
        return customerReviewRepository.findByMovieIdOrderByCreatedAtDesc(movieId).stream()
                .map(r -> new CustomerReviewResponse(
                        r.getId(),
                        r.getMovie().getId(),
                        r.getUser().getFullName(),
                        r.getRating(),
                        r.getComment(),
                        r.getCreatedAt()
                )).toList();
    }

    private MovieResponse toMovieResponse(Movie m) {
        return new MovieResponse(
                m.getId(), m.getTitle(), m.getDescription(), m.getGenre(),
                m.getLanguage(), m.getDurationMinutes(), m.getReleaseDate(),
                m.getPredictedCategory(), m.getPredictedMultiplier(), m.getOverridePrice(), m.isActive()
        );
    }

    private TheatreResponse toTheatreResponse(Theatre t) {
        return new TheatreResponse(
                t.getId(), t.getName(), t.getCity(), t.getAddress(),
                t.getType(), t.getMaxTicketPrice(), t.isActive()
        );
    }

    public ShowResponse toShowResponse(Show s) {
        BigDecimal dynamicRegularPrice = pricingService.calculateSeatDynamicPrice(s, BigDecimal.ONE);
        return new ShowResponse(
                s.getId(),
                s.getMovie().getId(),
                s.getMovie().getTitle(),
                s.getScreen().getTheatre().getId(),
                s.getScreen().getTheatre().getName(),
                s.getScreen().getTheatre().getType(),
                s.getScreen().getTheatre().getMaxTicketPrice(),
                s.getScreen().getId(),
                s.getScreen().getName(),
                s.getStartTime(),
                s.getEndTime(),
                TimeUtil.formatIst(s.getStartTime()),
                TimeUtil.formatIst(s.getEndTime()),
                s.getBasePrice(),
                dynamicRegularPrice,
                s.getMovie().getPredictedCategory()
        );
    }
}
