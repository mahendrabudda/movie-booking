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
    return <div className="py-16 text-center text-slate-400">Loading ticket confirmation...</div>;
  }

  if (error || !booking) {
    return <div className="p-6 rounded-xl bg-rose-500/15 text-rose-300">{error || 'Booking not found'}</div>;
  }

  return (
    <div className="max-w-xl mx-auto mt-6 bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase">
            Booking Confirmed
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-2">{booking.movieTitle}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ref: <span className="font-mono text-amber-400 font-bold">{booking.bookingReference}</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl font-bold">
          ✓
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Theatre & Screen</span>
          <span className="text-white font-medium">
            {booking.theatreName} • {booking.screenName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Show Time</span>
          <span className="text-amber-400 font-semibold">
            {booking.showDateTime ? new Date(booking.showDateTime).toLocaleString() : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Booked Seats</span>
          <span className="text-white font-bold">
            {booking.seats?.map((s) => `${s.seatNumber} (${s.category})`).join(', ')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Mock Payment Reference</span>
          <span className="font-mono text-xs text-slate-300">{booking.paymentReference}</span>
        </div>
        <div className="flex justify-between pt-3 border-t border-slate-800 text-base">
          <span className="font-bold text-white">Total Amount Paid</span>
          <span className="font-extrabold text-emerald-400 text-xl">₹{booking.totalAmount}</span>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between gap-4">
        <Link
          to="/my-bookings"
          className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-bold text-slate-200 transition"
        >
          View My Bookings
        </Link>
        <Link
          to="/"
          className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-center text-xs font-bold text-slate-950 transition"
        >
          Browse More Movies
        </Link>
      </div>
    </div>
  );
};

export default BookingConfirmation;
