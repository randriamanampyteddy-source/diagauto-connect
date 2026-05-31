import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../api/axios'
import { MdPeople, MdEventNote, MdBuild, MdReceipt, MdHourglassEmpty, MdAttachMoney } from 'react-icons/md'

const StatCard = ({ icon, label, value, color }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
)

const statusBadge = (statut) => {
  const map = {
    en_attente: 'bg-yellow-100 text-yellow-700',
    confirme: 'bg-green-100 text-green-700',
    annule: 'bg-red-100 text-red-700',
    termine: 'bg-gray-100 text-gray-700',
  }
  const labels = { en_attente: 'En attente', confirme: 'Confirmé', annule: 'Annulé', termine: 'Terminé' }
  return <span className={`badge ${map[statut] || 'bg-gray-100'}`}>{labels[statut] || statut}</span>
}

const Dashboard = () => {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data)).catch(() => {})
  }, [])

  if (!stats) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<MdPeople size={24} className="text-white" />} label="Clients actifs" value={stats.total_clients} color="bg-blue-500" />
        <StatCard icon={<MdHourglassEmpty size={24} className="text-white" />} label="En attente validation" value={stats.clients_en_attente} color="bg-yellow-500" />
        <StatCard icon={<MdEventNote size={24} className="text-white" />} label="RDV aujourd'hui" value={stats.rdv_aujourd_hui} color="bg-purple-500" />
        <StatCard icon={<MdBuild size={24} className="text-white" />} label="Interventions en cours" value={stats.interventions_en_cours} color="bg-orange-500" />
        <StatCard icon={<MdReceipt size={24} className="text-white" />} label="Factures non payées" value={stats.factures_non_payees} color="bg-red-500" />
        <StatCard icon={<MdAttachMoney size={24} className="text-white" />} label="CA ce mois (Ar)" value={Number(stats.chiffre_affaires_mois).toLocaleString()} color="bg-green-500" />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Derniers rendez-vous</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-3 rounded-l-lg">Client</th>
                <th className="text-left px-4 py-3">Véhicule</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Heure</th>
                <th className="text-left px-4 py-3 rounded-r-lg">Statut</th>
              </tr>
            </thead>
            <tbody>
              {stats.rdv_recents.map(rdv => (
                <tr key={rdv.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{rdv.prenom} {rdv.nom}</td>
                  <td className="px-4 py-3 text-gray-600">{rdv.marque} {rdv.modele}</td>
                  <td className="px-4 py-3">{new Date(rdv.date_rdv).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">{rdv.heure_rdv}</td>
                  <td className="px-4 py-3">{statusBadge(rdv.statut)}</td>
                </tr>
              ))}
              {stats.rdv_recents.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucun rendez-vous</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Dashboard
