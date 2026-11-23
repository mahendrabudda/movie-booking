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

  const isActive = (path) =>
    location.pathname === path
      ? 'text-amber-400 font-semibold'
      : 'text-slate-300 hover:text-white';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center text-slate-950 font-black text-lg shadow">
              CP
            </span>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white">CinePulse</span>
              <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                AI Pricing
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className={isActive('/')}>Movies</Link>
            {user && (
              <Link to="/my-bookings" className={isActive('/my-bookings')}>My Bookings</Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className={isActive('/admin')}>
                Admin & AI Pricing Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white leading-none">{user.fullName}</p>
                <p className="text-xs text-amber-400 mt-1 font-mono">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
