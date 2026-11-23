import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(fullName, email, password);
      navigate('/customer');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '480px' }}>
      <div className="card">
        <h2>Customer Registration</h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Public registration creates a CUSTOMER account. Reviewer and Manager accounts are provisioned by Admin.
        </p>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password (min 8 chars)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          <button type="submit" className="btn" style={{ width: '100%' }}>Register</button>
        </form>
      </div>
    </div>
  );
}
