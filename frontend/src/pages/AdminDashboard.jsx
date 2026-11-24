import React, { useState, useEffect } from 'react';
import { adminPricingApi, movieApi, theatreShowApi } from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('ai-pricing');
  const [summary, setSummary] = useState({
    totalMovies: 0,
    totalTheatres: 0,
    totalShows: 0,
    totalBookings: 0,
    totalCustomers: 0,
  });

  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [screens, setScreens] = useState([]);
  const [shows, setShows] = useState([]);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movieForm, setMovieForm] = useState({
    title: '',
    description: '',
    genre: 'SCI_FI',
    language: 'TELUGU',
    duration: 165,
    releaseDate: '2026-11-15',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    rating: 8.5,
    basePrice: 250.0,
  });

  const [theatreForm, setTheatreForm] = useState({
    name: '',
    city: 'Hyderabad',
    type: 'MULTIPLEX',
    maxTicketPrice: 450.0,
  });
  const [screenForm, setScreenForm] = useState({
    name: '',
    totalSeats: 24,
    theatreId: '',
  });

  const [editingShowId, setEditingShowId] = useState(null);
  const [showForm, setShowForm] = useState({
    movieId: '',
    screenId: '',
    showDateTime: '2026-11-20T18:30',
    basePrice: 240.0,
  });

  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [aiForm, setAiForm] = useState({
    averageMovieRating: 8.7,
    genre: 'SCI_FI',
    language: 'TELUGU',
    daysSinceRelease: 5,
    movieDuration: 181,
    expectedDemand: 88.0,
    currentOccupancy: 82.0,
    theatreTypeCap: 'MULTIPLEX',
  });
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const loadAllAdminData = async () => {
    try {
      const [sumRes, movRes, thRes, scrRes, shRes] = await Promise.all([
        adminPricingApi.getDashboardSummary(),
        movieApi.getAll(),
        theatreShowApi.getTheatres(),
        theatreShowApi.getScreens(),
        theatreShowApi.getShows(),
      ]);
      setSummary(sumRes.data);
      setMovies(movRes.data);
      setTheatres(thRes.data);
      setScreens(scrRes.data);
      setShows(shRes.data);

      if (movRes.data.length > 0 && !selectedMovieId) {
        const first = movRes.data[0];
        setSelectedMovieId(String(first.id));
        populateAiFormFromMovie(first);
        loadPredictionsForMovie(first.id);
      }
      if (thRes.data.length > 0 && !screenForm.theatreId) {
        setScreenForm((prev) => ({ ...prev, theatreId: thRes.data[0].id }));
      }
      if (movRes.data.length > 0 && scrRes.data.length > 0 && !showForm.movieId) {
        setShowForm((prev) => ({
          ...prev,
          movieId: movRes.data[0].id,
          screenId: scrRes.data[0].id,
        }));
      }
    } catch {
      setErrorMessage('Failed to load admin dashboard data.');
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const populateAiFormFromMovie = (movie) => {
    if (!movie) return;
    const release = new Date(movie.releaseDate);
    const diffDays = Math.max(0, Math.round((Date.now() - release.getTime()) / (1000 * 60 * 60 * 24)));
    setAiForm((prev) => ({
      ...prev,
      averageMovieRating: movie.rating,
      genre: movie.genre,
      language: movie.language,
      daysSinceRelease: diffDays,
      movieDuration: movie.duration,
    }));
  };

  const loadPredictionsForMovie = async (movieId) => {
    if (!movieId) return;
    try {
      const res = await adminPricingApi.getPredictions(movieId);
      setPredictionHistory(res.data);
      setLatestPrediction(res.data[0] || null);
    } catch {
      setPredictionHistory([]);
    }
  };

  const handleMovieSelectionForAi = (movieIdStr) => {
    setSelectedMovieId(movieIdStr);
    const found = movies.find((m) => String(m.id) === String(movieIdStr));
    if (found) {
      populateAiFormFromMovie(found);
      loadPredictionsForMovie(found.id);
    }
  };

  const handleTriggerPrediction = async (e) => {
    e.preventDefault();
    if (!selectedMovieId) return;
    setAiLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const res = await adminPricingApi.predictPrice(selectedMovieId, {
        ...aiForm,
        averageMovieRating: Number(aiForm.averageMovieRating),
        daysSinceRelease: Number(aiForm.daysSinceRelease),
        movieDuration: Number(aiForm.movieDuration),
        expectedDemand: Number(aiForm.expectedDemand),
        currentOccupancy: Number(aiForm.currentOccupancy),
      });
      setLatestPrediction(res.data);
      await loadPredictionsForMovie(selectedMovieId);
      setStatusMessage(
        `FastAPI Predicted ${res.data.predictedCategory} (${(Number(res.data.confidence) * 100).toFixed(1)}% confidence) → Recommended ₹${res.data.recommendedPrice}`
      );
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          'FastAPI ML service is unreachable on port 8000. Run uvicorn app:app --port 8000 in ml-service.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleApprovePrediction = async (predictionId) => {
    setErrorMessage('');
    setStatusMessage('');
    try {
      const res = await adminPricingApi.approvePrediction(predictionId, {});
      setLatestPrediction(res.data);
      await loadPredictionsForMovie(selectedMovieId);
      await loadAllAdminData();
      setStatusMessage(
        `Approved AI dynamic ticket price of ₹${res.data.approvedPrice} for ${res.data.movieTitle}!`
      );
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Could not approve prediction.');
    }
  };

  const handleSaveMovie = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    try {
      const payload = {
        ...movieForm,
        duration: Number(movieForm.duration),
        rating: Number(movieForm.rating),
        basePrice: Number(movieForm.basePrice),
      };
      if (editingMovieId) {
        await movieApi.update(editingMovieId, payload);
        setStatusMessage('Movie updated.');
      } else {
        await movieApi.create(payload);
        setStatusMessage('Movie added.');
      }
      setEditingMovieId(null);
      await loadAllAdminData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save movie.');
    }
  };

  const handleDeleteMovie = async (id) => {
    try {
      await movieApi.remove(id);
      setStatusMessage('Movie deleted.');
      await loadAllAdminData();
    } catch {
      setErrorMessage('Failed to delete movie.');
    }
  };

  const handleCreateTheatre = async (e) => {
    e.preventDefault();
    try {
      await theatreShowApi.createTheatre({
        ...theatreForm,
        maxTicketPrice: Number(theatreForm.maxTicketPrice),
      });
      setTheatreForm({ name: '', city: 'Hyderabad', type: 'MULTIPLEX', maxTicketPrice: 450.0 });
      setStatusMessage('Theatre added.');
      await loadAllAdminData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create theatre.');
    }
  };

  const handleCreateScreen = async (e) => {
    e.preventDefault();
    try {
      await theatreShowApi.createScreen({
        name: screenForm.name,
        totalSeats: Number(screenForm.totalSeats),
        theatreId: Number(screenForm.theatreId),
      });
      setScreenForm((prev) => ({ ...prev, name: '' }));
      setStatusMessage('Screen & auditorium seats created.');
      await loadAllAdminData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create screen.');
    }
  };

  const handleSaveShow = async (e) => {
    e.preventDefault();
    try {
      const normalizedDateTime =
        showForm.showDateTime.length === 16 ? `${showForm.showDateTime}:00` : showForm.showDateTime;
      const payload = {
        movieId: Number(showForm.movieId),
        screenId: Number(showForm.screenId),
        showDateTime: normalizedDateTime,
        basePrice: Number(showForm.basePrice),
      };
      if (editingShowId) {
        await theatreShowApi.updateShow(editingShowId, payload);
        setStatusMessage('Show updated.');
      } else {
        await theatreShowApi.createShow(payload);
        setStatusMessage('Show scheduled.');
      }
      setEditingShowId(null);
      await loadAllAdminData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save show.');
    }
  };

  const handleDeleteShow = async (id) => {
    try {
      await theatreShowApi.deleteShow(id);
      setStatusMessage('Show deleted.');
      await loadAllAdminData();
    } catch {
      setErrorMessage('Failed to delete show.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8 space-y-8">
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-crimson-500">
          ADMINISTRATION & ML ENGINE
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
          Cinema Operations & AI Dynamic Pricing
        </h1>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Movies', value: summary.totalMovies },
          { label: 'Theatres', value: summary.totalTheatres },
          { label: 'Scheduled Shows', value: summary.totalShows },
          { label: 'Total Bookings', value: summary.totalBookings },
          { label: 'Registered Customers', value: summary.totalCustomers },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {kpi.label}
            </span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-crimson-600 text-xs font-bold">
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-3">
        {[
          { id: 'ai-pricing', label: '01 AI Dynamic Pricing' },
          { id: 'movies', label: '02 Movies' },
          { id: 'theatres', label: '03 Theatres & Screens' },
          { id: 'shows', label: '04 Shows' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition ${
              activeTab === t.id
                ? 'bg-crimson-500 text-white cta-crimson-shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: AI PRICING */}
      {activeTab === 'ai-pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleTriggerPrediction}
            className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-extrabold text-slate-900">
              Predict Popularity & Price (scikit-learn RandomForest)
            </h2>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                Movie
              </label>
              <select
                value={selectedMovieId}
                onChange={(e) => handleMovieSelectionForAi(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900"
              >
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} (Base ₹{m.basePrice} | Approved AI: {m.approvedDynamicPrice ? `₹${m.approvedDynamicPrice}` : 'None'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">IMDb Rating</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="10"
                  required
                  value={aiForm.averageMovieRating}
                  onChange={(e) => setAiForm({ ...aiForm, averageMovieRating: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Days Since Release</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={aiForm.daysSinceRelease}
                  onChange={(e) => setAiForm({ ...aiForm, daysSinceRelease: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Genre</label>
                <select
                  value={aiForm.genre}
                  onChange={(e) => setAiForm({ ...aiForm, genre: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900"
                >
                  {['ACTION', 'SCI_FI', 'DRAMA', 'THRILLER', 'COMEDY', 'HORROR', 'ROMANCE', 'FANTASY'].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Language</label>
                <select
                  value={aiForm.language}
                  onChange={(e) => setAiForm({ ...aiForm, language: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900"
                >
                  {['TELUGU', 'HINDI', 'ENGLISH', 'TAMIL', 'MALAYALAM', 'KANNADA'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Expected Demand (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={aiForm.expectedDemand}
                  onChange={(e) => setAiForm({ ...aiForm, expectedDemand: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Current Occupancy (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={aiForm.currentOccupancy}
                  onChange={(e) => setAiForm({ ...aiForm, currentOccupancy: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={aiLoading}
              className="w-full py-3.5 rounded-lg bg-crimson-500 hover:bg-crimson-600 text-white font-bold text-xs uppercase tracking-wider transition cta-crimson-shadow"
            >
              {aiLoading ? 'Querying FastAPI...' : 'Predict Ticket Price'}
            </button>
          </form>

          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <h3 className="text-lg font-extrabold text-slate-900">Prediction Output</h3>
              {!latestPrediction ? (
                <div className="p-8 rounded-2xl bg-slate-50 text-center text-xs text-slate-400">
                  Run a prediction to view the ML classification and recommended price.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Category</span>
                      <span className="text-base font-extrabold text-crimson-500">
                        {latestPrediction.predictedCategory}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {latestPrediction.multiplierApplied}x multiplier
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Confidence</span>
                      <span className="text-base font-extrabold text-seatblue-500">
                        {(Number(latestPrediction.confidence) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Recommended</span>
                      <span className="text-xl font-extrabold text-slate-900">
                        ₹{latestPrediction.recommendedPrice}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 flex justify-between">
                      <span className="text-slate-400">Single-Screen Cap (≤₹350):</span>
                      <strong className="text-slate-800">₹{latestPrediction.singleScreenCappedPrice}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 flex justify-between">
                      <span className="text-slate-400">Multiplex Cap (≤₹450):</span>
                      <strong className="text-slate-800">₹{latestPrediction.multiplexCappedPrice}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApprovePrediction(latestPrediction.id)}
                    className="w-full py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition"
                  >
                    ✓ Approve ₹{latestPrediction.recommendedPrice} for {latestPrediction.movieTitle}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOVIES */}
      {activeTab === 'movies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleSaveMovie}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 space-y-3"
          >
            <h2 className="text-lg font-extrabold text-slate-900">
              {editingMovieId ? 'Edit Movie' : 'Add Movie'}
            </h2>
            <input
              type="text"
              required
              placeholder="Title"
              value={movieForm.title}
              onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
            <textarea
              rows={2}
              required
              placeholder="Description"
              value={movieForm.description}
              onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Genre"
                value={movieForm.genre}
                onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Language"
                value={movieForm.language}
                onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              />
              <input
                type="number"
                required
                placeholder="Duration (mins)"
                value={movieForm.duration}
                onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              />
              <input
                type="date"
                required
                value={movieForm.releaseDate}
                onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              />
              <input
                type="number"
                step="0.1"
                required
                placeholder="Rating"
                value={movieForm.rating}
                onChange={(e) => setMovieForm({ ...movieForm, rating: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              />
              <input
                type="number"
                required
                placeholder="Base Price (₹)"
                value={movieForm.basePrice}
                onChange={(e) => setMovieForm({ ...movieForm, basePrice: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              />
            </div>
            <input
              type="url"
              required
              placeholder="Poster URL"
              value={movieForm.posterUrl}
              onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-crimson-500 text-white font-bold text-xs uppercase tracking-wider cta-crimson-shadow"
            >
              {editingMovieId ? 'Update Movie' : '+ Add Movie'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
            <h3 className="text-lg font-extrabold text-slate-900">Catalog ({movies.length})</h3>
            {movies.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-slate-900 text-sm">{m.title}</p>
                  <p className="text-xs text-slate-400">
                    {m.genre} • {m.language} • Base ₹{m.basePrice}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMovieId(m.id);
                      setMovieForm(m);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMovie(m.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-xs font-bold text-crimson-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: THEATRES & SCREENS */}
      {activeTab === 'theatres' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleCreateTheatre}
              className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900">Add Theatre</h2>
              <input
                type="text"
                required
                placeholder="Theatre Name"
                value={theatreForm.name}
                onChange={(e) => setTheatreForm({ ...theatreForm, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              />
              <input
                type="text"
                required
                placeholder="City"
                value={theatreForm.city}
                onChange={(e) => setTheatreForm({ ...theatreForm, city: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={theatreForm.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setTheatreForm({
                      ...theatreForm,
                      type,
                      maxTicketPrice: type === 'SINGLE_SCREEN' ? 350 : 450,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                >
                  <option value="SINGLE_SCREEN">SINGLE_SCREEN (≤₹350)</option>
                  <option value="MULTIPLEX">MULTIPLEX (≤₹450)</option>
                </select>
                <input
                  type="number"
                  required
                  value={theatreForm.maxTicketPrice}
                  onChange={(e) => setTheatreForm({ ...theatreForm, maxTicketPrice: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-crimson-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                + Add Theatre
              </button>
            </form>

            <form
              onSubmit={handleCreateScreen}
              className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3"
            >
              <h2 className="text-lg font-extrabold text-slate-900">Add Screen</h2>
              <select
                value={screenForm.theatreId}
                onChange={(e) => setScreenForm({ ...screenForm, theatreId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              >
                {theatres.map((th) => (
                  <option key={th.id} value={th.id}>{th.name} ({th.type})</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Screen Name"
                  value={screenForm.name}
                  onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                />
                <input
                  type="number"
                  min="8"
                  max="120"
                  required
                  value={screenForm.totalSeats}
                  onChange={(e) => setScreenForm({ ...screenForm, totalSeats: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs uppercase tracking-wider"
              >
                + Create Screen & Seats
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
            <h3 className="text-lg font-extrabold text-slate-900">Theatres & Screens</h3>
            {theatres.map((th) => (
              <div key={th.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-900 text-sm">{th.name} ({th.city})</span>
                  <span className="text-xs font-bold text-crimson-500">
                    {th.type} • Cap ₹{th.maxTicketPrice}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {screens
                    .filter((s) => s.theatreId === th.id)
                    .map((s) => (
                      <span
                        key={s.id}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-600"
                      >
                        {s.name} ({s.totalSeats} seats)
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SHOWS */}
      {activeTab === 'shows' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleSaveShow}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 space-y-3"
          >
            <h2 className="text-lg font-extrabold text-slate-900">Schedule Show</h2>
            <select
              value={showForm.movieId}
              onChange={(e) => setShowForm({ ...showForm, movieId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            >
              {movies.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
            <select
              value={showForm.screenId}
              onChange={(e) => setShowForm({ ...showForm, screenId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            >
              {screens.map((s) => (
                <option key={s.id} value={s.id}>{s.theatreName} — {s.name}</option>
              ))}
            </select>
            <input
              type="datetime-local"
              required
              value={showForm.showDateTime}
              onChange={(e) => setShowForm({ ...showForm, showDateTime: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
            <input
              type="number"
              required
              value={showForm.basePrice}
              onChange={(e) => setShowForm({ ...showForm, basePrice: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-crimson-500 text-white font-bold text-xs uppercase tracking-wider cta-crimson-shadow"
            >
              + Schedule Show
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
            <h3 className="text-lg font-extrabold text-slate-900">Scheduled Shows ({shows.length})</h3>
            {shows.map((sh) => (
              <div
                key={sh.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-slate-900 text-sm">{sh.movieTitle}</p>
                  <p className="text-xs text-slate-500">
                    {sh.theatreName} ({sh.screenName}) • {new Date(sh.showDateTime).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteShow(sh.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-xs font-bold text-crimson-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
