import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Determine active step for the top 01..05 cinema workflow bar
  const path = location.pathname;
  let activeStep = 1;
  if (path.includes('/seats')) activeStep = 2;
  else if (path.includes('/checkout')) activeStep = 4;
  else if (path.includes('/booking-confirmation')) activeStep = 5;

  const steps = [
    { num: '01', label: 'Overview', step: 1, to: '/' },
    { num: '02', label: 'Seats', step: 2, to: null },
    { num: '03', label: 'Cart', step: 3, to: null },
    { num: '04', label: 'Payment', step: 4, to: null },
    { num: '05', label: 'Finish', step: 5, to: null },
  ];

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Guest';
  const avatarSeed = encodeURIComponent(user?.fullName || 'CinePulse');

  return (
    <header className="relative z-30 w-full">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
        {/* Left: < BACK button + Brand */}
        <div className="flex items-center gap-6">
          {path !== '/' ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase text-slate-600 hover:text-slate-950 transition"
            >
              <svg
                className="w-4 h-4 text-slate-700 group-hover:-translate-x-0.5 transition"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>BACK</span>
            </button>
          ) : (
            <Link to="/" className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-crimson-500 flex items-center justify-center text-white font-extrabold text-xs tracking-wider shadow-sm">
                CP
              </span>
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                CinePulse
              </span>
            </Link>
          )}
        </div>

        {/* Center: 01 Overview | 02 Seats | 03 Cart | 04 Payment | 05 Finish */}
        <nav className="hidden lg:flex items-center gap-9 h-full">
          {steps.map((item) => {
            const isCurrent = activeStep === item.step;
            const content = (
              <div
                className={`relative h-20 flex items-center text-xs tracking-wide transition ${
                  isCurrent
                    ? 'font-extrabold text-slate-900'
                    : 'font-medium text-slate-400 hover:text-slate-600'
                }`}
              >
                {/* Crimson top indicator bar matching the Pinterest design */}
                {isCurrent && (
                  <span className="absolute top-0 left-0 right-0 h-[3.5px] bg-crimson-500 rounded-b-full" />
                )}
                <span>
                  {item.num} {item.label}
                </span>
              </div>
            );

            return item.to ? (
              <Link key={item.num} to={item.to} className="h-full flex items-center">
                {content}
              </Link>
            ) : (
              <div key={item.num} className="h-full flex items-center cursor-default">
                {content}
              </div>
            );
          })}
        </nav>

        {/* Right: Quick navigation & "Hi, <Name>" profile pill */}
        <div className="flex items-center gap-5">
          <Link
            to="/"
            className={`text-xs font-semibold transition ${
              path === '/' ? 'text-crimson-500' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Movies
          </Link>

          {user && (
            <Link
              to="/my-bookings"
              className={`text-xs font-semibold transition ${
                path === '/my-bookings' ? 'text-crimson-500' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              My Tickets
            </Link>
          )}

          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                path === '/admin'
                  ? 'bg-crimson-500 text-white border-crimson-500'
                  : 'bg-crimson-50 text-crimson-600 border-crimson-100 hover:bg-crimson-100'
              }`}
            >
              AI Pricing & Admin
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                Hi, {firstName}
              </span>
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-1.5 focus:outline-none"
                  title={`${user.fullName} (${user.role})`}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=ffe4e6`}
                    alt={firstName}
                    className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md"
                  />
                  <svg
                    className="w-3.5 h-3.5 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate">{user.fullName}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-crimson-500">
                      {user.role}
                    </p>
                  </div>
                  <Link
                    to="/my-bookings"
                    className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    My Bookings
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    >
                      Admin & AI Pricing
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-crimson-600 hover:bg-rose-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-bold text-slate-700 hover:text-slate-950 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg text-xs font-bold bg-crimson-500 hover:bg-crimson-600 text-white transition cta-crimson-shadow"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
