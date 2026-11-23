package com.example.moviebooking.service;

import com.example.moviebooking.dto.MovieDtos.*;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.Movie;
import com.example.moviebooking.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MovieService {

    private final MovieRepository movieRepository;

    public List<MovieResponse> getAllMovies(String searchTitle) {
        List<Movie> movies = StringUtils.hasText(searchTitle)
                ? movieRepository.findByTitleContainingIgnoreCaseOrderByReleaseDateDesc(searchTitle.trim())
                : movieRepository.findAllByOrderByReleaseDateDesc();

        return movies.stream().map(this::toMovieResponse).toList();
    }

    public MovieResponse getMovieById(Long id) {
        Movie movie = findMovieEntity(id);
        return toMovieResponse(movie);
    }

    @Transactional
    public MovieResponse createMovie(MovieRequest request) {
        Movie movie = Movie.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .genre(request.getGenre().trim().toUpperCase().replace(" ", "_"))
                .language(request.getLanguage().trim().toUpperCase())
                .duration(request.getDuration())
                .releaseDate(request.getReleaseDate())
                .posterUrl(request.getPosterUrl().trim())
                .rating(request.getRating())
                .basePrice(request.getBasePrice())
                .build();

        return toMovieResponse(movieRepository.save(movie));
    }

    @Transactional
    public MovieResponse updateMovie(Long id, MovieRequest request) {
        Movie movie = findMovieEntity(id);
        movie.setTitle(request.getTitle().trim());
        movie.setDescription(request.getDescription().trim());
        movie.setGenre(request.getGenre().trim().toUpperCase().replace(" ", "_"));
        movie.setLanguage(request.getLanguage().trim().toUpperCase());
        movie.setDuration(request.getDuration());
        movie.setReleaseDate(request.getReleaseDate());
        movie.setPosterUrl(request.getPosterUrl().trim());
        movie.setRating(request.getRating());
        movie.setBasePrice(request.getBasePrice());

        return toMovieResponse(movieRepository.save(movie));
    }

    @Transactional
    public void deleteMovie(Long id) {
        Movie movie = findMovieEntity(id);
        movieRepository.delete(movie);
    }

    public Movie findMovieEntity(Long id) {
        return movieRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with ID: " + id));
    }

    public MovieResponse toMovieResponse(Movie movie) {
        BigDecimal effectivePrice = movie.getApprovedDynamicPrice() != null
                ? movie.getApprovedDynamicPrice()
                : movie.getBasePrice();

        return MovieResponse.builder()
                .id(movie.getId())
                .title(movie.getTitle())
                .description(movie.getDescription())
                .genre(movie.getGenre())
                .language(movie.getLanguage())
                .duration(movie.getDuration())
                .releaseDate(movie.getReleaseDate())
                .posterUrl(movie.getPosterUrl())
                .rating(movie.getRating())
                .basePrice(movie.getBasePrice())
                .approvedDynamicPrice(movie.getApprovedDynamicPrice())
                .effectivePrice(effectivePrice)
                .build();
    }
}
