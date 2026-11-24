import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { bookingApi } from '../services/api';
import { getMovieMediaAssets } from '../services/movieMedia';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [paymentMethod, setPaymentMethod] = useState('UPI_MOCK');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!state || !state.show || !state.selectedSeats?.length) {
    return <Navigate to="/" replace />;
  }

  const { show, movie, selectedSeats, totalPrice } = state;
  const media = getMovieMediaAssets(movie || { title: show.movieTitle });

  const handleConfirmPayment = async () => {
    setProcessing(true);
    setError('');
    try {
      const res = await bookingApi.create({
        showId: show.id,
        seatIds: selectedSeats.map((s) => s.seatId),
        mockPaymentMethod: paymentMethod,
      });
      navigate(`/booking-confirmation/${res.data.bookingReference}`, {
        state: { booking: res.data, movie },
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Booking failed. One or more selected seats may have already been reserved.'
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen pb-16">
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-[380px] overflow-hidden z-0">
        <img
          src={media.backdropUrl}
          alt={show.movieTitle}
          className="w-full h-full object-cover object-center grayscale opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/80 to-white" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-8">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-crimson-500">
                04 PAYMENT • MOCK GATEWAY
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {show.movieTitle}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {show.theatreName} • {show.screenName} • {new Date(show.showDateTime).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-widest text-crimson-500 block">
                TOTAL
              </span>
              <span className="text-3xl font-extrabold text-slate-900">
                ₹ {Number(totalPrice).toFixed(0)}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-crimson-600 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Reserved Seats ({selectedSeats.length})
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {selectedSeats.map((s) => (
                <span
                  key={s.seatId}
                  className="px-3.5 py-1.5 rounded-lg bg-seatblue-500 text-white text-xs font-bold seat-selected-shadow"
                >
                  {s.seatNumber} ({s.category} • ₹{s.price})
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Mock Payment Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {[
                { id: 'UPI_MOCK', title: 'UPI Instant Pay', sub: 'GPay / PhonePe (Mock)' },
                { id: 'CARD_MOCK', title: 'Credit / Debit Card', sub: 'Visa / Mastercard (Mock)' },
                { id: 'NETBANKING_MOCK', title: 'NetBanking', sub: 'All Indian Banks (Mock)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-4 rounded-xl border text-left transition ${
                    paymentMethod === m.id
                      ? 'border-crimson-500 bg-crimson-50/50 ring-2 ring-crimson-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <p className="text-xs font-extrabold text-slate-900">{m.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider"
            >
              Back to Seats
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={handleConfirmPayment}
              className="px-8 py-3.5 rounded-lg bg-crimson-500 hover:bg-crimson-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition cta-crimson-shadow"
            >
              {processing ? 'Confirming Ticket...' : `Pay ₹ ${Number(totalPrice).toFixed(0)} & Finish`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
