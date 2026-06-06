import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import AdminQuickClientModal from '../../components/AdminQuickClientModal'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdAdd, MdDelete, MdPayment, MdPersonAdd, MdPrint, MdSearch } from 'react-icons/md'
import { getWhatsAppWarning, ouvrirWhatsAppManuel } from '../../utils/whatsapp'

const statusColors = {
  non_payee:          'bg-red-100 text-red-700',
  partiellement_payee:'bg-yellow-100 text-yellow-700',
  payee:              'bg-green-100 text-green-700',
}
const statusLabels = {
  non_payee: 'Non payée', partiellement_payee: 'Partiel', payee: 'Payée'
}

const TYPES = ['Main d\'œuvre', 'Pièce de rechange', 'Fourniture', 'Diagnostic', 'Autre']
const ligneVide = () => ({ description: '', type: '', quantite: 1, prix_unitaire: 0 })
const today = new Date().toISOString().slice(0, 10)

const Factures = () => {
  const navigate = useNavigate()

  // Listes
  const [items, setItems]       = useState([])
  const [clients, setClients]   = useState([])
  const [vehicules, setVehicules] = useState([])

  // Filtres
  const [search, setSearch]           = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')

  // Modal nouvelle facture
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({
    client_id: '', vehicule_id: '',
    date_facture: today, date_echeance: '',
    tva: 0, lignes: [ligneVide()], notes: '',
  })

  // Modal paiement
  const [paiementModal, setPaiementModal] = useState(null)
  const [montantPaye, setMontantPaye]     = useState('')
  const [quickClientModal, setQuickClientModal] = useState(false)

  // ── Chargement ──────────────────────────────────────────────────────────────
  const load = () => {
    api.get('/admin/factures').then(r => setItems(r.data)).catch(() => {})
    api.get('/admin/clients').then(r => setClients(r.data.filter(c => c.statut === 'actif'))).catch(() => {})
  }
  useEffect(() => { load() }, [])

  // ── Sélection client → charge véhicules ─────────────────────────────────────
  const onClientChange = async (id) => {
    setForm(f => ({ ...f, client_id: id, vehicule_id: '' }))
    setVehicules([])
    if (id) {
      try {
        const { data } = await api.get(`/admin/clients/${id}/vehicules`)
        setVehicules(data)
      } catch { toast.error('Impossible de charger les véhicules') }
    }
  }

  const onQuickClientCreated = ({ client, vehicule }) => {
    setClients(current => [client, ...current])
    setVehicules([vehicule])
    setForm(current => ({ ...current, client_id: String(client.id), vehicule_id: String(vehicule.id) }))
  }

  // ── Mise à jour lignes ───────────────────────────────────────────────────────
  const updateLigne = (i, field, val) => {
    setForm(f => {
      const lignes = [...f.lignes]
      lignes[i] = { ...lignes[i], [field]: val }
      return { ...f, lignes }
    })
  }

  // ── Calculs ─────────────────────────────────────────────────────────────────
  const montantHT  = form.lignes.reduce((s, l) => s + Number(l.quantite) * Number(l.prix_unitaire), 0)
  const montantTTC = form.tva > 0 ? montantHT * (1 + form.tva / 100) : montantHT

  // ── Créer facture ────────────────────────────────────────────────────────────
  const creer = async () => {
    if (!form.client_id)   { toast.error('Sélectionnez un client');   return }
    if (!form.vehicule_id) { toast.error('Sélectionnez un véhicule'); return }
    if (!form.date_facture){ toast.error('Entrez la date de facture'); return }
    if (form.lignes.some(l => !l.description)) { toast.error('Remplissez toutes les désignations'); return }

    try {
      const { data } = await api.post('/admin/factures', {
        client_id:    form.client_id,
        vehicule_id:  form.vehicule_id,
        date_facture: form.date_facture,
        date_echeance: form.date_echeance || null,
        lignes:       form.lignes,
        tva:          form.tva,
        notes:        form.notes,
      })
      toast.success(`Facture créée : ${data.numero_facture}`)
      setModal(false)
      setForm({ client_id:'', vehicule_id:'', date_facture: today, date_echeance:'', tva:0, lignes:[ligneVide()], notes:'' })
      setVehicules([])
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  // ── Enregistrer paiement ─────────────────────────────────────────────────────
  const enregistrerPaiement = async () => {
    try {
      const { data } = await api.put(`/admin/factures/${paiementModal.id}/paiement`, { montant_paye: Number(montantPaye) })
      toast.success('Paiement enregistré')
      const whatsappWarning = getWhatsAppWarning(data.whatsapp, 'Paiement validé')
      if (whatsappWarning) toast.warning(whatsappWarning)
      if (ouvrirWhatsAppManuel(data.whatsapp)) toast.info('WhatsApp ouvert pour envoyer le message au client')
      setPaiementModal(null)
      load()
    } catch { toast.error('Erreur') }
  }

  // ── Filtrage ─────────────────────────────────────────────────────────────────
  const filtered = items.filter(f => {
    const matchS = `${f.nom} ${f.prenom} ${f.id_client} ${f.numero_facture} ${f.marque} ${f.modele}`
      .toLowerCase().includes(search.toLowerCase())
    const matchF = filtreStatut === 'tous' || f.statut === filtreStatut
    return matchS && matchF
  })

  const totalTTC  = filtered.reduce((s, f) => s + Number(f.montant_ttc), 0)
  const totalPaye = filtered.reduce((s, f) => s + Number(f.montant_paye), 0)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Factures</h1>
        <div className="flex gap-3">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input className="input pl-9 w-56" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
            <MdAdd size={18} /> Nouvelle facture
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'tous',              label: 'Toutes' },
          { key: 'non_payee',         label: 'Non payées' },
          { key: 'partiellement_payee', label: 'Partielles' },
          { key: 'payee',             label: 'Payées' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFiltreStatut(key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              filtreStatut === key
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-primary hover:text-primary'
            }`}>
            {label}
            <span className="ml-1.5 text-xs opacity-70">
              ({key === 'tous' ? items.length : items.filter(f => f.statut === key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Résumé */}
      {filtered.length > 0 && (
        <div className="flex gap-3 mb-4">
          {[
            { label: 'Total TTC',        val: totalTTC,             color: 'text-gray-800' },
            { label: 'Total encaissé',   val: totalPaye,            color: 'text-green-600' },
            { label: 'Reste à encaisser', val: totalTTC - totalPaye, color: 'text-red-500' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-xl px-4 py-2 shadow-sm flex items-center gap-3">
              <span className="text-xs text-gray-500">{label}</span>
              <span className={`font-bold ${color}`}>{val.toLocaleString()} Ar</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">N° Facture</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Véhicule</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Total TTC</th>
              <th className="text-left px-4 py-3">Encaissé</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-primary">{f.numero_facture}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{f.prenom} {f.nom}</p>
                  <p className="text-xs text-gray-400">{f.id_client}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{f.marque} {f.modele}</p>
                  <p className="text-xs font-mono text-gray-400">{f.immatriculation}</p>
                </td>
                <td className="px-4 py-3">{new Date(String(f.date_facture).slice(0,10)+'T00:00').toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3 font-semibold">{Number(f.montant_ttc).toLocaleString()} Ar</td>
                <td className="px-4 py-3 text-green-700 font-medium">{Number(f.montant_paye).toLocaleString()} Ar</td>
                <td className="px-4 py-3"><span className={`badge ${statusColors[f.statut]}`}>{statusLabels[f.statut]}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => navigate(`/documents/facture/${f.id}/imprimer`)}
                      className="bg-primary hover:bg-blue-900 text-white text-xs py-1 px-2 rounded-xl flex items-center gap-1 transition-colors">
                      <MdPrint size={13} /> Voir
                    </button>
                    {f.statut !== 'payee' && (
                      <button onClick={() => { setPaiementModal(f); setMontantPaye(f.montant_ttc) }}
                        className="btn-success text-xs py-1 px-2 flex items-center gap-1">
                        <MdPayment size={13} /> Payer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Aucune facture trouvée</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal NOUVELLE FACTURE ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Nouvelle facture directe</h2>
                <p className="text-xs text-gray-500">Sans rendez-vous et sans intervention obligatoire.</p>
              </div>
              <button type="button" onClick={() => setQuickClientModal(true)} className="text-primary font-semibold text-sm flex items-center gap-1">
                <MdPersonAdd size={18} /> Nouveau client sans APK
              </button>
            </div>

            {/* Client + Véhicule */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client *</label>
                <select className="input" value={form.client_id} onChange={e => onClientChange(e.target.value)}>
                  <option value="">Sélectionner un client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom} ({c.id_client})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Véhicule *</label>
                <select className="input" value={form.vehicule_id} onChange={e => setForm(f => ({ ...f, vehicule_id: e.target.value }))}
                  disabled={!form.client_id}>
                  <option value="">Sélectionner un véhicule...</option>
                  {vehicules.map(v => (
                    <option key={v.id} value={v.id}>{v.marque} {v.modele} — {v.immatriculation}</option>
                  ))}
                </select>
                {form.client_id && vehicules.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">Ce client n'a pas de véhicule enregistré</p>
                )}
              </div>
            </div>

            {/* Dates + TVA */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date facture *</label>
                <input type="date" className="input" value={form.date_facture}
                  onChange={e => setForm(f => ({ ...f, date_facture: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date échéance</label>
                <input type="date" className="input" value={form.date_echeance}
                  onChange={e => setForm(f => ({ ...f, date_echeance: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">TVA</label>
                <div className="flex items-center gap-2 mt-1">
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, tva: f.tva > 0 ? 0 : 20 }))}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${form.tva > 0 ? 'bg-primary' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.tva > 0 ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  {form.tva > 0 ? (
                    <input type="number" className="input py-1.5 w-20 text-sm" value={form.tva} min="0" max="100"
                      onChange={e => setForm(f => ({ ...f, tva: Number(e.target.value) }))} />
                  ) : (
                    <span className="text-xs text-gray-400">Sans TVA</span>
                  )}
                </div>
              </div>
            </div>

            {/* Lignes prestations */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Détail des prestations</label>
                <button onClick={() => setForm(f => ({ ...f, lignes: [...f.lignes, ligneVide()] }))}
                  className="text-primary text-xs flex items-center gap-1 hover:underline">
                  <MdAdd size={14} /> Ajouter ligne
                </button>
              </div>

              <div className="grid grid-cols-12 gap-1 mb-1 px-1">
                <span className="col-span-4 text-xs font-medium text-gray-500">Désignation</span>
                <span className="col-span-2 text-xs font-medium text-gray-500">Type</span>
                <span className="col-span-1 text-xs font-medium text-gray-500 text-center">Qté</span>
                <span className="col-span-3 text-xs font-medium text-gray-500 text-right">Prix unit. (Ar)</span>
                <span className="col-span-1 text-xs font-medium text-gray-500 text-right">Total</span>
                <span className="col-span-1" />
              </div>

              {form.lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 items-center mb-1.5">
                  <input className="input col-span-4 text-xs py-1.5" placeholder="Désignation..."
                    value={l.description} onChange={e => updateLigne(i, 'description', e.target.value)} />
                  <select className="input col-span-2 text-xs py-1.5" value={l.type}
                    onChange={e => updateLigne(i, 'type', e.target.value)}>
                    <option value="">—</option>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="number" className="input col-span-1 text-xs py-1.5 text-center" min="1"
                    value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)} />
                  <input type="number" className="input col-span-3 text-xs py-1.5 text-right"
                    value={l.prix_unitaire} onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)} />
                  <span className="col-span-1 text-xs font-semibold text-right text-gray-700">
                    {(Number(l.quantite) * Number(l.prix_unitaire)).toLocaleString()}
                  </span>
                  <button onClick={() => setForm(f => ({ ...f, lignes: f.lignes.filter((_, j) => j !== i) }))}
                    className="col-span-1 text-red-400 hover:text-red-600 flex justify-center">
                    <MdDelete size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Totaux */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm flex justify-end">
              <div className="text-right">
                {form.tva > 0 && (
                  <>
                    <p className="text-gray-500">HT : <span className="font-medium">{montantHT.toLocaleString()} Ar</span></p>
                    <p className="text-gray-500">TVA ({form.tva}%) : <span className="font-medium">{(montantTTC - montantHT).toLocaleString()} Ar</span></p>
                  </>
                )}
                <p className="text-base font-bold text-primary">
                  {form.tva > 0 ? 'TTC' : 'Total'} : {montantTTC.toLocaleString()} Ar
                </p>
              </div>
            </div>

            <textarea className="input mb-4" rows={2} placeholder="Notes / observations..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

            <div className="flex gap-3 justify-end">
              <button onClick={() => { setModal(false); setVehicules([]) }}
                className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={creer} className="btn-primary px-6">Créer la facture</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal PAIEMENT ── */}
      {paiementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-2">Enregistrer un paiement</h2>
            <p className="text-sm text-gray-500 mb-4">
              {paiementModal.numero_facture} — Total : {Number(paiementModal.montant_ttc).toLocaleString()} Ar
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Montant payé (Ar)</label>
              <input type="number" className="input text-lg font-semibold"
                value={montantPaye} onChange={e => setMontantPaye(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPaiementModal(null)} className="px-4 py-2 border rounded-xl text-gray-600">Annuler</button>
              <button onClick={enregistrerPaiement} className="btn-success px-6">Enregistrer</button>
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

export default Factures
