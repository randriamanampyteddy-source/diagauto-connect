import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdSearch } from 'react-icons/md'

const statusColors = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  confirme: 'bg-green-100 text-green-700',
  annule: 'bg-red-100 text-red-700',
  termine: 'bg-gray-100 text-gray-600',
}
const statusLabels = { en_attente: 'En attente', confirme: 'Confirmé', annule: 'Annulé', termine: 'Terminé' }

const Rendezvous = () => {
  const [rdvs, setRdvs] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ statut: '', notes_admin: '' })

  const load = () => api.get('/admin/rendezvous').then(r => setRdvs(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const openModal = (rdv) => {
    setModal(rdv)
    setForm({ statut: rdv.statut, notes_admin: rdv.notes_admin || '' })
  }

  const sauvegarder = async () => {
    try {
      await api.put(`/admin/rendezvous/${modal.id}/statut`, form)
      toast.success('Statut mis à jour')
      setModal(null)
      load()
    } catch { toast.error('Erreur') }
  }

  const filtered = rdvs.filter(r =>
    `${r.nom} ${r.prenom} ${r.id_client} ${r.marque} ${r.modele}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Rendez-vous</h1>
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input className="input pl-9 w-64" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Véhicule</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Heure</th>
              <th className="text-left px-4 py-3">Motif</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.prenom} {r.nom}</p>
                  <p className="text-xs text-primary">{r.id_client}</p>
                </td>
                <td className="px-4 py-3">{r.marque} {r.modele}<br /><span className="text-xs text-gray-400">{r.immatriculation}</span></td>
                <td className="px-4 py-3">{new Date(r.date_rdv).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3">{r.heure_rdv}</td>
                <td className="px-4 py-3 max-w-xs truncate">{r.motif || '-'}</td>
                <td className="px-4 py-3"><span className={`badge ${statusColors[r.statut]}`}>{statusLabels[r.statut]}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => openModal(r)} className="btn-primary text-xs py-1 px-3">Modifier</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun rendez-vous</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Modifier le rendez-vous</h2>
            <p className="text-sm text-gray-600 mb-4">{modal.prenom} {modal.nom} — {modal.marque} {modal.modele}</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <select className="input" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                  <option value="en_attente">En attente</option>
                  <option value="confirme">Confirmer</option>
                  <option value="annule">Annuler</option>
                  <option value="termine">Terminé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea className="input" rows={3} value={form.notes_admin} onChange={e => setForm({ ...form, notes_admin: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Annuler</button>
                <button onClick={sauvegarder} className="btn-primary">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Rendezvous
