import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div>
        <Link to="/" style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>
          MovieBooking AI
        </Link>
        {user?.role === 'CUSTOMER' && <Link to="/customer">Customer Portal</Link>}
        {user?.role === 'MOVIE_REVIEWER' && <Link to="/reviewer">Reviewer Portal</Link>}
        {user?.role === 'THEATRE_MANAGER' && <Link to="/manager">Theatre Manager</Link>}
        {user?.role === 'ADMIN' && <Link to="/admin">Admin Console</Link>}
      </div>
      <div>
        {user ? (
          <>
            <span style={{ marginRight: '14px', fontSize: '14px' }}>
              {user.fullName} <span className="badge">{user.role}</span>
            </span>
            <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
