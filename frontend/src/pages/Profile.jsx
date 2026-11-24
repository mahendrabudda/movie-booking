import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingApi } from '../services/api';

const Profile = () => {
  const { user, selectedCity, updateCity, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [savedUpi, setSavedUpi] = useState(() => localStorage.getItem('mahaa_upi_id') || 'buddamahendra05@okaxis');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    bookingApi.getMyBookings().then((res) => setBookings(res.data)).catch(() => {});
  }, []);

  const totalSpent = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const avatarSeed = encodeURIComponent(user?.fullName || 'mahaa');

  const handleSavePreferences = (e) => {
    e.preventDefault();
    localStorage.setItem('mahaa_upi_id', savedUpi.trim());
    setSavedMsg('Profile preferences & UPI ID saved!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=ffe4e6`}
            alt={user?.fullName}
            className="w-20 h-20 rounded-full border-2 border-[#f84464] shadow"
          />
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-[#f84464] text-[10px] font-extrabold uppercase">
              {user?.role}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{user?.fullName}</h1>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="flex gap-4 text-center">
          <div className="px-5 py-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-400 block font-semibold">Tickets Booked</span>
            <strong className="text-xl font-extrabold text-slate-900">{bookings.length}</strong>
          </div>
          <div className="px-5 py-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-400 block font-semibold">Total Spent</span>
            <strong className="text-xl font-extrabold text-[#f84464]">₹{totalSpent.toFixed(0)}</strong>
          </div>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          {savedMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleSavePreferences} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-slate-900">Account & Payment Preferences</h2>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Preferred City</label>
            <select
              value={selectedCity}
              onChange={(e) => updateCity(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            >
              {['Hyderabad', 'Visakhapatnam', 'Vijayawada', 'Bengaluru', 'Chennai', 'Mumbai'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Default UPI ID (Checkout QR)</label>
            <input
              type="text"
              value={savedUpi}
              onChange={(e) => setSavedUpi(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-mono"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#f84464] hover:bg-[#e03353] text-white text-xs font-bold"
            >
              Save Preferences
            </button>
            <button
              type="button"
              onClick={logout}
              className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              Sign Out
            </button>
          </div>
        </form>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Recent Tickets</h2>
            <Link to="/my-bookings" className="text-xs font-bold text-[#f84464] hover:underline">
              View All →
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No tickets booked yet.</p>
          ) : (
            bookings.slice(0, 3).map((b) => (
              <Link
                key={b.id}
                to={`/booking-confirmation/${b.bookingReference}`}
                className="block p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition"
              >
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-900">{b.movieTitle}</span>
                  <span className="text-[#f84464]">{b.bookingReference}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {b.theatreName} • Seats: {b.seats?.map((s) => s.seatNumber).join(', ')}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;