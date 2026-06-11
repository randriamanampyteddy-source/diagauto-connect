import { useEffect, useRef, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import AdminQuickClientModal from '../../components/AdminQuickClientModal'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdAdd, MdMessage, MdPersonAdd, MdSearch, MdSend } from 'react-icons/md'
import { playUrgenceSound } from '../../utils/alertSound'
import { getWhatsAppWarning, ouvrirWhatsAppManuel } from '../../utils/whatsapp'

const statusColors = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  confirme: 'bg-green-100 text-green-700',
  annule: 'bg-red-100 text-red-700',
  termine: 'bg-gray-100 text-gray-600',
}
const statusLabels = { en_attente: 'En attente', confirme: 'Confirme', annule: 'Annule', termine: 'Termine' }
const emptyCreateForm = { client_id: '', vehicule_id: '', date_rdv: '', heure_rdv: '', motif: '', notes_admin: '' }
const EMOJIS = ['👍', '🙏', '✅', '❌', '🔧', '🚗', '📍', '⏰', '📞', '💬', '🙂', '👌']

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
  const [messagesModal, setMessagesModal] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [sendingId, setSendingId] = useState(null)
  const latestMessageId = useRef(0)

  const load = () => {
    api.get('/admin/rendezvous').then(r => setRdvs(r.data)).catch(() => {})
    api.get('/admin/clients').then(r => setClients(r.data.filter(c => c.statut === 'actif'))).catch(() => {})
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [])

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
      await api.post('/admin/rendezvous', createForm)
      toast.success('Rendez-vous cree et confirme')
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
      await api.put(`/admin/rendezvous/${editModal.id}/statut`, editForm)
      toast.success('Statut mis a jour')
      setEditModal(null)
      load()
    } catch {
      toast.error('Erreur')
    }
  }

  const filtered = rdvs.filter(r =>
    `${r.nom} ${r.prenom} ${r.id_client} ${r.marque} ${r.modele}`.toLowerCase().includes(search.toLowerCase())
  )

  const ouvrirMessages = async (rdv) => {
    setMessagesModal(rdv)
    setMessageText('')
    try {
      const { data } = await api.get(`/admin/rendezvous/${rdv.id}/messages`)
      setMessages(data)
      latestMessageId.current = Number(data.at(-1)?.id) || 0
      setRdvs(current => current.map(item => item.id === rdv.id ? { ...item, unread_count: 0 } : item))
    } catch {
      toast.error('Impossible de charger les messages')
    }
  }

  const refreshMessages = async (rdvId, notify = false) => {
    const { data } = await api.get(`/admin/rendezvous/${rdvId}/messages`)
    const last = data.at(-1)
    const lastId = Number(last?.id) || 0
    if (notify && lastId > latestMessageId.current && last?.expediteur === 'client') {
      playUrgenceSound()
    }
    latestMessageId.current = lastId || latestMessageId.current
    setMessages(data)
  }

  useEffect(() => {
    if (!messagesModal) return undefined
    const timer = setInterval(() => {
      refreshMessages(messagesModal.id, true).catch(() => {})
    }, 2000)
    return () => clearInterval(timer)
  }, [messagesModal])

  const envoyerMessage = async () => {
    if (!messageText.trim() || !messagesModal) return
    try {
      await api.post(`/admin/rendezvous/${messagesModal.id}/messages`, { message: messageText })
      setMessageText('')
      await refreshMessages(messagesModal.id)
      toast.success('Message envoye')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Envoi impossible')
    }
  }

  const envoyerRendezvousWhatsApp = async (rdv) => {
    setSendingId(rdv.id)
    try {
      const { data } = await api.post(`/admin/rendezvous/${rdv.id}/envoyer`)
      const warning = getWhatsAppWarning(data.whatsapp, 'Rendez-vous prepare')
      if (warning) toast.warning(warning)
      else toast.success('Rendez-vous envoye sur WhatsApp')
      ouvrirWhatsAppManuel(data.whatsapp)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Envoi WhatsApp impossible')
    } finally {
      setSendingId(null)
    }
  }

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
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openEditModal(r)} className="btn-primary text-xs py-1 px-3">Modifier</button>
                    <button onClick={() => ouvrirMessages(r)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded-xl flex items-center gap-1">
                      <MdMessage size={14} /> Messages
                      {Number(r.unread_count) > 0 && (
                        <span className="bg-red-500 text-white min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px]">{r.unread_count}</span>
                      )}
                    </button>
                    <button
                      onClick={() => envoyerRendezvousWhatsApp(r)}
                      disabled={sendingId === r.id}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs py-1 px-3 rounded-xl flex items-center gap-1"
                    >
                      <MdSend size={14} /> {sendingId === r.id ? 'Envoi...' : 'WhatsApp'}
                    </button>
                  </div>
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

      {messagesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-5 max-h-[92vh] flex flex-col">
            <h2 className="text-lg font-bold mb-1">Messages rendez-vous</h2>
            <p className="text-sm text-gray-500 mb-4">{messagesModal.prenom} {messagesModal.nom} - {messagesModal.marque} {messagesModal.modele}</p>
            <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl p-3 space-y-2 min-h-[260px]">
              {messages.map(m => (
                <div key={m.id} className={`rounded-xl p-3 text-sm max-w-[85%] ${m.expediteur === 'client' ? 'bg-white border ml-auto' : 'bg-blue-50 text-blue-950'}`}>
                  <p className="text-xs font-semibold mb-1">{m.expediteur === 'client' ? 'Client' : 'Admin'}</p>
                  <p className="whitespace-pre-wrap">{m.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{new Date(m.created_at).toLocaleString('fr-FR')}</p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Aucun message.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                  {EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setMessageText(text => `${text}${emoji}`)}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-lg shrink-0"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <textarea className="input w-full" rows={2} value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Repondre au client..." />
              </div>
              <button onClick={envoyerMessage} className="btn-primary px-4 flex items-center gap-2 self-end"><MdSend /> Envoyer</button>
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => setMessagesModal(null)} className="px-4 py-2 border rounded-xl text-gray-600">Fermer</button>
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
