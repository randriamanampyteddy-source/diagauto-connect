import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  MdDashboard, MdPeople, MdEventNote, MdBuild,
  MdDescription, MdReceipt, MdArticle, MdLogout
} from 'react-icons/md'

const links = [
  { to: '/admin/dashboard', icon: <MdDashboard size={20} />, label: 'Tableau de bord' },
  { to: '/admin/clients', icon: <MdPeople size={20} />, label: 'Clients' },
  { to: '/admin/rendezvous', icon: <MdEventNote size={20} />, label: 'Rendez-vous' },
  { to: '/admin/interventions', icon: <MdBuild size={20} />, label: 'Interventions' },
  { to: '/admin/devis', icon: <MdDescription size={20} />, label: 'Devis' },
  { to: '/admin/proformas', icon: <MdArticle size={20} />, label: 'Proforma' },
  { to: '/admin/factures', icon: <MdReceipt size={20} />, label: 'Factures' },
]

const AdminSidebar = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="w-64 min-h-screen bg-primary flex flex-col py-6 px-3 fixed left-0 top-0 z-40">
      <div className="text-center mb-8">
        <h1 className="text-white text-xl font-bold">DiagAuto</h1>
        <p className="text-blue-200 text-xs mt-1">Espace Admin</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {icon}
            <span className="text-sm">{label}</span>
          </NavLink>
        ))}
      </nav>

      <button onClick={handleLogout} className="sidebar-link mt-4 text-red-300 hover:text-red-100">
        <MdLogout size={20} />
        <span className="text-sm">Déconnexion</span>
      </button>
    </aside>
  )
}

export default AdminSidebar
