import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { movieApi, theatreShowApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDurationHrsMins, getMovieMediaAssets } from '../services/movieMedia';

const CITIES = ['Hyderabad', 'Visakhapatnam', 'Vijayawada', 'Bengaluru', 'Chennai', 'Mumbai'];

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const { selectedCity, updateCity } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadCatalog = async () => {
      setLoading(true);
      setError('');
      try {
        const [movRes, thRes, showsRes] = await Promise.all([
          movieApi.getAll(queryParam),
          theatreShowApi.getTheatres(),
          theatreShowApi.getShows(),
        ]);
        setMovies(movRes.data);
        setTheatres(thRes.data);
        setShows(showsRes.data);
      } catch {
        setError('Unable to load movies & theatres from the backend API.');
      } finally {
        setLoading(false);
      }
    };
    loadCatalog();
  }, [queryParam]);

  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % Math.min(movies.length, 4));
    }, 5000);
    return () => clearInterval(timer);
  }, [movies]);

  const showsByMovie = shows.reduce((acc, sh) => {
    if (!acc[sh.movieId]) acc[sh.movieId] = [];
    acc[sh.movieId].push(sh);
    return acc;
  }, {});

  // Filter theatres in the chosen city (case-insensitive)
  const cityTheatres = theatres.filter(
  (t) => t.city?.trim().toLowerCase() === (selectedCity || 'Hyderabad').trim().toLowerCase()
);

  // Group shows per theatre -> per movie running in that theatre
  const getMoviesInTheatre = (theatreId) => {
    const theatreShows = shows.filter((s) => s.theatreId === theatreId);
    const byMovie = {};
    for (const sh of theatreShows) {
      if (!byMovie[sh.movieId]) {
        byMovie[sh.movieId] = {
          movieId: sh.movieId,
          movieTitle: sh.movieTitle,
          shows: [],
        };
      }
      byMovie[sh.movieId].shows.push(sh);
    }
    return Object.values(byMovie);
  };

  const languages = ['ALL', ...new Set(movies.map((m) => m.language))];
  const genres = ['ALL', ...new Set(movies.map((m) => m.genre))];

  const filteredMovies = movies.filter((m) => {
    const matchLang = selectedLanguage === 'ALL' || m.language === selectedLanguage;
    const matchGenre = selectedGenre === 'ALL' || m.genre === selectedGenre;
    return matchLang && matchGenre;
  });

  const bannerMovies = movies.slice(0, 4);
  const activeBanner = bannerMovies[bannerIndex] || movies[0];
  const activeBannerMedia = getMovieMediaAssets(activeBanner);

  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-10">
      {/* Featured Banner Carousel */}
      {activeBanner && (
        <div className="bg-[#1a1a24] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 h-64 sm:h-80 flex items-center shadow-xl">
              <img
                src={activeBannerMedia.backdropUrl}
                alt={activeBanner.title}
                className="absolute inset-0 w-full h-full object-cover opacity-45"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

              <div className="relative z-10 p-6 sm:p-10 max-w-xl space-y-3">
                <span className="px-2.5 py-1 rounded bg-[#f84464] text-[10px] font-extrabold uppercase tracking-wider">
                  Featured in {selectedCity}
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  {activeBanner.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
                  {activeBanner.description}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <Link
                    to={`/movies/${activeBanner.id}`}
                    className="px-6 py-2.5 rounded-lg bg-[#f84464] hover:bg-[#e03353] text-white text-xs font-extrabold uppercase tracking-wider shadow"
                  >
                    Book Tickets • ₹{activeBanner.effectivePrice}
                  </Link>
                  <span className="text-xs font-bold text-amber-400">
                    ★ {activeBanner.rating}/10
                  </span>
                </div>
              </div>

              {bannerMovies.length > 1 && (
                <div className="absolute bottom-4 right-6 flex gap-2 z-10">
                  {bannerMovies.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBannerIndex(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === bannerIndex ? 'w-6 bg-[#f84464]' : 'w-2 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-10">
        {/* SECTION 1: Choose Location -> Theatres in Location -> Movies Running in Each Theatre */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#f84464]">
                LOCAL CINEMAS & SHOWTIMES
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                Theatres in {selectedCity} & Movies Running
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => updateCity(city)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    selectedCity === city
                      ? 'bg-[#f84464] text-white border-[#f84464]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#f84464]'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {cityTheatres.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">
                No theatres registered in {selectedCity} yet.
              </p>
              <p className="text-xs text-slate-500">
                Select <strong>Hyderabad</strong> above (or add a theatre in {selectedCity} from the Admin Dashboard).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {cityTheatres.map((theatre) => {
                const runningMovies = getMoviesInTheatre(theatre.id);
                return (
                  <div
                    key={theatre.id}
                    className="p-5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {theatre.name}
                        </h3>
                        <p className="text-xs text-slate-500">{theatre.city}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-[10px] font-extrabold text-[#f84464]">
                        {theatre.type} • Cap ₹{theatre.maxTicketPrice}
                      </span>
                    </div>

                    {runningMovies.length === 0 ? (
                      <p className="text-xs text-slate-400">No shows scheduled in this theatre yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {runningMovies.map((mGroup) => (
                          <div key={mGroup.movieId} className="space-y-1.5">
                            <Link
                              to={`/movies/${mGroup.movieId}`}
                              className="text-xs font-extrabold text-slate-800 hover:text-[#f84464] transition"
                            >
                              🎬 {mGroup.movieTitle}
                            </Link>
                            <div className="flex flex-wrap gap-2">
                              {mGroup.shows.map((sh) => {
                                const dt = new Date(sh.showDateTime);
                                return (
                                  <button
                                    key={sh.id}
                                    type="button"
                                    onClick={() => navigate(`/shows/${sh.id}/seats`)}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-emerald-500/70 hover:bg-emerald-50 text-left transition"
                                  >
                                    <span className="text-[11px] font-extrabold text-emerald-700 block">
                                      {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {sh.screenName} • ₹{sh.effectiveTicketPrice}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: Filter Chips + Recommended Movies */}
        <section className="space-y-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Language:</span>
              {languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                    selectedLanguage === lang
                      ? 'bg-[#f84464] text-white border-[#f84464]'
                      : 'bg-white text-[#f84464] border-slate-200 hover:border-[#f84464]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Genre:</span>
              {genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGenre(g)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                    selectedGenre === g
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Recommended Movies {queryParam ? `for "${queryParam}"` : ''}
            </h2>
            <span className="text-xs font-semibold text-[#f84464]">
              {filteredMovies.length} Movies Available
            </span>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-80 rounded-xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {filteredMovies.map((movie) => {
                const movieMedia = getMovieMediaAssets(movie);
                const showCount = (showsByMovie[movie.id] || []).length;

                return (
                  <Link key={movie.id} to={`/movies/${movie.id}`} className="group flex flex-col">
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 shadow-md group-hover:shadow-xl transition">
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = movieMedia.posterFallback;
                        }}
                        className="w-full h-72 sm:h-80 object-cover group-hover:scale-105 transition duration-300"
                      />
                      {movie.approvedDynamicPrice && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-extrabold shadow">
                          AI ₹{movie.approvedDynamicPrice}
                        </span>
                      )}
                      <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1">
                          <span className="text-[#f84464]">★</span> {movie.rating}/10
                        </span>
                        <span className="text-[10px] text-slate-300 font-medium">
                          {showCount} {showCount === 1 ? 'Show' : 'Shows'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 space-y-0.5">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1 group-hover:text-[#f84464] transition">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {movie.genre} • {movie.language} • {formatDurationHrsMins(movie.duration)}
                      </p>
                      <p className="text-xs font-extrabold text-slate-800 pt-0.5">
                        ₹{movie.effectivePrice} onwards
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;