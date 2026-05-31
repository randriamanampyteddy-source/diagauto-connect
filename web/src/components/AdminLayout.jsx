import AdminSidebar from './AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { MdPerson } from 'react-icons/md'

const AdminLayout = ({ children }) => {
  const { user } = useAuth()
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="ml-64 flex-1 flex flex-col">
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-primary font-semibold text-lg">DiagAuto Connect</h2>
          <div className="flex items-center gap-2 text-gray-600">
            <MdPerson size={20} />
            <span className="text-sm">{user?.prenom} {user?.nom}</span>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
