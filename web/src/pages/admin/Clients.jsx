import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdCheckCircle, MdBlock, MdSearch } from 'react-icons/md'

const statusBadge = (statut) => {
  const map = {
    en_attente: 'bg-yellow-100 text-yellow-700',
    actif: 'bg-green-100 text-green-700',
    suspendu: 'bg-red-100 text-red-700',
  }
  const labels = { en_attente: 'En attente', actif: 'Actif', suspendu: 'Suspendu' }
  return <span className={`badge ${map[statut]}`}>{labels[statut]}</span>
}

const Clients = () => {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')

  const load = () => api.get('/admin/clients').then(r => setClients(r.data)).catch(() => {})

  useEffect(() => { load() }, [])

  const valider = async (id) => {
    try {
      await api.put(`/admin/clients/${id}/valider`)
      toast.success('Client validé')
      load()
    } catch { toast.error('Erreur') }
  }

  const suspendre = async (id) => {
    try {
      await api.put(`/admin/clients/${id}/suspendre`)
      toast.success('Client suspendu')
      load()
    } catch { toast.error('Erreur') }
  }

  const filtered = clients.filter(c =>
    `${c.nom} ${c.prenom} ${c.email} ${c.id_client}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="input pl-9 w-64"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-3">ID Client</th>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Téléphone</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Inscrit le</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-primary font-semibold">{c.id_client}</td>
                <td className="px-4 py-3 font-medium">{c.prenom} {c.nom}</td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3">{c.telephone || '-'}</td>
                <td className="px-4 py-3">{statusBadge(c.statut)}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3 flex gap-2">
                  {c.statut !== 'actif' && (
                    <button onClick={() => valider(c.id)} className="btn-success text-xs py-1 px-2 flex items-center gap-1">
                      <MdCheckCircle size={14} /> Valider
                    </button>
                  )}
                  {c.statut !== 'suspendu' && (
                    <button onClick={() => suspendre(c.id)} className="btn-danger text-xs py-1 px-2 flex items-center gap-1">
                      <MdBlock size={14} /> Suspendre
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun client trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

export default Clients
