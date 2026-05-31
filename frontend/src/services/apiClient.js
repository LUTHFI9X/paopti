import axios from 'axios'

function normalizeConfiguredBaseUrl(rawValue) {
  const value = (rawValue || '').trim()
  if (!value) {
    return ''
  }

  let normalized = value
  const hasProtocol = /^https?:\/\//i.test(normalized)
  if (!hasProtocol) {
    const isLocalhost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(normalized)
    normalized = `${isLocalhost ? 'http' : 'https'}://${normalized}`
  }

  normalized = normalized.replace(/\/+$/, '')

  if (!normalized.toLowerCase().endsWith('/api')) {
    normalized = `${normalized}/api`
  }

  return normalized
}

function resolveBaseUrl() {
  const configuredBaseUrl = normalizeConfiguredBaseUrl(import.meta.env.VITE_API_BASE_URL)

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
