import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    setNewsletterEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="bg-[#1c1c24] text-slate-300 mt-16 border-t border-slate-800">
      {/* Top Service Guarantee Bar (Snitch / Top E-Commerce & Ticketing Style) */}
      <div className="bg-[#272730] border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <span className="text-xl">🎟️</span>
            <p className="text-xs font-extrabold uppercase tracking-wider text-white">
              Instant M-Ticket & QR
            </p>
            <p className="text-[11px] text-slate-400">Scan directly at cinema gates</p>
          </div>
          <div className="space-y-1">
            <span className="text-xl">🤖</span>
            <p className="text-xs font-extrabold uppercase tracking-wider text-white">
              AI Fair Dynamic Pricing
            </p>
            <p className="text-[11px] text-slate-400">Single Screen ≤₹350 • Multiplex ≤₹450</p>
          </div>
          <div className="space-y-1">
            <span className="text-xl">📱</span>
            <p className="text-xs font-extrabold uppercase tracking-wider text-white">
              100% Secure UPI QR
            </p>
            <p className="text-[11px] text-slate-400">PhonePe, Google Pay & Cards</p>
          </div>
          <div className="space-y-1">
            <span className="text-xl">📧</span>
            <p className="text-xs font-extrabold uppercase tracking-wider text-white">
              24/7 Email & Support
            </p>
            <p className="text-[11px] text-slate-400">Instant confirmation & pass delivery</p>
          </div>
        </div>
      </div>

      {/* Main 4-Column Footer */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">
        {/* Column 1: Brand & Contact Info */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-[#f84464] flex items-center justify-center text-white font-black text-lg">
              m
            </span>
            <div>
              <span className="text-xl font-extrabold text-white tracking-tight">mahaa</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Cinemas & AI Ticketing
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            Experience next-generation cinema booking across India with transparent regulatory price caps, live seat selection, and AI-powered demand pricing.
          </p>
          <div className="space-y-1.5 text-xs text-slate-300 pt-1">
            <p>
              <strong className="text-white">Support Email:</strong>{' '}
              <a href="mailto:buddamahendra05@gmail.com" className="text-[#f84464] hover:underline">
                buddamahendra05@gmail.com
              </a>
            </p>
            <p>
              <strong className="text-white">Customer Care:</strong> +91 98765 43210 (Mon–Sun, 9 AM – 11 PM)
            </p>
            <p>
              <strong className="text-white">Head Office:</strong> HITEC City, Hyderabad & Visakhapatnam, India
            </p>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
            Explore mahaa
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li><Link to="/" className="hover:text-white transition">Now Showing</Link></li>
            <li><Link to="/my-bookings" className="hover:text-white transition">My Booked Tickets</Link></li>
            <li><Link to="/profile" className="hover:text-white transition">My Profile & Location</Link></li>
            <li><Link to="/login" className="hover:text-white transition">Sign In / Register</Link></li>
            <li><Link to="/admin" className="hover:text-white transition">Admin & AI Pricing</Link></li>
          </ul>
        </div>

        {/* Column 3: Cities & Cinema Formats */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
            Top Cities
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>Hyderabad (IMAX & 70MM)</li>
            <li>Visakhapatnam</li>
            <li>Vijayawada</li>
            <li>Bengaluru</li>
            <li>Chennai & Mumbai</li>
          </ul>
        </div>

        {/* Column 4: Newsletter / Offers */}
        <div className="lg:col-span-4 space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
            Get Show Alerts & Premiere Updates
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Subscribe to receive instant alerts on blockbuster pre-bookings, weekend AI price drops, and premiere tickets.
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2 pt-1">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#272730] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f84464]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-[#f84464] hover:bg-[#e03353] text-white text-xs font-extrabold uppercase tracking-wider transition"
            >
              Join
            </button>
          </form>
          {subscribed && (
            <p className="text-[11px] font-bold text-emerald-400">
              ✓ Subscribed! You'll receive premiere alerts at your inbox.
            </p>
          )}
        </div>
      </div>

      {/* Bottom Legal & Copyright Strip */}
      <div className="border-t border-slate-800 bg-[#14141a]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} mahaa Cinemas Pvt. Ltd. All Rights Reserved.</p>
          <div className="flex items-center gap-5">
            <span>Spring Boot 3 • PostgreSQL • FastAPI scikit-learn • React</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;