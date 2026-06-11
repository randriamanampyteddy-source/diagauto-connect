import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import ClientUrgenceNotification from './components/ClientUrgenceNotification'
import ClientRdvNotification from './components/ClientRdvNotification'
import ClientMobileNav from './components/ClientMobileNav'

import ClientLogin from './pages/client/Login'
import Register from './pages/client/Register'
import ClientDashboard from './pages/client/Dashboard'
import ClientVehicules from './pages/client/Vehicules'
import ClientRendezvous from './pages/client/Rendezvous'
import ClientFactures from './pages/client/Factures'
import DocumentImprimer from './pages/DocumentImprimer'
import ClientParametres from './pages/client/Parametres'
import ClientUrgence from './pages/client/Urgence'

// Gestion bouton retour Android (hardware back button)
const AndroidBackHandler = () => {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const noBackRoutes = ['/dashboard', '/login', '/register']

    const handleBack = (e) => {
      if (e && e.preventDefault) e.preventDefault()

      const path = location.pathname

      // Sur la page de connexion ou dashboard → minimiser l'app (ne pas quitter)
      if (noBackRoutes.includes(path)) {
        if (window.Capacitor?.Plugins?.App?.minimizeApp) {
          window.Capacitor.Plugins.App.minimizeApp()
        } else if (window.Capacitor?.Plugins?.App?.exitApp) {
          window.Capacitor.Plugins.App.exitApp()
        }
        return
      }

      // Sur les autres pages → retour React Router
      navigate(-1)
    }

    // Capacitor / Cordova hardware back button
    document.addEventListener('backbutton', handleBack, false)

    return () => {
      document.removeEventListener('backbutton', handleBack, false)
    }
  }, [navigate, location.pathname])

  return null
}

// App client UNIQUEMENT — aucune route admin n'existe ici
function AppClient() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AndroidBackHandler />
        <ClientUrgenceNotification />
        <ClientRdvNotification />
        <Routes>
          <Route path="/"          element={<Navigate to="/login" replace />} />
          <Route path="/login"     element={<ClientLogin />} />
          <Route path="/register"  element={<Register />} />

          <Route path="/dashboard"  element={<PrivateRoute role="client"><ClientDashboard /></PrivateRoute>} />
          <Route path="/vehicules"  element={<PrivateRoute role="client"><ClientVehicules /></PrivateRoute>} />
          <Route path="/rendezvous" element={<PrivateRoute role="client"><ClientRendezvous /></PrivateRoute>} />
          <Route path="/factures"   element={<PrivateRoute role="client"><ClientFactures /></PrivateRoute>} />
          <Route path="/urgence"    element={<PrivateRoute role="client"><ClientUrgence /></PrivateRoute>} />
          <Route path="/parametres" element={<PrivateRoute role="client"><ClientParametres /></PrivateRoute>} />
          <Route path="/documents/:type/:id/imprimer" element={<PrivateRoute role="client"><DocumentImprimer scope="client" /></PrivateRoute>} />

          {/* Toute URL inconnue → login client */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ClientMobileNav />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default AppClient
