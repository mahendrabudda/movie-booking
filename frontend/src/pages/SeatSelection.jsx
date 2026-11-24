import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { movieApi, theatreShowApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDurationHrsMins, getMovieMediaAssets } from '../services/movieMedia';

const SeatSelection = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [show, setShow] = useState(null);
  const [movie, setMovie] = useState(null);
  const [allMovieShows, setAllMovieShows] = useState([]);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(295); // 04:55 live countdown timer

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 295));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchShowAndSeats = async () => {
      setLoading(true);
      setSelectedSeats([]);
      try {
        const [showRes, seatsRes] = await Promise.all([
          theatreShowApi.getShowById(showId),
          theatreShowApi.getShowSeats(showId),
        ]);
        const currentShow = showRes.data;
        setShow(currentShow);
        setSeats(seatsRes.data);

        const [movieRes, movieShowsRes] = await Promise.all([
          movieApi.getById(currentShow.movieId),
          theatreShowApi.getShows(currentShow.movieId),
        ]);
        setMovie(movieRes.data);
        setAllMovieShows(movieShowsRes.data);
      } catch (err) {
        setError('Unable to load auditorium seat map for this show.');
      } finally {
        setLoading(false);
      }
    };
    fetchShowAndSeats();
  }, [showId]);

  const toggleSeat = (seat) => {
    if (seat.booked) return;
    const exists = selectedSeats.some((s) => s.seatId === seat.seatId);
    if (exists) {
      setSelectedSeats(selectedSeats.filter((s) => s.seatId !== seat.seatId));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  // Group seats by row letter (A, B, C...) so we can render row labels on both left and right sides
  const rowsMap = seats.reduce((acc, seat) => {
    const rowLetter = seat.seatNumber.replace(/[0-9]/g, '') || 'A';
    if (!acc[rowLetter]) acc[rowLetter] = [];
    acc[rowLetter].push(seat);
    return acc;
  }, {});

  // Display rows from back/top (C, B, A) or standard order
  const rowLetters = Object.keys(rowsMap).sort().reverse();

  // Group selected seats by category for the right-hand "Your Seats" summary
  const regularSelected = selectedSeats.filter((s) => s.category === 'REGULAR');
  const premiumSelected = selectedSeats.filter((s) => s.category === 'PREMIUM');
  const regularSubtotal = regularSelected.reduce((sum, s) => sum + Number(s.price), 0);
  const premiumSubtotal = premiumSelected.reduce((sum, s) => sum + Number(s.price), 0);
  const totalPrice = regularSubtotal + premiumSubtotal;

  const formatTimer = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/checkout', {
      state: {
        show,
        movie,
        selectedSeats,
        totalPrice,
      },
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm font-medium">
        Loading cinema auditorium & seat layout...
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-6 rounded-2xl bg-rose-50 border border-rose-200 text-crimson-600 text-sm">
        {error || 'Show not found'}
      </div>
    );
  }

  const media = getMovieMediaAssets(movie || { title: show.movieTitle });
  const showDateObj = new Date(show.showDateTime);
  const formattedDate = showDateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = showDateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="relative min-h-screen pb-16">
      {/* Dynamic Desaturated Movie Backdrop Header ("according to movie") */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-[430px] overflow-hidden z-0">
        <img
          src={media.backdropUrl}
          alt={show.movieTitle}
          className="w-full h-full object-cover object-center grayscale contrast-125 opacity-30 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/75 to-white" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-white/80" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* LEFT / MAIN COLUMN (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Movie Title, IMDb Badge, Duration & Synopsis */}
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-baseline gap-4">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {show.movieTitle}
                </h1>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200/90 text-slate-700 font-extrabold tracking-tight text-[10px]">
                    IMDb
                  </span>
                  <span>{movie?.rating || '8.5'}</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {formatDurationHrsMins(movie?.duration || 165)}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-2">
                {movie?.description ||
                  'Experience this theatrical release in crystal-clear laser projection with AI-optimized dynamic seat pricing.'}
              </p>
            </div>

            {/* Metadata Bar (Theatre no | Date | Show time) + Seat Status Legend */}
            <div className="pt-4 flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-wrap items-center gap-8 sm:gap-12">
                <div>
                  <span className="block text-[11px] font-medium text-slate-400 mb-1">
                    Theatre no
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {show.theatreName} • {show.screenName}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400 mb-1">
                    Date
                  </span>
                  <span className="text-sm font-bold text-slate-800">{formattedDate}</span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400 mb-1">
                    Show time
                  </span>
                  {allMovieShows.length > 1 ? (
                    <select
                      value={show.id}
                      onChange={(e) => navigate(`/shows/${e.target.value}/seats`)}
                      className="text-sm font-bold text-slate-800 bg-transparent border-b border-slate-300 focus:outline-none focus:border-crimson-500 pb-0.5 cursor-pointer"
                    >
                      {allMovieShows.map((s) => {
                        const dt = new Date(s.showDateTime);
                        return (
                          <option key={s.id} value={s.id}>
                            {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} ({s.theatreName})
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <span className="text-sm font-bold text-slate-800">{formattedTime}</span>
                  )}
                </div>
              </div>

              {/* Top Seat Legend matching Pinterest UI */}
              <div className="flex items-center gap-5 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-[3px] bg-slate-400 inline-block" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-[3px] bg-slate-200 inline-block" />
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-[3px] border border-slate-300 bg-white inline-block" />
                  <span>Sold out</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-[3px] bg-seatblue-500 seat-selected-shadow inline-block" />
                  <span className="text-slate-600 font-semibold">Selected</span>
                </div>
              </div>
            </div>

            {/* Sweeping Crimson Red Curved SCREEN Arc */}
            <div className="pt-2">
              <div className="relative w-full">
                <svg
                  viewBox="0 0 800 55"
                  className="w-full h-12 overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <filter id="screenGlow" x="-10%" y="-20%" width="120%" height="180%">
                      <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#e51937" floodOpacity="0.22" />
                    </filter>
                  </defs>
                  <path
                    d="M 10 42 Q 400 -8 790 42"
                    fill="none"
                    stroke="#e51937"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    filter="url(#screenGlow)"
                  />
                </svg>
                <p className="text-center text-[10px] font-semibold tracking-[0.38em] uppercase text-slate-400 -mt-3">
                  SCREEN
                </p>
              </div>
            </div>

            {/* Auditorium Seat Matrix */}
            <div className="bg-slate-50/75 rounded-3xl px-6 sm:px-10 py-10 border border-slate-100/90 space-y-5">
              {rowLetters.map((rowLetter) => {
                const rowSeats = rowsMap[rowLetter];
                const isPremiumRow = rowSeats.some((s) => s.category === 'PREMIUM');

                return (
                  <div
                    key={rowLetter}
                    className="flex items-center justify-between gap-4"
                  >
                    {/* Left Row Label */}
                    <span className="w-5 text-[11px] font-semibold text-slate-300 text-left select-none">
                      {rowLetter}
                    </span>

                    {/* Seats in Row */}
                    <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 flex-wrap">
                      {rowSeats.map((seat, idx) => {
                        const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId);
                        const isBooked = seat.booked;

                        // Add subtle center aisle gap after seat 2 and seat 6 in an 8-seat row
                        const aisleMargin =
                          idx === 1 || idx === 5 ? 'mr-3 sm:mr-5' : '';

                        if (isPremiumRow) {
                          // VIP / Armchair / Love-Box wider seat silhouette
                          return (
                            <button
                              key={seat.seatId}
                              type="button"
                              disabled={isBooked}
                              onClick={() => toggleSeat(seat)}
                              title={`Seat ${seat.seatNumber} (${seat.category}) — ₹${seat.price}`}
                              className={`group relative transition-all duration-150 ${aisleMargin} ${
                                isBooked
                                  ? 'cursor-not-allowed opacity-45'
                                  : 'hover:-translate-y-0.5 cursor-pointer'
                              }`}
                            >
                              <div
                                className={`w-9 sm:w-10 h-7 rounded-t-lg rounded-b-[4px] flex flex-col items-center justify-center transition ${
                                  isSelected
                                    ? 'bg-seatblue-500 text-white seat-selected-shadow'
                                    : isBooked
                                    ? 'bg-slate-200 text-slate-400 border border-slate-300'
                                    : 'bg-slate-400/90 hover:bg-slate-500 text-white'
                                }`}
                              >
                                <span className="text-[9px] font-bold leading-none">
                                  {seat.seatNumber}
                                </span>
                                <span
                                  className={`w-7 h-1 mt-1 rounded-full ${
                                    isSelected
                                      ? 'bg-blue-300'
                                      : isBooked
                                      ? 'bg-slate-300'
                                      : 'bg-slate-300/80'
                                  }`}
                                />
                              </div>
                            </button>
                          );
                        }

                        // Standard Regular Cinema Seat silhouette
                        return (
                          <button
                            key={seat.seatId}
                            type="button"
                            disabled={isBooked}
                            onClick={() => toggleSeat(seat)}
                            title={`Seat ${seat.seatNumber} (${seat.category}) — ₹${seat.price}`}
                            className={`group relative transition-all duration-150 ${aisleMargin} ${
                              isBooked
                                ? 'cursor-not-allowed opacity-50'
                                : 'hover:-translate-y-0.5 cursor-pointer'
                            }`}
                          >
                            <div
                              className={`w-7 sm:w-8 h-6 rounded-t-md rounded-b-[3px] flex flex-col items-center justify-center transition ${
                                isSelected
                                  ? 'bg-seatblue-500 text-white seat-selected-shadow'
                                  : isBooked
                                  ? 'bg-white border border-slate-300 text-slate-300'
                                  : 'bg-slate-400/90 hover:bg-slate-500 text-white'
                              }`}
                            >
                              <span className="text-[9px] font-bold leading-none">
                                {seat.seatNumber}
                              </span>
                              <span
                                className={`w-5 h-[3px] mt-1 rounded-full ${
                                  isSelected
                                    ? 'bg-blue-300'
                                    : isBooked
                                    ? 'bg-slate-200'
                                    : 'bg-slate-300/75'
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Row Label */}
                    <span className="w-5 text-[11px] font-semibold text-slate-300 text-right select-none">
                      {rowLetter}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Seat Category Legend + Green Countdown Timer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1 px-2">
              <div className="flex items-center gap-6 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-3.5 rounded-t bg-slate-400 inline-block" />
                  <span>Regular Seats (₹{show.effectiveTicketPrice})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-3.5 rounded-t bg-slate-400 inline-block" />
                  <span>Premium / VIP (₹{show.premiumTicketPrice})</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {show.theatreType} Cap: ₹{show.theatreMaxPrice}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  TIME LEFT
                </span>
                <span className="text-base font-extrabold text-emerald-500 tabular-nums">
                  {formatTimer(secondsLeft)}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR COLUMN (4 cols): Floating Poster + Play Button + "Your Seats" Summary */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end space-y-10">
            {/* Floating Poster Card with Red Circular Play Trailer Button */}
            <div className="w-64 sm:w-72 flex flex-col items-center">
              <div className="relative w-full h-96 rounded-xl overflow-visible poster-elevation bg-slate-900">
                <img
                  src={movie?.posterUrl || media.posterFallback}
                  alt={show.movieTitle}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = media.posterFallback;
                  }}
                  className="w-full h-full object-cover rounded-xl"
                />
                {/* Subtle bottom gradient for tagline */}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/30 to-transparent rounded-b-xl flex flex-col items-center justify-end pb-7 px-4 text-center">
                  <p className="text-[10px] tracking-[0.22em] text-white/90 font-semibold uppercase">
                    {media.tagline}
                  </p>
                </div>

                {/* Overlapping Red Play Button */}
                <a
                  href={media.trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Watch Official Trailer"
                  className=" -bottom-5 left-1/2 -translate-x-1/2 absolute w-11 h-11 rounded-full bg-crimson-500 hover:bg-crimson-600 text-white flex items-center justify-center cta-crimson-shadow transition hover:scale-105"
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

            {/* "Your Seats" Summary & Crimson CTA */}
            <div className="w-full max-w-xs space-y-5 pt-2">
              <h3 className="text-xs font-semibold text-slate-400 tracking-wide">
                Your Seats
              </h3>

              {selectedSeats.length === 0 ? (
                <div className="py-6 border-y border-slate-100 text-xs text-slate-400">
                  Click any available seat on the auditorium map to add it to your booking.
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {regularSelected.length > 0 && (
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span className="w-28">Regular</span>
                      <span className="text-slate-500 font-bold">{regularSelected.length}</span>
                      <span className="w-20 text-right font-bold text-slate-800">
                        ₹ {regularSubtotal.toFixed(0)}
                      </span>
                    </div>
                  )}

                  {premiumSelected.length > 0 && (
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span className="w-28">Premium VIP</span>
                      <span className="text-slate-500 font-bold">{premiumSelected.length}</span>
                      <span className="w-20 text-right font-bold text-slate-800">
                        ₹ {premiumSubtotal.toFixed(0)}
                      </span>
                    </div>
                  )}

                  <div className="pt-1 text-[11px] text-slate-400">
                    Seats:{' '}
                    <span className="font-bold text-seatblue-500">
                      {selectedSeats.map((s) => s.seatNumber).join(', ')}
                    </span>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 flex items-baseline justify-between">
                <span className="text-xs font-bold tracking-widest uppercase text-crimson-500">
                  TOTAL
                </span>
                <span className="text-2xl font-extrabold text-slate-900">
                  ₹ {totalPrice.toFixed(0)}
                </span>
              </div>

              <button
                type="button"
                disabled={selectedSeats.length === 0}
                onClick={handleProceedToCheckout}
                className="w-full py-3.5 rounded-lg bg-crimson-500 hover:bg-crimson-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-bold text-xs tracking-wider uppercase transition cta-crimson-shadow"
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
