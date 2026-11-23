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
      const redirectPath = location.state?.from?.pathname || (loggedInUser.role === 'ADMIN' ? '/admin' : '/');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
      <h1 className="text-2xl font-bold text-white mb-1">Welcome Back</h1>
      <p className="text-sm text-slate-400 mb-6">Sign in to book tickets or manage AI pricing</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-800">
        <p className="text-xs text-slate-400 mb-2.5 font-medium">Quick Fill Demo Accounts (Evaluation):</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillDemoCredentials('customer@cinepulse.com', 'Customer@123')}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition text-left"
          >
            <div className="font-semibold text-amber-400">Customer Demo</div>
            <div className="text-[11px] text-slate-400 truncate">customer@cinepulse.com</div>
          </button>
          <button
            type="button"
            onClick={() => fillDemoCredentials('admin@cinepulse.com', 'Admin@123')}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition text-left"
          >
            <div className="font-semibold text-rose-400">Admin Demo</div>
            <div className="text-[11px] text-slate-400 truncate">admin@cinepulse.com</div>
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center mt-6">
        New to CinePulse?{' '}
        <Link to="/register" className="text-amber-400 hover:underline font-medium">
          Create a customer account
        </Link>
      </p>
    </div>
  );
};

export default Login;
