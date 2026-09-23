/**
 * api.js — Axios client for the FastAPI backend.
 * All API calls are centralised here to make the IBM watsonx.ai
 * integration easy to modify or mock.
 */
import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// Add request/response interceptors for global error handling
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

export const api = {
  // Health
  health: () => client.get('/health'),

  // Dataset
  uploadCsv: (file) => {
    const form = new FormData()
    form.append('file', file)
    return client.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
  },
  getDataset: (page = 1, pageSize = 50) =>
    client.get('/dataset', { params: { page, page_size: pageSize } }),
  getDatasetInfo: () => client.get('/dataset/info'),

  // Summary / dashboard
  getSummary: () => client.get('/summary'),
  getChartData: () => client.get('/charts/process-parameters'),

  // Agents
  getMonitoring: (page = 1, pageSize = 50) =>
    client.get('/monitoring', { params: { page, page_size: pageSize } }),
  getAlerts: (severity) =>
    client.get('/monitoring/alerts', { params: severity ? { severity } : {} }),
  getQuality: (page = 1, pageSize = 50) =>
    client.get('/quality', { params: { page, page_size: pageSize } }),
  getDefects: (page = 1, pageSize = 50) =>
    client.get('/defects', { params: { page, page_size: pageSize } }),
  getOptimizations: (page = 1, pageSize = 50) =>
    client.get('/optimizations', { params: { page, page_size: pageSize } }),

  // Chat
  chat: (message, history = []) =>
    client.post('/chat', { message, history }),

  // Report
  getReport: () => client.get('/report'),
}
