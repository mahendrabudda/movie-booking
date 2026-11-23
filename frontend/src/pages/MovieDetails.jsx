import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { movieApi, theatreShowApi } from '../services/api';

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
      } catch (err) {
        setError('Could not load movie details or shows.');
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [id]);

  if (loading) {
    return <div className="py-16 text-center text-slate-400">Loading movie & show timings...</div>;
  }

  if (error || !movie) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300">
        {error || 'Movie not found'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-8">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/400x600/0f172a/f59e0b?text=' + encodeURIComponent(movie.title);
          }}
          className="w-48 sm:w-56 h-72 sm:h-80 object-cover rounded-xl border border-slate-700 shrink-0"
        />

        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
              ★ {movie.rating} / 10
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium">
              {movie.genre}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium">
              {movie.language}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium">
              {movie.duration} mins
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white">{movie.title}</h1>
          <p className="text-slate-300 text-sm leading-relaxed">{movie.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Release Date</span>
              <span className="text-sm font-semibold text-white">{movie.releaseDate}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Standard Base Price</span>
              <span className="text-sm font-semibold text-white">₹{movie.basePrice}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">AI Approved Dynamic Price</span>
              <span className="text-sm font-bold text-amber-400">
                {movie.approvedDynamicPrice ? `₹${movie.approvedDynamicPrice}` : 'Using Show Base Price'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Show Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Available Shows & Theatres</h2>
          <Link to="/" className="text-xs text-amber-400 hover:underline">← Back to all movies</Link>
        </div>

        {shows.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
            No shows are currently scheduled for this movie.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shows.map((show) => (
              <div
                key={show.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{show.theatreName}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-mono">
                      {show.theatreType} (Max ₹{show.theatreMaxPrice})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {show.city} • Screen: <span className="text-slate-200 font-medium">{show.screenName}</span>
                  </p>
                  <p className="text-xs text-amber-400 font-semibold pt-1">
                    {new Date(show.showDateTime).toLocaleString()}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">
                      Regular: <strong className="text-white">₹{show.effectiveTicketPrice}</strong>
                    </span>
                    <span className="text-xs text-slate-400 block">
                      Premium: <strong className="text-amber-400">₹{show.premiumTicketPrice}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/shows/${show.id}/seats`)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                  >
                    Select Seats
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetails;
