import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { movieApi, theatreShowApi } from '../services/api';
import { formatDurationHrsMins, getMovieMediaAssets } from '../services/movieMedia';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [activeMovie, setActiveMovie] = useState(null);
  const [showsByMovie, setShowsByMovie] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchMovies = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const [movRes, showsRes] = await Promise.all([
        movieApi.getAll(query),
        theatreShowApi.getShows(),
      ]);
      setMovies(movRes.data);
      if (movRes.data.length > 0) {
        setActiveMovie(movRes.data[0]);
      }
      const grouped = {};
      for (const sh of showsRes.data) {
        if (!grouped[sh.movieId]) grouped[sh.movieId] = [];
        grouped[sh.movieId].push(sh);
      }
      setShowsByMovie(grouped);
    } catch {
      setError('Unable to load movies from the Spring Boot backend (port 8080).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMovies(searchQuery);
  };

  const featured = activeMovie || movies[0];
  const media = getMovieMediaAssets(featured);
  const featuredShows = featured ? showsByMovie[featured.id] || [] : [];

  return (
    <div className="relative min-h-screen pb-20">
      {/* Dynamic Desaturated Backdrop that changes when hovering/selecting any movie */}
      {featured && (
        <div className="pointer-events-none absolute inset-x-0 -top-20 h-[470px] overflow-hidden z-0 transition-all duration-500">
          <img
            src={media.backdropUrl}
            alt={featured.title}
            className="w-full h-full object-cover object-center grayscale contrast-125 opacity-30 scale-105 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/75 to-white" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/55 to-white/85" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-6 space-y-14">
        {/* Featured Movie Hero Section (Matching the Pinterest 2-Column Aesthetic) */}
        {featured && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-5">
              <div className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-crimson-500">
                <span>NOW SHOWING</span>
                <span>•</span>
                <span>{featured.genre}</span>
                <span>•</span>
                <span>{featured.language}</span>
                {featured.approvedDynamicPrice && (
                  <span className="ml-2 px-2.5 py-0.5 rounded-full bg-crimson-50 text-crimson-600 border border-crimson-100">
                    AI Price Active
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-baseline gap-4">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                  {featured.title}
                </h1>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-extrabold text-[10px]">
                    IMDb
                  </span>
                  <span>{featured.rating}</span>
                  <span className="text-slate-400">•</span>
                  <span>{formatDurationHrsMins(featured.duration)}</span>
                </div>
              </div>

              <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
                {featured.description}
              </p>

              {/* Quick Showtime Strip */}
              <div className="pt-2 flex flex-wrap items-center gap-8">
                <div>
                  <span className="block text-[11px] font-medium text-slate-400">
                    Ticket Price
                  </span>
                  <span className="text-xl font-extrabold text-slate-900">
                    ₹ {featured.effectivePrice}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400">
                    Release Date
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {featured.releaseDate}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {featuredShows.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/shows/${featuredShows[0].id}/seats`)}
                      className="px-7 py-3.5 rounded-lg bg-crimson-500 hover:bg-crimson-600 text-white font-bold text-xs uppercase tracking-wider transition cta-crimson-shadow"
                    >
                      Book Seats Now
                    </button>
                  ) : null}
                  <Link
                    to={`/movies/${featured.id}`}
                    className="px-5 py-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition"
                  >
                    All Showtimes
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Floating Poster with Red Play Button */}
            <div className="lg:col-span-4 flex flex-col items-center lg:items-end">
              <div className="w-60 sm:w-64 flex flex-col items-center">
                <div className="relative w-full h-80 sm:h-96 rounded-xl poster-elevation bg-slate-900">
                  <img
                    src={featured.posterUrl}
                    alt={featured.title}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = media.posterFallback;
                    }}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl flex items-end justify-center pb-6 px-3 text-center">
                    <span className="text-[10px] tracking-[0.2em] text-white/90 font-semibold uppercase">
                      {media.tagline}
                    </span>
                  </div>
                  <a
                    href={media.trailerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="-bottom-5 left-1/2 -translate-x-1/2 absolute w-11 h-11 rounded-full bg-crimson-500 hover:bg-crimson-600 text-white flex items-center justify-center cta-crimson-shadow transition hover:scale-105"
                  >
                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4.5 3.5v13l11-6.5-11-6.5z" />
                    </svg>
                  </a>
                </div>
                <span className="mt-8 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">
                  WATCH TRAILER
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter Row */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Select a Movie to Update Backdrop & Book Seats
            </h2>
            <p className="text-xs text-slate-400">
              Click any card to preview its atmosphere or jump straight into auditorium seat selection
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movie title..."
              className="w-full sm:w-64 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-crimson-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchMovies('');
                }}
                className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold"
              >
                Reset
              </button>
            )}
          </form>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-crimson-600 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Movie Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-80 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-7">
            {movies.map((movie) => {
              const isSelected = featured?.id === movie.id;
              const movieMedia = getMovieMediaAssets(movie);
              const movieShows = showsByMovie[movie.id] || [];

              return (
                <div
                  key={movie.id}
                  onMouseEnter={() => setActiveMovie(movie)}
                  className={`group flex flex-col rounded-xl bg-white transition duration-200 ${
                    isSelected ? 'ring-2 ring-crimson-500 ring-offset-4' : ''
                  }`}
                >
                  <div className="relative h-72 rounded-xl overflow-hidden poster-elevation bg-slate-100">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = movieMedia.posterFallback;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-white/90 backdrop-blur text-slate-900 text-[10px] font-extrabold shadow-sm">
                      IMDb {movie.rating}
                    </div>
                    {movie.approvedDynamicPrice && (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-crimson-500 text-white text-[10px] font-bold">
                        AI ₹{movie.approvedDynamicPrice}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {movie.genre} • {formatDurationHrsMins(movie.duration)}
                      </p>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-0.5 line-clamp-1">
                        {movie.title}
                      </h3>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-slate-900">
                        ₹ {movie.effectivePrice}
                      </span>
                      {movieShows.length > 0 ? (
                        <Link
                          to={`/shows/${movieShows[0].id}/seats`}
                          className="text-xs font-extrabold text-crimson-500 hover:text-crimson-600"
                        >
                          02 Seats →
                        </Link>
                      ) : (
                        <Link
                          to={`/movies/${movie.id}`}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900"
                        >
                          Details →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
