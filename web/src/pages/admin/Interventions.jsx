import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import AdminQuickClientModal from '../../components/AdminQuickClientModal'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdAdd, MdSearch, MdPayment, MdPrint, MdDelete, MdPersonAdd, MdPlaylistAdd } from 'react-icons/md'
import { CATEGORIES_REPARATION, REPARATIONS_DIESEL_COMMON_RAIL } from '../../data/reparationsDieselCommonRail'
import { getWhatsAppWarning, ouvrirWhatsAppManuel } from '../../utils/whatsapp'

const statusColors = {
  en_cours: 'bg-blue-100 text-blue-700',
  termine:  'bg-green-100 text-green-700',
  suspendu: 'bg-red-100 text-red-700',
}
const statusLabels = { en_cours: 'En cours', termine: 'Terminé', suspendu: 'Annulé' }

const ligneVide = () => ({ description: '', type: '', quantite: 1, prix_unitaire: 0 })

const Interventions = () => {
  const navigate = useNavigate()
  const [items, setItems]         = useState([])
  const [clients, setClients]     = useState([])
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(null)   // 'new' | 'edit'
  const [payModal, setPayModal]   = useState(null)   // intervention sélectionnée
  const [form, setForm]           = useState({ client_id: '', vehicule_id: '', description: '', technicien: '', date_debut: '', dernier_kilometrage: '', numero_vehicule_archive: '' })
  const [repairCategory, setRepairCategory] = useState('')
  const [repairChoice, setRepairChoice] = useState('')
  const [vehicules, setVehicules] = useState([])
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm]   = useState({ statut: '', date_fin: '' })
  const [quickClientModal, setQuickClientModal] = useState(false)

  // Formulaire facturation paiement
  const [payForm, setPayForm] = useState({
    date_facture: new Date().toISOString().slice(0,10),
    date_echeance: '',
    tva: 20,
    lignes: [ligneVide()],
    montant_paye: 0,
    notes: '',
  })

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

  const onQuickClientCreated = ({ client, vehicule }) => {
    setClients(current => [client, ...current])
    setVehicules([vehicule])
    setForm(current => ({ ...current, client_id: String(client.id), vehicule_id: String(vehicule.id) }))
  }

  const creer = async () => {
    if (!form.client_id || !form.vehicule_id || !form.description.trim()) {
      toast.error('Client, véhicule et réparation obligatoires')
      return
    }
    try {
      await api.post('/admin/interventions', form)
      toast.success('Intervention créée')
      setModal(null)
      setForm({ client_id: '', vehicule_id: '', description: '', technicien: '', date_debut: '', dernier_kilometrage: '', numero_vehicule_archive: '' })
      setRepairCategory('')
      setRepairChoice('')
      load()
    } catch { toast.error('Erreur') }
  }

  const ajouterReparation = () => {
    if (!repairChoice) {
      toast.error('Sélectionnez une réparation')
      return
    }
    const ligne = `[${repairCategory}] ${repairChoice}`
    if (form.description.includes(ligne)) {
      toast.warning('Cette réparation est déjà ajoutée')
      return
    }
    setForm(f => ({
      ...f,
      description: f.description.trim()
        ? `${f.description.trim()}\n- ${ligne}`
        : `- ${ligne}`,
    }))
    setRepairChoice('')
  }

  const ouvrirNouvelleIntervention = () => {
    setForm({ client_id: '', vehicule_id: '', description: '', technicien: '', date_debut: '', dernier_kilometrage: '', numero_vehicule_archive: '' })
    setVehicules([])
    setRepairCategory('')
    setRepairChoice('')
    setModal('new')
  }

  const sauvegarder = async () => {
    try {
      await api.put(`/admin/interventions/${editModal.id}/statut`, editForm)
      toast.success('Mis à jour')
      setEditModal(null)
      load()
    } catch { toast.error('Erreur') }
  }

  // ── Ouvrir modal paiement ──────────────────────────────────────────────────
  const ouvrirPaiement = (inter) => {
    setPayModal(inter)
    setPayForm({
      date_facture: new Date().toISOString().slice(0,10),
      date_echeance: '',
      tva: 20,
      lignes: [{ description: inter.description || '', type: 'Main d\'œuvre', quantite: 1, prix_unitaire: 0 }],
      montant_paye: 0,
      notes: '',
    })
  }

  const updateLigne = (i, field, val) => {
    setPayForm(f => {
      const lignes = [...f.lignes]
      lignes[i] = { ...lignes[i], [field]: val }
      return { ...f, lignes }
    })
  }

  const montantHT  = payForm.lignes.reduce((s, l) => s + Number(l.quantite) * Number(l.prix_unitaire), 0)
  const montantTTC = payForm.tva > 0 ? montantHT * (1 + Number(payForm.tva) / 100) : montantHT

  // ── Valider paiement → créer facture → ouvrir impression ──────────────────
  const validerPaiement = async () => {
    if (payForm.lignes.some(l => !l.description)) {
      toast.error('Remplissez toutes les désignations')
      return
    }
    try {
      // 1. Créer la facture
      const { data } = await api.post('/admin/factures', {
        client_id:      payModal.client_id,
        vehicule_id:    payModal.vehicule_id,
        intervention_id: payModal.id,
        date_facture:   payForm.date_facture,
        date_echeance:  payForm.date_echeance || null,
        lignes:         payForm.lignes,
        tva:            payForm.tva,
        notes:          payForm.notes,
      })

      const factureId = data.id
      if (!factureId) throw new Error('Facture creee sans identifiant')

      // 2. Enregistrer le paiement si montant > 0
      if (Number(payForm.montant_paye) > 0) {
        const { data: paiementData } = await api.put(`/admin/factures/${factureId}/paiement`, { montant_paye: payForm.montant_paye })
        await api.put(`/admin/interventions/${payModal.id}/statut`, { statut: 'termine', date_fin: payForm.date_facture })
        setPayModal(null)
        load()
        toast.success('Facture creee et paiement valide !')
        const whatsappWarning = getWhatsAppWarning(paiementData.whatsapp, 'Facture créée et paiement validé')
        if (whatsappWarning) toast.warning(whatsappWarning)
        if (ouvrirWhatsAppManuel(paiementData.whatsapp)) toast.info('WhatsApp ouvert pour envoyer le message au client')
        navigate(`/documents/facture/${factureId}/imprimer`)
      } else {
        await api.put(`/admin/interventions/${payModal.id}/statut`, { statut: 'termine', date_fin: payForm.date_facture })
        setPayModal(null)
        load()
        toast.success('Facture creee !')
        navigate(`/documents/facture/${factureId}/imprimer`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const [filtreStatut, setFiltreStatut] = useState('tous')

  const filtered = items.filter(i => {
    const matchSearch = `${i.nom} ${i.prenom} ${i.id_client} ${i.marque} ${i.modele}`.toLowerCase().includes(search.toLowerCase())
    const matchStatut = filtreStatut === 'tous' || i.statut === filtreStatut
    return matchSearch && matchStatut
  })

  const TYPES = ['Main d\'œuvre','Pièce de rechange','Fourniture','Diagnostic','Autre']

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Interventions</h1>
        <div className="flex gap-3">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input className="input pl-9 w-56" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={ouvrirNouvelleIntervention} className="btn-primary flex items-center gap-2">
            <MdAdd size={18} /> Nouvelle
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'tous',     label: 'Toutes' },
          { key: 'en_cours', label: 'En cours' },
          { key: 'suspendu', label: 'Annulées' },
          { key: 'termine',  label: 'Terminées' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltreStatut(key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              filtreStatut === key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-primary hover:text-primary'
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs opacity-70">
              ({key === 'tous' ? items.length : items.filter(i => i.statut === key).length})
            </span>
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Véhicule</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Technicien</th>
              <th className="text-left px-4 py-3">Début</th>
              <th className="text-left px-4 py-3">Fin</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{i.prenom} {i.nom}</p>
                  <p className="text-xs text-primary">{i.id_client}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{i.marque} {i.modele}</p>
                  <p className="text-xs text-gray-400 font-mono">{i.immatriculation}</p>
                  {(i.dernier_kilometrage || i.numero_vehicule_archive) && (
                    <p className="text-[11px] text-orange-600 mt-1">
                      Garage: {i.dernier_kilometrage ? `${Number(i.dernier_kilometrage).toLocaleString()} km` : 'km -'}
                      {i.numero_vehicule_archive ? ` / ${i.numero_vehicule_archive}` : ''}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="truncate text-gray-700">{i.description}</p>
                </td>
                <td className="px-4 py-3">{i.technicien || '—'}</td>
                <td className="px-4 py-3 text-sm">{i.date_debut ? new Date(i.date_debut).toLocaleDateString('fr-FR') : '—'}</td>
                <td className="px-4 py-3 text-sm">{i.date_fin  ? new Date(i.date_fin).toLocaleDateString('fr-FR')  : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusColors[i.statut]}`}>{statusLabels[i.statut]}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => { setEditModal(i); setEditForm({ statut: i.statut, date_fin: i.date_fin || '' }) }}
                      className="btn-primary text-xs py-1 px-2"
                    >
                      Modifier
                    </button>
                    {i.statut !== 'termine' && (
                      <button
                        onClick={() => ouvrirPaiement(i)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs py-1 px-2 rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <MdPayment size={13} /> Facturer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Aucune intervention</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal nouvelle intervention ── */}
      {modal === 'new' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold">Nouvelle intervention directe</h2>
                <p className="text-xs text-gray-500">Aucun rendez-vous requis.</p>
              </div>
              <button type="button" onClick={() => setQuickClientModal(true)} className="text-primary font-semibold text-sm flex items-center gap-1">
                <MdPersonAdd size={18} /> Nouveau client sans APK
              </button>
            </div>
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
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Catalogue réparations Diesel Common Rail</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    className="input bg-white"
                    value={repairCategory}
                    onChange={e => { setRepairCategory(e.target.value); setRepairChoice('') }}
                  >
                    <option value="">Choisir une catégorie...</option>
                    {CATEGORIES_REPARATION.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <select
                    className="input bg-white"
                    value={repairChoice}
                    onChange={e => setRepairChoice(e.target.value)}
                    disabled={!repairCategory}
                  >
                    <option value="">Choisir une réparation...</option>
                    {(REPARATIONS_DIESEL_COMMON_RAIL[repairCategory] || []).map(repair => (
                      <option key={repair} value={repair}>{repair}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={ajouterReparation}
                  disabled={!repairChoice}
                  className="mt-2 btn-primary text-sm py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  <MdPlaylistAdd size={18} /> Ajouter à l’intervention
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Réparations sélectionnées / description personnalisée</label>
                <textarea
                  className="input"
                  rows={5}
                  placeholder="Ajoutez une ou plusieurs réparations depuis le catalogue, ou saisissez une réparation personnalisée..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
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
              <div className="border border-orange-200 bg-orange-50 rounded-xl p-3">
                <p className="text-sm font-semibold text-orange-800 mb-2">Archive garage privee</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Dernier kilometrage</label>
                    <input
                      type="number"
                      min="0"
                      className="input bg-white"
                      value={form.dernier_kilometrage}
                      onChange={e => setForm(f => ({ ...f, dernier_kilometrage: e.target.value }))}
                      placeholder="Ex: 185000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Numero fiara / archive</label>
                    <input
                      className="input bg-white"
                      value={form.numero_vehicule_archive}
                      onChange={e => setForm(f => ({ ...f, numero_vehicule_archive: e.target.value }))}
                      placeholder="Interne garage, chassis, repere..."
                    />
                  </div>
                </div>
                <p className="text-xs text-orange-700 mt-2">Tsy miseho amin'ny facture na amin'ny app client ireo champs ireo.</p>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Annuler</button>
                <button onClick={creer} className="btn-primary">Créer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal modifier statut ── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Modifier le statut</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <select className="input" value={editForm.statut} onChange={e => setEditForm(f => ({ ...f, statut: e.target.value }))}>
                  <option value="en_cours">En cours</option>
                  <option value="suspendu">Annulé</option>
                  <option value="termine">Terminé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date fin</label>
                <input type="date" className="input" value={editForm.date_fin} onChange={e => setEditForm(f => ({ ...f, date_fin: e.target.value }))} />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button onClick={() => setEditModal(null)} className="px-4 py-2 border rounded-xl text-gray-600">Annuler</button>
                <button onClick={sauvegarder} className="btn-primary">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal FACTURATION PAIEMENT ── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Facturation &amp; Paiement</h2>
                <p className="text-sm text-gray-500">{payModal.prenom} {payModal.nom} — {payModal.marque} {payModal.modele} ({payModal.immatriculation})</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date facture</label>
                <input type="date" className="input" value={payForm.date_facture} onChange={e => setPayForm(f => ({ ...f, date_facture: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date échéance</label>
                <input type="date" className="input" value={payForm.date_echeance} onChange={e => setPayForm(f => ({ ...f, date_echeance: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">TVA</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPayForm(f => ({ ...f, tva: f.tva > 0 ? 0 : 20 }))}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${payForm.tva > 0 ? 'bg-primary' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${payForm.tva > 0 ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  {payForm.tva > 0 ? (
                    <input
                      type="number"
                      className="input py-1.5 w-20 text-sm"
                      value={payForm.tva}
                      min="0" max="100"
                      onChange={e => setPayForm(f => ({ ...f, tva: Number(e.target.value) }))}
                    />
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
                <button onClick={() => setPayForm(f => ({ ...f, lignes: [...f.lignes, ligneVide()] }))}
                  className="text-primary text-xs hover:underline flex items-center gap-1">
                  <MdAdd size={14} /> Ajouter ligne
                </button>
              </div>

              {/* En-têtes */}
              <div className="grid grid-cols-12 gap-1 mb-1 px-1">
                <span className="col-span-4 text-xs font-medium text-gray-500">Désignation</span>
                <span className="col-span-2 text-xs font-medium text-gray-500">Type</span>
                <span className="col-span-1 text-xs font-medium text-gray-500 text-center">Qté</span>
                <span className="col-span-3 text-xs font-medium text-gray-500 text-right">Prix unit. (Ar)</span>
                <span className="col-span-1 text-xs font-medium text-gray-500 text-right">Total</span>
                <span className="col-span-1" />
              </div>

              {payForm.lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 items-center mb-1.5">
                  <input className="input col-span-4 text-xs py-1.5" placeholder="Désignation..." value={l.description}
                    onChange={e => updateLigne(i, 'description', e.target.value)} />
                  <select className="input col-span-2 text-xs py-1.5" value={l.type}
                    onChange={e => updateLigne(i, 'type', e.target.value)}>
                    <option value="">—</option>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="number" className="input col-span-1 text-xs py-1.5 text-center" value={l.quantite}
                    onChange={e => updateLigne(i, 'quantite', e.target.value)} min="1" />
                  <input type="number" className="input col-span-3 text-xs py-1.5 text-right" value={l.prix_unitaire}
                    onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)} />
                  <span className="col-span-1 text-xs font-semibold text-right text-gray-700">
                    {(Number(l.quantite) * Number(l.prix_unitaire)).toLocaleString()}
                  </span>
                  <button onClick={() => setPayForm(f => ({ ...f, lignes: f.lignes.filter((_, j) => j !== i) }))}
                    className="col-span-1 text-red-400 hover:text-red-600 flex justify-center">
                    <MdDelete size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Totaux */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4 flex justify-between items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Montant reçu (Ar)</label>
                <input type="number" className="input w-48 font-semibold text-lg text-green-700"
                  value={payForm.montant_paye}
                  onChange={e => setPayForm(f => ({ ...f, montant_paye: e.target.value }))}
                  placeholder="0" />
                <p className="text-xs text-gray-400 mt-1">Laisser à 0 si non encore payé</p>
              </div>
              <div className="text-right">
                {payForm.tva > 0 && (
                  <>
                    <p className="text-xs text-gray-500">HT : <span className="font-medium">{montantHT.toLocaleString()} Ar</span></p>
                    <p className="text-xs text-gray-500">TVA ({payForm.tva}%) : <span className="font-medium">{(montantTTC - montantHT).toLocaleString()} Ar</span></p>
                  </>
                )}
                <p className="text-base font-bold text-primary mt-1">
                  {payForm.tva > 0 ? 'TTC' : 'Total'} : {montantTTC.toLocaleString()} Ar
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setPayModal(null)} className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={validerPaiement} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors">
                <MdPayment size={18} /> Valider &amp; Générer facture
              </button>
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

export default Interventions
