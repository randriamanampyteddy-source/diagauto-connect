const STORAGE_KEY = 'diagauto_api_base_url'

export const normalizeApiBaseUrl = (value) => {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw) return ''
  if (raw === '/api') return raw
  if (!/^https?:\/\//i.test(raw)) return ''
  return raw.endsWith('/api') ? raw : `${raw}/api`
}

export const getApiBaseUrl = () => {
  const saved = normalizeApiBaseUrl(localStorage.getItem(STORAGE_KEY))
  return saved || import.meta.env.VITE_API_BASE_URL || '/api'
}

export const setApiBaseUrl = (value) => {
  const normalized = normalizeApiBaseUrl(value)
  if (!normalized) throw new Error('URL serveur invalide')
  localStorage.setItem(STORAGE_KEY, normalized)
  return normalized
}

export const clearApiBaseUrl = () => {
  localStorage.removeItem(STORAGE_KEY)
}

export const getApiHealthUrl = (baseUrl = getApiBaseUrl()) => {
  if (baseUrl === '/api') return '/'
  return baseUrl.replace(/\/api$/, '')
}
