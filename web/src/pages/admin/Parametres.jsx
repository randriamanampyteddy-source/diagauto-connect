import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdCheckCircle, MdCleaningServices, MdDeleteForever, MdErrorOutline, MdRefresh, MdSave, MdSettings, MdWarning } from 'react-icons/md'

const cleanupOptions = [
  { key: 'lignes_orphelines', label: 'Lignes documents orphelines', hint: 'Nettoie les lignes qui ne sont plus rattachées à un devis, proforma ou facture.' },
  { key: 'rdv_annules', label: 'Rendez-vous annulés sans intervention', hint: 'Supprime uniquement les rendez-vous annulés qui ne sont pas liés à une intervention.' },
  { key: 'devis_brouillon_refuse', label: 'Devis brouillons ou refusés', hint: 'Supprime les devis non utilisés par une facture, avec leurs lignes.' },
  { key: 'proformas_brouillon_refuse', label: 'Proformas brouillons ou refusés', hint: 'Supprime les proformas non validées, avec leurs lignes.' },
]

const emptyAtelier = {
  nom: '',
  adresse: '',
  telephone: '',
  whatsapp: '',
  email: '',
  facebook: '',
  site_web: '',
  nif: '',
  stat: '',
}

const Parametres = () => {
  const [atelier, setAtelier] = useState(emptyAtelier)
  const [stats, setStats] = useState(null)
  const [selected, setSelected] = useState(['lignes_orphelines'])
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [reset, setReset] = useState({ confirmation: '', password: '' })
  const [resetLoading, setResetLoading] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState(null)
  const [whatsappChecking, setWhatsappChecking] = useState(false)

  const load = () => {
    api.get('/admin/atelier').then(r => setAtelier({ ...emptyAtelier, ...r.data })).catch(() => {})
    api.get('/admin/systeme/stats').then(r => setStats(r.data)).catch(() => {})
    api.get('/admin/systeme/whatsapp').then(r => setWhatsappStatus(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const saveAtelier = async (e) => {
    e.preventDefault()
    try {
      await api.put('/admin/atelier', atelier)
      toast.success('Paramètres atelier enregistrés')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const toggle = (key) => {
    setSelected(s => s.includes(key) ? s.filter(x => x !== key) : [...s, key])
  }

  const nettoyer = async () => {
    if (confirmation !== 'NETTOYER') {
      toast.error('Tapez NETTOYER pour confirmer')
      return
    }
    if (!selected.length) {
      toast.error('Sélectionnez au moins une option')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/admin/systeme/nettoyage', { options: selected, confirmation })
      const total = Object.values(data.resultats || {}).reduce((s, n) => s + Number(n || 0), 0)
      toast.success(`Nettoyage terminé: ${total} élément(s) supprimé(s)`)
      setConfirmation('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur nettoyage')
    } finally {
      setLoading(false)
    }
  }

  const reinitialiser = async () => {
    if (reset.confirmation !== 'REINITIALISER TOUT' || !reset.password) {
      toast.error('Confirmation et mot de passe admin obligatoires')
      return
    }
    setResetLoading(true)
    try {
      await api.post('/admin/systeme/reinitialiser', reset)
      toast.success('Application réinitialisée')
      setReset({ confirmation: '', password: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur réinitialisation')
    } finally {
      setResetLoading(false)
    }
  }

  const verifierWhatsApp = async () => {
    setWhatsappChecking(true)
    try {
      const { data } = await api.post('/admin/systeme/whatsapp/verifier')
      if (data.valide) {
        toast.success(`${data.message}${data.compte?.numero ? ` Numéro: ${data.compte.numero}` : ''}`)
      } else {
        toast.error(data.message || 'Configuration WhatsApp invalide')
      }
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de vérifier WhatsApp')
    } finally {
      setWhatsappChecking(false)
    }
  }

  const whatsappConfigure = whatsappStatus?.configuration?.configure ?? stats?.whatsapp_configure
  const whatsappConfig = whatsappStatus?.configuration
  const diagnosticToneClass = {
    green: {
      box: 'border-green-200 bg-green-50',
      icon: 'text-green-700',
      text: 'text-green-700',
    },
    red: {
      box: 'border-red-200 bg-red-50',
      icon: 'text-red-700',
      text: 'text-red-700',
    },
    blue: {
      box: 'border-blue-200 bg-blue-50',
      icon: 'text-blue-700',
      text: 'text-blue-700',
    },
  }
  const diagnosticItems = whatsappConfig ? [
    {
      label: 'Phone Number ID',
      ok: whatsappConfig.phone_number_id_present,
      status: whatsappConfig.phone_number_id_present ? 'Present' : 'Manquant',
      tone: whatsappConfig.phone_number_id_present ? 'green' : 'red',
    },
    {
      label: 'API Token',
      ok: whatsappConfig.api_token_present,
      status: whatsappConfig.api_token_present ? 'Present' : 'Manquant',
      tone: whatsappConfig.api_token_present ? 'green' : 'red',
    },
    {
      label: 'Facture client',
      ok: true,
      status: whatsappConfig.app_client_url_utilisable ? 'Lien web actif' : 'Mode APK actif',
      tone: whatsappConfig.app_client_url_utilisable ? 'green' : 'blue',
    },
  ] : []

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Paramètres</h1>
          <p className="text-sm text-gray-500">Atelier, documents et nettoyage système</p>
        </div>
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
          <MdSettings size={24} className="text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={saveAtelier} className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Coordonnées atelier</h2>
              <p className="text-sm text-gray-500">Utilisées sur facture, devis et proforma</p>
            </div>
            <button className="btn-primary flex items-center gap-2">
              <MdSave size={18} /> Enregistrer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['nom', 'Nom atelier'],
              ['telephone', 'Téléphone'],
              ['whatsapp', 'WhatsApp'],
              ['email', 'Email'],
              ['facebook', 'Facebook'],
              ['site_web', 'Site web'],
              ['nif', 'NIF'],
              ['stat', 'STAT'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input className="input" value={atelier[key] || ''} onChange={e => setAtelier(a => ({ ...a, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <textarea className="input" rows={3} value={atelier.adresse || ''} onChange={e => setAtelier(a => ({ ...a, adresse: e.target.value }))} />
            </div>
          </div>
        </form>

        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">État système</h2>
          {stats ? (
            <>
              <div className={`rounded-xl p-3 mb-3 border ${whatsappConfigure ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <p className="font-bold text-sm">WhatsApp automatique : {whatsappConfigure ? 'Configuré' : 'Non configuré'}</p>
                <p className="text-xs mt-1">
                  {whatsappConfigure
                    ? `${stats.whatsapp_envoyes} notification(s) envoyée(s).`
                    : 'Notifications dans l’application actives. Pour l’envoi WhatsApp automatique, renseignez les cles Meta WhatsApp Cloud API sur le serveur.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Clients', stats.clients],
                  ['Véhicules', stats.vehicules],
                  ['RDV', stats.rendezvous],
                  ['Interventions', stats.interventions],
                  ['Devis', stats.devis],
                  ['Proformas', stats.proformas],
                  ['Factures', stats.factures],
                  ['WhatsApp attente', stats.whatsapp_en_attente],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          )}
        </div>

        <div className="card xl:col-span-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Diagnostic WhatsApp Cloud API</h2>
              <p className="text-sm text-gray-500">Configuration serveur et derniers envois automatiques</p>
            </div>
            <button
              type="button"
              onClick={verifierWhatsApp}
              disabled={whatsappChecking}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <MdRefresh size={19} className={whatsappChecking ? 'animate-spin' : ''} />
              {whatsappChecking ? 'Vérification...' : 'Vérifier WhatsApp API'}
            </button>
          </div>

          {whatsappStatus ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {diagnosticItems.map(({ label, ok, status, tone }) => {
                  const classes = diagnosticToneClass[tone]
                  return (
                  <div key={label} className={`border rounded-xl p-3 flex items-center gap-3 ${classes.box}`}>
                    {ok ? <MdCheckCircle size={22} className={`${classes.icon} shrink-0`} /> : <MdErrorOutline size={22} className={`${classes.icon} shrink-0`} />}
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{label}</p>
                      <p className={`text-xs ${classes.text}`}>{status}</p>
                    </div>
                  </div>
                  )
                })}
              </div>

              {!whatsappStatus.configuration.app_client_url_utilisable && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 mb-4 text-sm">
                  Mode APK client actif : les factures, devis et proformas sont disponibles directement dans l app client. Aucun lien web externe n est requis.
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Client</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Statut</th>
                      <th className="py-2">Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatsappStatus.notifications.length ? whatsappStatus.notifications.map(notification => (
                      <tr key={notification.id} className="border-b last:border-0 align-top">
                        <td className="py-3 pr-3 whitespace-nowrap">{new Date(notification.created_at).toLocaleString('fr-FR')}</td>
                        <td className="py-3 pr-3">{notification.client || notification.destinataire || '---'}</td>
                        <td className="py-3 pr-3">{notification.type.replaceAll('_', ' ')}</td>
                        <td className="py-3 pr-3 font-semibold">{notification.statut.replaceAll('_', ' ')}</td>
                        <td className="py-3 text-gray-600">{notification.erreur || 'Envoyé correctement'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-500">Aucune tentative WhatsApp enregistrée.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
          )}
        </div>

        <div className="card xl:col-span-3">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <MdCleaningServices size={22} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Nettoyage système</h2>
              <p className="text-sm text-gray-500">Suppression contrôlée des éléments inutiles. Les factures et clients actifs ne sont pas supprimés ici.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {cleanupOptions.map(opt => (
              <label key={opt.key} className={`border rounded-xl p-4 cursor-pointer transition-colors ${selected.includes(opt.key) ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" checked={selected.includes(opt.key)} onChange={() => toggle(opt.key)} />
                  <div>
                    <p className="font-semibold text-gray-800">{opt.label}</p>
                    <p className="text-sm text-gray-500 mt-1">{opt.hint}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
            <div className="flex items-start gap-3">
              <MdWarning size={22} className="text-orange-600 shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-orange-900">Confirmation requise</p>
                <p className="text-sm text-orange-700">Tapez NETTOYER avant d’exécuter l’action.</p>
                <input className="input mt-3 max-w-xs bg-white" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="NETTOYER" />
              </div>
            </div>
            <button onClick={nettoyer} disabled={loading || confirmation !== 'NETTOYER'} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50">
              {loading ? 'Nettoyage...' : 'Lancer le nettoyage'}
            </button>
          </div>
        </div>

        <div className="card xl:col-span-3 border border-red-300">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <MdDeleteForever size={25} className="text-red-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-800">Réinitialisation totale</h2>
              <p className="text-sm text-red-700">
                Supprime tous les clients, véhicules, rendez-vous, interventions, urgences, devis, proformas et factures.
                Le compte admin et les coordonnées atelier sont conservés.
              </p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-semibold text-red-900 mb-1">Action définitive et irréversible</p>
            <p className="text-sm text-red-700 mb-4">Tapez exactement REINITIALISER TOUT puis entrez votre mot de passe admin.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="input bg-white"
                value={reset.confirmation}
                onChange={e => setReset(r => ({ ...r, confirmation: e.target.value }))}
                placeholder="REINITIALISER TOUT"
              />
              <input
                type="password"
                className="input bg-white"
                value={reset.password}
                onChange={e => setReset(r => ({ ...r, password: e.target.value }))}
                placeholder="Mot de passe admin"
              />
            </div>
            <button
              onClick={reinitialiser}
              disabled={resetLoading || reset.confirmation !== 'REINITIALISER TOUT' || !reset.password}
              className="mt-4 bg-red-700 hover:bg-red-800 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <MdDeleteForever size={20} /> {resetLoading ? 'Réinitialisation...' : 'Tout réinitialiser'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Parametres
