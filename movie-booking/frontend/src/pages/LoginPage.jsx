import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const routeForRole = (role) => {
    if (role === 'ADMIN') return '/admin';
    if (role === 'THEATRE_MANAGER') return '/manager';
    if (role === 'MOVIE_REVIEWER') return '/reviewer';
    return '/customer';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(email, password);
      navigate(routeForRole(data.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const fillDevAccount = (devEmail) => {
    setEmail(devEmail);
    setPassword('Password@123');
  };

  return (
    <div className="container" style={{ maxWidth: '480px' }}>
      <div className="card">
        <h2>Sign In</h2>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '8px' }}>Login</button>
        </form>
        <p style={{ fontSize: '14px', marginTop: '12px' }}>
          New customer? <Link to="/register">Create a Customer account</Link>
        </p>
        <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
          Quick-fill Seeded Dev Accounts (Password: Password@123):
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => fillDevAccount('customer@moviebooking.local')}>Customer</button>
          <button type="button" className="btn btn-secondary" onClick={() => fillDevAccount('reviewer10@moviebooking.local')}>Reviewer #10</button>
          <button type="button" className="btn btn-secondary" onClick={() => fillDevAccount('manager@moviebooking.local')}>Manager</button>
          <button type="button" className="btn btn-secondary" onClick={() => fillDevAccount('admin@moviebooking.local')}>Admin</button>
        </div>
      </div>
    </div>
  );
}
