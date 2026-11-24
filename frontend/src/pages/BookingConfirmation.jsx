import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { bookingApi } from '../services/api';

const BookingConfirmation = () => {
  const { reference } = useParams();
  const location = useLocation();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!booking) {
      bookingApi
        .getByReference(reference)
        .then((res) => setBooking(res.data))
        .catch(() => setError('Could not load booking confirmation details.'))
        .finally(() => setLoading(false));
    }
  }, [reference, booking]);

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-sm">Loading ticket pass...</div>;
  }

  if (error || !booking) {
    return <div className="max-w-xl mx-auto p-6 rounded-xl bg-rose-50 text-crimson-600">{error}</div>;
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 poster-elevation space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              05 FINISH • CONFIRMED
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{booking.movieTitle}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Booking Ref: <strong className="text-crimson-500 font-mono">{booking.bookingReference}</strong>
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-md">
            ✓
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-400">Theatre & Auditorium</span>
            <span className="font-bold text-slate-800">
              {booking.theatreName} • {booking.screenName}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-400">Date & Showtime</span>
            <span className="font-bold text-slate-800">
              {booking.showDateTime ? new Date(booking.showDateTime).toLocaleString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-400">Reserved Seats</span>
            <span className="font-extrabold text-seatblue-500">
              {booking.seats?.map((s) => `${s.seatNumber} (${s.category})`).join(', ')}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-400">Payment Ref</span>
            <span className="font-mono text-xs text-slate-600">{booking.paymentReference}</span>
          </div>
          <div className="flex justify-between pt-3 items-baseline">
            <span className="text-xs font-extrabold uppercase tracking-widest text-crimson-500">
              TOTAL PAID
            </span>
            <span className="text-2xl font-extrabold text-slate-900">₹ {booking.totalAmount}</span>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Link
            to="/my-bookings"
            className="flex-1 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-center text-xs font-bold uppercase tracking-wider text-slate-700 transition"
          >
            My Bookings
          </Link>
          <Link
            to="/"
            className="flex-1 py-3 rounded-lg bg-crimson-500 hover:bg-crimson-600 text-center text-xs font-bold uppercase tracking-wider text-white transition cta-crimson-shadow"
          >
            Browse Movies
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
