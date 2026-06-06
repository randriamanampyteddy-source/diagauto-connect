import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import {
  MdPeople, MdEventNote, MdBuild, MdReceipt,
  MdHourglassEmpty, MdTrendingUp, MdDirectionsCar, MdCheckCircle
} from 'react-icons/md'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#1e3a5f', '#e63946', '#f4a261', '#2a9d8f']

const StatCard = ({ icon, label, value, sub, color, bg }) => (
  <div className="card flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${bg}`}>
      <span className={color}>{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-500 truncate">{label}</p>
      <p className="text-3xl font-bold text-gray-800 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

const statusColor = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  confirme:   'bg-green-100 text-green-700',
  annule:     'bg-red-100 text-red-700',
  termine:    'bg-gray-100 text-gray-600',
}
const statusLabel = {
  en_attente: 'En attente', confirme: 'Confirmé', annule: 'Annulé', termine: 'Terminé'
}

const interventionStatusColor = {
  en_cours: 'bg-blue-100 text-blue-700',
  termine: 'bg-green-100 text-green-700',
  suspendu: 'bg-red-100 text-red-700',
}
const interventionStatusLabel = {
  en_cours: 'En cours',
  termine: 'Termine',
  suspendu: 'Annule',
}

const Dashboard = () => {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data)).catch(() => {})
  }, [])

  if (!stats) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Chargement du tableau de bord...</p>
      </div>

    </AdminLayout>
  )

  // Données pour graphiques
  const pieData = [
    { name: 'Actifs',     value: Number(stats.total_clients) },
    { name: 'En attente', value: Number(stats.clients_en_attente) },
    { name: 'RDV aujourd\'hui', value: Number(stats.rdv_aujourd_hui) },
    { name: 'Interventions', value: Number(stats.interventions_en_cours) },
  ].filter(d => d.value > 0)

  const caFormate = new Intl.NumberFormat('fr-MG').format(Number(stats.chiffre_affaires_mois))

  return (
    <AdminLayout>
      {/* Titre */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          <MdCheckCircle className="text-green-500" size={18} />
          <span className="text-sm text-green-700 font-medium">Système opérationnel</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<MdPeople size={26} />} label="Clients actifs" value={stats.total_clients}
          sub={`${stats.clients_en_attente} en attente`}
          color="text-blue-600" bg="bg-blue-50"
        />
        <StatCard
          icon={<MdEventNote size={26} />} label="RDV aujourd'hui" value={stats.rdv_aujourd_hui}
          sub={`${stats.rdv_en_attente} à confirmer`}
          color="text-purple-600" bg="bg-purple-50"
        />
        <StatCard
          icon={<MdBuild size={26} />} label="Interventions en cours" value={stats.interventions_en_cours}
          sub="En atelier"
          color="text-orange-600" bg="bg-orange-50"
        />
        <StatCard
          icon={<MdTrendingUp size={26} />} label="CA ce mois" value={`${caFormate} Ar`}
          sub={`${stats.factures_non_payees} facture(s) impayée(s)`}
          color="text-green-600" bg="bg-green-50"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Pie chart */}
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Vue d'ensemble</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, '']} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-300">
              <div className="text-center">
                <MdDirectionsCar size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune donnée</p>
              </div>
            </div>
          )}
        </div>

        {/* Activité récente — placeholder area chart */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-gray-700 mb-4">Activité (7 derniers jours)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={[
              { j: 'Lun', rdv: 2, int: 1 },
              { j: 'Mar', rdv: 4, int: 2 },
              { j: 'Mer', rdv: 3, int: 3 },
              { j: 'Jeu', rdv: 5, int: 2 },
              { j: 'Ven', rdv: 6, int: 4 },
              { j: 'Sam', rdv: 3, int: 1 },
              { j: 'Dim', rdv: 1, int: 0 },
            ]}>
              <defs>
                <linearGradient id="gRdv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gInt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f4a261" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f4a261" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="j" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="rdv" name="Rendez-vous" stroke="#1e3a5f" strokeWidth={2} fill="url(#gRdv)" />
              <Area type="monotone" dataKey="int" name="Interventions" stroke="#f4a261" strokeWidth={2} fill="url(#gInt)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Derniers RDV */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Derniers rendez-vous</h2>
          <a href="/rendezvous" className="text-sm text-primary hover:underline">Voir tout →</a>
        </div>
        {stats.rdv_recents.length === 0 ? (
          <div className="text-center py-10 text-gray-300">
            <MdEventNote size={40} className="mx-auto mb-2" />
            <p className="text-sm">Aucun rendez-vous</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 text-gray-500 font-medium">Client</th>
                  <th className="text-left pb-3 text-gray-500 font-medium">Véhicule</th>
                  <th className="text-left pb-3 text-gray-500 font-medium">Date & heure</th>
                  <th className="text-left pb-3 text-gray-500 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {stats.rdv_recents.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-gray-800">{r.prenom} {r.nom}</td>
                    <td className="py-3 text-gray-500">{r.marque} {r.modele}</td>
                    <td className="py-3 text-gray-500">
                      {new Date(r.date_rdv).toLocaleDateString('fr-FR')} — {r.heure_rdv}
                    </td>
                    <td className="py-3">
                      <span className={`badge ${statusColor[r.statut] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel[r.statut] || r.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Dernieres interventions</h2>
          <a href="/interventions" className="text-sm text-primary hover:underline">Voir tout</a>
        </div>
        {!stats.interventions_recentes?.length ? (
          <div className="text-center py-10 text-gray-300">
            <MdBuild size={40} className="mx-auto mb-2" />
            <p className="text-sm">Aucune intervention</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 text-gray-500 font-medium">Client</th>
                  <th className="text-left pb-3 text-gray-500 font-medium">Vehicule</th>
                  <th className="text-left pb-3 text-gray-500 font-medium">Intervention</th>
                  <th className="text-left pb-3 text-gray-500 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {stats.interventions_recentes.map(i => (
                  <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-gray-800">{i.prenom} {i.nom}</td>
                    <td className="py-3 text-gray-500">{i.marque} {i.modele}<br /><span className="text-xs font-mono text-gray-400">{i.immatriculation}</span></td>
                    <td className="py-3 text-gray-500 max-w-md truncate">{i.description}</td>
                    <td className="py-3">
                      <span className={`badge ${interventionStatusColor[i.statut] || 'bg-gray-100 text-gray-600'}`}>
                        {interventionStatusLabel[i.statut] || i.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default Dashboard
