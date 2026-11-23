import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { movieApi } from '../services/api';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMovies = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await movieApi.getAll(query);
      setMovies(res.data);
    } catch (err) {
      setError('Unable to load movies from the backend API. Make sure Spring Boot is running on port 8080.');
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

  return (
    <div className="space-y-8">
      {/* Hero & Search Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 sm:p-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-3">
            Now Showing • AI Dynamic Pricing Enabled
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Book Cinema Tickets with Real-Time AI Pricing
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2">
            Browse movies, inspect show timings across Single-Screen (capped at ₹350) and Multiplex (capped at ₹450) theatres, and pick your seats.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies by title (e.g., Kalki, Dune, Salaar)..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
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
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-96 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-14 bg-slate-900/50 rounded-2xl border border-slate-800">
          <p className="text-slate-300 font-medium">No movies matched your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="group bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden flex flex-col transition shadow-lg"
            >
              <div className="relative h-72 bg-slate-950 overflow-hidden">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://placehold.co/400x600/0f172a/f59e0b?text=' + encodeURIComponent(movie.title);
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur border border-amber-500/40 text-amber-400 text-xs font-bold">
                  ★ {movie.rating}
                </div>
                {movie.approvedDynamicPrice && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-500/90 text-slate-950 text-[11px] font-extrabold uppercase">
                    AI Price Active
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <span>{movie.genre}</span>
                    <span>•</span>
                    <span>{movie.language}</span>
                    <span>•</span>
                    <span>{movie.duration}m</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1.5 line-clamp-1">{movie.title}</h2>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{movie.description}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Starting at</span>
                    <span className="text-lg font-extrabold text-amber-400">
                      ₹{movie.effectivePrice}
                    </span>
                  </div>
                  <Link
                    to={`/movies/${movie.id}`}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                  >
                    View Shows →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
