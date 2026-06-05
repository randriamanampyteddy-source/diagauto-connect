import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { MdArrowBack, MdDeleteForever, MdDeleteSweep, MdLock, MdLogout, MdPerson, MdSave, MdSettings } from 'react-icons/md'

const emptyProfil = { nom: '', prenom: '', email: '', telephone: '', whatsapp: '', adresse: '', id_client: '' }

const ParametresClient = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [profil, setProfil] = useState(emptyProfil)
  const [password, setPassword] = useState({ ancien_password: '', nouveau_password: '', confirmer: '' })
  const [loading, setLoading] = useState(false)
  const [reset, setReset] = useState({ confirmation: '', password: '' })
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    api.get('/client/profil').then(r => setProfil({ ...emptyProfil, ...r.data })).catch(() => {})
  }, [])

  const saveProfil = async (e) => {
    e.preventDefault()
    try {
      await api.put('/client/profil', profil)
      toast.success('Profil mis à jour')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (password.nouveau_password !== password.confirmer) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      await api.put('/client/password', {
        ancien_password: password.ancien_password,
        nouveau_password: password.nouveau_password,
      })
      toast.success('Mot de passe modifié')
      setPassword({ ancien_password: '', nouveau_password: '', confirmer: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const viderSession = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    toast.success('Session locale nettoyée')
    logout()
    navigate('/login', { replace: true })
  }

  const reinitialiserHistorique = async () => {
    if (reset.confirmation !== 'REINITIALISER' || !reset.password) {
      toast.error('Confirmation et mot de passe obligatoires')
      return
    }
    setResetLoading(true)
    try {
      await api.post('/client/systeme/reinitialiser', reset)
      toast.success('Votre historique a été réinitialisé')
      setReset({ confirmation: '', password: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur réinitialisation')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white px-6 py-4 flex items-center gap-3">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/10"><MdArrowBack size={20} /></Link>
        <h1 className="font-bold text-lg">Paramètres</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-5">
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
              <MdPerson size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Profil client</h2>
              <p className="text-sm text-gray-500 font-mono">{profil.id_client || '---'}</p>
            </div>
          </div>

          <form onSubmit={saveProfil} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-semibold text-green-800">Ampidiro eto ny numéro WhatsApp anao</p>
              <p className="text-sm text-green-700 mt-1">Io numéro io no handraisanao automatique ny facture numérique, validation rendez-vous ary confirmation paiement.</p>
            </div>
            {[
              ['prenom', 'Prénom'],
              ['nom', 'Nom'],
              ['email', 'Email'],
              ['telephone', 'Téléphone'],
              ['whatsapp', 'Numéro WhatsApp'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input className="input" value={profil[key] || ''} onChange={e => setProfil(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <textarea className="input" rows={3} value={profil.adresse || ''} onChange={e => setProfil(p => ({ ...p, adresse: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button className="btn-primary flex items-center gap-2"><MdSave size={18} /> Enregistrer</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
              <MdLock size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Mot de passe</h2>
              <p className="text-sm text-gray-500">Sécuriser l’accès client</p>
            </div>
          </div>

          <form onSubmit={savePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="password" className="input" placeholder="Ancien mot de passe" value={password.ancien_password} onChange={e => setPassword(p => ({ ...p, ancien_password: e.target.value }))} />
            <input type="password" className="input" placeholder="Nouveau mot de passe" value={password.nouveau_password} onChange={e => setPassword(p => ({ ...p, nouveau_password: e.target.value }))} />
            <input type="password" className="input" placeholder="Confirmer" value={password.confirmer} onChange={e => setPassword(p => ({ ...p, confirmer: e.target.value }))} />
            <div className="md:col-span-3 flex justify-end">
              <button disabled={loading} className="btn-primary disabled:opacity-50">{loading ? 'Modification...' : 'Modifier'}</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center">
              <MdSettings size={24} className="text-gray-700" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Options locales</h2>
              <p className="text-sm text-gray-500">Nettoyage sur cet appareil uniquement</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button onClick={viderSession} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2">
              <MdDeleteSweep size={20} /> Vider session locale
            </button>
            <button onClick={() => { logout(); navigate('/login', { replace: true }) }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2">
              <MdLogout size={20} /> Déconnexion
            </button>
          </div>
        </div>

        <div className="card border border-red-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center">
              <MdDeleteForever size={24} className="text-red-700" />
            </div>
            <div>
              <h2 className="font-bold text-red-800">Réinitialiser mon historique</h2>
              <p className="text-sm text-red-700">Supprime vos véhicules, rendez-vous, interventions, urgences et documents. Votre compte est conservé.</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800 mb-3">Tapez REINITIALISER et entrez votre mot de passe.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="input bg-white"
                value={reset.confirmation}
                onChange={e => setReset(r => ({ ...r, confirmation: e.target.value }))}
                placeholder="REINITIALISER"
              />
              <input
                type="password"
                className="input bg-white"
                value={reset.password}
                onChange={e => setReset(r => ({ ...r, password: e.target.value }))}
                placeholder="Votre mot de passe"
              />
            </div>
            <button
              onClick={reinitialiserHistorique}
              disabled={resetLoading || reset.confirmation !== 'REINITIALISER' || !reset.password}
              className="mt-4 bg-red-700 hover:bg-red-800 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <MdDeleteForever size={20} /> {resetLoading ? 'Réinitialisation...' : 'Réinitialiser mon historique'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParametresClient
