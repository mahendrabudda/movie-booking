import React, { useState, useEffect } from 'react';
import {
  adminPricingApi,
  movieApi,
  theatreShowApi,
} from '../services/api';

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

  // Movie Form State
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

  // Theatre & Screen Form State
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

  // Show Form State
  const [editingShowId, setEditingShowId] = useState(null);
  const [showForm, setShowForm] = useState({
    movieId: '',
    screenId: '',
    showDateTime: '2026-11-20T18:30',
    basePrice: 240.0,
  });

  // AI Pricing State
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
    } catch (err) {
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
        `AI Model predicted ${res.data.predictedCategory} (${(Number(res.data.confidence) * 100).toFixed(1)}% confidence) → Recommended ₹${res.data.recommendedPrice}`
      );
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          'FastAPI ML service is unreachable. Ensure uvicorn app:app --port 8000 is running.'
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
        `Approved dynamic ticket price of ₹${res.data.approvedPrice} for ${res.data.movieTitle}!`
      );
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Could not approve prediction.');
    }
  };

  // Movie CRUD Handlers
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
        setStatusMessage('Movie updated successfully.');
      } else {
        await movieApi.create(payload);
        setStatusMessage('Movie added successfully.');
      }
      setEditingMovieId(null);
      setMovieForm({
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
      await loadAllAdminData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save movie.');
    }
  };

  const handleEditMovieClick = (m) => {
    setEditingMovieId(m.id);
    setMovieForm({
      title: m.title,
      description: m.description,
      genre: m.genre,
      language: m.language,
      duration: m.duration,
      releaseDate: m.releaseDate,
      posterUrl: m.posterUrl,
      rating: m.rating,
      basePrice: m.basePrice,
    });
  };

  const handleDeleteMovie = async (id) => {
    setErrorMessage('');
    try {
      await movieApi.remove(id);
      setStatusMessage('Movie deleted.');
      await loadAllAdminData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete movie.');
    }
  };

  // Theatre & Screen Handlers
  const handleCreateTheatre = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    try {
      await theatreShowApi.createTheatre({
        ...theatreForm,
        maxTicketPrice: Number(theatreForm.maxTicketPrice),
      });
      setTheatreForm({ name: '', city: 'Hyderabad', type: 'MULTIPLEX', maxTicketPrice: 450.0 });
      setStatusMessage('Theatre added successfully.');
      await loadAllAdminData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create theatre.');
    }
  };

  const handleCreateScreen = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    try {
      await theatreShowApi.createScreen({
        name: screenForm.name,
        totalSeats: Number(screenForm.totalSeats),
        theatreId: Number(screenForm.theatreId),
      });
      setScreenForm((prev) => ({ ...prev, name: '' }));
      setStatusMessage('Screen created and seats automatically initialized.');
      await loadAllAdminData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create screen.');
    }
  };

  // Show CRUD Handlers
  const handleSaveShow = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    try {
      const normalizedDateTime =
        showForm.showDateTime.length === 16
          ? `${showForm.showDateTime}:00`
          : showForm.showDateTime;
      const payload = {
        movieId: Number(showForm.movieId),
        screenId: Number(showForm.screenId),
        showDateTime: normalizedDateTime,
        basePrice: Number(showForm.basePrice),
      };
      if (editingShowId) {
        await theatreShowApi.updateShow(editingShowId, payload);
        setStatusMessage('Show updated successfully.');
      } else {
        await theatreShowApi.createShow(payload);
        setStatusMessage('New show scheduled.');
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
    } catch (err) {
      setErrorMessage('Failed to delete show.');
    }
  };

  const selectedMovieObj = movies.find((m) => String(m.id) === String(selectedMovieId));

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Administrator Control Center
        </span>
        <h1 className="text-3xl font-extrabold text-white mt-1">
          Cinema Operations & AI Dynamic Pricing Dashboard
        </h1>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Movies', value: summary.totalMovies, color: 'text-amber-400' },
          { label: 'Total Theatres', value: summary.totalTheatres, color: 'text-sky-400' },
          { label: 'Active Shows', value: summary.totalShows, color: 'text-emerald-400' },
          { label: 'Total Bookings', value: summary.totalBookings, color: 'text-rose-400' },
          { label: 'Customers', value: summary.totalCustomers, color: 'text-indigo-400' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow"
          >
            <span className="text-xs text-slate-400 font-medium">{kpi.label}</span>
            <p className={`text-3xl font-extrabold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'ai-pricing', label: '1. AI Dynamic Pricing Engine' },
          { id: 'movies', label: '2. Movie Management' },
          { id: 'theatres', label: '3. Theatres & Screens' },
          { id: 'shows', label: '4. Show Management' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === t.id
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: AI DYNAMIC PRICING */}
      {activeTab === 'ai-pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleTriggerPrediction}
            className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-white">
              Predict Ticket Price via FastAPI (RandomForestClassifier)
            </h2>
            <p className="text-xs text-slate-400">
              Select a movie, review or adjust real-time demand/occupancy features, and invoke the Python ML microservice.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Movie
              </label>
              <select
                value={selectedMovieId}
                onChange={(e) => handleMovieSelectionForAi(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              >
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} (Base: ₹{m.basePrice} | Approved AI: {m.approvedDynamicPrice ? `₹${m.approvedDynamicPrice}` : 'None'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Average Rating (1-10)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="10"
                  required
                  value={aiForm.averageMovieRating}
                  onChange={(e) => setAiForm({ ...aiForm, averageMovieRating: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Days Since Release</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={aiForm.daysSinceRelease}
                  onChange={(e) => setAiForm({ ...aiForm, daysSinceRelease: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Genre</label>
                <select
                  value={aiForm.genre}
                  onChange={(e) => setAiForm({ ...aiForm, genre: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                >
                  {['ACTION', 'SCI_FI', 'DRAMA', 'THRILLER', 'COMEDY', 'HORROR', 'ROMANCE', 'FANTASY'].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Language</label>
                <select
                  value={aiForm.language}
                  onChange={(e) => setAiForm({ ...aiForm, language: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                >
                  {['TELUGU', 'HINDI', 'ENGLISH', 'TAMIL', 'MALAYALAM', 'KANNADA'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration (mins)</label>
                <input
                  type="number"
                  min="40"
                  max="300"
                  required
                  value={aiForm.movieDuration}
                  onChange={(e) => setAiForm({ ...aiForm, movieDuration: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Cap Tier</label>
                <select
                  value={aiForm.theatreTypeCap}
                  onChange={(e) => setAiForm({ ...aiForm, theatreTypeCap: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                >
                  <option value="MULTIPLEX">MULTIPLEX (Max ₹450)</option>
                  <option value="SINGLE_SCREEN">SINGLE_SCREEN (Max ₹350)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Expected Demand (0-100%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={aiForm.expectedDemand}
                  onChange={(e) => setAiForm({ ...aiForm, expectedDemand: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Current Occupancy (0-100%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={aiForm.currentOccupancy}
                  onChange={(e) => setAiForm({ ...aiForm, currentOccupancy: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={aiLoading}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition shadow-lg"
            >
              {aiLoading ? 'Querying FastAPI ML Service...' : '⚡ Predict Ticket Price'}
            </button>
          </form>

          {/* Prediction Result Card & History */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Latest AI Prediction & Recommendation</h3>
                {selectedMovieObj && (
                  <span className="text-xs text-slate-400">
                    Base Price: <strong className="text-white">₹{selectedMovieObj.basePrice}</strong>
                  </span>
                )}
              </div>

              {!latestPrediction ? (
                <div className="p-8 text-center text-slate-400 text-sm bg-slate-950 rounded-xl border border-slate-800">
                  Click <strong>Predict Ticket Price</strong> to run the scikit-learn model for this movie.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Predicted Category</span>
                      <span className="text-base font-extrabold text-amber-400">
                        {latestPrediction.predictedCategory}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Multiplier: {latestPrediction.multiplierApplied}x
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">ML Confidence</span>
                      <span className="text-base font-extrabold text-sky-400">
                        {(Number(latestPrediction.confidence) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Recommended Price</span>
                      <span className="text-xl font-extrabold text-emerald-400">
                        ₹{latestPrediction.recommendedPrice}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Single-Screen Cap (≤₹350):</span>
                      <strong className="text-white">₹{latestPrediction.singleScreenCappedPrice}</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Multiplex Cap (≤₹450):</span>
                      <strong className="text-white">₹{latestPrediction.multiplexCappedPrice}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-slate-400">
                      Status:{' '}
                      {latestPrediction.approved ? (
                        <span className="text-emerald-400 font-bold">
                          Approved (₹{latestPrediction.approvedPrice})
                        </span>
                      ) : (
                        <span className="text-amber-300 font-semibold">Pending Admin Approval</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApprovePrediction(latestPrediction.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition"
                    >
                      ✓ Approve Recommended Price (₹{latestPrediction.recommendedPrice})
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prediction History */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h4 className="text-sm font-bold text-white">Prediction Audit Log ({predictionHistory.length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {predictionHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-amber-400">{item.predictedCategory}</span>
                      <span className="text-slate-400 ml-2">
                        ({(Number(item.confidence) * 100).toFixed(1)}%) • Base ₹{item.basePrice} → Rec ₹{item.recommendedPrice}
                      </span>
                    </div>
                    <div>
                      {item.approved ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          Approved ₹{item.approvedPrice}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApprovePrediction(item.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOVIE MANAGEMENT */}
      {activeTab === 'movies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveMovie}
            className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"
          >
            <h2 className="text-lg font-bold text-white">
              {editingMovieId ? 'Edit Movie' : 'Add New Movie'}
            </h2>
            <input
              type="text"
              required
              placeholder="Movie Title"
              value={movieForm.title}
              onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
            />
            <textarea
              rows={3}
              required
              placeholder="Synopsis / Description"
              value={movieForm.description}
              onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Genre (e.g. SCI_FI)"
                value={movieForm.genre}
                onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
              <input
                type="text"
                required
                placeholder="Language (e.g. TELUGU)"
                value={movieForm.language}
                onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
              <input
                type="number"
                required
                placeholder="Duration (mins)"
                value={movieForm.duration}
                onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
              <input
                type="date"
                required
                value={movieForm.releaseDate}
                onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
              <input
                type="number"
                step="0.1"
                required
                placeholder="Rating (1-10)"
                value={movieForm.rating}
                onChange={(e) => setMovieForm({ ...movieForm, rating: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
              <input
                type="number"
                step="1"
                required
                placeholder="Base Price (₹)"
                value={movieForm.basePrice}
                onChange={(e) => setMovieForm({ ...movieForm, basePrice: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>
            <input
              type="url"
              required
              placeholder="Poster URL"
              value={movieForm.posterUrl}
              onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
            />
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {editingMovieId ? 'Update Movie' : '+ Add Movie'}
              </button>
              {editingMovieId && (
                <button
                  type="button"
                  onClick={() => setEditingMovieId(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-bold text-white">Catalog Movies ({movies.length})</h3>
            <div className="space-y-2.5">
              {movies.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-bold text-white text-sm">{m.title}</p>
                    <p className="text-xs text-slate-400">
                      {m.genre} • {m.language} • {m.duration}m • Base ₹{m.basePrice}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditMovieClick(m)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMovie(m.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THEATRES & SCREENS */}
      {activeTab === 'theatres' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleCreateTheatre}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"
            >
              <h2 className="text-lg font-bold text-white">Add Theatre</h2>
              <input
                type="text"
                required
                placeholder="Theatre Name"
                value={theatreForm.name}
                onChange={(e) => setTheatreForm({ ...theatreForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
              <input
                type="text"
                required
                placeholder="City"
                value={theatreForm.city}
                onChange={(e) => setTheatreForm({ ...theatreForm, city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={theatreForm.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setTheatreForm({
                      ...theatreForm,
                      type,
                      maxTicketPrice: type === 'SINGLE_SCREEN' ? 350.0 : 450.0,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                >
                  <option value="SINGLE_SCREEN">SINGLE_SCREEN (≤₹350)</option>
                  <option value="MULTIPLEX">MULTIPLEX (≤₹450)</option>
                </select>
                <input
                  type="number"
                  required
                  max={theatreForm.type === 'SINGLE_SCREEN' ? 350 : 450}
                  value={theatreForm.maxTicketPrice}
                  onChange={(e) => setTheatreForm({ ...theatreForm, maxTicketPrice: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                + Add Theatre
              </button>
            </form>

            <form
              onSubmit={handleCreateScreen}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"
            >
              <h2 className="text-lg font-bold text-white">Add Screen to Theatre</h2>
              <select
                value={screenForm.theatreId}
                onChange={(e) => setScreenForm({ ...screenForm, theatreId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              >
                {theatres.map((th) => (
                  <option key={th.id} value={th.id}>
                    {th.name} ({th.type})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Screen Name (e.g. Audi 3)"
                  value={screenForm.name}
                  onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
                <input
                  type="number"
                  min="8"
                  max="120"
                  required
                  placeholder="Total Seats"
                  value={screenForm.totalSeats}
                  onChange={(e) => setScreenForm({ ...screenForm, totalSeats: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
              >
                + Create Screen & Auto-Generate Seats
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Configured Theatres & Screens</h3>
            <div className="space-y-3">
              {theatres.map((th) => (
                <div key={th.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {th.name} — {th.city}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">
                      {th.type} • Cap ₹{th.maxTicketPrice}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {screens
                      .filter((s) => s.theatreId === th.id)
                      .map((s) => (
                        <span
                          key={s.id}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
                        >
                          {s.name} ({s.totalSeats} seats)
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SHOW MANAGEMENT */}
      {activeTab === 'shows' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveShow}
            className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"
          >
            <h2 className="text-lg font-bold text-white">
              {editingShowId ? 'Update Show' : 'Create Movie Show'}
            </h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Movie</label>
              <select
                value={showForm.movieId}
                onChange={(e) => setShowForm({ ...showForm, movieId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              >
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Theatre & Screen</label>
              <select
                value={showForm.screenId}
                onChange={(e) => setShowForm({ ...showForm, screenId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              >
                {screens.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.theatreName} — {s.name} ({s.theatreType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Show Date & Time</label>
              <input
                type="datetime-local"
                required
                value={showForm.showDateTime}
                onChange={(e) => setShowForm({ ...showForm, showDateTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Show Base Ticket Price (₹)</label>
              <input
                type="number"
                required
                min="80"
                max="450"
                value={showForm.basePrice}
                onChange={(e) => setShowForm({ ...showForm, basePrice: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {editingShowId ? 'Update Show' : '+ Schedule Show'}
              </button>
              {editingShowId && (
                <button
                  type="button"
                  onClick={() => setEditingShowId(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-bold text-white">Scheduled Shows ({shows.length})</h3>
            <div className="space-y-2.5">
              {shows.map((sh) => (
                <div
                  key={sh.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-bold text-white text-sm">{sh.movieTitle}</p>
                    <p className="text-xs text-slate-400">
                      {sh.theatreName} ({sh.screenName}) • {new Date(sh.showDateTime).toLocaleString()}
                    </p>
                    <p className="text-xs text-amber-400 mt-0.5">
                      Base: ₹{sh.basePrice} | Effective Regular: ₹{sh.effectiveTicketPrice} | Premium: ₹{sh.premiumTicketPrice}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingShowId(sh.id);
                        setShowForm({
                          movieId: sh.movieId,
                          screenId: sh.screenId,
                          showDateTime: sh.showDateTime.slice(0, 16),
                          basePrice: sh.basePrice,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteShow(sh.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
