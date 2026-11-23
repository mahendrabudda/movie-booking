import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function CustomerDashboard() {
  const [movies, setMovies] = useState([]);
  const [filters, setFilters] = useState({ city: '', language: '', genre: '' });
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [holdInfo, setHoldInfo] = useState(null);
  const [countdownSec, setCountdownSec] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [bookingInit, setBookingInit] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMovies = async () => {
    const { data } = await api.get('/movies', { params: filters });
    setMovies(data);
  };

  const loadMyBookings = async () => {
    try {
      const { data } = await api.get('/bookings/my?page=0&size=10');
      setMyBookings(data.content || []);
    } catch (_) {}
  };

  useEffect(() => {
    loadMovies();
    loadMyBookings();
  }, []);

  useEffect(() => {
    if (!holdInfo?.holdExpiresAt) return;
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(holdInfo.holdExpiresAt).getTime() - Date.now()) / 1000));
      setCountdownSec(diff);
    }, 1000);
    return () => clearInterval(timer);
  }, [holdInfo]);

  const selectMovie = async (movie) => {
    setSelectedMovie(movie);
    setSelectedShow(null);
    setHoldInfo(null);
    setBookingInit(null);
    const [showsRes, revRes] = await Promise.all([
      api.get(`/movies/${movie.id}/shows`),
      api.get(`/movies/${movie.id}/reviews`),
    ]);
    setShows(showsRes.data);
    setReviews(revRes.data);
  };

  const selectShow = async (show) => {
    setSelectedShow(show);
    setSelectedSeatIds([]);
    setHoldInfo(null);
    setBookingInit(null);
    const { data } = await api.get(`/shows/${show.id}/seats`);
    setSeats(data);
  };

  const toggleSeat = (seat) => {
    if (seat.status !== 'AVAILABLE') return;
    setSelectedSeatIds((prev) =>
      prev.includes(seat.seatId) ? prev.filter((id) => id !== seat.seatId) : [...prev, seat.seatId]
    );
  };

  const handleHoldSeats = async () => {
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/bookings/hold', {
        showId: selectedShow.id,
        seatIds: selectedSeatIds,
      });
      setHoldInfo(data);
      setMessage(`Seats ${data.seatCodes.join(', ')} held for 5 minutes! Locked Subtotal: INR ${data.lockedSeatSubtotal}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to hold seats');
    }
  };

  const handleInitiateBooking = async () => {
    setError('');
    try {
      const idemKey = `idem_${selectedShow.id}_${Date.now()}`;
      const { data } = await api.post('/bookings/initiate', {
        showId: selectedShow.id,
        seatIds: holdInfo.heldSeatIds,
        couponCode: couponCode || null,
        idempotencyKey: idemKey,
      });
      setBookingInit(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate booking');
    }
  };

  const handleConfirmMockPayment = async () => {
    setError('');
    try {
      const { data } = await api.post('/bookings/confirm', {
        bookingId: bookingInit.bookingId,
        gatewayOrderId: bookingInit.gatewayOrderId,
        gatewayPaymentId: 'mock_pay_demo',
        gatewaySignature: bookingInit.mockSignatureHint,
        idempotencyKey: `confirm_${bookingInit.bookingId}`,
      });
      setMessage(`Booking Confirmed! Reference: ${data.bookingReference}`);
      setBookingInit(null);
      setHoldInfo(null);
      await selectShow(selectedShow);
      await loadMyBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment confirmation failed');
    }
  };

  const handleDownloadTicket = async (bookingId, bookingRef) => {
    const response = await api.get(`/bookings/${bookingId}/ticket/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ticket-${bookingRef}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCancelBooking = async (bookingId) => {
    setError('');
    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      setMessage('Booking cancelled and refund initiated.');
      loadMyBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel booking');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/customer/movies/${selectedMovie.id}/reviews`, reviewForm);
      setReviewForm({ rating: 5, comment: '' });
      const { data } = await api.get(`/movies/${selectedMovie.id}/reviews`);
      setReviews(data);
      setMessage('Customer review posted!');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit review');
    }
  };

  return (
    <div className="container">
      {error && <div className="alert">{error}</div>}
      {message && <div className="success-banner">{message}</div>}

      <div className="card">
        <h3>Browse Movies</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input placeholder="City (e.g. Hyderabad)" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
          <input placeholder="Language (e.g. Telugu)" value={filters.language} onChange={(e) => setFilters({ ...filters, language: e.target.value })} />
          <input placeholder="Genre (e.g. ACTION)" value={filters.genre} onChange={(e) => setFilters({ ...filters, genre: e.target.value })} />
          <button className="btn" onClick={loadMovies}>Search</button>
        </div>
        <div className="grid-2" style={{ marginTop: '12px' }}>
          {movies.map((m) => (
            <div key={m.id} className="card" style={{ marginBottom: 0 }}>
              <h4>{m.title} <span className="badge">{m.language}</span> <span className="badge">{m.genre}</span></h4>
              <p style={{ fontSize: '13px', color: '#475569' }}>{m.description}</p>
              <p style={{ fontSize: '12px' }}>
                AI Demand Tier: <strong>{m.predictedCategory || 'STANDARD (Unrated)'}</strong>
              </p>
              <button className="btn" onClick={() => selectMovie(m)}>View Shows & Reviews</button>
            </div>
          ))}
        </div>
      </div>

      {selectedMovie && (
        <div className="card">
          <h3>Shows for {selectedMovie.title}</h3>
          {shows.length === 0 ? <p>No active shows scheduled.</p> : (
            <table>
              <thead>
                <tr>
                  <th>Theatre</th>
                  <th>Type (Cap)</th>
                  <th>Screen</th>
                  <th>Showtime (IST)</th>
                  <th>Base Price</th>
                  <th>AI Dynamic Regular Price</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.theatreName}</td>
                    <td>{s.theatreType} (Max INR {s.theatreMaxPrice})</td>
                    <td>{s.screenName}</td>
                    <td>{s.startTimeIst}</td>
                    <td>INR {s.basePrice}</td>
                    <td><strong>INR {s.dynamicRegularPrice}</strong></td>
                    <td><button className="btn" onClick={() => selectShow(s)}>Select Seats</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedShow && (
        <div className="card">
          <h3>Seat Selection — {selectedShow.theatreName} ({selectedShow.screenName})</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Click AVAILABLE seats to select, then click Hold Seats (locks price and reserves for 5 minutes).
          </p>
          <div className="seat-grid">
            {seats.map((seat) => {
              const isSelected = selectedSeatIds.includes(seat.seatId);
              const cls = isSelected ? 'seat-SELECTED' : `seat-${seat.status}`;
              return (
                <button
                  key={seat.showSeatId}
                  className={`seat-btn ${cls}`}
                  onClick={() => toggleSeat(seat)}
                  title={`${seat.category} - INR ${seat.currentPrice}`}
                >
                  {seat.seatCode}<br />₹{seat.currentPrice}
                </button>
              );
            })}
          </div>
          {selectedSeatIds.length > 0 && !holdInfo && (
            <button className="btn" onClick={handleHoldSeats}>
              Hold Selected Seats ({selectedSeatIds.length})
            </button>
          )}

          {holdInfo && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px' }}>
              <h4>Active Seat Hold — Expires in {Math.floor(countdownSec / 60)}m {countdownSec % 60}s</h4>
              <p>Held Seats: <strong>{holdInfo.seatCodes.join(', ')}</strong> | Locked Subtotal: <strong>INR {holdInfo.lockedSeatSubtotal}</strong></p>
              <div style={{ maxWidth: '320px' }}>
                <input placeholder="Optional Coupon (e.g. WELCOME10)" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                <button className="btn" onClick={handleInitiateBooking}>Proceed to Checkout</button>
              </div>
            </div>
          )}

          {bookingInit && (
            <div style={{ marginTop: '16px', padding: '14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
              <h4>Checkout Price Breakdown (Ref: {bookingInit.bookingReference})</h4>
              <p>Seat Subtotal: INR {bookingInit.seatSubtotal}</p>
              <p>Coupon Discount: - INR {bookingInit.discountAmount}</p>
              <p>Convenience Fee (5%): INR {bookingInit.convenienceFee}</p>
              <p>GST (18% on fee): INR {bookingInit.gstAmount}</p>
              <p style={{ fontSize: '16px' }}><strong>Total Payable: INR {bookingInit.totalAmount}</strong></p>
              <button className="btn btn-success" onClick={handleConfirmMockPayment}>
                Pay Now (Mock Payment Gateway)
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3>My Bookings</h3>
        {myBookings.length === 0 ? <p>No bookings yet.</p> : (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Movie & Theatre</th>
                <th>Showtime (IST)</th>
                <th>Seats</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myBookings.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.bookingReference}</strong></td>
                  <td>{b.movieTitle} ({b.theatreName})</td>
                  <td>{b.startTimeIst}</td>
                  <td>{b.seats.join(', ')}</td>
                  <td>INR {b.totalAmount}</td>
                  <td><span className="badge">{b.status}</span> {b.checkedIn && '(Checked In)'}</td>
                  <td>
                    {b.status === 'CONFIRMED' && (
                      <>
                        <button className="btn" onClick={() => handleDownloadTicket(b.id, b.bookingReference)}>PDF Ticket</button>
                        <button className="btn btn-danger" onClick={() => handleCancelBooking(b.id)}>Cancel</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedMovie && (
        <div className="card">
          <h3>Customer Reviews for {selectedMovie.title}</h3>
          <form onSubmit={handleReviewSubmit} style={{ maxWidth: '480px', marginBottom: '16px' }}>
            <label>Rating (1-5 Stars)</label>
            <select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Stars</option>)}
            </select>
            <label>Comment</label>
            <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} required />
            <button type="submit" className="btn">Submit Customer Review</button>
          </form>
          {reviews.map((r) => (
            <div key={r.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
              <strong>{r.customerName}</strong> — <span className="badge">{r.rating}/5</span>
              <p style={{ margin: '4px 0' }}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
