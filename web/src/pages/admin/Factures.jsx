import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdAdd, MdDelete, MdPayment } from 'react-icons/md'

const statusColors = {
  non_payee: 'bg-red-100 text-red-700',
  partiellement_payee: 'bg-yellow-100 text-yellow-700',
  payee: 'bg-green-100 text-green-700',
}
const statusLabels = { non_payee: 'Non payée', partiellement_payee: 'Partiel', payee: 'Payée' }

const ligneVide = () => ({ description: '', quantite: 1, prix_unitaire: 0 })

const Factures = () => {
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [modal, setModal] = useState(false)
  const [paiementModal, setPaiementModal] = useState(null)
  const [montantPaye, setMontantPaye] = useState('')
  const [form, setForm] = useState({ client_id: '', vehicule_id: '', date_facture: '', date_echeance: '', tva: 20, notes: '', lignes: [ligneVide()] })

  const load = () => {
    api.get('/admin/factures').then(r => setItems(r.data))
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

  const updateLigne = (i, field, val) => {
    setForm(f => { const lignes = [...f.lignes]; lignes[i] = { ...lignes[i], [field]: val }; return { ...f, lignes } })
  }

  const montantHT = form.lignes.reduce((s, l) => s + Number(l.quantite) * Number(l.prix_unitaire), 0)
  const montantTTC = montantHT * (1 + Number(form.tva) / 100)

  const creer = async () => {
    try {
      await api.post('/admin/factures', form)
      toast.success('Facture créée')
      setModal(false)
      setForm({ client_id: '', vehicule_id: '', date_facture: '', date_echeance: '', tva: 20, notes: '', lignes: [ligneVide()] })
      load()
    } catch { toast.error('Erreur') }
  }

  const enregistrerPaiement = async () => {
    try {
      await api.put(`/admin/factures/${paiementModal.id}/paiement`, { montant_paye: Number(montantPaye) })
      toast.success('Paiement enregistré')
      setPaiementModal(null)
      load()
    } catch { toast.error('Erreur') }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Factures</h1>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2"><MdAdd size={18} /> Nouvelle facture</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-3">N° Facture</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Véhicule</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Total TTC</th>
              <th className="text-left px-4 py-3">Payé</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(f => (
              <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-primary">{f.numero_facture}</td>
                <td className="px-4 py-3"><p className="font-medium">{f.prenom} {f.nom}</p><p className="text-xs text-gray-400">{f.id_client}</p></td>
                <td className="px-4 py-3">{f.marque} {f.modele}</td>
                <td className="px-4 py-3">{new Date(f.date_facture).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3 font-semibold">{Number(f.montant_ttc).toLocaleString()} Ar</td>
                <td className="px-4 py-3">{Number(f.montant_paye).toLocaleString()} Ar</td>
                <td className="px-4 py-3"><span className={`badge ${statusColors[f.statut]}`}>{statusLabels[f.statut]}</span></td>
                <td className="px-4 py-3">
                  {f.statut !== 'payee' && (
                    <button onClick={() => { setPaiementModal(f); setMontantPaye(f.montant_ttc) }} className="btn-success text-xs py-1 px-2 flex items-center gap-1">
                      <MdPayment size={14} /> Paiement
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Aucune facture</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal création facture */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Nouvelle facture</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <select className="input" value={form.client_id} onChange={e => onClientChange(e.target.value)}>
                  <option value="">Sélectionner...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Véhicule</label>
                <select className="input" value={form.vehicule_id} onChange={e => setForm(f => ({ ...f, vehicule_id: e.target.value }))}>
                  <option value="">Sélectionner...</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.marque} {v.modele} — {v.immatriculation}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date facture</label>
                <input type="date" className="input" value={form.date_facture} onChange={e => setForm(f => ({ ...f, date_facture: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date échéance</label>
                <input type="date" className="input" value={form.date_echeance} onChange={e => setForm(f => ({ ...f, date_echeance: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">TVA (%)</label>
                <input type="number" className="input" value={form.tva} onChange={e => setForm(f => ({ ...f, tva: e.target.value }))} />
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Lignes</label>
                <button onClick={() => setForm(f => ({ ...f, lignes: [...f.lignes, ligneVide()] }))} className="text-primary text-sm flex items-center gap-1"><MdAdd size={16} /> Ajouter</button>
              </div>
              {form.lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center mb-2">
                  <input className="input col-span-5" placeholder="Description" value={l.description} onChange={e => updateLigne(i, 'description', e.target.value)} />
                  <input type="number" className="input col-span-2" placeholder="Qté" value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)} />
                  <input type="number" className="input col-span-3" placeholder="Prix unit." value={l.prix_unitaire} onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)} />
                  <p className="col-span-1 text-sm font-medium text-right">{(l.quantite * l.prix_unitaire).toLocaleString()}</p>
                  <button onClick={() => setForm(f => ({ ...f, lignes: f.lignes.filter((_, j) => j !== i) }))} className="col-span-1 text-red-400"><MdDelete size={18} /></button>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
              <div className="flex justify-between"><span>HT</span><span>{montantHT.toLocaleString()} Ar</span></div>
              <div className="flex justify-between font-bold pt-2 border-t mt-2"><span>TTC</span><span className="text-primary">{montantTTC.toLocaleString()} Ar</span></div>
            </div>
            <textarea className="input mb-4" rows={2} placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(false)} className="px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
              <button onClick={creer} className="btn-primary">Créer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal paiement */}
      {paiementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-2">Enregistrer un paiement</h2>
            <p className="text-sm text-gray-500 mb-4">{paiementModal.numero_facture} — Total : {Number(paiementModal.montant_ttc).toLocaleString()} Ar</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Montant payé (Ar)</label>
              <input type="number" className="input" value={montantPaye} onChange={e => setMontantPaye(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPaiementModal(null)} className="px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
              <button onClick={enregistrerPaiement} className="btn-success">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Factures
