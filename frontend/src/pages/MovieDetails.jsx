import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { movieApi, theatreShowApi } from '../services/api';
import { formatDurationHrsMins, getMovieMediaAssets } from '../services/movieMedia';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const [movieRes, showsRes] = await Promise.all([
          movieApi.getById(id),
          theatreShowApi.getShows(id),
        ]);
        setMovie(movieRes.data);
        setShows(showsRes.data);
      } catch {
        setError('Could not load movie details or shows.');
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [id]);

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-sm">Loading movie overview...</div>;
  }

  if (error || !movie) {
    return <div className="max-w-3xl mx-auto p-6 rounded-xl bg-rose-50 text-crimson-600">{error}</div>;
  }

  const media = getMovieMediaAssets(movie);

  return (
    <div className="relative min-h-screen pb-16">
      {/* Dynamic Desaturated Movie Backdrop */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-[440px] overflow-hidden z-0">
        <img
          src={media.backdropUrl}
          alt={movie.title}
          className="w-full h-full object-cover object-center grayscale contrast-125 opacity-30 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/75 to-white" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-white/85" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left 8 Cols: Movie Header + Showtime Cards */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-4">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {movie.title}
                </h1>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-extrabold text-[10px]">
                    IMDb
                  </span>
                  <span>{movie.rating}</span>
                  <span>•</span>
                  <span>{formatDurationHrsMins(movie.duration)}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                {movie.description}
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Select Auditorium & Showtime
              </h2>

              {shows.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 text-sm">
                  No shows are currently scheduled for this movie.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {shows.map((show) => {
                    const dt = new Date(show.showDateTime);
                    return (
                      <div
                        key={show.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-crimson-500 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              {show.city} • {show.theatreType} (Max ₹{show.theatreMaxPrice})
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                              {show.theatreName}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Screen: {show.screenName}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-crimson-50 text-crimson-600 font-extrabold text-xs">
                            {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="text-xs text-slate-500">
                            Regular <strong className="text-slate-900">₹{show.effectiveTicketPrice}</strong> • VIP{' '}
                            <strong className="text-slate-900">₹{show.premiumTicketPrice}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/shows/${show.id}/seats`)}
                            className="px-4 py-2 rounded-lg bg-crimson-500 hover:bg-crimson-600 text-white font-bold text-xs transition"
                          >
                            Select Seats →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right 4 Cols: Floating Poster + Play Button */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end">
            <div className="w-64 sm:w-72 flex flex-col items-center">
              <div className="relative w-full h-96 rounded-xl poster-elevation bg-slate-900">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = media.posterFallback;
                  }}
                  className="w-full h-full object-cover rounded-xl"
                />
                <a
                  href={media.trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="-bottom-5 left-1/2 -translate-x-1/2 absolute w-11 h-11 rounded-full bg-crimson-500 hover:bg-crimson-600 text-white flex items-center justify-center cta-crimson-shadow transition"
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
      </div>
    </div>
  );
};

export default MovieDetails;
