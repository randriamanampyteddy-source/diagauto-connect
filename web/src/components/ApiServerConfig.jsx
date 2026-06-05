import { useState } from 'react'
import { toast } from 'react-toastify'
import { clearApiBaseUrl, getApiBaseUrl, getApiHealthUrl, setApiBaseUrl } from '../utils/apiServer'
import api from '../api/axios'

const ApiServerConfig = ({ compact = false }) => {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(getApiBaseUrl())
  const [testing, setTesting] = useState(false)

  const save = () => {
    try {
      const normalized = setApiBaseUrl(value)
      api.defaults.baseURL = normalized
      toast.success('Serveur enregistre')
      setOpen(false)
      window.location.reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const reset = () => {
    clearApiBaseUrl()
    api.defaults.baseURL = getApiBaseUrl()
    toast.success('Configuration serveur reinitialisee')
    setOpen(false)
    window.location.reload()
  }

  const test = async () => {
    const normalized = value === '/api' ? '/api' : String(value || '').trim().replace(/\/+$/, '')
    setTesting(true)
    try {
      const apiUrl = normalized.endsWith('/api') ? normalized : `${normalized}/api`
      const healthUrl = getApiHealthUrl(apiUrl)
      const response = await fetch(healthUrl, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      toast.success('Serveur accessible')
    } catch {
      toast.error('Serveur inaccessible')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={compact ? 'mt-3 text-center' : 'mt-4'}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-semibold text-primary hover:underline"
      >
        Configuration serveur
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-left">
          <label className="block text-xs font-medium text-gray-600 mb-1">URL API publique</label>
          <input
            className="input text-xs"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="https://diagauto-connect.onrender.com/api"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={test} disabled={testing} className="px-3 py-1.5 rounded-lg bg-white border text-xs font-semibold">
              {testing ? 'Test...' : 'Tester'}
            </button>
            <button type="button" onClick={save} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">
              Enregistrer
            </button>
            <button type="button" onClick={reset} className="px-3 py-1.5 rounded-lg bg-white border text-xs font-semibold text-gray-600">
              Defaut
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApiServerConfig
