import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import ClientUrgenceNotification from './components/ClientUrgenceNotification'

// Pages publiques
import Home from './pages/Home'
import ClientLogin from './pages/client/Login'
import Register from './pages/client/Register'
import AdminLogin from './pages/admin/Login'

// Pages admin
import AdminDashboard from './pages/admin/Dashboard'
import Clients from './pages/admin/Clients'
import Rendezvous from './pages/admin/Rendezvous'
import Interventions from './pages/admin/Interventions'
import Devis from './pages/admin/Devis'
import Proforma from './pages/admin/Proforma'
import Factures from './pages/admin/Factures'
import DocumentImprimer from './pages/DocumentImprimer'
import Parametres from './pages/admin/Parametres'
import Urgences from './pages/admin/Urgences'

// Pages client
import ClientDashboard from './pages/client/Dashboard'
import ClientVehicules from './pages/client/Vehicules'
import ClientRendezvous from './pages/client/Rendezvous'
import ClientFactures from './pages/client/Factures'
import ClientParametres from './pages/client/Parametres'
import ClientUrgence from './pages/client/Urgence'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ClientUrgenceNotification />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<ClientLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/clients" element={<PrivateRoute role="admin"><Clients /></PrivateRoute>} />
          <Route path="/admin/rendezvous" element={<PrivateRoute role="admin"><Rendezvous /></PrivateRoute>} />
          <Route path="/admin/interventions" element={<PrivateRoute role="admin"><Interventions /></PrivateRoute>} />
          <Route path="/admin/urgences" element={<PrivateRoute role="admin"><Urgences /></PrivateRoute>} />
          <Route path="/admin/devis" element={<PrivateRoute role="admin"><Devis /></PrivateRoute>} />
          <Route path="/admin/proformas" element={<PrivateRoute role="admin"><Proforma /></PrivateRoute>} />
          <Route path="/admin/factures" element={<PrivateRoute role="admin"><Factures /></PrivateRoute>} />
          <Route path="/admin/parametres" element={<PrivateRoute role="admin"><Parametres /></PrivateRoute>} />
          <Route path="/admin/documents/:type/:id/imprimer" element={<PrivateRoute role="admin"><DocumentImprimer scope="admin" /></PrivateRoute>} />

          {/* Client */}
          <Route path="/client/dashboard" element={<PrivateRoute role="client"><ClientDashboard /></PrivateRoute>} />
          <Route path="/client/vehicules" element={<PrivateRoute role="client"><ClientVehicules /></PrivateRoute>} />
          <Route path="/client/rendezvous" element={<PrivateRoute role="client"><ClientRendezvous /></PrivateRoute>} />
          <Route path="/client/factures" element={<PrivateRoute role="client"><ClientFactures /></PrivateRoute>} />
          <Route path="/client/urgence" element={<PrivateRoute role="client"><ClientUrgence /></PrivateRoute>} />
          <Route path="/client/parametres" element={<PrivateRoute role="client"><ClientParametres /></PrivateRoute>} />
          <Route path="/client/documents/:type/:id/imprimer" element={<PrivateRoute role="client"><DocumentImprimer scope="client" /></PrivateRoute>} />
          <Route path="/parametres" element={<PrivateRoute role="client"><ClientParametres /></PrivateRoute>} />
          <Route path="/urgence" element={<PrivateRoute role="client"><ClientUrgence /></PrivateRoute>} />
          <Route path="/documents/:type/:id/imprimer" element={<PrivateRoute role="client"><DocumentImprimer scope="client" /></PrivateRoute>} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
