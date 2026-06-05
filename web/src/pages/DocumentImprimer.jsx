import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../api/axios'
import { montantEnLettres } from '../utils/montantEnLettres'
import { MdArrowBack, MdCheckCircle, MdPrint, MdVisibility, MdCancel } from 'react-icons/md'

const labels = {
  facture: 'FACTURE',
  devis: 'DEVIS',
  proforma: 'PROFORMA',
}

const endpointPlural = {
  devis: 'devis',
  proforma: 'proformas',
}

const atelierFallback = {
  adresse: '67ha Nord Ouest Antananarivo',
  telephone: '034 61 721 32 / 034 76 562 52',
  whatsapp: '037 79 111 66',
  email: 'diagautomadagascar@gmail.com',
  facebook: 'DiagAuto Mada',
}

const fmt = (n) => new Intl.NumberFormat('fr-MG').format(Number(n) || 0)
const fmtDate = (d) => {
  if (!d) return '-'
  const s = String(d).slice(0, 10)
  const dt = new Date(`${s}T00:00`)
  return isNaN(dt) ? s : dt.toLocaleDateString('fr-FR')
}

export default function DocumentImprimer({ scope = 'admin', fixedType }) {
  const params = useParams()
  const navigate = useNavigate()
  const type = fixedType || params.type || 'facture'
  const id = params.id
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get(`/${scope}/documents/${type}/${id}/imprimer`)
      .then(r => setData(r.data))
      .catch(() => setError(`${labels[type] || 'Document'} introuvable`))
  }

  useEffect(() => {
    setError('')
    setData(null)
    load()
  }, [scope, type, id])

  const changerStatut = async (statut) => {
    try {
      setSaving(true)
      await api.put(`/client/${endpointPlural[type]}/${id}/statut`, { statut })
      toast.success(statut === 'accepte' ? 'Document accepte' : 'Document refuse')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (error) return (
    <div className="flex items-center justify-center h-screen text-gray-500">
      <div className="text-center">
        <p className="text-lg mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-primary">Retour</button>
      </div>
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const { document: d, lignes, atelier: a } = data
  const ht = Number(d.montant_ht) || 0
  const ttc = Number(d.montant_ttc) || 0
  const tva = Number(d.tva) || 0
  const montantPaye = type === 'facture' ? Number(d.montant_paye) || 0 : 0
  const reste = ttc - montantPaye
  const canValidate = scope === 'client' && ['devis', 'proforma'].includes(type) && !['accepte', 'refuse'].includes(d.statut)

  return (
    <>
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white flex items-center justify-between px-6 py-3 shadow-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 hover:text-gray-300 text-sm">
          <MdArrowBack size={18} /> Retour
        </button>
        <span className="font-mono text-sm font-semibold">{d.numero_document}</span>
        <div className="flex items-center gap-2">
          {canValidate && (
            <>
              <button disabled={saving} onClick={() => changerStatut('refuse')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm disabled:opacity-50">
                <MdCancel size={18} /> Refuser
              </button>
              <button disabled={saving} onClick={() => changerStatut('accepte')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-sm disabled:opacity-50">
                <MdCheckCircle size={18} /> Accepter
              </button>
            </>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-primary hover:bg-blue-900 px-4 py-2 rounded-lg text-sm">
            <MdPrint size={18} /> Imprimer
          </button>
        </div>
      </div>
      <div className="no-print h-14" />

      <main id="document-page">
        <div className="watermark">DiagAuto Mada</div>
        <header className="doc-header">
          <div>
            <div className="brand-line"><span>DiagAuto </span><strong>Mada</strong><em>.Service</em></div>
            <p className="brand-sub">Specialiste Terracan Crdi & systeme d'injection common rail</p>
            <p className="brand-sub">Diagnostic voiture toutes marques</p>
            <div className="brand-contact">
              <span>Adresse : {a.adresse || atelierFallback.adresse}</span>
              <span>Telephone : {a.telephone || atelierFallback.telephone}</span>
              <span>WhatsApp : {a.whatsapp || atelierFallback.whatsapp}</span>
              <span>Email : {a.email || atelierFallback.email}</span>
              <span>Facebook : {a.facebook || atelierFallback.facebook}</span>
            </div>
          </div>
          <div className="doc-ref">
            <h1>{labels[type] || 'DOCUMENT'}</h1>
            <table>
              <tbody>
                <tr><td>N</td><td className="mono">{d.numero_document}</td></tr>
                <tr><td>Date</td><td>{fmtDate(d.date_document)}</td></tr>
                {d.date_secondaire && <tr><td>{type === 'facture' ? 'Echeance' : 'Validite'}</td><td>{fmtDate(d.date_secondaire)}</td></tr>}
                <tr><td>Statut</td><td>{String(d.statut || '-').replaceAll('_', ' ')}</td></tr>
              </tbody>
            </table>
          </div>
        </header>

        <div className="rule" />

        <section className="info-grid">
          <div>
            <h2>CLIENT</h2>
            <p className="mono strong">{d.id_client}</p>
            <p className="strong">{d.client_prenom} {d.client_nom}</p>
            {d.client_tel && <p>Tel : {d.client_tel}</p>}
            {d.client_adresse && <p>{d.client_adresse}</p>}
            {d.client_email && <p>{d.client_email}</p>}
          </div>
          <div>
            <h2>VEHICULE</h2>
            <p className="strong">{d.marque} {d.modele}</p>
            <p className="mono strong">{d.immatriculation}</p>
            {d.annee && <p>Annee : {d.annee}</p>}
            {d.couleur && <p>Couleur : {d.couleur}</p>}
          </div>
        </section>

        <table className="lines">
          <thead>
            <tr>
              <th>N</th>
              <th>Designation</th>
              <th>Type</th>
              <th>Qte</th>
              <th>Prix unitaire</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={l.id || i}>
                <td>{i + 1}</td>
                <td className="left">{l.description}</td>
                <td>{l.type || '-'}</td>
                <td>{Number(l.quantite)}</td>
                <td>{fmt(l.prix_unitaire)}</td>
                <td className="strong">{fmt(l.montant)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {d.notes && <div className="notes"><strong>Observations :</strong> {d.notes}</div>}

        <section className="totals">
          <div />
          <div className="total-box">
            {tva > 0 && <p><span>Montant HT</span><strong>{fmt(ht)} Ar</strong></p>}
            {tva > 0 && <p><span>TVA ({tva}%)</span><strong>{fmt(ttc - ht)} Ar</strong></p>}
            {montantPaye > 0 && <p><span>Deja regle</span><strong>{fmt(montantPaye)} Ar</strong></p>}
            <p className="final"><span>TOTAL TTC</span><strong>{fmt(ttc)} Ar</strong></p>
            {montantPaye > 0 && montantPaye < ttc && <p><span>Reste a payer</span><strong>{fmt(reste)} Ar</strong></p>}
          </div>
        </section>

        <div className="letters">
          <strong>Arrete a la somme de :</strong> {montantEnLettres(ttc)}
        </div>

        <section className="signatures">
          <div><p>Signature du client</p><div /></div>
          <div><p>Signature de l'atelier</p><div /></div>
        </section>

        <footer>
          <p>
            DiagAuto Mada - Adresse : {a.adresse || atelierFallback.adresse} - Tel : {a.telephone || atelierFallback.telephone}
            {' '} - WhatsApp : {a.whatsapp || atelierFallback.whatsapp} - Email : {a.email || atelierFallback.email}
            {' '} - Fb : {a.facebook || atelierFallback.facebook}
          </p>
        </footer>
      </main>

      <style>{`
        @page { size: A4 portrait; margin: 12mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0; background: white; }
          #document-page { box-shadow: none !important; margin: 0 !important; }
        }
        #document-page {
          width: 182mm; min-height: 273mm; margin: 20px auto; padding: 12mm;
          background: white; box-shadow: 0 4px 32px rgba(0,0,0,.14);
          font-family: Segoe UI, Arial, sans-serif; font-size: 9pt; color: #1a1a1a;
          display: flex; flex-direction: column; box-sizing: border-box; position: relative; overflow: hidden;
        }
        #document-page > *:not(.watermark) {
          position: relative;
          z-index: 1;
        }
        .watermark {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(-34deg);
          z-index: 0;
          font-size: 54pt;
          font-weight: 900;
          letter-spacing: 2px;
          color: rgba(30, 58, 95, 0.055);
          text-transform: uppercase;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
        }
        .doc-header { display: flex; justify-content: space-between; gap: 24px; }
        .brand-line { font-size: 22pt; font-weight: 900; color: #1e3a5f; line-height: 1; }
        .brand-line em { color: #e63946; font-size: 11pt; font-style: normal; margin-left: 2px; }
        .brand-sub { margin: 3px 0; font-weight: 700; }
        .brand-contact { display: flex; flex-direction: column; gap: 1px; margin-top: 5px; color: #555; font-size: 7.5pt; }
        .doc-ref { min-width: 42mm; text-align: right; }
        .doc-ref h1 { margin: 0 0 8px; color: #1e3a5f; font-size: 18pt; letter-spacing: 3px; }
        .doc-ref table { margin-left: auto; border-collapse: collapse; }
        .doc-ref td { padding: 2px 0 2px 8px; font-size: 8.5pt; }
        .rule { height: 2px; background: #1a1a1a; margin: 10px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
        .info-grid > div { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; padding: 8px 10px; }
        .info-grid h2 { font-size: 7.5pt; margin: 0 0 5px; border-bottom: 1px solid #d1d5db; padding-bottom: 3px; }
        .info-grid p { margin: 2px 0; color: #555; }
        .lines { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .lines th { background: #1e3a5f; color: white; padding: 6px; font-size: 7.5pt; }
        .lines td { border-bottom: 1px solid #f3f4f6; padding: 5px 6px; text-align: center; }
        .lines .left { text-align: left; }
        .notes { margin: 8px 0; padding: 7px 9px; border-left: 3px solid #f4a261; background: #fffbeb; color: #555; }
        .totals { display: grid; grid-template-columns: 1fr 64mm; margin-top: 10px; }
        .total-box { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .total-box p { display: flex; justify-content: space-between; margin: 0; padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
        .total-box p:last-child { border-bottom: 0; }
        .total-box .final { background: #1e3a5f; color: white; font-size: 10.5pt; }
        .letters { border: 1.5px solid #1e3a5f; background: #f0f4ff; border-radius: 4px; padding: 8px 10px; margin-top: 12px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 18px 0; text-align: center; }
        .signatures div div { height: 54px; }
        footer { margin-top: auto; border-top: 1px solid #9ca3af; padding-top: 6px; text-align: center; color: #777; font-size: 7pt; }
        .mono { font-family: monospace; }
        .strong { font-weight: 700; color: #1a1a1a !important; }
      `}</style>
    </>
  )
}
