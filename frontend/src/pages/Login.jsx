import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      const redirectPath =
        location.state?.from?.pathname || (loggedInUser.role === 'ADMIN' ? '/admin' : '/');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-6 pb-16">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 poster-elevation space-y-6">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-crimson-500">
            CINEPULSE ACCESS
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Sign In</h1>
          <p className="text-xs text-slate-400 mt-1">
            Book seats or manage AI dynamic ticket pricing
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-crimson-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-crimson-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-crimson-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-crimson-500 hover:bg-crimson-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition cta-crimson-shadow"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 mb-2.5 font-semibold">
            One-Click Evaluation Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEmail('customer@cinepulse.com');
                setPassword('Customer@123');
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition"
            >
              <div className="text-xs font-extrabold text-slate-800">Customer Demo</div>
              <div className="text-[10px] text-slate-400 truncate">customer@cinepulse.com</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@cinepulse.com');
                setPassword('Admin@123');
              }}
              className="p-2.5 rounded-xl bg-crimson-50/60 hover:bg-crimson-50 border border-crimson-100 text-left transition"
            >
              <div className="text-xs font-extrabold text-crimson-600">Admin Demo</div>
              <div className="text-[10px] text-slate-400 truncate">admin@cinepulse.com</div>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Don't have an account?{' '}
          <Link to="/register" className="text-crimson-500 font-bold hover:underline">
            Register as Customer
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
