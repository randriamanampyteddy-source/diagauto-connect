import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdDirectionsCar, MdAdd, MdArrowBack, MdLocalGasStation } from 'react-icons/md'
import { CATALOGUE, MARQUES, ENERGIES } from '../../data/catalogue'

const Vehicules = () => {
  const [vehicules, setVehicules] = useState([])
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState({
    marque: '', modele: '', annee: '', immatriculation: '', couleur: '', energie: ''
  })

  const load = () => api.get('/client/vehicules').then(r => setVehicules(r.data))
  useEffect(() => { load() }, [])

  // Modèles selon marque choisie (ou tous si marque non reconnue)
  const modelesSuggeres = CATALOGUE[form.marque] || []

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const ajouter = async (e) => {
    e.preventDefault()
    try {
      await api.post('/client/vehicules', form)
      toast.success('Véhicule ajouté !')
      setModal(false)
      setForm({ marque: '', modele: '', annee: '', immatriculation: '', couleur: '', energie: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white px-4 py-4 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <MdArrowBack size={20} />
          </Link>
          <h1 className="font-bold text-lg">Mes véhicules</h1>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm transition-colors"
        >
          <MdAdd size={18} /> Ajouter
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vehicules.map(v => (
            <div key={v.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <MdDirectionsCar size={26} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800">{v.marque} {v.modele}</h3>
                <p className="text-sm font-mono text-primary font-semibold">{v.immatriculation}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {v.annee   && <span className="text-xs text-gray-400">{v.annee}</span>}
                  {v.couleur && <span className="text-xs text-gray-400">{v.couleur}</span>}
                  {v.energie && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MdLocalGasStation size={11} />{v.energie}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {vehicules.length === 0 && (
            <div className="col-span-2 text-center py-16 text-gray-300">
              <MdDirectionsCar size={52} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun véhicule enregistré</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ajout véhicule ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Ajouter un véhicule</h2>

            <form onSubmit={ajouter} className="flex flex-col gap-3">

              {/* Marque — datalist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marque *</label>
                <input
                  list="liste-marques"
                  className="input"
                  placeholder="Ex: Toyota, Mitsubishi..."
                  value={form.marque}
                  onChange={e => { set('marque', e.target.value); set('modele', '') }}
                  required
                />
                <datalist id="liste-marques">
                  {MARQUES.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>

              {/* Modèle — datalist filtré par marque */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modèle *</label>
                <input
                  list="liste-modeles"
                  className="input"
                  placeholder="Ex: Hilux, L200..."
                  value={form.modele}
                  onChange={e => set('modele', e.target.value)}
                  required
                />
                <datalist id="liste-modeles">
                  {modelesSuggeres.map(m => <option key={m} value={m} />)}
                </datalist>
                {form.marque && modelesSuggeres.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Choisissez dans la liste ou tapez librement
                  </p>
                )}
              </div>

              {/* Immatriculation — libre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation *</label>
                <input
                  className="input uppercase tracking-widest font-mono"
                  placeholder="Ex: 1234 TAA"
                  value={form.immatriculation}
                  onChange={e => set('immatriculation', e.target.value.toUpperCase())}
                  required
                />
              </div>

              {/* Énergie — select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Énergie / Carburant</label>
                <select
                  className="input"
                  value={form.energie}
                  onChange={e => set('energie', e.target.value)}
                >
                  <option value="">— Choisir —</option>
                  {ENERGIES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              {/* Année + Couleur */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Ex: 2018"
                    min="1970"
                    max={new Date().getFullYear() + 1}
                    value={form.annee}
                    onChange={e => set('annee', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                  <input
                    className="input"
                    placeholder="Ex: Blanc"
                    value={form.couleur}
                    onChange={e => set('couleur', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary py-2.5">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Vehicules
