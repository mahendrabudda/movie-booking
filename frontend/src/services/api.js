import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

let inMemoryToken = sessionStorage.getItem('cinepulse_jwt') || null;

export const setAuthToken = (token) => {
  inMemoryToken = token;
  if (token) {
    sessionStorage.setItem('cinepulse_jwt', token);
  } else {
    sessionStorage.removeItem('cinepulse_jwt');
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Sends HTTP-only cookie automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const movieApi = {
  getAll: (title = '') => api.get('/movies', { params: title ? { title } : {} }),
  getById: (id) => api.get(`/movies/${id}`),
  create: (payload) => api.post('/movies', payload),
  update: (id, payload) => api.put(`/movies/${id}`, payload),
  remove: (id) => api.delete(`/movies/${id}`),
};

export const theatreShowApi = {
  getTheatres: () => api.get('/theatres'),
  createTheatre: (payload) => api.post('/theatres', payload),
  getScreens: (theatreId) => api.get('/theatres/screens', { params: theatreId ? { theatreId } : {} }),
  createScreen: (payload) => api.post('/theatres/screens', payload),
  getShows: (movieId) => api.get('/shows', { params: movieId ? { movieId } : {} }),
  getShowById: (showId) => api.get(`/shows/${showId}`),
  getShowSeats: (showId) => api.get(`/shows/${showId}/seats`),
  createShow: (payload) => api.post('/shows', payload),
  updateShow: (id, payload) => api.put(`/shows/${id}`, payload),
  deleteShow: (id) => api.delete(`/shows/${id}`),
};

export const bookingApi = {
  create: (payload) => api.post('/bookings', payload),
  getMyBookings: () => api.get('/bookings/my'),
  getByReference: (reference) => api.get(`/bookings/${reference}`),
};

export const adminPricingApi = {
  getDashboardSummary: () => api.get('/admin/dashboard/summary'),
  predictPrice: (movieId, payload) => api.post(`/admin/pricing/predict/${movieId}`, payload),
  getPredictions: (movieId) => api.get(`/admin/pricing/${movieId}`),
  approvePrediction: (predictionId, payload = {}) => api.post(`/admin/pricing/approve/${predictionId}`, payload),
};

export default api;
