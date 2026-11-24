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
    return <div className="py-24 text-center text-slate-400 text-sm">Loading your tickets...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-10 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-crimson-500">
            CUSTOMER PASSES
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">My Bookings</h1>
        </div>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-lg bg-crimson-500 hover:bg-crimson-600 text-white font-bold text-xs uppercase tracking-wider cta-crimson-shadow"
        >
          + Book Tickets
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-crimson-600 text-xs">{error}</div>
      )}

      {bookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-50 border border-slate-100 text-center space-y-3">
          <p className="text-slate-600 font-semibold text-sm">You haven't booked any tickets yet.</p>
          <Link to="/" className="inline-block text-crimson-500 text-xs font-bold hover:underline">
            Explore movies now showing →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono font-bold text-crimson-500">
                    {b.bookingReference}
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">{b.movieTitle}</h2>
                  <p className="text-xs text-slate-500">
                    {b.theatreName} • {b.screenName}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {b.showDateTime ? new Date(b.showDateTime).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase">
                  {b.bookingStatus}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Seats:{' '}
                  <strong className="text-seatblue-500">
                    {b.seats?.map((s) => s.seatNumber).join(', ')}
                  </strong>
                </div>
                <div className="text-lg font-extrabold text-slate-900">₹ {b.totalAmount}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
