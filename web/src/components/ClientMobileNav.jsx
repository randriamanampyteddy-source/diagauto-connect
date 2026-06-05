import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MdDashboard, MdDirectionsCar, MdEventNote, MdReceipt, MdWarning } from 'react-icons/md'

const links = [
  { to: '/dashboard', icon: MdDashboard, label: 'Accueil' },
  { to: '/vehicules', icon: MdDirectionsCar, label: 'Véhicules' },
  { to: '/rendezvous', icon: MdEventNote, label: 'Rendez-vous' },
  { to: '/factures', icon: MdReceipt, label: 'Documents' },
  { to: '/urgence', icon: MdWarning, label: 'Urgence', urgent: true },
]

const ClientMobileNav = () => {
  const { pathname } = useLocation()
  const hidden = ['/login', '/register'].includes(pathname) || pathname.startsWith('/documents/')

  useEffect(() => {
    document.body.classList.toggle('has-client-mobile-nav', !hidden)
    return () => document.body.classList.remove('has-client-mobile-nav')
  }, [hidden])

  if (hidden) return null

  return (
    <nav className="client-mobile-nav">
      {links.map(({ to, icon: Icon, label, urgent }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `${isActive ? 'active' : ''} ${urgent ? 'urgent' : ''}`}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default ClientMobileNav
