import { useNavigate } from 'react-router-dom'
import { MdAdminPanelSettings, MdDirectionsCar } from 'react-icons/md'

const Home = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MdDirectionsCar size={44} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white">DiagAuto Connect</h1>
        <p className="text-blue-200 mt-2 text-lg">Gestion automobile professionnelle</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
        {/* Admin */}
        <button
          onClick={() => navigate('/admin/login')}
          className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl hover:scale-105 transition-transform cursor-pointer group"
        >
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
            <MdAdminPanelSettings size={36} className="text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-primary">Administrateur</h2>
            <p className="text-gray-500 text-sm mt-1">Gérer les clients, RDV, factures...</p>
          </div>
        </button>

        {/* Client */}
        <button
          onClick={() => navigate('/login')}
          className="bg-white/10 border-2 border-white/30 rounded-2xl p-8 flex flex-col items-center gap-4 hover:bg-white/20 transition-colors cursor-pointer group"
        >
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <MdDirectionsCar size={36} className="text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">Espace Client</h2>
            <p className="text-blue-200 text-sm mt-1">Rendez-vous, factures, véhicules...</p>
          </div>
        </button>
      </div>

      <p className="text-blue-300 text-sm mt-10">© 2024 DiagAuto Connect — Madagascar</p>
    </div>
  )
}

export default Home
