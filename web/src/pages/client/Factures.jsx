import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../api/axios'
import { MdArrowBack, MdCancel, MdCheckCircle, MdDescription, MdPrint, MdReceipt, MdVisibility } from 'react-icons/md'

const typeConfig = {
  facture: {
    label: 'Factures',
    icon: MdReceipt,
    endpoint: '/client/factures',
    numberKey: 'numero_facture',
    dateKey: 'date_facture',
  },
  devis: {
    label: 'Devis',
    icon: MdDescription,
    endpoint: '/client/devis',
    numberKey: 'numero_devis',
    dateKey: 'date_devis',
    validation: '/client/devis',
  },
  proforma: {
    label: 'Proformas',
    icon: MdDescription,
    endpoint: '/client/proformas',
    numberKey: 'numero_proforma',
    dateKey: 'date_proforma',
    validation: '/client/proformas',
  },
}

const statusColors = {
  non_payee: 'bg-red-100 text-red-700',
  partiellement_payee: 'bg-yellow-100 text-yellow-700',
  payee: 'bg-green-100 text-green-700',
  brouillon: 'bg-gray-100 text-gray-600',
  envoye: 'bg-blue-100 text-blue-700',
  accepte: 'bg-green-100 text-green-700',
  refuse: 'bg-red-100 text-red-700',
}

const statusLabels = {
  non_payee: 'Non payee',
  partiellement_payee: 'Partiel',
  payee: 'Payee',
  brouillon: 'Brouillon',
  envoye: 'Envoye',
  accepte: 'Accepte',
  refuse: 'Refuse',
}

const fmtDate = (d) => {
  if (!d) return '-'
  const s = String(d).slice(0, 10)
  const dt = new Date(`${s}T00:00`)
  return isNaN(dt) ? s : dt.toLocaleDateString('fr-FR')
}

const Factures = () => {
  const navigate = useNavigate()
  const [active, setActive] = useState('facture')
  const [docs, setDocs] = useState({ facture: [], devis: [], proforma: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [factures, devis, proformas] = await Promise.all([
        api.get(typeConfig.facture.endpoint),
        api.get(typeConfig.devis.endpoint),
        api.get(typeConfig.proforma.endpoint),
      ])
      setDocs({
        facture: factures.data,
        devis: devis.data,
        proforma: proformas.data,
      })
    } catch {
      if (!silent) toast.error('Impossible de charger les documents')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(() => load(true), 4000)
    return () => clearInterval(timer)
  }, [])

  const items = useMemo(() => docs[active] || [], [docs, active])

  const valider = async (type, id, statut) => {
    try {
      setSaving(`${type}-${id}`)
      await api.put(`${typeConfig[type].validation}/${id}/statut`, { statut })
      toast.success(statut === 'accepte' ? 'Document accepte' : 'Document refuse')
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setSaving(null)
    }
  }

  const openDocument = (type, id) => navigate(`/documents/${type}/${id}/imprimer`)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white px-6 py-4 flex items-center gap-3">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/10"><MdArrowBack size={20} /></Link>
        <h1 className="font-bold text-lg">Mes documents</h1>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
                active === key ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cfg.label} ({docs[key].length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map(doc => {
              const cfg = typeConfig[active]
              const Icon = cfg.icon
              const canValidate = cfg.validation && !['accepte', 'refuse'].includes(doc.statut)
              return (
                <div key={doc.id} className="card">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <Icon size={24} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 font-mono">{doc[cfg.numberKey]}</h3>
                        <p className="text-sm text-gray-500">{doc.marque} {doc.modele} - {doc.immatriculation}</p>
                        <p className="text-sm text-gray-400 mt-1">Date : {fmtDate(doc[cfg.dateKey])}</p>
                        {doc.notes && <p className="text-sm text-gray-500 mt-2 italic">{doc.notes}</p>}
                      </div>
                    </div>
                    <div className="md:text-right">
                      <p className="text-xl font-bold text-gray-800">{Number(doc.montant_ttc).toLocaleString()} Ar</p>
                      {active === 'facture' && doc.statut !== 'payee' && (
                        <p className="text-sm text-gray-400">Paye : {Number(doc.montant_paye).toLocaleString()} Ar</p>
                      )}
                      <span className={`badge mt-1 inline-block ${statusColors[doc.statut] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[doc.statut] || doc.statut}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                    <button onClick={() => openDocument(active, doc.id)} className="btn-primary text-sm flex items-center gap-2">
                      <MdVisibility size={17} /> Voir
                    </button>
                    <button onClick={() => openDocument(active, doc.id)} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                      <MdPrint size={17} /> Imprimer
                    </button>
                    {canValidate && (
                      <>
                        <button
                          disabled={saving === `${active}-${doc.id}`}
                          onClick={() => valider(active, doc.id, 'refuse')}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          <MdCancel size={17} /> Refuser
                        </button>
                        <button
                          disabled={saving === `${active}-${doc.id}`}
                          onClick={() => valider(active, doc.id, 'accepte')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          <MdCheckCircle size={17} /> Accepter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {items.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <MdReceipt size={48} className="mx-auto mb-3 opacity-30" />
                <p>Aucun document</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Factures
