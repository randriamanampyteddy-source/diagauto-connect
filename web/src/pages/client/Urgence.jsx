import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../api/axios'
import { playUrgenceSound } from '../../utils/alertSound'
import { MdArrowBack, MdCall, MdLocationOn, MdSend, MdWarning } from 'react-icons/md'

const ADMIN_PHONE = '0346172132'

const statusLabels = {
  nouveau: 'Envoyee',
  vu: 'Vue par admin',
  en_cours: 'En cours',
  traite: 'Traitee',
  annule: 'Annulee',
}

const UrgenceClient = () => {
  const [form, setForm] = useState({
    telephone: '',
    numero_vehicule: '',
    zone: 'route_nationale',
    latitude: '',
    longitude: '',
    precision: '',
    message: '',
  })
  const [items, setItems] = useState([])
  const [messages, setMessages] = useState({})
  const [reply, setReply] = useState({})
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [localisationStatus, setLocalisationStatus] = useState('chargement')
  const loadingRef = useRef(false)
  const activeIdRef = useRef(null)

  const load = async ({ silent = true } = {}) => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const { data } = await api.get('/client/urgences')
      setItems(data)
      const selected = activeIdRef.current || data[0]?.id || null
      if (selected) {
        activeIdRef.current = selected
        setActiveId(selected)
        await loadMessages(selected)
      }
      if (data.some(item => Boolean(item.client_notification_non_lue))) {
        await api.put('/client/urgences/notifications/lire')
      }
    } catch {
      if (!silent) toast.error('Impossible de charger les urgences')
    } finally {
      loadingRef.current = false
    }
  }

  const loadMessages = async (urgenceId) => {
    try {
      const { data } = await api.get(`/client/urgences/${urgenceId}/messages`)
      setMessages(current => ({ ...current, [urgenceId]: data }))
    } catch {
      // L'urgence peut avoir ete supprimee ou appartenir a une ancienne session.
    }
  }

  const localiser = () => {
    if (!navigator.geolocation) {
      setLocalisationStatus('indisponible')
      toast.error('Localisation GPS indisponible sur cet appareil')
      return
    }
    setLocalisationStatus('chargement')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm(f => ({
          ...f,
          latitude: coords.latitude.toFixed(7),
          longitude: coords.longitude.toFixed(7),
          precision: Math.round(coords.accuracy),
        }))
        setLocalisationStatus('ok')
      },
      (error) => {
        setLocalisationStatus('erreur')
        if (error.code === 1) {
          toast.error('Autorisation localisation refusee. Activez la permission GPS pour envoyer l urgence.')
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    api.get('/client/profil').then(r => {
      setForm(f => ({ ...f, telephone: r.data.telephone || '' }))
    }).catch(() => {})
    load({ silent: false })
    localiser()
    const timer = setInterval(() => load(), 2000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!activeId) return
    const timer = setInterval(() => loadMessages(activeId), 2000)
    return () => clearInterval(timer)
  }, [activeId])

  const envoyer = async (e) => {
    e.preventDefault()
    if (!form.telephone.trim()) {
      toast.error('Numero telephone obligatoire')
      return
    }
    if (!form.numero_vehicule.trim()) {
      toast.error('Numero du vehicule obligatoire')
      return
    }
    if (!form.message.trim()) {
      toast.error('Message obligatoire')
      return
    }
    if (!form.latitude || !form.longitude || localisationStatus !== 'ok') {
      toast.error('Position exacte non disponible. Activez le GPS puis reessayez.')
      localiser()
      return
    }
    setLoading(true)
    try {
      playUrgenceSound()
      const { data } = await api.post('/client/urgences', form)
      toast.success('Urgence envoyee a l admin')
      setForm(f => ({ ...f, message: '' }))
      activeIdRef.current = data.id
      setActiveId(data.id)
      await load({ silent: false })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (urgenceId) => {
    const text = String(reply[urgenceId] || '').trim()
    if (!text) return
    try {
      await api.post(`/client/urgences/${urgenceId}/messages`, { message: text })
      setReply(current => ({ ...current, [urgenceId]: '' }))
      await loadMessages(urgenceId)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Envoi impossible')
    }
  }

  const selectUrgence = async (id) => {
    activeIdRef.current = id
    setActiveId(id)
    await loadMessages(id)
    await api.put('/client/urgences/notifications/lire').catch(() => {})
    await load()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-red-700 text-white px-4 py-4 flex items-center gap-3">
        <Link to="/dashboard" className="px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2 font-semibold">
          <MdArrowBack size={20} /> Retour
        </Link>
        <h1 className="font-bold text-lg flex items-center gap-2"><MdWarning /> Depannage urgence</h1>
      </header>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 flex flex-col gap-5">
        <form onSubmit={envoyer} className="urgence-form bg-white rounded-2xl shadow-sm p-5 border-l-4 border-red-600">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-800">Alerte depannage immediat</h2>
            <p className="text-sm text-gray-500">Ce premier message part dans l alerte urgence. Les reponses suivantes restent dans le message APK.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone obligatoire</label>
              <input className="input" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="Votre numero joignable" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° du vehicule obligatoire</label>
              <input className="input uppercase" value={form.numero_vehicule} onChange={e => setForm(f => ({ ...f, numero_vehicule: e.target.value.toUpperCase() }))} placeholder="Immatriculation ou numero du fiara" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
              <select className="input" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
                <option value="route_nationale">Route nationale</option>
                <option value="province">Province</option>
                <option value="antananarivo">Antananarivo</option>
                <option value="hors_antananarivo">Hors Antananarivo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message urgence</label>
              <textarea className="input" rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Decrivez la panne, vehicule et nombre de personnes..." />
            </div>
          </div>

          <div className="urgence-submit-bar mt-5">
            <button disabled={loading} className="w-full bg-red-700 hover:bg-red-800 text-white px-5 py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <MdSend size={20} /> {loading ? 'Envoi...' : 'Envoyer l alerte urgence'}
            </button>
          </div>
        </form>

        <a href={`tel:${ADMIN_PHONE}`} className="bg-green-600 hover:bg-green-700 text-white rounded-2xl p-4 flex items-center justify-center gap-2 font-bold">
          <MdCall size={22} /> Appeler directement l admin - 034 61 721 32
        </a>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-bold text-gray-800">Mes demandes urgence</h2>
            <button onClick={() => load({ silent: false })} className="text-xs font-semibold text-primary">Actualiser</button>
          </div>
          <div className="flex flex-col gap-3">
            {items.map(u => {
              const isActive = activeId === u.id
              const thread = messages[u.id] || []
              return (
                <div key={u.id} className={`rounded-xl p-3 border ${isActive ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-transparent'}`}>
                  <button type="button" onClick={() => selectUrgence(u.id)} className="w-full text-left">
                    <div className="flex justify-between gap-3">
                      <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{statusLabels[u.statut] || u.statut}</span>
                    {u.numero_vehicule && <span className="text-xs font-mono bg-white border px-2 py-0.5 rounded-lg">{u.numero_vehicule}</span>}
                      </div>
                      <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{u.message}</p>
                  </button>

                  {u.gps && (
                    <a href={u.gps.carte_url} target="_blank" rel="noreferrer" className="mt-2 text-sm text-blue-700 font-semibold flex items-center gap-1">
                      <MdLocationOn /> Voir la position envoyee
                    </a>
                  )}

                  {isActive && (
                    <div className="mt-3 bg-white rounded-xl border border-gray-200 p-3">
                      <p className="text-xs font-bold text-gray-500 mb-2">Messages APK</p>
                      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                        {thread.map(m => (
                          <div key={m.id} className={`rounded-xl px-3 py-2 text-sm max-w-[88%] ${m.expediteur === 'client' ? 'bg-red-100 text-red-950 self-end' : 'bg-blue-50 text-blue-950 self-start'}`}>
                            <p className="whitespace-pre-wrap">{m.message}</p>
                            <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString('fr-FR')}</p>
                          </div>
                        ))}
                        {thread.length === 0 && <p className="text-sm text-gray-400 text-center py-3">Aucun message apres l alerte.</p>}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <textarea
                          className="input flex-1"
                          rows={2}
                          value={reply[u.id] || ''}
                          onChange={e => setReply(r => ({ ...r, [u.id]: e.target.value }))}
                          placeholder="Repondre a l admin..."
                        />
                        <button onClick={() => sendMessage(u.id)} className="bg-red-700 hover:bg-red-800 text-white px-4 rounded-xl font-bold">
                          <MdSend size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {items.length === 0 && <p className="text-sm text-gray-400">Aucune demande envoyee.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UrgenceClient
