import axios from 'axios'
import Cookies from 'js-cookie'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  timeout: 15000,
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 &&
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !original._retry) {
      original._retry = true
      try {
        const refreshToken = Cookies.get('refreshToken')
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken }
        )
        Cookies.set('accessToken', data.accessToken, { expires: 1 / 96 }) // 15min
        Cookies.set('refreshToken', data.refreshToken, { expires: 7 })
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        Cookies.remove('accessToken')
        Cookies.remove('refreshToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (phone, password) => api.post('/auth/login', { phone, password }),
  verifyOTP: (phone, otp) => api.post('/auth/otp/verify', { phone, otp }),
  sendOTP: (phone) => api.post('/auth/otp/send', { phone }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
}

// ── Complaints ───────────────────────────────────────────────────────────────
export const complaintsAPI = {
  submit: (formData) => api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (params) => api.get('/complaints', { params }),
  get: (id) => api.get(`/complaints/${id}`),
  updateStatus: (id, status, note) =>
    api.put(`/complaints/${id}/status`, { status, rejection_note: note }),
  assign: (id, workerId, notes) =>
    api.post(`/complaints/${id}/assign`, { worker_id: workerId, notes }),
  upvote: (id) => api.post(`/complaints/${id}/upvote`),
}

// ── AI ───────────────────────────────────────────────────────────────────────
export const aiAPI = {
  classify: (formData) => api.post('/ai/classify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  hotspots: (params) => api.get('/ai/hotspots', { params }),
  predictions: (wardId) => api.get(`/ai/predictions/ward/${wardId}`),
  heatmap: (params) => api.get('/ai/heatmap', { params }),
}

// ── Map ──────────────────────────────────────────────────────────────────────
export const mapAPI = {
  centers: (lat, lng, radius, type) =>
    api.get('/map/centers', { params: { lat, lng, radius, type } }),
  bins: (wardId) => api.get('/map/bins', { params: { ward_id: wardId } }),
}

// ── Training & Gamification ──────────────────────────────────────────────────
export const trainingAPI = {
  modules: (category) => api.get('/training/modules', { params: { category } }),
  module: (id) => api.get(`/training/modules/${id}`),
  submitQuiz: (data) => api.post('/training/quiz/submit', data),
}

export const gamificationAPI = {
  leaderboard: (wardId) => api.get('/gamification/leaderboard', { params: { ward_id: wardId } }),
  me: () => api.get('/gamification/me'),
}

// ── Workers ──────────────────────────────────────────────────────────────────
export const workersAPI = {
  list: (params) => api.get('/workers', { params }),
  updateStatus: (id, status, lat, lng) =>
    api.put(`/workers/${id}/status`, { status, lat, lng }),
}

// ── Reports ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
  dashboard: (params) => api.get('/reports/dashboard', { params }),
  export: (params) => api.get('/reports/export', { params, responseType: 'blob' }),
  participation: (wardId) =>
    api.get('/reports/citizen-participation', { params: { ward_id: wardId } }),
}

// ── Notifications ────────────────────────────────────────────────────────────
export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}
