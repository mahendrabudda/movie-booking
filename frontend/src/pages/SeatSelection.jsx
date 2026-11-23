import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { theatreShowApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SeatSelection = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSeats = async () => {
      setLoading(true);
      try {
        const [showRes, seatsRes] = await Promise.all([
          theatreShowApi.getShowById(showId),
          theatreShowApi.getShowSeats(showId),
        ]);
        setShow(showRes.data);
        setSeats(seatsRes.data);
      } catch (err) {
        setError('Unable to load seat layout for this show.');
      } finally {
        setLoading(false);
      }
    };
    fetchSeats();
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

  const totalPrice = selectedSeats.reduce((sum, s) => sum + Number(s.price), 0);

  const handleProceedToCheckout = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/checkout', {
      state: {
        show,
        selectedSeats,
        totalPrice,
      },
    });
  };

  if (loading) {
    return <div className="py-16 text-center text-slate-400">Loading auditorium seat map...</div>;
  }

  if (error || !show) {
    return <div className="p-6 rounded-xl bg-rose-500/15 text-rose-300">{error || 'Show not found'}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{show.movieTitle}</h1>
          <p className="text-sm text-slate-400">
            {show.theatreName} ({show.theatreType}) • {show.screenName}
          </p>
          <p className="text-xs text-amber-400 font-semibold mt-1">
            {new Date(show.showDateTime).toLocaleString()}
          </p>
        </div>
        <div className="text-xs text-slate-300 space-y-1 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <div>Regular Seat: <strong className="text-white">₹{show.effectiveTicketPrice}</strong></div>
          <div>Premium Seat: <strong className="text-amber-400">₹{show.premiumTicketPrice}</strong></div>
          <div className="text-[11px] text-slate-400">Theatre Price Cap: ₹{show.theatreMaxPrice}</div>
        </div>
      </div>

      {/* Screen Curve Indicator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-8">
        <div className="max-w-md mx-auto">
          <div className="h-2.5 rounded-t-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_6px_25px_rgba(245,158,11,0.45)]" />
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 mt-2">
            All Eyes This Way — Cinema Screen
          </p>
        </div>

        {/* Seat Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-slate-800 border border-slate-600 inline-block" />
            <span>Regular Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-indigo-950 border border-indigo-400 inline-block" />
            <span>Premium Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-amber-500 text-slate-950 inline-block" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-rose-950/80 border border-rose-800/60 inline-block opacity-60" />
            <span>Sold / Booked</span>
          </div>
        </div>

        {/* Seat Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 max-w-2xl mx-auto pt-2">
          {seats.map((seat) => {
            const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId);
            let btnStyle =
              'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200';
            if (seat.category === 'PREMIUM') {
              btnStyle =
                'bg-indigo-950/90 hover:bg-indigo-900 border-indigo-500/60 text-indigo-200';
            }
            if (isSelected) {
              btnStyle =
                'bg-amber-500 border-amber-300 text-slate-950 font-extrabold shadow-md scale-105';
            }
            if (seat.booked) {
              btnStyle =
                'bg-rose-950/40 border-rose-900/40 text-slate-600 cursor-not-allowed opacity-60';
            }

            return (
              <button
                key={seat.seatId}
                type="button"
                disabled={seat.booked}
                onClick={() => toggleSeat(seat)}
                className={`py-2.5 px-2 rounded-lg border text-xs transition flex flex-col items-center justify-center ${btnStyle}`}
              >
                <span>{seat.seatNumber}</span>
                <span className="text-[10px] opacity-80">₹{seat.price}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">Selected Seats ({selectedSeats.length})</p>
          <p className="text-sm font-bold text-white mt-0.5">
            {selectedSeats.length > 0
              ? selectedSeats.map((s) => `${s.seatNumber} (${s.category})`).join(', ')
              : 'None selected yet'}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total Payable</span>
            <span className="text-2xl font-extrabold text-amber-400">₹{totalPrice.toFixed(2)}</span>
          </div>

          <button
            type="button"
            disabled={selectedSeats.length === 0}
            onClick={handleProceedToCheckout}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-sm transition"
          >
            Proceed to Checkout →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
