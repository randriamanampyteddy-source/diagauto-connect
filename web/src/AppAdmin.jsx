import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

import AdminLogin from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Clients from './pages/admin/Clients'
import Rendezvous from './pages/admin/Rendezvous'
import Interventions from './pages/admin/Interventions'
import Devis from './pages/admin/Devis'
import Proforma from './pages/admin/Proforma'
import Factures from './pages/admin/Factures'
import MonCompte from './pages/admin/MonCompte'
import FactureImprimer from './pages/admin/FactureImprimer'

function AppAdmin() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<AdminLogin />} />

          <Route path="/dashboard"     element={<PrivateRoute role="admin"><Dashboard /></PrivateRoute>} />
          <Route path="/clients"       element={<PrivateRoute role="admin"><Clients /></PrivateRoute>} />
          <Route path="/rendezvous"    element={<PrivateRoute role="admin"><Rendezvous /></PrivateRoute>} />
          <Route path="/interventions" element={<PrivateRoute role="admin"><Interventions /></PrivateRoute>} />
          <Route path="/devis"         element={<PrivateRoute role="admin"><Devis /></PrivateRoute>} />
          <Route path="/proformas"     element={<PrivateRoute role="admin"><Proforma /></PrivateRoute>} />
          <Route path="/factures"      element={<PrivateRoute role="admin"><Factures /></PrivateRoute>} />
          <Route path="/mon-compte"    element={<PrivateRoute role="admin"><MonCompte /></PrivateRoute>} />
          <Route path="/factures/:id/imprimer" element={<PrivateRoute role="admin"><FactureImprimer /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default AppAdmin
