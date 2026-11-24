import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { bookingApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getMovieMediaAssets } from '../services/movieMedia';

const MAHAA_MERCHANT_UPI = 'buddamahendra05@okaxis';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state;

  const [paymentMethod, setPaymentMethod] = useState('UPI_QR_SCANNER');
  const [notificationEmail, setNotificationEmail] = useState(
    () =>
      user?.email && !user.email.endsWith('@cinepulse.com')
        ? user.email
        : 'buddamahendra05@gmail.com'
  );
  const [transactionId, setTransactionId] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!state || !state.show || !state.selectedSeats?.length) {
    return <Navigate to="/" replace />;
  }

  const { show, movie, selectedSeats, totalPrice } = state;
  const media = getMovieMediaAssets(movie || { title: show.movieTitle });
  const amountFormatted = Number(totalPrice).toFixed(2);

  // Clean mahaa Cinemas UPI QR (no fixed &am= so PhonePe / GPay / Paytm accept P2P cleanly)
  const upiUri = `upi://pay?pa=${encodeURIComponent(MAHAA_MERCHANT_UPI)}&pn=${encodeURIComponent(
    'mahaa Cinemas'
  )}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
    upiUri
  )}`;

  const handleConfirmPayment = async (e) => {
    if (e) e.preventDefault();
    setProcessing(true);
    setError('');
    try {
      const utrToSave =
        transactionId.trim() ||
        String(Math.floor(100000000000 + Math.random() * 900000000000));

      const res = await bookingApi.create({
        showId: show.id,
        seatIds: selectedSeats.map((s) => s.seatId),
        mockPaymentMethod: paymentMethod,
        paymentTransactionId: utrToSave,
        notificationEmail: notificationEmail.trim(),
      });
      navigate(`/booking-confirmation/${res.data.bookingReference}`, {
        state: { booking: res.data, movie, emailDispatched: true },
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Booking failed. One or more selected seats may have already been reserved.'
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen pb-16 bg-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-sm space-y-7">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#f84464]">
                mahaa CHECKOUT • SECURE PAYMENT
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                {show.movieTitle}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {show.theatreName} • {show.screenName} • {new Date(show.showDateTime).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                TOTAL PAYABLE
              </span>
              <span className="text-3xl font-extrabold text-slate-900">
                ₹{amountFormatted}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Seats & E-Ticket Email */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="md:col-span-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Selected Seats ({selectedSeats.length})
              </span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {selectedSeats.map((s) => (
                  <span
                    key={s.seatId}
                    className="px-2.5 py-1 rounded bg-emerald-500 text-white text-xs font-bold"
                  >
                    {s.seatNumber} ({s.category} • ₹{s.price})
                  </span>
                ))}
              </div>
            </div>

            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                📧 Send E-Ticket Email To:
              </label>
              <input
                type="email"
                required
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#f84464]"
              />
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              {
                id: 'UPI_QR_SCANNER',
                title: '📱 Scan & Pay via UPI QR',
                sub: 'PhonePe • Google Pay • Paytm • BHIM',
              },
              {
                id: 'CARD_PAYMENT',
                title: '💳 Debit / Credit Card',
                sub: 'Visa • Mastercard • RuPay',
              },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={`p-4 rounded-xl border text-left transition ${
                  paymentMethod === m.id
                    ? 'border-[#f84464] bg-rose-50/50 ring-2 ring-[#f84464]/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <p className="text-xs font-extrabold text-slate-900">{m.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{m.sub}</p>
              </button>
            ))}
          </div>

          {/* Clean UPI QR Section (Customer-facing only) */}
          {paymentMethod === 'UPI_QR_SCANNER' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-8">
              <div className="md:col-span-5 flex flex-col items-center text-center">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-md">
                  <img
                    src={qrCodeUrl}
                    alt="mahaa Cinemas UPI QR"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <span className="mt-3 text-xs font-extrabold text-slate-800">
                  mahaa Cinemas
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  UPI: {MAHAA_MERCHANT_UPI}
                </span>
              </div>

              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Scan QR & Complete Payment of ₹{amountFormatted}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Open PhonePe, Google Pay, or Paytm on your phone, scan the QR code, pay <strong>₹{amountFormatted}</strong>, and click <strong>Confirm Payment</strong> below to receive your instant M-Ticket & email pass.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    UPI Transaction / UTR Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter 12-digit UTR number (optional)"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#f84464]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Card Payment Section */}
          {paymentMethod === 'CARD_PAYMENT' && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">Enter Card Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Cardholder Name"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm"
                />
                <input
                  type="text"
                  maxLength={19}
                  placeholder="Card Number"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-mono"
                />
                <input
                  type="text"
                  maxLength={5}
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-mono"
                />
                <input
                  type="password"
                  maxLength={4}
                  placeholder="CVV"
                  value={cardDetails.cvv}
                  onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-mono"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider"
            >
              ← Back to Seats
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={handleConfirmPayment}
              className="px-8 py-3 rounded-lg bg-[#f84464] hover:bg-[#e03353] disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition"
            >
              {processing
                ? 'Confirming & Sending E-Ticket...'
                : `✓ Pay ₹${amountFormatted} & Confirm Ticket`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;