import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdAdd, MdSearch } from 'react-icons/md'

const statusColors = {
  en_cours: 'bg-blue-100 text-blue-700',
  termine: 'bg-green-100 text-green-700',
  suspendu: 'bg-yellow-100 text-yellow-700',
}
const statusLabels = { en_cours: 'En cours', termine: 'Terminé', suspendu: 'Suspendu' }

const Interventions = () => {
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ client_id: '', vehicule_id: '', description: '', technicien: '', date_debut: '' })
  const [vehicules, setVehicules] = useState([])
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ statut: '', date_fin: '' })

  const load = () => {
    api.get('/admin/interventions').then(r => setItems(r.data))
    api.get('/admin/clients').then(r => setClients(r.data.filter(c => c.statut === 'actif')))
  }
  useEffect(() => { load() }, [])

  const onClientChange = async (id) => {
    setForm(f => ({ ...f, client_id: id, vehicule_id: '' }))
    if (id) {
      const { data } = await api.get(`/admin/clients/${id}/vehicules`)
      setVehicules(data)
    } else setVehicules([])
  }

  const creer = async () => {
    try {
      await api.post('/admin/interventions', form)
      toast.success('Intervention créée')
      setModal(null)
      setForm({ client_id: '', vehicule_id: '', description: '', technicien: '', date_debut: '' })
      load()
    } catch { toast.error('Erreur') }
  }

  const sauvegarder = async () => {
    try {
      await api.put(`/admin/interventions/${editModal.id}/statut`, editForm)
      toast.success('Mis à jour')
      setEditModal(null)
      load()
    } catch { toast.error('Erreur') }
  }

  const filtered = items.filter(i =>
    `${i.nom} ${i.prenom} ${i.id_client} ${i.marque} ${i.modele}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Interventions</h1>
        <div className="flex gap-3">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input className="input pl-9 w-56" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
            <MdAdd size={18} /> Nouvelle
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Véhicule</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Technicien</th>
              <th className="text-left px-4 py-3">Début</th>
              <th className="text-left px-4 py-3">Fin</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{i.prenom} {i.nom}</p>
                  <p className="text-xs text-primary">{i.id_client}</p>
                </td>
                <td className="px-4 py-3">{i.marque} {i.modele}<br /><span className="text-xs text-gray-400">{i.immatriculation}</span></td>
                <td className="px-4 py-3 max-w-xs truncate">{i.description}</td>
                <td className="px-4 py-3">{i.technicien || '-'}</td>
                <td className="px-4 py-3">{i.date_debut ? new Date(i.date_debut).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="px-4 py-3">{i.date_fin ? new Date(i.date_fin).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="px-4 py-3"><span className={`badge ${statusColors[i.statut]}`}>{statusLabels[i.statut]}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => { setEditModal(i); setEditForm({ statut: i.statut, date_fin: i.date_fin || '' }) }} className="btn-primary text-xs py-1 px-3">Modifier</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Aucune intervention</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal création */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">Nouvelle intervention</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <select className="input" value={form.client_id} onChange={e => onClientChange(e.target.value)}>
                  <option value="">Sélectionner...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom} ({c.id_client})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Véhicule</label>
                <select className="input" value={form.vehicule_id} onChange={e => setForm(f => ({ ...f, vehicule_id: e.target.value }))}>
                  <option value="">Sélectionner...</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.marque} {v.modele} — {v.immatriculation}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Technicien</label>
                  <input className="input" value={form.technicien} onChange={e => setForm(f => ({ ...f, technicien: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date début</label>
                  <input type="date" className="input" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Annuler</button>
                <button onClick={creer} className="btn-primary">Créer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Modifier l'intervention</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <select className="input" value={editForm.statut} onChange={e => setEditForm(f => ({ ...f, statut: e.target.value }))}>
                  <option value="en_cours">En cours</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="termine">Terminé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date fin</label>
                <input type="date" className="input" value={editForm.date_fin} onChange={e => setEditForm(f => ({ ...f, date_fin: e.target.value }))} />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button onClick={() => setEditModal(null)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Annuler</button>
                <button onClick={sauvegarder} className="btn-primary">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Interventions
