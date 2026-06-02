import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdCheckCircle, MdBlock, MdSearch, MdLockReset, MdClose, MdContentCopy } from 'react-icons/md'

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
  const [resetModal, setResetModal] = useState(null) // { client, tempPwd }

  const load = () => api.get('/admin/clients').then(r => setClients(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const valider = async (id) => {
    try {
      await api.put(`/admin/clients/${id}/valider`)
      const client = clients.find(c => c.id === id)
      toast.success(
        <div>
          <p className="font-semibold">Client validé ✓</p>
          <p className="text-sm">ID à communiquer : <strong className="font-mono">{client?.id_client}</strong></p>
        </div>,
        { autoClose: 8000 }
      )
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

  const resetPassword = async (client) => {
    try {
      const { data } = await api.post(`/admin/clients/${client.id}/reset-password`)
      setResetModal({ client, tempPwd: data.temp_password })
    } catch { toast.error('Erreur lors de la réinitialisation') }
  }

  const copier = (texte) => {
    navigator.clipboard.writeText(texte)
    toast.success('Copié !')
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
          <input className="input pl-9 w-64" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.statut !== 'actif' && (
                      <button onClick={() => valider(c.id)} className="btn-success text-xs py-1 px-2 flex items-center gap-1">
                        <MdCheckCircle size={13} /> Valider
                      </button>
                    )}
                    {c.statut !== 'suspendu' && (
                      <button onClick={() => suspendre(c.id)} className="btn-danger text-xs py-1 px-2 flex items-center gap-1">
                        <MdBlock size={13} /> Suspendre
                      </button>
                    )}
                    <button onClick={() => resetPassword(c)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-2 rounded-lg flex items-center gap-1">
                      <MdLockReset size={13} /> Réinit. MDP
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun client trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal mot de passe temporaire */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Mot de passe réinitialisé</h2>
              <button onClick={() => setResetModal(null)} className="text-gray-400 hover:text-gray-600">
                <MdClose size={22} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Communiquez ces informations à <strong>{resetModal.client.prenom} {resetModal.client.nom}</strong> :
            </p>

            <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">ID Client</p>
                  <p className="font-mono font-bold text-primary text-lg">{resetModal.client.id_client}</p>
                </div>
                <button onClick={() => copier(resetModal.client.id_client)} className="p-2 text-gray-400 hover:text-primary">
                  <MdContentCopy size={18} />
                </button>
              </div>
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mot de passe temporaire</p>
                  <p className="font-mono font-bold text-orange-600 text-xl tracking-widest">{resetModal.tempPwd}</p>
                </div>
                <button onClick={() => copier(resetModal.tempPwd)} className="p-2 text-gray-400 hover:text-orange-500">
                  <MdContentCopy size={18} />
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-yellow-700">⚠️ Demandez au client de changer ce mot de passe temporaire dès sa prochaine connexion.</p>
            </div>

            <button onClick={() => setResetModal(null)} className="btn-primary w-full py-2">Fermer</button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Clients
