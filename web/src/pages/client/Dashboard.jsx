import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import {
  MdDirectionsCar, MdEventNote, MdReceipt, MdLogout,
  MdBuild, MdAdd, MdArrowForward, MdCheckCircle,
  MdAccessTime, MdCancel, MdDescription, MdSettings, MdWarning
} from 'react-icons/md'

const statusConfig = {
  en_attente: { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700', icon: <MdAccessTime size={13} /> },
  confirme:   { label: 'Confirmé',    color: 'bg-green-100 text-green-700',   icon: <MdCheckCircle size={13} /> },
  annule:     { label: 'Annulé',      color: 'bg-red-100 text-red-700',       icon: <MdCancel size={13} /> },
  termine:    { label: 'Terminé',     color: 'bg-gray-100 text-gray-600',     icon: <MdCheckCircle size={13} /> },
}

const Badge = ({ statut }) => {
  const s = statusConfig[statut] || { label: statut, color: 'bg-gray-100 text-gray-600', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}>
      {s.icon}{s.label}
    </span>
  )
}

const ClientDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profil, setProfil]     = useState(null)
  const [vehicules, setVehicules] = useState([])
  const [rdvs, setRdvs]         = useState([])
  const [factures, setFactures] = useState([])

  useEffect(() => {
    api.get('/client/profil').then(r => setProfil(r.data)).catch(() => {})
    api.get('/client/vehicules').then(r => setVehicules(r.data)).catch(() => {})
    api.get('/client/rendezvous').then(r => setRdvs(r.data)).catch(() => {})
    api.get('/client/factures').then(r => setFactures(r.data)).catch(() => {})
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const facturesImpayees = factures.filter(f => f.statut !== 'payee').length
  const rdvActif = rdvs.find(r => r.statut === 'confirme' || r.statut === 'en_attente')

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MdDirectionsCar size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">DiagAuto Connect</h1>
              <p className="text-blue-200 text-xs">Espace Client</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
            <MdLogout size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-4">

        {profil && !profil.whatsapp && (
          <Link to="/parametres" className="bg-green-50 border border-green-300 text-green-900 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="flex-1">
              <p className="font-bold">Ampidiro ny numéro WhatsApp anao</p>
              <p className="text-sm">Mba handraisanao facture numérique sy validation automatique.</p>
            </div>
            <MdArrowForward size={20} className="shrink-0" />
          </Link>
        )}

        <Link to="/urgence" className="bg-red-700 hover:bg-red-800 text-white rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-13 h-13 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <MdWarning size={30} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg leading-tight">Dépannage urgence</p>
            <p className="text-sm text-red-100">Route nationale ou hors Antananarivo</p>
          </div>
          <MdArrowForward size={22} className="text-white/80 shrink-0" />
        </Link>

        {/* Carte bienvenue */}
        <div className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm mb-1">Bonjour,</p>
              <h2 className="text-xl font-bold">
                {profil ? `${profil.prenom} ${profil.nom}` : '...'}
              </h2>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5">
                <MdDescription size={14} className="text-blue-200" />
                <span className="text-xs font-mono font-bold tracking-wider">
                  {profil?.id_client || '---'}
                </span>
              </div>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <MdDirectionsCar size={36} className="text-white/70" />
            </div>
          </div>

          {/* Prochain RDV */}
          {rdvActif && (
            <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-xs mb-0.5">Prochain rendez-vous</p>
                <p className="text-white text-sm font-semibold">
                  {new Date(rdvActif.date_rdv).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} — {rdvActif.heure_rdv}
                </p>
              </div>
              <Badge statut={rdvActif.statut} />
            </div>
          )}
        </div>

        {/* Chiffres rapides */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <MdDirectionsCar size={22} />, val: vehicules.length, label: 'Véhicule(s)', color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: <MdEventNote size={22} />,     val: rdvs.length,      label: 'Rendez-vous', color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: <MdReceipt size={22} />,       val: facturesImpayees, label: 'Impayée(s)',  color: facturesImpayees > 0 ? 'text-red-600' : 'text-green-600', bg: facturesImpayees > 0 ? 'bg-red-50' : 'bg-green-50' },
          ].map(({ icon, val, label, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <span className={color}>{icon}</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Menu rapide */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/rendezvous" className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 group">
            <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <MdEventNote size={22} className="text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">Rendez-vous</p>
              <p className="text-xs text-gray-400">Prendre / voir</p>
            </div>
            <MdArrowForward size={16} className="text-gray-300 group-hover:text-primary transition-colors shrink-0" />
          </Link>

          <Link to="/vehicules" className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 group">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <MdDirectionsCar size={22} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">Mes véhicules</p>
              <p className="text-xs text-gray-400">Gérer</p>
            </div>
            <MdArrowForward size={16} className="text-gray-300 group-hover:text-primary transition-colors shrink-0" />
          </Link>

          <Link to="/factures" className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 group">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <MdReceipt size={22} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">Mes factures</p>
              <p className="text-xs text-gray-400">Historique</p>
            </div>
            <MdArrowForward size={16} className="text-gray-300 group-hover:text-primary transition-colors shrink-0" />
          </Link>

          <Link to="/parametres" className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 group">
            <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <MdSettings size={22} className="text-gray-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">Paramètres</p>
              <p className="text-xs text-gray-400">Compte</p>
            </div>
            <MdArrowForward size={16} className="text-gray-300 group-hover:text-primary transition-colors shrink-0" />
          </Link>
        </div>

        {/* Derniers RDV */}
        {rdvs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Rendez-vous récents</h3>
              <Link to="/rendezvous" className="text-xs text-primary hover:underline">Voir tout</Link>
            </div>
            <div className="flex flex-col gap-2">
              {rdvs.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <MdDirectionsCar size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.marque} {r.modele}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(r.date_rdv).toLocaleDateString('fr-FR')} — {r.heure_rdv}
                      </p>
                    </div>
                  </div>
                  <Badge statut={r.statut} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dernières factures */}
        {factures.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Dernières factures</h3>
              <Link to="/factures" className="text-xs text-primary hover:underline">Voir tout</Link>
            </div>
            <div className="flex flex-col gap-2">
              {factures.slice(0, 3).map(f => (
                <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                      <MdReceipt size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 font-mono">{f.numero_facture}</p>
                      <p className="text-xs text-gray-400">{new Date(f.date_facture).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{Number(f.montant_ttc).toLocaleString()} Ar</p>
                    <span className={`text-xs font-semibold ${f.statut === 'payee' ? 'text-green-600' : 'text-red-500'}`}>
                      {f.statut === 'payee' ? '✓ Payée' : '⚠ Impayée'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default ClientDashboard
