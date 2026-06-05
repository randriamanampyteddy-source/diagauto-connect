import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import AdminQuickClientModal from '../../components/AdminQuickClientModal'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdAdd, MdPersonAdd, MdSearch } from 'react-icons/md'
import { getWhatsAppWarning } from '../../utils/whatsapp'

const statusColors = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  confirme: 'bg-green-100 text-green-700',
  annule: 'bg-red-100 text-red-700',
  termine: 'bg-gray-100 text-gray-600',
}
const statusLabels = { en_attente: 'En attente', confirme: 'Confirme', annule: 'Annule', termine: 'Termine' }
const emptyCreateForm = { client_id: '', vehicule_id: '', date_rdv: '', heure_rdv: '', motif: '', notes_admin: '' }

const Rendezvous = () => {
  const [rdvs, setRdvs] = useState([])
  const [clients, setClients] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [search, setSearch] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ statut: '', notes_admin: '' })
  const [createModal, setCreateModal] = useState(false)
  const [quickClientModal, setQuickClientModal] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)

  const load = () => {
    api.get('/admin/rendezvous').then(r => setRdvs(r.data)).catch(() => {})
    api.get('/admin/clients').then(r => setClients(r.data.filter(c => c.statut === 'actif'))).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const onClientChange = async (clientId) => {
    setCreateForm(current => ({ ...current, client_id: clientId, vehicule_id: '' }))
    if (!clientId) return setVehicules([])
    const { data } = await api.get(`/admin/clients/${clientId}/vehicules`)
    setVehicules(data)
  }

  const onQuickClientCreated = ({ client, vehicule }) => {
    setClients(current => [client, ...current])
    setVehicules([vehicule])
    setCreateForm(current => ({ ...current, client_id: String(client.id), vehicule_id: String(vehicule.id) }))
  }

  const creerRendezvous = async () => {
    try {
      const { data } = await api.post('/admin/rendezvous', createForm)
      toast.success('Rendez-vous cree et confirme')
      const warning = getWhatsAppWarning(data.whatsapp, 'RDV confirme')
      if (warning) toast.warning(warning)
      setCreateModal(false)
      setCreateForm(emptyCreateForm)
      setVehicules([])
      load()
    } catch (err) {
      const suggested = err.response?.data?.suggested_date
      toast.error(`${err.response?.data?.message || 'Erreur'}${suggested ? ` Prochaine date libre : ${suggested}` : ''}`)
    }
  }

  const openEditModal = (rdv) => {
    setEditModal(rdv)
    setEditForm({ statut: rdv.statut, notes_admin: rdv.notes_admin || '' })
  }

  const sauvegarder = async () => {
    try {
      const { data } = await api.put(`/admin/rendezvous/${editModal.id}/statut`, editForm)
      toast.success('Statut mis a jour')
      const warning = editForm.statut === 'confirme' ? getWhatsAppWarning(data.whatsapp, 'RDV valide') : null
      if (warning) toast.warning(warning)
      setEditModal(null)
      load()
    } catch {
      toast.error('Erreur')
    }
  }

  const filtered = rdvs.filter(r =>
    `${r.nom} ${r.prenom} ${r.id_client} ${r.marque} ${r.modele}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Rendez-vous</h1>
        <div className="flex gap-3">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input className="input pl-9 w-64" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2">
            <MdAdd size={18} /> Nouveau rendez-vous
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Vehicule</th>
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
                  <button onClick={() => openEditModal(r)} className="btn-primary text-xs py-1 px-3">Modifier</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun rendez-vous</td></tr>}
          </tbody>
        </table>
      </div>

      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold">Nouveau rendez-vous Admin</h2>
              <button type="button" onClick={() => setQuickClientModal(true)} className="text-primary font-semibold text-sm flex items-center gap-1">
                <MdPersonAdd size={18} /> Nouveau client sans APK
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Client *</label>
                <select className="input" value={createForm.client_id} onChange={e => onClientChange(e.target.value)}>
                  <option value="">Selectionner...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom} ({c.id_client})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vehicule *</label>
                <select className="input" value={createForm.vehicule_id} onChange={e => setCreateForm(current => ({ ...current, vehicule_id: e.target.value }))}>
                  <option value="">Selectionner...</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.marque} {v.modele} - {v.immatriculation}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input type="date" className="input" value={createForm.date_rdv} onChange={e => setCreateForm(current => ({ ...current, date_rdv: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Heure *</label>
                <input type="time" className="input" value={createForm.heure_rdv} onChange={e => setCreateForm(current => ({ ...current, heure_rdv: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Motif</label>
                <textarea className="input" rows={3} value={createForm.motif} onChange={e => setCreateForm(current => ({ ...current, motif: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes Admin</label>
                <textarea className="input" rows={2} value={createForm.notes_admin} onChange={e => setCreateForm(current => ({ ...current, notes_admin: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setCreateModal(false)} className="px-4 py-2 border rounded-xl text-gray-600">Annuler</button>
              <button onClick={creerRendezvous} className="btn-primary">Creer et confirmer</button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Modifier le rendez-vous</h2>
            <p className="text-sm text-gray-600 mb-4">{editModal.prenom} {editModal.nom} - {editModal.marque} {editModal.modele}</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <select className="input" value={editForm.statut} onChange={e => setEditForm({ ...editForm, statut: e.target.value })}>
                  <option value="en_attente">En attente</option>
                  <option value="confirme">Confirmer</option>
                  <option value="annule">Annuler</option>
                  <option value="termine">Termine</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea className="input" rows={3} value={editForm.notes_admin} onChange={e => setEditForm({ ...editForm, notes_admin: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button onClick={() => setEditModal(null)} className="px-4 py-2 border rounded-xl text-gray-600">Annuler</button>
                <button onClick={sauvegarder} className="btn-primary">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminQuickClientModal
        open={quickClientModal}
        onClose={() => setQuickClientModal(false)}
        onCreated={onQuickClientCreated}
      />
    </AdminLayout>
  )
}

export default Rendezvous
