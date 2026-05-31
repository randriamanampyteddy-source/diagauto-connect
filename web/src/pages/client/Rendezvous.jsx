import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdEventNote, MdAdd, MdArrowBack } from 'react-icons/md'

const statusColors = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  confirme: 'bg-green-100 text-green-700',
  annule: 'bg-red-100 text-red-700',
  termine: 'bg-gray-100 text-gray-600',
}
const statusLabels = { en_attente: 'En attente', confirme: 'Confirmé', annule: 'Annulé', termine: 'Terminé' }

const Rendezvous = () => {
  const [rdvs, setRdvs] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ vehicule_id: '', date_rdv: '', heure_rdv: '', motif: '' })

  const load = () => {
    api.get('/client/rendezvous').then(r => setRdvs(r.data))
    api.get('/client/vehicules').then(r => setVehicules(r.data))
  }
  useEffect(() => { load() }, [])

  const creer = async (e) => {
    e.preventDefault()
    try {
      await api.post('/client/rendezvous', form)
      toast.success('Rendez-vous demandé !')
      setModal(false)
      setForm({ vehicule_id: '', date_rdv: '', heure_rdv: '', motif: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/client/dashboard" className="p-2 rounded-lg hover:bg-white/10"><MdArrowBack size={20} /></Link>
          <h1 className="font-bold text-lg">Mes rendez-vous</h1>
        </div>
        <button onClick={() => setModal(true)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <MdAdd size={18} /> Prendre RDV
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
        {rdvs.map(r => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <MdEventNote size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{r.marque} {r.modele}</h3>
                  <p className="text-sm text-gray-500">{r.immatriculation}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(r.date_rdv).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à {r.heure_rdv}
                  </p>
                  {r.motif && <p className="text-sm text-gray-400 mt-1 italic">"{r.motif}"</p>}
                  {r.notes_admin && <p className="text-sm bg-blue-50 text-blue-700 rounded-lg px-3 py-2 mt-2">Note admin: {r.notes_admin}</p>}
                </div>
              </div>
              <span className={`badge ${statusColors[r.statut]}`}>{statusLabels[r.statut]}</span>
            </div>
          </div>
        ))}
        {rdvs.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MdEventNote size={48} className="mx-auto mb-3 opacity-30" />
            <p>Aucun rendez-vous</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Prendre un rendez-vous</h2>
            <form onSubmit={creer} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Véhicule *</label>
                <select className="input" value={form.vehicule_id} onChange={e => setForm(f => ({ ...f, vehicule_id: e.target.value }))} required>
                  <option value="">Sélectionner...</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.marque} {v.modele} — {v.immatriculation}</option>)}
                </select>
                {vehicules.length === 0 && <p className="text-xs text-red-500 mt-1">Ajoutez d'abord un véhicule</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input type="date" className="input" value={form.date_rdv} onChange={e => setForm(f => ({ ...f, date_rdv: e.target.value }))} required min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Heure *</label>
                  <input type="time" className="input" value={form.heure_rdv} onChange={e => setForm(f => ({ ...f, heure_rdv: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motif</label>
                <textarea className="input" rows={3} placeholder="Décrivez le problème..." value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="btn-primary">Confirmer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Rendezvous
