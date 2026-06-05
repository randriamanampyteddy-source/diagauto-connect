import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdCall, MdLocationOn, MdMessage, MdRefresh, MdVisibility, MdWarning } from 'react-icons/md'

const statusColors = {
  nouveau: 'bg-red-100 text-red-700',
  vu: 'bg-yellow-100 text-yellow-700',
  en_cours: 'bg-blue-100 text-blue-700',
  traite: 'bg-green-100 text-green-700',
  annule: 'bg-gray-100 text-gray-600',
}

const statusLabels = {
  nouveau: 'Nouveau',
  vu: 'Vu',
  en_cours: 'En cours',
  traite: 'Traité',
  annule: 'Annulé',
}

const zoneLabels = {
  route_nationale: 'Route nationale',
  hors_antananarivo: 'Hors Antananarivo',
  antananarivo: 'Antananarivo',
  autre: 'Autre',
}

const Urgences = () => {
  const [items, setItems] = useState([])
  const [reply, setReply] = useState({})

  const load = async () => {
    try {
      const { data } = await api.get('/admin/urgences')
      setItems(data)
    } catch {
      toast.error('Impossible de charger les urgences')
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [])

  const update = async (u, statut, reponse = undefined) => {
    try {
      await api.put(`/admin/urgences/${u.id}`, { statut, reponse_admin: reponse })
      toast.success('Urgence mise à jour')
      await load()
      window.dispatchEvent(new Event('urgences-refresh'))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const sendReply = (u) => {
    const text = reply[u.id]
    if (!text || !text.trim()) {
      toast.error('Message réponse obligatoire')
      return
    }
    update(u, 'en_cours', text)
  }

  const nouvelles = items.filter(u => u.statut === 'nouveau').length

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MdWarning className="text-red-600" /> Urgences dépannage
          </h1>
          <p className="text-sm text-gray-500">Demandes clients sur route nationale ou hors Antananarivo</p>
        </div>
        <button onClick={load} className="btn-primary flex items-center gap-2">
          <MdRefresh size={18} /> Actualiser {nouvelles > 0 && `(${nouvelles})`}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {items.map(u => (
          <div key={u.id} className={`card border-l-4 ${u.statut === 'nouveau' ? 'border-red-600' : 'border-gray-200'}`}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`badge ${statusColors[u.statut]}`}>{statusLabels[u.statut]}</span>
                  <span className="badge bg-gray-100 text-gray-700">{zoneLabels[u.zone] || u.zone}</span>
                  <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <h2 className="font-bold text-gray-800">{u.prenom} {u.nom} <span className="font-mono text-primary">{u.id_client}</span></h2>
                <p className="text-sm text-gray-500 mt-1">Téléphone urgence : <strong>{u.telephone}</strong></p>
              {u.gps ? (
                <a
                  href={u.gps.carte_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-700 font-semibold flex items-center gap-1 mt-1"
                >
                  <MdLocationOn /> Position exacte · {u.gps.latitude}, {u.gps.longitude}
                  {u.gps.precision && ` · ±${u.gps.precision} m`}
                </a>
              ) : (
                <p className="text-sm text-red-700 font-semibold">Localisation GPS non disponible</p>
              )}
                <p className="mt-3 text-gray-800 whitespace-pre-wrap">{u.message}</p>
                {u.reponse_admin && (
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Réponse admin</p>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{u.reponse_admin}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 min-w-[260px]">
                <a href={`tel:${u.telephone}`} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2">
                  <MdCall size={18} /> Appeler
                </a>
                {u.statut === 'nouveau' && (
                  <button onClick={() => update(u, 'vu')} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-semibold">
                    <MdVisibility size={18} /> Marquer vu
                  </button>
                )}
                <select className="input" value={u.statut} onChange={e => update(u, e.target.value)}>
                  <option value="vu">Vu</option>
                  <option value="en_cours">En cours</option>
                  <option value="traite">Traité</option>
                  <option value="annule">Annulé</option>
                  {u.statut === 'nouveau' && <option value="nouveau">Nouveau</option>}
                </select>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex flex-col md:flex-row gap-2">
              <textarea
                className="input flex-1"
                rows={2}
                placeholder="Répondre au client..."
                value={reply[u.id] || ''}
                onChange={e => setReply(r => ({ ...r, [u.id]: e.target.value }))}
              />
              <button onClick={() => sendReply(u)} className="btn-primary flex items-center justify-center gap-2 md:w-44">
                <MdMessage size={18} /> Répondre
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MdWarning size={48} className="mx-auto mb-3 opacity-30" />
            <p>Aucune urgence</p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default Urgences
