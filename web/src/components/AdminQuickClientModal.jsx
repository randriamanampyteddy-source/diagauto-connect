import { useState } from 'react'
import { toast } from 'react-toastify'
import api from '../api/axios'
import { MdClose, MdPersonAdd } from 'react-icons/md'

const initialForm = {
  nom: '', prenom: '', telephone: '', whatsapp: '', email: '', adresse: '',
  marque: '', modele: '', annee: '', immatriculation: '', couleur: '',
}

const AdminQuickClientModal = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const update = (field, value) => setForm(current => ({ ...current, [field]: value }))

  const submit = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/admin/clients/sans-apk', form)
      toast.success(
        `Client créé : ${data.client.id_client} | MDP temporaire : ${data.temp_password}`,
        { autoClose: 12000 }
      )
      setForm(initialForm)
      onCreated?.(data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de créer le client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Nouveau client sans APK</h2>
            <p className="text-xs text-gray-500">Le client et son premier véhicule seront disponibles immédiatement.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700" title="Fermer">
            <MdClose size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
            <input className="input" value={form.nom} onChange={e => update('nom', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
            <input className="input" value={form.prenom} onChange={e => update('prenom', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone *</label>
            <input className="input" value={form.telephone} onChange={e => update('telephone', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
            <input className="input" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email facultatif</label>
            <input type="email" className="input" value={form.email} onChange={e => update('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
            <input className="input" value={form.adresse} onChange={e => update('adresse', e.target.value)} />
          </div>
        </div>

        <h3 className="text-sm font-bold text-gray-700 mt-5 mb-3">Premier véhicule</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Marque *</label>
            <input className="input" value={form.marque} onChange={e => update('marque', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Modèle *</label>
            <input className="input" value={form.modele} onChange={e => update('modele', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Immatriculation *</label>
            <input className="input uppercase" value={form.immatriculation} onChange={e => update('immatriculation', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Année</label>
              <input type="number" className="input" value={form.annee} onChange={e => update('annee', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Couleur</label>
              <input className="input" value={form.couleur} onChange={e => update('couleur', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-gray-600">Annuler</button>
          <button type="button" onClick={submit} disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <MdPersonAdd size={18} /> {loading ? 'Création...' : 'Créer client et véhicule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminQuickClientModal
