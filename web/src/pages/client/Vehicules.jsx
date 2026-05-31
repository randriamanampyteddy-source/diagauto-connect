import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdDirectionsCar, MdAdd, MdArrowBack } from 'react-icons/md'

const Vehicules = () => {
  const { user, logout } = useAuth()
  const [vehicules, setVehicules] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ marque: '', modele: '', annee: '', immatriculation: '', couleur: '' })

  const load = () => api.get('/client/vehicules').then(r => setVehicules(r.data))
  useEffect(() => { load() }, [])

  const ajouter = async (e) => {
    e.preventDefault()
    try {
      await api.post('/client/vehicules', form)
      toast.success('Véhicule ajouté')
      setModal(false)
      setForm({ marque: '', modele: '', annee: '', immatriculation: '', couleur: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/client/dashboard" className="p-2 rounded-lg hover:bg-white/10"><MdArrowBack size={20} /></Link>
          <h1 className="font-bold text-lg">Mes véhicules</h1>
        </div>
        <button onClick={() => setModal(true)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <MdAdd size={18} /> Ajouter
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vehicules.map(v => (
            <div key={v.id} className="card flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <MdDirectionsCar size={28} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{v.marque} {v.modele}</h3>
                <p className="text-sm text-gray-500">{v.immatriculation}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  {v.annee && <span>Année: {v.annee}</span>}
                  {v.couleur && <span>Couleur: {v.couleur}</span>}
                </div>
              </div>
            </div>
          ))}
          {vehicules.length === 0 && (
            <div className="col-span-2 text-center py-16 text-gray-400">
              <MdDirectionsCar size={48} className="mx-auto mb-3 opacity-30" />
              <p>Aucun véhicule enregistré</p>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Ajouter un véhicule</h2>
            <form onSubmit={ajouter} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Marque *</label>
                  <input className="input" value={form.marque} onChange={e => setForm(f => ({ ...f, marque: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Modèle *</label>
                  <input className="input" value={form.modele} onChange={e => setForm(f => ({ ...f, modele: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Année</label>
                  <input type="number" className="input" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Couleur</label>
                  <input className="input" value={form.couleur} onChange={e => setForm(f => ({ ...f, couleur: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Immatriculation *</label>
                <input className="input uppercase" value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value.toUpperCase() }))} required />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="btn-primary">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Vehicules
