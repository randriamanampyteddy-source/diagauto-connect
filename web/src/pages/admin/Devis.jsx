import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdAdd, MdDelete, MdPrint } from 'react-icons/md'

const statusColors = {
  brouillon: 'bg-gray-100 text-gray-600',
  envoye: 'bg-blue-100 text-blue-700',
  accepte: 'bg-green-100 text-green-700',
  refuse: 'bg-red-100 text-red-700',
}
const statusLabels = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé' }

const ligneVide = () => ({ description: '', quantite: 1, prix_unitaire: 0 })

const Devis = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ client_id: '', vehicule_id: '', date_devis: '', date_validite: '', tva: 20, notes: '', lignes: [ligneVide()] })

  const load = () => {
    api.get('/admin/devis').then(r => setItems(r.data))
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
    setForm(f => {
      const lignes = [...f.lignes]
      lignes[i] = { ...lignes[i], [field]: val }
      return { ...f, lignes }
    })
  }

  const montantHT = form.lignes.reduce((s, l) => s + Number(l.quantite) * Number(l.prix_unitaire), 0)
  const montantTTC = montantHT * (1 + Number(form.tva) / 100)

  const creer = async () => {
    try {
      await api.post('/admin/devis', form)
      toast.success('Devis créé')
      setModal(false)
      setForm({ client_id: '', vehicule_id: '', date_devis: '', date_validite: '', tva: 20, notes: '', lignes: [ligneVide()] })
      load()
    } catch { toast.error('Erreur') }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Devis</h1>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2"><MdAdd size={18} /> Nouveau devis</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-3">N° Devis</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Véhicule</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Montant TTC</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-primary">{d.numero_devis}</td>
                <td className="px-4 py-3"><p className="font-medium">{d.prenom} {d.nom}</p><p className="text-xs text-gray-400">{d.id_client}</p></td>
                <td className="px-4 py-3">{d.marque} {d.modele}</td>
                <td className="px-4 py-3">{new Date(d.date_devis).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3 font-semibold">{Number(d.montant_ttc).toLocaleString()} Ar</td>
                <td className="px-4 py-3"><span className={`badge ${statusColors[d.statut]}`}>{statusLabels[d.statut]}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/documents/devis/${d.id}/imprimer`)} className="bg-primary hover:bg-blue-900 text-white text-xs py-1 px-2 rounded-xl flex items-center gap-1">
                    <MdPrint size={13} /> Voir
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun devis</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Nouveau devis</h2>
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
                <label className="block text-sm font-medium mb-1">Date devis</label>
                <input type="date" className="input" value={form.date_devis} onChange={e => setForm(f => ({ ...f, date_devis: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date validité</label>
                <input type="date" className="input" value={form.date_validite} onChange={e => setForm(f => ({ ...f, date_validite: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">TVA (%)</label>
                <input type="number" className="input" value={form.tva} onChange={e => setForm(f => ({ ...f, tva: e.target.value }))} />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Lignes</label>
                <button onClick={() => setForm(f => ({ ...f, lignes: [...f.lignes, ligneVide()] }))} className="text-primary text-sm hover:underline flex items-center gap-1"><MdAdd size={16} /> Ajouter ligne</button>
              </div>
              <div className="flex flex-col gap-2">
                {form.lignes.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input className="input col-span-5" placeholder="Description" value={l.description} onChange={e => updateLigne(i, 'description', e.target.value)} />
                    <input type="number" className="input col-span-2" placeholder="Qté" value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)} />
                    <input type="number" className="input col-span-3" placeholder="Prix unit." value={l.prix_unitaire} onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)} />
                    <p className="col-span-1 text-sm font-medium text-right">{(l.quantite * l.prix_unitaire).toLocaleString()}</p>
                    <button onClick={() => setForm(f => ({ ...f, lignes: f.lignes.filter((_, j) => j !== i) }))} className="col-span-1 text-red-400 hover:text-red-600"><MdDelete size={18} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
              <div className="flex justify-between"><span>Montant HT</span><span className="font-semibold">{montantHT.toLocaleString()} Ar</span></div>
              <div className="flex justify-between"><span>TVA ({form.tva}%)</span><span>{(montantTTC - montantHT).toLocaleString()} Ar</span></div>
              <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t"><span>Total TTC</span><span className="text-primary">{montantTTC.toLocaleString()} Ar</span></div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setModal(false)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={creer} className="btn-primary">Créer le devis</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Devis
