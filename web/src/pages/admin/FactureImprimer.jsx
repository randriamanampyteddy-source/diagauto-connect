import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { montantEnLettres } from '../../utils/montantEnLettres'
import { MdPrint, MdArrowBack } from 'react-icons/md'

const fmt     = (n) => new Intl.NumberFormat('fr-MG').format(Number(n) || 0)
const fmtDate = (d) => {
  if (!d) return '—'
  const s = String(d).slice(0, 10) // "YYYY-MM-DD" toujours
  const dt = new Date(s + 'T00:00')
  if (isNaN(dt)) return String(d).slice(0, 10)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function FactureImprimer() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [data, setData]   = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/admin/factures/${id}/imprimer`)
      .then(r => setData(r.data))
      .catch(() => setError('Facture introuvable'))
  }, [id])

  if (error) return (
    <div className="flex items-center justify-center h-screen text-gray-400">
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

  const { facture: f, lignes, atelier: a } = data
  const ht    = Number(f.montant_ht)  || 0
  const ttc   = Number(f.montant_ttc) || 0
  const tva   = Number(f.tva)         || 0
  const tvaM  = ttc - ht
  const reste = ttc - (Number(f.montant_paye) || 0)

  return (
    <>
      {/* ── BARRE OUTILS (cachée à l'impression) ── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white flex items-center justify-between px-6 py-3 shadow-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 hover:text-gray-300 text-sm transition-colors">
          <MdArrowBack size={18} /> Retour
        </button>
        <span className="font-mono text-sm font-semibold tracking-wider">{f.numero_facture}</span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary hover:bg-blue-900 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <MdPrint size={18} /> Imprimer / Enregistrer PDF
        </button>
      </div>
      <div className="no-print h-14" />

      {/* ══════════════════════════════════════════════════════
          PAGE A4
      ══════════════════════════════════════════════════════ */}
      <div id="facture-page">

        <div className="contenu-principal">
        {/* ── EN-TÊTE ── */}
        <header className="entete">

          {/* Logo / Nom atelier */}
          <div className="atelier-brand">
            <div className="brand-nom-ligne">
              <span className="brand-diagauto-txt">DiagAuto </span>
              <span className="brand-mada-groupe">
                <span className="brand-mada-txt">Mada</span>
                <span className="brand-service">.Service</span>
              </span>
            </div>
            <div className="brand-specialite">
              <strong>Spécialiste Terracan Crdi &amp; système d'injection common rail</strong><br />
              <strong>Diagnostic voiture toutes marques</strong>
            </div>
            <div className="brand-coords">
              <span>📍 67ha Nord Ouest Antananarivo</span>
              <span>📞 034 61 721 32 / 034 76 562 52</span>
              <span>💬 WhatsApp : 037 79 111 66</span>
              <span>✉ diagautomadagascar@gmail.com</span>
              <span>📘 Fb : DiagAuto Mada</span>
            </div>
          </div>

          {/* Référence facture */}
          <div className="facture-ref">
            <div className="facture-titre-bloc">
              <span className="facture-titre">FACTURE</span>
            </div>
            <table className="ref-table">
              <tbody>
                <tr>
                  <td className="rl">N°</td>
                  <td className="rv mono">{f.numero_facture}</td>
                </tr>
                <tr>
                  <td className="rl">Date</td>
                  <td className="rv">{fmtDate(f.date_facture)}</td>
                </tr>
                {f.date_echeance && (
                  <tr>
                    <td className="rl">Échéance</td>
                    <td className="rv">{fmtDate(f.date_echeance)}</td>
                  </tr>
                )}
                <tr>
                  <td className="rl">Statut</td>
                  <td className={`rv statut ${f.statut === 'payee' ? 'payee' : 'impayee'}`}>
                    {f.statut === 'payee' ? '✓ PAYÉE' : f.statut === 'partiellement_payee' ? '⚡ PARTIEL' : '⚠ IMPAYÉE'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </header>

        <div className="filet-rouge" />

        {/* ── CLIENT + VÉHICULE ── */}
        <section className="info-section">
          <div className="info-bloc">
            <div className="info-titre">CLIENT</div>
            <div className="info-id">{f.id_client}</div>
            <div className="info-nom">{f.client_prenom} {f.client_nom}</div>
            {f.client_tel     && <div className="info-ligne">Tél : {f.client_tel}</div>}
            {f.client_adresse && <div className="info-ligne">{f.client_adresse}</div>}
            {f.client_email   && <div className="info-ligne">{f.client_email}</div>}
          </div>
          <div className="info-bloc">
            <div className="info-titre">VÉHICULE</div>
            <div className="info-nom">{f.marque} {f.modele}</div>
            <div className="info-id">{f.immatriculation}</div>
            {f.annee   && <div className="info-ligne">Année : {f.annee}</div>}
            {f.couleur && <div className="info-ligne">Couleur : {f.couleur}</div>}
          </div>
        </section>

        <div className="filet-gris" />

        {/* ── TABLEAU PRESTATIONS ── */}
        {lignes.length > 0 && (
          <section className="prestations-section">
            <table className="table-presta">
              <thead>
                <tr>
                  <th className="th-num">N°</th>
                  <th className="th-desig">Désignation</th>
                  <th className="th-type">Type</th>
                  <th className="th-qte">Qté</th>
                  <th className="th-pu">Prix unitaire</th>
                  <th className="th-total">Total (Ar)</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={l.id} className={i % 2 === 0 ? 'row-pair' : ''}>
                    <td className="td-num">{i + 1}</td>
                    <td className="td-desig">{l.description}</td>
                    <td className="td-type">{l.type || '—'}</td>
                    <td className="td-qte">{Number(l.quantite)}</td>
                    <td className="td-pu">{fmt(l.prix_unitaire)}</td>
                    <td className="td-total">{fmt(l.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Notes */}
        {f.notes && (
          <div className="notes-bloc">
            <span className="notes-label">Observations : </span>{f.notes}
          </div>
        )}

        {/* ── TOTAUX ── */}
        <section className="totaux-section">
          <div className="totaux-spacer" />
          <div className="totaux-bloc">
            {tva > 0 && <div className="tl"><span>Montant HT</span><span>{fmt(ht)} Ar</span></div>}
            {tva > 0 && <div className="tl"><span>TVA ({tva}%)</span><span>{fmt(tvaM)} Ar</span></div>}
            {Number(f.montant_paye) > 0 && (
              <div className="tl tl-paye"><span>Déjà réglé</span><span>— {fmt(f.montant_paye)} Ar</span></div>
            )}
            <div className="tl tl-final"><span>TOTAL TTC</span><span>{fmt(ttc)} Ar</span></div>
            {Number(f.montant_paye) > 0 && Number(f.montant_paye) < ttc && (
              <div className="tl tl-reste"><span>Reste à payer</span><span>{fmt(reste)} Ar</span></div>
            )}
          </div>
        </section>

        {/* ── MONTANT EN LETTRES ── */}
        <div className="montant-lettres">
          <span className="ml-label">Arrêté à la somme de : </span>
          <span className="ml-val">{montantEnLettres(ttc)}</span>
        </div>

        {/* ── SIGNATURES ── */}
        <section className="signatures">
          <div className="sig">
            <div className="sig-titre">Signature du client</div>
            <div className="sig-zone" />
            <div className="sig-nom">{f.client_prenom} {f.client_nom}</div>
          </div>
          <div className="sig">
            <div className="sig-titre">Signature de l'atelier</div>
            <div className="sig-zone" />
            <div className="sig-nom">DiagAuto Mada .Service</div>
          </div>
        </section>

        </div>{/* fin contenu-principal */}

        {/* ── PIED DE PAGE ── */}
        <footer className="pied-page">
          <div className="pied-separateur" />
          <p className="pied-specialite">Spécialiste Terracan Crdi &amp; système d'injection common rail — Diagnostic voiture toutes marques</p>
          <p>DiagAuto Mada — 67ha Nord Ouest Antananarivo — Tél : 034 61 721 32 / 034 76 562 52 — WA : 037 79 111 66 — diagautomadagascar@gmail.com — Fb : DiagAuto Mada</p>
        </footer>

      </div>{/* fin facture-page */}

      {/* ══════════════════════════════════════════════════════
          STYLES
      ══════════════════════════════════════════════════════ */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm 14mm 12mm 14mm;
        }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0; background: white; }
          #facture-page { box-shadow: none !important; margin: 0 !important; }
        }

        #facture-page {
          background: white;
          width: 182mm;
          min-height: 273mm;
          margin: 20px auto;
          padding: 12mm 12mm 8mm;
          box-shadow: 0 4px 32px rgba(0,0,0,.14);
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 9pt;
          color: #1a1a1a;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        #facture-page .contenu-principal {
          flex: 1;
        }

        /* ── EN-TÊTE ── */
        .entete {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
        }

        /* Branding atelier */
        .atelier-brand { flex: 1; }
        .brand-nom-ligne {
          display: flex;
          align-items: flex-start;
          margin-bottom: 4px;
        }
        .brand-diagauto-txt {
          font-size: 22pt;
          font-weight: 900;
          color: #1e3a5f;
          white-space: nowrap;
          line-height: 1;
        }
        .brand-mada-groupe {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .brand-mada-txt {
          font-size: 22pt;
          font-weight: 900;
          color: #1e3a5f;
          line-height: 1;
        }
        .brand-service {
          color: #e63946;
          font-size: 11pt;
          font-weight: 900;
          letter-spacing: 1.5px;
          line-height: 1.1;
          margin-top: 1px;
        }
        .brand-specialite {
          font-size: 8.5pt;
          color: #1a1a1a;
          line-height: 1.6;
          margin-bottom: 4px;
        }
        .brand-specialite strong {
          font-weight: 700;
        }
        .brand-coords {
          display: flex;
          flex-direction: column;
          gap: 1px;
          font-size: 7.5pt;
          color: #555;
        }

        /* Référence */
        .facture-ref { text-align: right; min-width: 110px; }
        .facture-titre-bloc { margin-bottom: 6px; }
        .facture-titre {
          font-size: 18pt;
          font-weight: 900;
          color: #1e3a5f;
          letter-spacing: 4px;
          text-transform: uppercase;
        }
        .ref-table { margin-left: auto; border-collapse: collapse; }
        .rl { font-size: 7.5pt; color: #777; text-align: right; padding: 1.5px 8px 1.5px 0; white-space: nowrap; }
        .rv { font-size: 8.5pt; font-weight: 600; text-align: right; padding: 1.5px 0; }
        .rv.mono { font-family: monospace; font-size: 9pt; color: #1e3a5f; }
        .statut.payee    { color: #16a34a; font-weight: 700; }
        .statut.impayee  { color: #dc2626; font-weight: 700; }

        /* Filets */
        .filet-rouge { height: 2px; background: #1a1a1a; margin: 6px 0 8px; border-radius: 1px; }
        .filet-gris  { height: 1px; background: #e5e7eb; margin: 8px 0; }

        /* ── INFO CLIENT + VEHICULE ── */
        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 6px;
        }
        .info-bloc {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 5px;
          padding: 7px 10px;
        }
        .info-titre {
          font-size: 7pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #1a1a1a;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .info-id  { font-family: monospace; font-size: 9pt; font-weight: 700; color: #1e3a5f; }
        .info-nom { font-size: 10pt; font-weight: 700; margin: 2px 0; }
        .info-ligne { font-size: 8pt; color: #555; margin: 1px 0; }

        /* ── TABLEAU PRESTATIONS ── */
        .prestations-section { margin: 8px 0 4px; }
        .table-presta { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        .table-presta thead { display: table-header-group; }
        .table-presta tr { page-break-inside: avoid; }

        .table-presta th {
          background: #1e3a5f;
          color: white;
          padding: 5px 6px;
          font-size: 7.5pt;
          font-weight: 600;
          text-align: center;
          white-space: nowrap;
        }
        .table-presta td {
          padding: 4px 6px;
          font-size: 8pt;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: top;
        }
        .row-pair { background: #f9fafb; }

        .th-num, .td-num   { width: 24px; text-align: center; }
        .th-desig, .td-desig { text-align: left; word-break: break-word; }
        .th-type, .td-type  { width: 72px; text-align: center; font-size: 7.5pt; }
        .th-qte, .td-qte   { width: 32px; text-align: center; }
        .th-pu, .td-pu     { width: 88px; text-align: right; }
        .th-total, .td-total { width: 88px; text-align: right; font-weight: 600; }

        /* Notes */
        .notes-bloc {
          margin: 6px 0;
          font-size: 8pt;
          color: #555;
          padding: 5px 8px;
          background: #fffbeb;
          border-left: 3px solid #f4a261;
          border-radius: 3px;
        }
        .notes-label { font-weight: 600; color: #444; }

        /* ── TOTAUX ── */
        .totaux-section {
          display: flex;
          justify-content: flex-end;
          margin: 8px 0;
        }
        .totaux-spacer { flex: 1; }
        .totaux-bloc {
          min-width: 200px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }
        .tl {
          display: flex;
          justify-content: space-between;
          padding: 4px 10px;
          font-size: 8.5pt;
          border-bottom: 1px solid #f3f4f6;
        }
        .tl:last-child { border-bottom: none; }
        .tl-paye  { color: #16a34a; }
        .tl-final {
          background: #1e3a5f;
          color: white;
          font-weight: 700;
          font-size: 10.5pt;
          padding: 6px 10px;
        }
        .tl-reste {
          background: #fef3c7;
          color: #92400e;
          font-weight: 600;
          font-size: 8.5pt;
        }

        /* ── MONTANT EN LETTRES ── */
        .montant-lettres {
          border: 1.5px solid #1e3a5f;
          border-radius: 4px;
          padding: 6px 10px;
          margin: 8px 0;
          font-size: 8pt;
          background: #f0f4ff;
        }
        .ml-label { font-weight: 700; color: #1e3a5f; }
        .ml-val   { font-style: italic; }

        /* ── SIGNATURES ── */
        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin: 14px 0 10px;
        }
        .sig { text-align: center; }
        .sig-titre {
          font-size: 8pt;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }
        .sig-zone {
          height: 50px;
          margin: 0 8px 4px;
        }
        .sig-nom {
          font-size: 7.5pt;
          color: #6b7280;
          font-style: italic;
        }

        /* ── PIED DE PAGE ── */
        .pied-page { margin-top: auto; padding-top: 10px; }
        .pied-separateur {
          height: 1px;
          background: #9ca3af;
          margin-bottom: 5px;
        }
        .pied-page p {
          text-align: center;
          font-size: 7pt;
          color: #9ca3af;
          margin: 2px 0;
          letter-spacing: 0.2px;
        }
        .pied-specialite {
          font-weight: 600;
          color: #6b7280 !important;
          font-style: italic;
        }
      `}</style>
    </>
  )
}
