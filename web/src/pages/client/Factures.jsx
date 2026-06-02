import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { MdReceipt, MdArrowBack } from 'react-icons/md'

const statusColors = {
  non_payee: 'bg-red-100 text-red-700',
  partiellement_payee: 'bg-yellow-100 text-yellow-700',
  payee: 'bg-green-100 text-green-700',
}
const statusLabels = { non_payee: 'Non payée', partiellement_payee: 'Partiel', payee: 'Payée' }

const Factures = () => {
  const [factures, setFactures] = useState([])

  useEffect(() => {
    api.get('/client/factures').then(r => setFactures(r.data))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white px-6 py-4 flex items-center gap-3">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/10"><MdArrowBack size={20} /></Link>
        <h1 className="font-bold text-lg">Mes factures</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
        {factures.map(f => (
          <div key={f.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <MdReceipt size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 font-mono">{f.numero_facture}</h3>
                  <p className="text-sm text-gray-500">{f.marque} {f.modele} — {f.immatriculation}</p>
                  <p className="text-sm text-gray-400 mt-1">Émise le {new Date(f.date_facture).toLocaleDateString('fr-FR')}</p>
                  {f.date_echeance && (
                    <p className="text-sm text-gray-400">Échéance: {new Date(f.date_echeance).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-800">{Number(f.montant_ttc).toLocaleString()} Ar</p>
                {f.statut !== 'payee' && (
                  <p className="text-sm text-gray-400">Payé: {Number(f.montant_paye).toLocaleString()} Ar</p>
                )}
                <span className={`badge mt-1 inline-block ${statusColors[f.statut]}`}>{statusLabels[f.statut]}</span>
              </div>
            </div>
            {f.notes && <p className="text-sm text-gray-500 mt-3 pt-3 border-t italic">{f.notes}</p>}
          </div>
        ))}
        {factures.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MdReceipt size={48} className="mx-auto mb-3 opacity-30" />
            <p>Aucune facture</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Factures
