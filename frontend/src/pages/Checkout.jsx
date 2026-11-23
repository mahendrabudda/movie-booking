import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { bookingApi } from '../services/api';

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

  const { show, selectedSeats, totalPrice } = state;

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
        state: { booking: res.data },
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Booking failed. One or more selected seats may have just been booked.'
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Step 2 of 2 • Mock Payment Gateway
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Review & Confirm Your Booking</h1>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">Movie</span>
            <span className="font-bold text-white">{show.movieTitle}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">Theatre & Screen</span>
            <span className="text-slate-200">{show.theatreName} ({show.screenName})</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">Show Date & Time</span>
            <span className="text-amber-400 font-medium">
              {new Date(show.showDateTime).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">Selected Seats</span>
            <span className="text-white font-semibold">
              {selectedSeats.map((s) => `${s.seatNumber} (₹${s.price})`).join(', ')}
            </span>
          </div>
          <div className="flex justify-between py-3 text-base">
            <span className="font-bold text-white">Total Amount (Calculated on Backend)</span>
            <span className="text-xl font-extrabold text-amber-400">₹{Number(totalPrice).toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Mock Payment Method
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'UPI_MOCK', label: 'UPI Instant Pay (Mock)' },
              { id: 'CARD_MOCK', label: 'Debit / Credit Card (Mock)' },
              { id: 'NETBANKING_MOCK', label: 'NetBanking (Mock)' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={`p-3 rounded-xl border text-xs font-semibold text-left transition ${
                  paymentMethod === m.id
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
          >
            Back
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={handleConfirmPayment}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition shadow-lg"
          >
            {processing ? 'Processing Mock Payment...' : `Pay ₹${Number(totalPrice).toFixed(2)} & Confirm`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
