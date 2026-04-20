import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('fp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fp_token');
      localStorage.removeItem('fp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  telegramJoined: () => api.post('/api/auth/telegram-joined'),
};

export const videoAPI = {
  list: (params) => api.get('/api/videos/', { params }),
  featured: () => api.get('/api/videos/featured'),
  search: (q) => api.get('/api/videos/search', { params: { q } }),
  get: (id) => api.get(`/api/videos/${id}`),
  related: (id) => api.get(`/api/videos/${id}/related`),
  categories: () => api.get('/api/videos/categories'),
};

export const streamAPI = {
  getToken: (videoId, partId) => api.get(`/api/stream/token/${videoId}/${partId}`),
  watchUrl: (token) => `${BASE_URL}/api/stream/watch/${token}`,
  downloadUrl: (token) => `${BASE_URL}/api/stream/download/${token}`,
};

export const plansAPI = {
  list: () => api.get('/api/plans/'),
};

export const tokenAPI = {
  generate: () => api.post('/api/tokens/generate'),
  verify: (token) => api.get(`/api/tokens/verify/${token}`),
  myTokens: () => api.get('/api/tokens/my-tokens'),
};

export default api;
