import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdDirectionsCar, MdBadge, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md'

const ClientLogin = () => {
  const [form, setForm] = useState({ id_client: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/client/login', form)
      login(data.user, data.token)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <MdDirectionsCar size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">DiagAuto Connect</h1>
          <p className="text-gray-500 text-sm mt-1">Espace Client</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* ID Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Client
            </label>
            <div className="relative">
              <MdBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                className="input pl-10 uppercase tracking-widest font-mono"
                placeholder="CLI-XXXXX"
                value={form.id_client}
                onChange={e => setForm({ ...form, id_client: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Votre ID client vous a été fourni par l'administrateur après validation de votre compte.
            </p>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPwd ? 'text' : 'password'}
                className="input pl-9 pr-10"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 mt-2 text-base"
          >
            {loading ? 'Connexion...' : 'Accéder à mon espace'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">© DiagAuto Connect</p>
      </div>
    </div>
  )
}

export default ClientLogin
