import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdDirectionsCar } from 'react-icons/md'

const Register = () => {
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', telephone: '', adresse: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/client/register', form)
      setDone(data.id_client)
      toast.success('Inscription réussie !')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MdDirectionsCar size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Inscription envoyée !</h2>
        <p className="text-gray-500 mb-6">Votre demande a été transmise à l'administrateur. Vous recevrez votre <strong>ID Client</strong> une fois votre compte validé.</p>

        <div className="bg-primary/10 border-2 border-primary/20 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Votre ID Client (provisoire)</p>
          <p className="text-3xl font-bold text-primary tracking-widest font-mono">{done}</p>
          <p className="text-xs text-gray-400 mt-3">⚠️ Conservez cet ID — il vous servira à vous connecter une fois votre compte activé par l'admin.</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-yellow-800 mb-1">En attente de validation</p>
          <p className="text-xs text-yellow-700">L'administrateur doit activer votre compte avant que vous puissiez vous connecter. Utilisez votre ID Client + mot de passe pour accéder à votre espace.</p>
        </div>

        <Link to="/login" className="btn-primary w-full block text-center py-3 rounded-xl">Aller à la connexion</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Créer un compte</h1>
          <p className="text-gray-500 text-sm mt-1">DiagAuto Connect — Espace Client</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Prénom *</label>
            <input className="input" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nom *</label>
            <input className="input" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Mot de passe *</label>
            <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <input className="input" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adresse</label>
            <input className="input" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} />
          </div>
          <div className="col-span-2 mt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Inscription...' : "S'inscrire"}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          Déjà un compte ? <Link to="/login" className="text-primary font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
