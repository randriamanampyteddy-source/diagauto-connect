import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  MdArticle, MdBuild, MdClose, MdDashboard, MdDescription, MdEventNote,
  MdLogout, MdManageAccounts, MdMenu, MdPeople, MdReceipt, MdSettings, MdWarning
} from 'react-icons/md'

const primaryLinks = [
  { to: '/dashboard', icon: MdDashboard, label: 'Accueil' },
  { to: '/rendezvous', icon: MdEventNote, label: 'Rendez-vous' },
  { to: '/interventions', icon: MdBuild, label: 'Interventions' },
  { to: '/urgences', icon: MdWarning, label: 'Urgences' },
]

const menuLinks = [
  { to: '/clients', icon: MdPeople, label: 'Clients' },
  { to: '/devis', icon: MdDescription, label: 'Devis' },
  { to: '/proformas', icon: MdArticle, label: 'Proformas' },
  { to: '/factures', icon: MdReceipt, label: 'Factures' },
  { to: '/parametres', icon: MdSettings, label: 'Paramètres' },
  { to: '/mon-compte', icon: MdManageAccounts, label: 'Mon compte' },
]

const AdminMobileNav = () => {
  const [open, setOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {open && (
        <div className="mobile-menu-backdrop" onClick={() => setOpen(false)}>
          <section className="mobile-menu-sheet" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu-title">
              <div>
                <strong>Menu administration</strong>
                <span>DiagAuto Mada</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fermer"><MdClose size={22} /></button>
            </div>
            <div className="mobile-menu-grid">
              {menuLinks.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setOpen(false)}>
                  <Icon size={24} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
            <button className="mobile-logout" onClick={handleLogout}>
              <MdLogout size={20} /> Déconnexion
            </button>
          </section>
        </div>
      )}

      <nav className="admin-mobile-nav">
        {primaryLinks.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className={open ? 'active' : ''} onClick={() => setOpen(true)}>
          <MdMenu size={23} />
          <span>Menu</span>
        </button>
      </nav>
    </>
  )
}

export default AdminMobileNav
