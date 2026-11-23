import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../services/api';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingApi
      .getMyBookings()
      .then((res) => setBookings(res.data))
      .catch(() => setError('Unable to load booking history.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-slate-400">Loading your bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Booking History</h1>
          <p className="text-sm text-slate-400">All confirmed tickets booked under your account</p>
        </div>
        <Link
          to="/"
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
        >
          + Book New Tickets
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 text-rose-300 text-sm">{error}</div>
      )}

      {bookings.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <p className="text-slate-300 font-medium">You have not booked any movie tickets yet.</p>
          <Link to="/" className="inline-block text-amber-400 text-sm hover:underline">
            Explore currently showing movies →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    {b.bookingReference}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">{b.movieTitle}</h2>
                  <p className="text-xs text-slate-400">
                    {b.theatreName} • {b.screenName}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    Show: {b.showDateTime ? new Date(b.showDateTime).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  {b.bookingStatus}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="text-slate-300">
                  Seats:{' '}
                  <strong className="text-white">
                    {b.seats?.map((s) => s.seatNumber).join(', ')}
                  </strong>
                </div>
                <div className="text-base font-extrabold text-amber-400">₹{b.totalAmount}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
