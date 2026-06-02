import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

import ClientLogin from './pages/client/Login'
import Register from './pages/client/Register'
import ClientDashboard from './pages/client/Dashboard'
import ClientVehicules from './pages/client/Vehicules'
import ClientRendezvous from './pages/client/Rendezvous'
import ClientFactures from './pages/client/Factures'

// App client UNIQUEMENT — aucune route admin n'existe ici
function AppClient() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<Navigate to="/login" replace />} />
          <Route path="/login"     element={<ClientLogin />} />
          <Route path="/register"  element={<Register />} />

          <Route path="/dashboard"  element={<PrivateRoute role="client"><ClientDashboard /></PrivateRoute>} />
          <Route path="/vehicules"  element={<PrivateRoute role="client"><ClientVehicules /></PrivateRoute>} />
          <Route path="/rendezvous" element={<PrivateRoute role="client"><ClientRendezvous /></PrivateRoute>} />
          <Route path="/factures"   element={<PrivateRoute role="client"><ClientFactures /></PrivateRoute>} />

          {/* Toute URL inconnue → login client */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default AppClient
