import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminDashboard() {
  const [movies, setMovies] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState(1);
  const [progress, setProgress] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [movieForm, setMovieForm] = useState({
    title: '', description: '', genre: 'ACTION', language: 'Telugu', durationMinutes: 150, releaseDate: '2026-10-30'
  });
  const [userForm, setUserForm] = useState({ email: '', password: 'Password@123', fullName: '', role: 'MOVIE_REVIEWER' });
  const [overrideForm, setOverrideForm] = useState({ overridePrice: '', reason: '' });
  const [correctionForm, setCorrectionForm] = useState({ ratingId: '', newRating: 8, reason: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAll = async () => {
    const [mRes, uRes, aRes] = await Promise.all([
      api.get('/movies'),
      api.get('/admin/users'),
      api.get('/admin/audit-logs'),
    ]);
    setMovies(mRes.data);
    setUsers(uRes.data);
    setAuditLogs(aRes.data);
    if (selectedMovieId) {
      loadProgress(selectedMovieId);
    }
  };

  const loadProgress = async (movieId) => {
    try {
      const { data } = await api.get(`/admin/movies/${movieId}/ratings-progress`);
      setProgress(data);
    } catch (_) {}
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateMovie = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/admin/movies', movieForm);
      setMessage(`Movie created: ${data.title} (ID ${data.id})`);
      setSelectedMovieId(data.id);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create movie');
    }
  };

  const handleAssignFirst10Reviewers = async () => {
    setError('');
    const reviewerIds = users.filter((u) => u.role === 'MOVIE_REVIEWER' && u.active).slice(0, 10).map((u) => u.id);
    if (reviewerIds.length < 10) {
      setError(`Need 10 active MOVIE_REVIEWER accounts (currently ${reviewerIds.length}).`);
      return;
    }
    try {
      await api.post(`/admin/movies/${selectedMovieId}/assign-reviewers`, { reviewerIds });
      setMessage(`Assigned 10 reviewers to movie ID ${selectedMovieId}!`);
      loadProgress(selectedMovieId);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign reviewers');
    }
  };

  const handleRunPrediction = async () => {
    setError('');
    setPredictionResult(null);
    try {
      const { data } = await api.post(`/admin/movies/${selectedMovieId}/predict-price`);
      setPredictionResult(data);
      setMessage(`AI Prediction completed: ${data.predictedClass} (Confidence ${(data.confidence * 100).toFixed(1)}%)`);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Prediction failed');
    }
  };

  const handleOverridePrice = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/admin/movies/${selectedMovieId}/override-price`, {
        overridePrice: Number(overrideForm.overridePrice),
        reason: overrideForm.reason,
      });
      setMessage('Price override saved and logged in audit trail!');
      setOverrideForm({ overridePrice: '', reason: '' });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Price override failed');
    }
  };

  const handleCorrectRating = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.patch(`/admin/ratings/${correctionForm.ratingId}/correct`, {
        newRating: Number(correctionForm.newRating),
        reason: correctionForm.reason,
      });
      setMessage('Reviewer rating corrected and recorded in audit log.');
      loadProgress(selectedMovieId);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Rating correction failed');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/users', userForm);
      setMessage(`Created ${userForm.role}: ${userForm.email}`);
      setUserForm({ email: '', password: 'Password@123', fullName: '', role: 'MOVIE_REVIEWER' });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <div className="container">
      <h2>Admin Control Center — AI Dynamic Pricing & RBAC</h2>
      {error && <div className="alert">{error}</div>}
      {message && <div className="success-banner">{message}</div>}

      <div className="card">
        <h3>10-Reviewer Rating Gate & AI Dynamic Pricing Engine</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
          <select
            value={selectedMovieId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedMovieId(id);
              loadProgress(id);
            }}
            style={{ maxWidth: '320px', margin: 0 }}
          >
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.id} {m.title} ({m.predictedCategory || 'UNRATED'})
              </option>
            ))}
          </select>
          <button className="btn" onClick={handleAssignFirst10Reviewers}>Assign 10 Reviewers</button>
          <button className="btn btn-success" onClick={handleRunPrediction}>Run AI Price Prediction</button>
        </div>

        {progress && (
          <div>
            <p>
              <strong>Submission Progress for {progress.movieTitle}:</strong>{' '}
              <span className="badge">{progress.submittedRatingsCount} / {progress.assignedReviewersCount} Submitted</span>{' '}
              {progress.readyForPrediction ? '✅ Ready for AI Prediction' : '⏳ Waiting for all 10 ratings'}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Rating ID</th>
                  <th>Reviewer</th>
                  <th>Official Rating</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {progress.ratings.map((r) => (
                  <tr key={r.reviewerId}>
                    <td>{r.ratingId || '-'}</td>
                    <td>{r.reviewerName} ({r.reviewerEmail})</td>
                    <td>{r.rating ? <strong>{r.rating}/10</strong> : 'Pending'}</td>
                    <td>{r.reviewNotes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {predictionResult && (
          <div className="success-banner" style={{ marginTop: '14px' }}>
            <h4>AI Prediction Result ({predictionResult.modelVersion})</h4>
            <p>
              Predicted Category: <strong>{predictionResult.predictedClass}</strong> | Confidence: <strong>{(predictionResult.confidence * 100).toFixed(1)}%</strong> | Multiplier: <strong>{predictionResult.recommendedMultiplier}x</strong>
            </p>
            <p>
              Mean: {predictionResult.meanRating} | Median: {predictionResult.medianRating} | StdDev: {predictionResult.stdDevRating} | Preview (₹200 base): Single-Screen ₹{predictionResult.finalSingleScreenPreview} / Multiplex ₹{predictionResult.finalMultiplexPreview}
            </p>
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Manual Price Override (Audited)</h3>
          <form onSubmit={handleOverridePrice}>
            <label>Override Base Price (INR) for Movie #{selectedMovieId}</label>
            <input type="number" step="0.01" value={overrideForm.overridePrice} onChange={(e) => setOverrideForm({ ...overrideForm, overridePrice: e.target.value })} required />
            <label>Mandatory Audit Reason</label>
            <input value={overrideForm.reason} onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })} required minLength={5} />
            <button type="submit" className="btn">Apply Price Override</button>
          </form>

          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
          <h3>Audited Rating Correction</h3>
          <form onSubmit={handleCorrectRating}>
            <label>Rating ID</label>
            <input type="number" value={correctionForm.ratingId} onChange={(e) => setCorrectionForm({ ...correctionForm, ratingId: e.target.value })} required />
            <label>Corrected Rating (1-10)</label>
            <input type="number" min={1} max={10} value={correctionForm.newRating} onChange={(e) => setCorrectionForm({ ...correctionForm, newRating: e.target.value })} required />
            <label>Mandatory Audit Reason</label>
            <input value={correctionForm.reason} onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })} required minLength={5} />
            <button type="submit" className="btn btn-secondary">Correct Rating</button>
          </form>
        </div>

        <div className="card">
          <h3>Create Movie</h3>
          <form onSubmit={handleCreateMovie}>
            <input placeholder="Movie Title" value={movieForm.title} onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })} required />
            <input placeholder="Description" value={movieForm.description} onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })} required />
            <input placeholder="Genre (ACTION, SCI_FI, DRAMA)" value={movieForm.genre} onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })} required />
            <input placeholder="Language" value={movieForm.language} onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })} required />
            <button type="submit" className="btn">Create Movie</button>
          </form>

          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
          <h3>Provision Privileged User (Reviewer / Manager)</h3>
          <form onSubmit={handleCreateUser}>
            <input placeholder="Full Name" value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} required />
            <input type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              <option value="MOVIE_REVIEWER">MOVIE_REVIEWER</option>
              <option value="THEATRE_MANAGER">THEATRE_MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button type="submit" className="btn">Create Account</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h3>Platform Audit Trail</h3>
        <table>
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt}</td>
                <td><span className="badge">{log.actionType}</span></td>
                <td>{log.entityType} #{log.entityId}</td>
                <td>{log.actorEmail}</td>
                <td>{log.oldValue || '-'}</td>
                <td>{log.newValue}</td>
                <td>{log.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
