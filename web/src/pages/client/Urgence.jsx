import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../api/axios'
import { playUrgenceSound } from '../../utils/alertSound'
import { MdArrowBack, MdCall, MdLocationOn, MdMyLocation, MdNotifications, MdSend, MdWarning } from 'react-icons/md'

const ADMIN_PHONE = '0346172132'

const statusLabels = {
  nouveau: 'Envoyée',
  vu: 'Vue par admin',
  en_cours: 'En cours',
  traite: 'Traitée',
  annule: 'Annulée',
}

const UrgenceClient = () => {
  const [form, setForm] = useState({
    telephone: '',
    zone: 'route_nationale',
    latitude: '',
    longitude: '',
    precision: '',
    message: '',
  })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [localisationStatus, setLocalisationStatus] = useState('chargement')

  const load = () => api.get('/client/urgences').then(r => setItems(r.data)).catch(() => {})

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
        toast.error(error.code === 1
          ? 'Activez et autorisez la localisation pour envoyer l’urgence'
          : 'Impossible d’obtenir votre position exacte. Réessayez dehors ou activez le GPS.')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    api.get('/client/profil').then(r => {
      setForm(f => ({ ...f, telephone: r.data.telephone || '' }))
    }).catch(() => {})
    load()
    localiser()
  }, [])

  const envoyer = async (e) => {
    e.preventDefault()
    if (!form.telephone.trim()) {
      toast.error('Numéro téléphone obligatoire')
      return
    }
    if (!form.message.trim()) {
      toast.error('Message obligatoire')
      return
    }
    if (!form.latitude || !form.longitude || localisationStatus !== 'ok') {
      toast.error('Localisation GPS exacte obligatoire')
      localiser()
      return
    }
    setLoading(true)
    try {
      playUrgenceSound()
      await api.post('/client/urgences', form)
      toast.success('Urgence envoyée à l’admin')
      setForm(f => ({ ...f, message: '' }))
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const marquerNotificationsLues = async () => {
    try {
      await api.put('/client/urgences/notifications/lire')
      await load()
    } catch {
      toast.error('Impossible de marquer les notifications comme lues')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-red-700 text-white px-6 py-4 flex items-center gap-3">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/10"><MdArrowBack size={20} /></Link>
        <h1 className="font-bold text-lg flex items-center gap-2"><MdWarning /> Dépannage urgence</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-5">
        <form onSubmit={envoyer} className="urgence-form bg-white rounded-2xl shadow-sm p-5 border-l-4 border-red-600">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-800">Alerte dépannage immédiat</h2>
            <p className="text-sm text-gray-500">Route nationale, hors Antananarivo, ou panne urgente.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone obligatoire</label>
              <input className="input" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="Votre numéro joignable" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
              <select className="input" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
                <option value="route_nationale">Route nationale</option>
                <option value="hors_antananarivo">Hors Antananarivo</option>
                <option value="antananarivo">Antananarivo</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Localisation GPS obligatoire</label>
              <div className={`rounded-xl border p-3 ${localisationStatus === 'ok' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-center gap-3">
                  <MdLocationOn size={22} className={localisationStatus === 'ok' ? 'text-green-700' : 'text-red-700'} />
                  <div className="flex-1 min-w-0">
                    {localisationStatus === 'ok' ? (
                      <>
                        <p className="text-sm font-semibold text-green-900">Position exacte obtenue</p>
                        <p className="text-xs text-green-800 break-all">{form.latitude}, {form.longitude} · précision ±{form.precision} m</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-red-900">
                          {localisationStatus === 'chargement' ? 'Recherche de votre position...' : 'Position GPS obligatoire'}
                        </p>
                        <p className="text-xs text-red-800">Activez la localisation de l’appareil puis réessayez.</p>
                      </>
                    )}
                  </div>
                  <button type="button" onClick={localiser} className="w-11 h-11 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0" title="Actualiser la position">
                    <MdMyLocation size={21} />
                  </button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message urgence</label>
              <textarea className="input" rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Décrivez la panne, véhicule et nombre de personnes..." />
            </div>
          </div>

          <div className="urgence-submit-bar mt-5">
            <button disabled={loading || localisationStatus !== 'ok'} className="w-full bg-red-700 hover:bg-red-800 text-white px-5 py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <MdSend size={20} /> {loading ? 'Envoi...' : 'Envoyer l’alerte urgence'}
            </button>
          </div>
        </form>

        <a href={`tel:${ADMIN_PHONE}`} className="bg-green-600 hover:bg-green-700 text-white rounded-2xl p-4 flex items-center justify-center gap-2 font-bold">
          <MdCall size={22} /> Appeler directement l’admin · 034 61 721 32
        </a>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-bold text-gray-800">Mes demandes urgence</h2>
            {items.some(item => Boolean(item.client_notification_non_lue)) && (
              <button onClick={marquerNotificationsLues} className="text-xs font-semibold text-primary">Marquer comme lues</button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {items.map(u => (
              <div key={u.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{statusLabels[u.statut] || u.statut}</span>
                    {Boolean(u.client_notification_non_lue) && (
                      <span className="badge bg-yellow-100 text-yellow-800 flex items-center gap-1">
                        <MdNotifications size={13} /> Nouveau
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{u.message}</p>
                {u.gps && (
                  <a href={u.gps.carte_url} target="_blank" rel="noreferrer" className="mt-2 text-sm text-blue-700 font-semibold flex items-center gap-1">
                    <MdLocationOn /> Voir la position envoyée
                  </a>
                )}
                {u.reponse_admin && (
                  <div className="mt-3 bg-blue-50 rounded-xl p-3 text-sm text-blue-900">
                    <strong>Réponse admin : </strong>{u.reponse_admin}
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-gray-400">Aucune demande envoyée.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UrgenceClient
