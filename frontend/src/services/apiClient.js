import axios from 'axios'

function resolveBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (configuredBaseUrl) {
    return configuredBaseUrl
  }

  if (import.meta.env.PROD) {
    // In production, avoid localhost fallback that causes mixed-content network errors.
    console.warn('[SPI-Hub] VITE_API_BASE_URL is not set. Falling back to /api on current domain.')
    return '/api'
  }

  return 'http://localhost:8000/api'
}

const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 10000,
})

export default apiClient
