import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function ManagerDashboard() {
  const [theatres, setTheatres] = useState([]);
  const [movies, setMovies] = useState([]);
  const [selectedTheatre, setSelectedTheatre] = useState(null);
  const [screens, setScreens] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [screenForm, setScreenForm] = useState({ name: '', rowsCount: 3, seatsPerRow: 5 });
  const [showForm, setShowForm] = useState({ movieId: '', screenId: '', startTime: '', basePrice: '200.00' });
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/manager/theatres').then(({ data }) => {
      setTheatres(data);
      if (data.length > 0) selectTheatre(data[0]);
    });
    api.get('/movies').then(({ data }) => setMovies(data));
  }, []);

  const selectTheatre = async (theatre) => {
    setSelectedTheatre(theatre);
    const [scrRes, anaRes] = await Promise.all([
      api.get(`/manager/theatres/${theatre.id}/screens`),
      api.get(`/manager/theatres/${theatre.id}/analytics`),
    ]);
    setScreens(scrRes.data);
    setAnalytics(anaRes.data);
  };

  const handleCreateScreen = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/manager/theatres/${selectedTheatre.id}/screens`, {
        name: screenForm.name,
        rowsCount: Number(screenForm.rowsCount),
        seatsPerRow: Number(screenForm.seatsPerRow),
      });
      setMessage('Screen and seat layout created!');
      setScreenForm({ name: '', rowsCount: 3, seatsPerRow: 5 });
      selectTheatre(selectedTheatre);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create screen');
    }
  };

  const handleCreateShow = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/manager/shows', {
        movieId: Number(showForm.movieId),
        screenId: Number(showForm.screenId),
        startTime: new Date(showForm.startTime).toISOString(),
        basePrice: Number(showForm.basePrice),
      });
      setMessage('Show scheduled!');
      selectTheatre(selectedTheatre);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule show');
    }
  };

  const handleValidateQr = async (e) => {
    e.preventDefault();
    setError('');
    setValidationResult(null);
    try {
      const { data } = await api.post('/manager/tickets/validate', { qrToken: qrTokenInput.trim() });
      setValidationResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Ticket validation failed');
    }
  };

  return (
    <div className="container">
      <h2>Theatre Manager Dashboard</h2>
      {error && <div className="alert">{error}</div>}
      {message && <div className="success-banner">{message}</div>}

      <div className="card">
        <h3>My Assigned Theatres</h3>
        {theatres.map((t) => (
          <button
            key={t.id}
            className={`btn ${selectedTheatre?.id === t.id ? '' : 'btn-secondary'}`}
            onClick={() => selectTheatre(t)}
          >
            {t.name} ({t.type} — Cap INR {t.maxTicketPrice})
          </button>
        ))}

        {analytics && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div><strong>Total Shows:</strong> {analytics.totalShows}</div>
            <div><strong>Confirmed Bookings:</strong> {analytics.confirmedBookingsCount}</div>
            <div><strong>Seats Booked:</strong> {analytics.totalSeatsBooked} / {analytics.totalSeatCapacity}</div>
            <div><strong>Occupancy:</strong> {analytics.occupancyPercentage}%</div>
            <div><strong>Total Revenue:</strong> INR {analytics.totalRevenue}</div>
          </div>
        )}
      </div>

      {selectedTheatre && (
        <div className="grid-2">
          <div className="card">
            <h3>Add Screen to {selectedTheatre.name}</h3>
            <form onSubmit={handleCreateScreen}>
              <label>Screen Name</label>
              <input value={screenForm.name} onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })} required />
              <label>Rows Count (A, B, C...)</label>
              <input type="number" min={1} max={15} value={screenForm.rowsCount} onChange={(e) => setScreenForm({ ...screenForm, rowsCount: e.target.value })} required />
              <label>Seats Per Row</label>
              <input type="number" min={1} max={25} value={screenForm.seatsPerRow} onChange={(e) => setScreenForm({ ...screenForm, seatsPerRow: e.target.value })} required />
              <button type="submit" className="btn">Create Screen</button>
            </form>
          </div>

          <div className="card">
            <h3>Schedule Show (Max Cap: INR {selectedTheatre.maxTicketPrice})</h3>
            <form onSubmit={handleCreateShow}>
              <label>Movie</label>
              <select value={showForm.movieId} onChange={(e) => setShowForm({ ...showForm, movieId: e.target.value })} required>
                <option value="">Select Movie...</option>
                {movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <label>Screen</label>
              <select value={showForm.screenId} onChange={(e) => setShowForm({ ...showForm, screenId: e.target.value })} required>
                <option value="">Select Screen...</option>
                {screens.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.totalSeats} seats)</option>)}
              </select>
              <label>Start Time</label>
              <input type="datetime-local" value={showForm.startTime} onChange={(e) => setShowForm({ ...showForm, startTime: e.target.value })} required />
              <label>Base Ticket Price (INR)</label>
              <input type="number" step="0.01" value={showForm.basePrice} onChange={(e) => setShowForm({ ...showForm, basePrice: e.target.value })} required />
              <button type="submit" className="btn">Schedule Show</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Staff QR Ticket Validation (One-Time Check-In)</h3>
        <form onSubmit={handleValidateQr} style={{ display: 'flex', gap: '10px' }}>
          <input placeholder="Paste signed QR token from ticket..." value={qrTokenInput} onChange={(e) => setQrTokenInput(e.target.value)} required />
          <button type="submit" className="btn btn-success">Validate & Check In</button>
        </form>
        {validationResult && (
          <div className="success-banner" style={{ marginTop: '12px' }}>
            <strong>{validationResult.message}</strong> — Ref: {validationResult.bookingReference} | Movie: {validationResult.movieTitle} | Seats: {validationResult.seats.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
