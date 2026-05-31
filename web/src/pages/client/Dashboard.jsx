import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { MdDirectionsCar, MdEventNote, MdReceipt, MdLogout, MdPerson } from 'react-icons/md'

const statusBadge = (statut) => {
  const map = {
    en_attente: 'bg-yellow-100 text-yellow-700',
    confirme: 'bg-green-100 text-green-700',
    annule: 'bg-red-100 text-red-700',
    termine: 'bg-gray-100 text-gray-600',
  }
  const labels = { en_attente: 'En attente', confirme: 'Confirmé', annule: 'Annulé', termine: 'Terminé' }
  return <span className={`badge ${map[statut]}`}>{labels[statut] || statut}</span>
}

const ClientDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)
  const [vehicules, setVehicules] = useState([])
  const [rdvs, setRdvs] = useState([])
  const [factures, setFactures] = useState([])

  useEffect(() => {
    api.get('/client/profil').then(r => setProfil(r.data))
    api.get('/client/vehicules').then(r => setVehicules(r.data))
    api.get('/client/rendezvous').then(r => setRdvs(r.data))
    api.get('/client/factures').then(r => setFactures(r.data))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MdDirectionsCar size={28} />
          <div>
            <h1 className="font-bold text-lg">DiagAuto Connect</h1>
            <p className="text-blue-200 text-xs">Espace Client</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-medium">{user?.prenom} {user?.nom}</p>
            <p className="text-blue-200 text-xs">{user?.id_client}</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-white/10">
            <MdLogout size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
        {/* Carte profil */}
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <MdPerson size={28} className="text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-lg">{profil?.prenom} {profil?.nom}</h2>
            <p className="text-gray-500 text-sm">{profil?.email}</p>
            <span className="badge bg-primary/10 text-primary text-xs mt-1 inline-block">{profil?.id_client}</span>
          </div>
        </div>

        {/* Mes véhicules */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><MdDirectionsCar /> Mes véhicules ({vehicules.length})</h2>
            <Link to="/client/vehicules" className="text-primary text-sm hover:underline">Gérer</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicules.slice(0, 4).map(v => (
              <div key={v.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <MdDirectionsCar size={24} className="text-primary" />
                <div>
                  <p className="font-semibold text-gray-800">{v.marque} {v.modele}</p>
                  <p className="text-xs text-gray-400">{v.immatriculation} {v.annee ? `• ${v.annee}` : ''}</p>
                </div>
              </div>
            ))}
            {vehicules.length === 0 && <p className="text-gray-400 text-sm col-span-2">Aucun véhicule enregistré</p>}
          </div>
        </div>

        {/* Mes rendez-vous */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><MdEventNote /> Mes rendez-vous</h2>
            <Link to="/client/rendezvous" className="text-primary text-sm hover:underline">Voir tout</Link>
          </div>
          <div className="flex flex-col gap-2">
            {rdvs.slice(0, 3).map(r => (
              <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-gray-800">{r.marque} {r.modele}</p>
                  <p className="text-xs text-gray-400">{new Date(r.date_rdv).toLocaleDateString('fr-FR')} à {r.heure_rdv}</p>
                </div>
                {statusBadge(r.statut)}
              </div>
            ))}
            {rdvs.length === 0 && <p className="text-gray-400 text-sm">Aucun rendez-vous</p>}
          </div>
        </div>

        {/* Mes factures */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><MdReceipt /> Mes factures</h2>
            <Link to="/client/factures" className="text-primary text-sm hover:underline">Voir tout</Link>
          </div>
          <div className="flex flex-col gap-2">
            {factures.slice(0, 3).map(f => (
              <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-gray-800">{f.numero_facture}</p>
                  <p className="text-xs text-gray-400">{new Date(f.date_facture).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{Number(f.montant_ttc).toLocaleString()} Ar</p>
                  <span className={`badge text-xs ${f.statut === 'payee' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {f.statut === 'payee' ? 'Payée' : 'Non payée'}
                  </span>
                </div>
              </div>
            ))}
            {factures.length === 0 && <p className="text-gray-400 text-sm">Aucune facture</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientDashboard
