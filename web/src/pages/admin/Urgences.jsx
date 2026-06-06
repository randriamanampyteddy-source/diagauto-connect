import { useEffect, useRef, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdCall, MdLocationOn, MdMessage, MdRefresh, MdSend, MdVisibility, MdWarning } from 'react-icons/md'

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
  traite: 'Traite',
  annule: 'Annule',
}

const zoneLabels = {
  route_nationale: 'Route nationale',
  hors_antananarivo: 'Hors Antananarivo',
  antananarivo: 'Antananarivo',
  autre: 'Autre',
}

const Urgences = () => {
  const [items, setItems] = useState([])
  const [messages, setMessages] = useState({})
  const [reply, setReply] = useState({})
  const [openThreads, setOpenThreads] = useState({})
  const loadingRef = useRef(false)
  const openThreadsRef = useRef({})

  const loadMessages = async (id) => {
    try {
      const { data } = await api.get(`/admin/urgences/${id}/messages`)
      setMessages(current => ({ ...current, [id]: data }))
    } catch {
      // Ignore pendant le polling pour ne pas deranger l'admin.
    }
  }

  const load = async ({ silent = true } = {}) => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const { data } = await api.get('/admin/urgences')
      setItems(data)
      const idsToLoad = data
        .filter(u => openThreadsRef.current[u.id] || u.statut === 'nouveau' || u.statut === 'en_cours' || u.statut === 'vu')
        .map(u => u.id)
      await Promise.all(idsToLoad.map(loadMessages))
    } catch {
      if (!silent) toast.error('Impossible de charger les urgences')
    } finally {
      loadingRef.current = false
    }
  }

  useEffect(() => {
    load({ silent: false })
    const timer = setInterval(() => load(), 2000)
    return () => clearInterval(timer)
  }, [])

  const update = async (u, statut) => {
    try {
      await api.put(`/admin/urgences/${u.id}`, { statut })
      await load()
      window.dispatchEvent(new Event('urgences-refresh'))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const sendReply = async (u) => {
    const text = String(reply[u.id] || '').trim()
    if (!text) {
      toast.error('Message reponse obligatoire')
      return
    }
    try {
      await api.post(`/admin/urgences/${u.id}/messages`, { message: text })
      setReply(current => ({ ...current, [u.id]: '' }))
      openThreadsRef.current = { ...openThreadsRef.current, [u.id]: true }
      setOpenThreads(current => ({ ...current, [u.id]: true }))
      await loadMessages(u.id)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Envoi impossible')
    }
  }

  const toggleThread = async (id) => {
    const next = !openThreadsRef.current[id]
    openThreadsRef.current = { ...openThreadsRef.current, [id]: next }
    setOpenThreads(current => ({ ...current, [id]: next }))
    if (next) await loadMessages(id)
  }

  const nouvelles = items.filter(u => u.statut === 'nouveau').length

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MdWarning className="text-red-600" /> Urgences depannage
          </h1>
          <p className="text-sm text-gray-500">Conversation APK directe apres l alerte initiale.</p>
        </div>
        <button onClick={() => load({ silent: false })} className="btn-primary flex items-center gap-2">
          <MdRefresh size={18} /> Actualiser {nouvelles > 0 && `(${nouvelles})`}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {items.map(u => {
          const thread = messages[u.id] || []
          const open = Boolean(openThreads[u.id])
          return (
            <div key={u.id} className={`card border-l-4 ${u.statut === 'nouveau' ? 'border-red-600' : 'border-gray-200'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`badge ${statusColors[u.statut]}`}>{statusLabels[u.statut]}</span>
                    <span className="badge bg-gray-100 text-gray-700">{zoneLabels[u.zone] || u.zone}</span>
                    <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                  <h2 className="font-bold text-gray-800">{u.prenom} {u.nom} <span className="font-mono text-primary">{u.id_client}</span></h2>
                  <p className="text-sm text-gray-500 mt-1">Telephone urgence : <strong>{u.telephone}</strong></p>
                  {u.gps ? (
                    <a
                      href={u.gps.carte_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-700 font-semibold flex items-center gap-1 mt-1"
                    >
                      <MdLocationOn /> Position exacte - {u.gps.latitude}, {u.gps.longitude}
                      {u.gps.precision && ` - +/-${u.gps.precision} m`}
                    </a>
                  ) : (
                    <p className="text-sm text-red-700 font-semibold">Localisation GPS non disponible</p>
                  )}
                  <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">Alerte initiale client</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{u.message}</p>
                  </div>
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
                    <option value="traite">Traite</option>
                    <option value="annule">Annule</option>
                    {u.statut === 'nouveau' && <option value="nouveau">Nouveau</option>}
                  </select>
                  <button onClick={() => toggleThread(u.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-semibold">
                    <MdMessage size={18} /> {open ? 'Masquer messages' : 'Voir messages'}
                  </button>
                </div>
              </div>

              {open && (
                <div className="mt-4 pt-4 border-t">
                  <div className="bg-gray-50 rounded-xl p-3 max-h-80 overflow-y-auto flex flex-col gap-2">
                    {thread.map(m => (
                      <div key={m.id} className={`rounded-xl px-3 py-2 text-sm max-w-[86%] ${m.expediteur === 'admin' ? 'bg-blue-100 text-blue-950 self-end' : 'bg-white border text-gray-800 self-start'}`}>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString('fr-FR')}</p>
                      </div>
                    ))}
                    {thread.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucun message apres l alerte.</p>}
                  </div>

                  <div className="mt-3 flex flex-col md:flex-row gap-2">
                    <textarea
                      className="input flex-1"
                      rows={2}
                      placeholder="Repondre au client dans l application..."
                      value={reply[u.id] || ''}
                      onChange={e => setReply(r => ({ ...r, [u.id]: e.target.value }))}
                    />
                    <button onClick={() => sendReply(u)} className="btn-primary flex items-center justify-center gap-2 md:w-44">
                      <MdSend size={18} /> Envoyer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

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
