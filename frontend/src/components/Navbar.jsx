import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CITIES = ['Hyderabad', 'Visakhapatnam', 'Vijayawada', 'Bengaluru', 'Chennai', 'Mumbai'];

const Navbar = () => {
  const { user, logout, selectedCity, updateCity } = useAuth();
  const [navSearch, setNavSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(navSearch.trim())}`);
  };

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Guest';
  const avatarSeed = encodeURIComponent(user?.fullName || 'mahaa');
  const path = location.pathname;

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-1">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-[#f84464] flex items-center justify-center text-white font-black text-base shadow-sm">
              m
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              mahaa
            </span>
          </Link>

          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg relative">
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search for Movies, Genres, Languages..."
              className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#f84464]"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </form>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedCity}
            onChange={(e) => updateCity(e.target.value)}
            title="Choose your city to see local theatres & shows"
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 cursor-pointer focus:outline-none focus:border-[#f84464]"
          >
            {CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          {user ? (
            <div className="relative group flex items-center gap-2">
              {/* Clicking Consumer Name or Avatar opens /profile directly */}
              <Link
                to="/profile"
                className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-rose-50 transition"
                title="Open Profile"
              >
                <img
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=ffe4e6`}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full border border-[#f84464]/40 shadow-sm"
                />
                <div className="hidden sm:block text-left leading-tight">
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] font-semibold text-[#f84464]">
                    View Profile
                  </span>
                </div>
              </Link>

              <div className="absolute right-0 top-10 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                  <p className="text-[10px] font-bold uppercase text-[#f84464]">{user.role}</p>
                </div>
                <Link to="/profile" className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  My Profile & Location
                </Link>
                <Link to="/my-bookings" className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  My Booked Tickets
                </Link>
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="block px-4 py-2 text-xs font-semibold text-[#f84464] hover:bg-rose-50">
                    Admin & AI Pricing
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border-t border-slate-100 mt-1"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-md bg-[#f84464] hover:bg-[#e03353] text-white text-xs font-bold transition shadow-sm"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Secondary Navigation Strip */}
      <div className="bg-slate-100/90 border-t border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-10 flex items-center justify-between text-xs">
          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className={`font-semibold transition ${
                path === '/' ? 'text-[#f84464]' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Movies & Theatres
            </Link>
            {user && (
              <>
                <Link
                  to="/my-bookings"
                  className={`font-semibold transition ${
                    path === '/my-bookings' ? 'text-[#f84464]' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  My Tickets
                </Link>
                <Link
                  to="/profile"
                  className={`font-semibold transition ${
                    path === '/profile' ? 'text-[#f84464]' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {firstName}'s Profile
                </Link>
              </>
            )}
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`font-bold transition ${
                  path === '/admin' ? 'text-[#f84464]' : 'text-slate-700 hover:text-[#f84464]'
                }`}
              >
                AI Pricing & Admin
              </Link>
            )}
          </nav>

          <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
            Showing theatres in <strong className="text-slate-800">{selectedCity}</strong> • AI Dynamic Pricing
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;