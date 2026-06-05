import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ApiServerConfig from '../../components/ApiServerConfig'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdAdminPanelSettings, MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdInfo } from 'react-icons/md'

// Identifiants par défaut — à changer dans Paramètres > Mon compte
const DEFAULT_EMAIL = 'admin@diagauto.mg'
const DEFAULT_PASSWORD = 'admin123'

const AdminLogin = () => {
  const [form, setForm] = useState({ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/admin/login', form)
      login(data.user, data.token)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-primary">

      {/* Panneau gauche */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-[45%] text-white">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
          <MdAdminPanelSettings size={36} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-3">DiagAuto Connect</h1>
        <p className="text-blue-200 text-lg mb-8">Plateforme de gestion automobile</p>
        <div className="flex flex-col gap-3">
          {[
            'Gestion des clients & véhicules',
            'Rendez-vous & interventions',
            'Devis, proformas & factures',
            'Tableau de bord en temps réel'
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-blue-100">
              <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 flex items-center justify-center px-6 bg-white lg:rounded-l-3xl">
        <div className="w-full max-w-md">

          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
              <MdAdminPanelSettings size={30} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-primary">DiagAuto Connect</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">Administration</h2>
          <p className="text-gray-500 text-sm mb-6">Connectez-vous avec vos identifiants.</p>

          {/* Notice identifiants par défaut */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <MdInfo size={20} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-blue-800 mb-1">Identifiants par défaut</p>
              <p className="text-blue-600">Email : <span className="font-mono font-bold">{DEFAULT_EMAIL}</span></p>
              <p className="text-blue-600">Mot de passe : <span className="font-mono font-bold">{DEFAULT_PASSWORD}</span></p>
              <p className="text-blue-500 text-xs mt-1">→ Changez-les dans <strong>Mon compte</strong> après connexion.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  className="input pl-9"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pl-9 pr-10"
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
              className="btn-primary py-3 text-base mt-1"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <ApiServerConfig compact />

          <p className="text-center text-xs text-gray-300 mt-8">
            © DiagAuto Connect — Espace Administrateur
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
