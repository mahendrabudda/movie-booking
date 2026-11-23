import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function ReviewerDashboard() {
  const [assignedMovies, setAssignedMovies] = useState([]);
  const [ratingInputs, setRatingInputs] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAssigned = async () => {
    try {
      const { data } = await api.get('/reviewer/movies');
      setAssignedMovies(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assigned movies');
    }
  };

  useEffect(() => {
    loadAssigned();
  }, []);

  const handleSubmit = async (movieId) => {
    setError('');
    setMessage('');
    const input = ratingInputs[movieId] || { rating: 8, reviewNotes: '' };
    try {
      await api.post(`/reviewer/movies/${movieId}/ratings`, {
        rating: Number(input.rating || 8),
        reviewNotes: input.reviewNotes || 'Official critic evaluation.',
      });
      setMessage('Official rating submitted! Status is now locked (read-only).');
      loadAssigned();
    } catch (err) {
      setError(err.response?.data?.message || 'Rating submission failed');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Official Movie Reviewer Portal</h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Submit your official 1-10 rating for movies assigned to you by Admin. Once submitted, ratings are read-only and can only be modified through an Admin audited correction.
        </p>
        {error && <div className="alert">{error}</div>}
        {message && <div className="success-banner">{message}</div>}

        {assignedMovies.length === 0 ? <p>No movies assigned to your reviewer account yet.</p> : (
          <table>
            <thead>
              <tr>
                <th>Movie Title</th>
                <th>Genre & Language</th>
                <th>Status</th>
                <th>Official Rating (1-10)</th>
                <th>Review Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignedMovies.map((m) => {
                const current = ratingInputs[m.movieId] || { rating: 8, reviewNotes: '' };
                return (
                  <tr key={m.movieId}>
                    <td><strong>{m.movieTitle}</strong></td>
                    <td>{m.genre} / {m.language}</td>
                    <td>
                      <span className="badge">
                        {m.submitted ? 'SUBMITTED (LOCKED)' : 'PENDING SUBMISSION'}
                      </span>
                    </td>
                    <td>
                      {m.submitted ? (
                        <strong>{m.submittedRating} / 10</strong>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={current.rating}
                          onChange={(e) => setRatingInputs({
                            ...ratingInputs,
                            [m.movieId]: { ...current, rating: e.target.value }
                          })}
                          style={{ width: '80px', margin: 0 }}
                        />
                      )}
                    </td>
                    <td>
                      {m.submitted ? (
                        m.reviewNotes
                      ) : (
                        <input
                          placeholder="Critic evaluation notes..."
                          value={current.reviewNotes}
                          onChange={(e) => setRatingInputs({
                            ...ratingInputs,
                            [m.movieId]: { ...current, reviewNotes: e.target.value }
                          })}
                          style={{ margin: 0 }}
                        />
                      )}
                    </td>
                    <td>
                      {m.submitted ? (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Read-only</span>
                      ) : (
                        <button className="btn" onClick={() => handleSubmit(m.movieId)}>Submit Rating</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
