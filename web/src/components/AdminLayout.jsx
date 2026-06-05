import AdminSidebar from './AdminSidebar'
import AdminMobileNav from './AdminMobileNav'
import { useAuth } from '../context/AuthContext'
import { MdPerson } from 'react-icons/md'

const AdminLayout = ({ children }) => {
  const { user } = useAuth()
  return (
    <div className="admin-app flex min-h-screen">
      <AdminSidebar />
      <div className="admin-content ml-64 flex-1 flex flex-col min-w-0">
        <header className="admin-header bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-primary font-semibold text-lg">DiagAuto Connect</h2>
          <div className="flex items-center gap-2 text-gray-600">
            <MdPerson size={20} />
            <span className="text-sm">{user?.prenom} {user?.nom}</span>
          </div>
        </header>
        <main className="admin-main flex-1 p-6 min-w-0">
          {children}
        </main>
      </div>
      <AdminMobileNav />
    </div>
  )
}

export default AdminLayout
