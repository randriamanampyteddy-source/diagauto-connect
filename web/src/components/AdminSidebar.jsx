import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { playUrgenceSound } from '../utils/alertSound'
import {
  MdDashboard, MdPeople, MdEventNote, MdBuild,
  MdDescription, MdReceipt, MdArticle, MdLogout, MdManageAccounts, MdSettings, MdWarning
} from 'react-icons/md'

const links = [
  { to: '/dashboard', icon: <MdDashboard size={20} />, label: 'Tableau de bord' },
  { to: '/clients', icon: <MdPeople size={20} />, label: 'Clients' },
  { to: '/rendezvous', icon: <MdEventNote size={20} />, label: 'Rendez-vous' },
  { to: '/interventions', icon: <MdBuild size={20} />, label: 'Interventions' },
  { to: '/urgences', icon: <MdWarning size={20} />, label: 'Urgences', urgent: true },
  { to: '/devis', icon: <MdDescription size={20} />, label: 'Devis' },
  { to: '/proformas', icon: <MdArticle size={20} />, label: 'Proforma' },
  { to: '/factures', icon: <MdReceipt size={20} />, label: 'Factures' },
  { to: '/parametres', icon: <MdSettings size={20} />, label: 'Paramètres' },
  { to: '/mon-compte', icon: <MdManageAccounts size={20} />, label: 'Mon compte' },
]

const AdminSidebar = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [nouvelles, setNouvelles] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const load = () => {
      api.get('/admin/urgences/stats').then(r => {
        const n = Number(r.data.nouvelles) || 0
        setNouvelles(n)
      }).catch(() => {})
    }
    load()
    const timer = setInterval(load, 3000)
    window.addEventListener('urgences-refresh', load)
    return () => {
      clearInterval(timer)
      window.removeEventListener('urgences-refresh', load)
    }
  }, [])

  useEffect(() => {
    const activate = () => setReady(true)
    window.addEventListener('pointerdown', activate, { once: true })
    window.addEventListener('keydown', activate, { once: true })
    return () => {
      window.removeEventListener('pointerdown', activate)
      window.removeEventListener('keydown', activate)
    }
  }, [])

  useEffect(() => {
    if (!ready || nouvelles <= 0) return
    playUrgenceSound()
    const alarm = setInterval(playUrgenceSound, 2800)
    return () => clearInterval(alarm)
  }, [ready, nouvelles])

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <aside onClick={() => setReady(true)} className="admin-sidebar w-64 min-h-screen bg-primary flex flex-col py-6 px-3 fixed left-0 top-0 z-40">
      <div className="text-center mb-8">
        <h1 className="text-white text-xl font-bold">DiagAuto</h1>
        <p className="text-blue-200 text-xs mt-1">Espace Admin</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {links.map(({ to, icon, label, urgent }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {icon}
            <span className="text-sm">{label}</span>
            {urgent && nouvelles > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                {nouvelles}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <button onClick={handleLogout} className="sidebar-link mt-2 text-red-300 hover:text-red-100 border-t border-white/10 pt-3">
        <MdLogout size={20} />
        <span className="text-sm">Déconnexion</span>
      </button>
    </aside>
  )
}

export default AdminSidebar
