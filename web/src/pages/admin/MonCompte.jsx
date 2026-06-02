import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff, MdCheckCircle } from 'react-icons/md'

const MonCompte = () => {
  const [profil, setProfil] = useState(null)
  const [form, setForm] = useState({ ancien_password: '', nouveau_password: '', confirmer: '' })
  const [show, setShow] = useState({ ancien: false, nouveau: false, confirmer: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/auth/admin/profil').then(r => setProfil(r.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.nouveau_password !== form.confirmer) {
      toast.error('Les nouveaux mots de passe ne correspondent pas')
      return
    }
    if (form.nouveau_password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    setLoading(true)
    try {
      await api.put('/auth/admin/password', {
        ancien_password: form.ancien_password,
        nouveau_password: form.nouveau_password,
      })
      toast.success('Mot de passe modifié avec succès !')
      setForm({ ancien_password: '', nouveau_password: '', confirmer: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const InputPassword = ({ label, field }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type={show[field] ? 'text' : 'password'}
          className="input pl-9 pr-10"
          value={form[field]}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          required
        />
        <button
          type="button"
          onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show[field] ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
        </button>
      </div>
    </div>
  )

  const strength = (p) => {
    if (!p) return null
    if (p.length < 6) return { label: 'Trop court', color: 'bg-red-400', w: 'w-1/4' }
    if (p.length < 8) return { label: 'Faible', color: 'bg-orange-400', w: 'w-2/4' }
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: 'Moyen', color: 'bg-yellow-400', w: 'w-3/4' }
    return { label: 'Fort', color: 'bg-green-500', w: 'w-full' }
  }
  const s = strength(form.nouveau_password)

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mon compte</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Informations profil */}
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <MdPerson size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Informations</h2>
              <p className="text-sm text-gray-500">Compte administrateur</p>
            </div>
          </div>
          {profil ? (
            <div className="flex flex-col gap-3">
              {[
                { label: 'Prénom', value: profil.prenom },
                { label: 'Nom', value: profil.nom },
                { label: 'Email', value: profil.email },
                { label: 'Téléphone', value: profil.telephone || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-pulse flex flex-col gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-100 rounded-lg" />)}
            </div>
          )}
        </div>

        {/* Changer mot de passe */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <MdLock size={22} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Changer le mot de passe</h2>
              <p className="text-sm text-gray-500">Sécurisez votre compte</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <InputPassword label="Ancien mot de passe" field="ancien_password" />
            <InputPassword label="Nouveau mot de passe" field="nouveau_password" />

            {/* Indicateur de force */}
            {s && (
              <div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${s.color} ${s.w}`} />
                </div>
                <p className={`text-xs mt-1 font-medium ${s.color.replace('bg-', 'text-')}`}>{s.label}</p>
              </div>
            )}

            <InputPassword label="Confirmer le nouveau mot de passe" field="confirmer" />

            {/* Vérification correspondance */}
            {form.confirmer && (
              <div className={`flex items-center gap-2 text-sm ${form.nouveau_password === form.confirmer ? 'text-green-600' : 'text-red-500'}`}>
                <MdCheckCircle size={16} />
                {form.nouveau_password === form.confirmer ? 'Les mots de passe correspondent' : 'Ne correspondent pas'}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || form.nouveau_password !== form.confirmer || !form.ancien_password}
              className="btn-primary py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default MonCompte
