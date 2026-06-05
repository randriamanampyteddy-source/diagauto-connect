import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { MdArrowBack, MdArrowBackIos, MdArrowForwardIos, MdAdd, MdDirectionsCar, MdAccessTime, MdCheckCircle, MdCancel, MdEditCalendar } from 'react-icons/md'

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MOIS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MAX_PAR_JOUR = 2

// Formate date en YYYY-MM-DD local
const toLocalDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${j}`
}

const StatusIcon = ({ statut }) => {
  if (statut === 'confirme') return <MdCheckCircle size={11} className="text-green-600" />
  if (statut === 'annule')   return <MdCancel size={11} className="text-red-500" />
  return <MdAccessTime size={11} className="text-orange-500" />
}

const Rendezvous = () => {
  const today = new Date()
  const [annee, setAnnee]       = useState(today.getFullYear())
  const [mois, setMois]         = useState(today.getMonth())
  const [rdvs, setRdvs]         = useState([])
  const [tousRdvs, setTousRdvs] = useState([]) // tous les rdv du garage (pour vérifier limite)
  const [vehicules, setVehicules] = useState([])
  const [modal, setModal]       = useState(false)
  const [dateChoisie, setDateChoisie] = useState('')
  const [form, setForm]         = useState({ vehicule_id: '', heure_rdv: '', motif: '' })
  const [reportModal, setReportModal] = useState(null)
  const [reportForm, setReportForm] = useState({ date_rdv: '', heure_rdv: '' })

  const load = () => {
    api.get('/client/rendezvous').then(r => setRdvs(r.data)).catch(() => {})
    api.get('/client/vehicules').then(r => setVehicules(r.data)).catch(() => {})
    // Récupère tous les RDV pour vérifier la limite par jour
    api.get('/client/rendezvous/tous').then(r => setTousRdvs(r.data)).catch(() => {
      // fallback: utilise les rdvs du client uniquement
    })
  }
  useEffect(() => { load() }, [])

  // Mois précédent / suivant
  const moisPrev = () => {
    if (mois === 0) { setMois(11); setAnnee(a => a - 1) }
    else setMois(m => m - 1)
  }
  const moisSuiv = () => {
    if (mois === 11) { setMois(0); setAnnee(a => a + 1) }
    else setMois(m => m + 1)
  }

  // Jours du mois
  const premierJour = new Date(annee, mois, 1).getDay()
  const nbJours     = new Date(annee, mois + 1, 0).getDate()

  // RDV par date (pour affichage calendrier)
  const rdvParDate = {}
  rdvs.forEach(r => {
    const d = r.date_rdv?.slice(0, 10)
    if (!rdvParDate[d]) rdvParDate[d] = []
    rdvParDate[d].push(r)
  })

  // Tous les RDV par date (pour limite)
  const tousParDate = {}
  ;(tousRdvs.length ? tousRdvs : rdvs).forEach(r => {
    const d = r.date_rdv?.slice(0, 10)
    if (!tousParDate[d]) tousParDate[d] = []
    tousParDate[d].push(r)
  })

  const estPlein  = (date) => (tousParDate[date]?.filter(r => r.statut !== 'annule').length || 0) >= MAX_PAR_JOUR
  const estPasse  = (date) => date < toLocalDate(today)
  const estAujourd = (date) => date === toLocalDate(today)

  const prochaineDateDisponible = (date) => {
    const d = new Date(`${date}T12:00:00`)
    for (let i = 1; i <= 90; i++) {
      d.setDate(d.getDate() + 1)
      const candidate = toLocalDate(d)
      if (!estPlein(candidate)) return candidate
    }
    return ''
  }

  const ouvrirModal = (date) => {
    if (estPasse(date)) return
    if (estPlein(date)) {
      const suggestion = prochaineDateDisponible(date)
      toast.warning(
        <div>
          <p className="font-semibold">Date complète !</p>
          <p className="text-sm">Le {new Date(date+'T00:00').toLocaleDateString('fr-FR', {day:'numeric',month:'long'})} est complet (max {MAX_PAR_JOUR} véhicules).</p>
          {suggestion && <p className="text-sm mt-1">Prochaine date disponible sélectionnée : <strong>{new Date(suggestion+'T00:00').toLocaleDateString('fr-FR')}</strong>.</p>}
        </div>,
        { autoClose: 7000 }
      )
      if (!suggestion) return
      date = suggestion
    }
    setDateChoisie(date)
    setForm({ vehicule_id: '', heure_rdv: '', motif: '' })
    setModal(true)
  }

  const creer = async (e) => {
    e.preventDefault()
    try {
      await api.post('/client/rendezvous', { ...form, date_rdv: dateChoisie })
      toast.success('Rendez-vous demandé !')
      setModal(false)
      load()
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.suggested_date) {
        const suggestion = err.response.data.suggested_date
        setDateChoisie(suggestion)
        toast.warning(`Date complète. Prochaine date disponible sélectionnée : ${new Date(suggestion+'T00:00').toLocaleDateString('fr-FR')}`)
        load()
        return
      }
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const annulerRdv = async (rdv) => {
    if (!window.confirm('Annuler ce rendez-vous ?')) return
    try {
      await api.put(`/client/rendezvous/${rdv.id}/annuler`)
      toast.success('Rendez-vous annulé')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Annulation impossible')
    }
  }

  const ouvrirReport = (rdv) => {
    setReportModal(rdv)
    setReportForm({ date_rdv: rdv.date_rdv?.slice(0, 10) || '', heure_rdv: String(rdv.heure_rdv || '').slice(0, 5) })
  }

  const reporterRdv = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/client/rendezvous/${reportModal.id}/reporter`, reportForm)
      toast.success('Rendez-vous reporté et remis en attente')
      setReportModal(null)
      load()
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.suggested_date) {
        const suggestion = err.response.data.suggested_date
        setReportForm(f => ({ ...f, date_rdv: suggestion }))
        toast.warning(`Date complète. Prochaine date disponible sélectionnée : ${new Date(suggestion+'T00:00').toLocaleDateString('fr-FR')}`)
        load()
        return
      }
      toast.error(err.response?.data?.message || 'Report impossible')
    }
  }

  // Cellule calendrier
  const renderJour = (jour) => {
    const date = toLocalDate(new Date(annee, mois, jour))
    const mesRdv = rdvParDate[date] || []
    const plein  = estPlein(date)
    const passe  = estPasse(date)
    const aujrd  = estAujourd(date)

    let cellBg = 'bg-white hover:bg-gray-50'
    if (aujrd)  cellBg = 'bg-primary/5 ring-2 ring-primary/30'
    if (passe)  cellBg = 'bg-gray-50 opacity-50'
    if (plein && !passe) cellBg = 'bg-red-50 cursor-not-allowed'

    return (
      <div
        key={jour}
        onClick={() => !passe && ouvrirModal(date)}
        className={`relative rounded-xl p-1.5 min-h-[70px] transition-all border border-transparent
          ${cellBg} ${!passe && !plein ? 'cursor-pointer hover:border-primary/20 hover:shadow-sm' : ''}
          ${plein && !passe ? 'border-red-200' : ''}`}
      >
        {/* Numéro du jour */}
        <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full
          ${aujrd ? 'bg-primary text-white' : 'text-gray-600'}`}>
          {jour}
        </div>

        {/* RDV du client sur ce jour */}
        <div className="flex flex-col gap-0.5">
          {mesRdv.map(r => (
            <div
              key={r.id}
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold truncate
                ${r.statut === 'confirme' ? 'bg-green-100 text-green-700' :
                  r.statut === 'annule'   ? 'bg-gray-100 text-gray-500 line-through' :
                  'bg-orange-100 text-orange-700'}`}
              title={`${r.immatriculation} — ${r.heure_rdv}`}
            >
              <StatusIcon statut={r.statut} />
              <span className="truncate">{r.immatriculation}</span>
            </div>
          ))}
        </div>

        {/* Indicateur plein */}
        {plein && !passe && (
          <div className="absolute bottom-1 right-1">
            <span className="text-red-400 text-xs font-bold">COMPLET</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white px-4 py-4 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <MdArrowBack size={20} />
          </Link>
          <h1 className="font-bold text-lg">Rendez-vous</h1>
        </div>
        <button
          onClick={() => ouvrirModal(toLocalDate(today))}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm transition-colors"
        >
          <MdAdd size={18} /> Nouveau
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-4">

        {/* Navigation mois */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={moisPrev} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <MdArrowBackIos size={16} className="text-gray-600" />
            </button>
            <h2 className="font-bold text-gray-800 text-base">
              {MOIS[mois]} {annee}
            </h2>
            <button onClick={moisSuiv} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <MdArrowForwardIos size={16} className="text-gray-600" />
            </button>
          </div>

          {/* En-têtes jours */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {JOURS.map(j => (
              <div key={j} className="text-center text-xs font-semibold text-gray-400 py-1">{j}</div>
            ))}
          </div>

          {/* Grille jours */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {/* Cellules vides avant le 1er */}
            {Array.from({ length: premierJour }).map((_, i) => <div key={`e${i}`} />)}
            {/* Jours du mois */}
            {Array.from({ length: nbJours }, (_, i) => renderJour(i + 1))}
          </div>

          {/* Légende */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-300" />
              En attente
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
              Confirmé
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-red-50 border border-red-200" />
              Complet
            </div>
          </div>
        </div>

        {/* Liste RDV du mois */}
        {rdvs.filter(r => r.date_rdv?.slice(0,7) === `${annee}-${String(mois+1).padStart(2,'0')}`).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Mes RDV — {MOIS[mois]}</h3>
            <div className="flex flex-col gap-2">
              {rdvs
                .filter(r => r.date_rdv?.slice(0,7) === `${annee}-${String(mois+1).padStart(2,'0')}`)
                .sort((a,b) => a.date_rdv > b.date_rdv ? 1 : -1)
                .map(r => (
                  <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                      ${r.statut === 'confirme' ? 'bg-green-100' : r.statut === 'annule' ? 'bg-gray-100' : 'bg-orange-100'}`}>
                      <MdDirectionsCar size={18} className={
                        r.statut === 'confirme' ? 'text-green-600' :
                        r.statut === 'annule'   ? 'text-gray-400' : 'text-orange-500'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{r.marque} {r.modele}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.immatriculation}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-gray-700">
                        {new Date(r.date_rdv+'T00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
                      </p>
                      <p className="text-xs text-gray-400">{r.heure_rdv}</p>
                    </div>
                    {['en_attente', 'confirme'].includes(r.statut) && (
                      <div className="flex gap-2 sm:ml-2">
                        <button onClick={() => ouvrirReport(r)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1">
                          <MdEditCalendar size={15} /> Reporter
                        </button>
                        <button onClick={() => annulerRdv(r)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1">
                          <MdCancel size={15} /> Annuler
                        </button>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Modal nouveau RDV */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Nouveau rendez-vous</h2>
            <p className="text-sm text-primary font-medium mb-4">
              {dateChoisie && new Date(dateChoisie+'T00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </p>

            <form onSubmit={creer} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Véhicule *</label>
                <select
                  className="input"
                  value={form.vehicule_id}
                  onChange={e => setForm(f => ({ ...f, vehicule_id: e.target.value }))}
                  required
                >
                  <option value="">Choisir un véhicule...</option>
                  {vehicules.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.marque} {v.modele} — {v.immatriculation}
                    </option>
                  ))}
                </select>
                {vehicules.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Vous n'avez pas encore de véhicule. <Link to="/vehicules" className="underline">Ajouter</Link>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heure souhaitée *</label>
                <input
                  type="time"
                  className="input"
                  value={form.heure_rdv}
                  onChange={e => setForm(f => ({ ...f, heure_rdv: e.target.value }))}
                  required
                  min="07:00" max="17:00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif / Description</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Décrivez le problème ou la raison..."
                  value={form.motif}
                  onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary py-2.5 text-center">
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Reporter le rendez-vous</h2>
            <p className="text-sm text-gray-500 mb-4">{reportModal.marque} {reportModal.modele} — {reportModal.immatriculation}</p>
            <form onSubmit={reporterRdv} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle date</label>
                <input
                  type="date"
                  className="input"
                  min={toLocalDate(today)}
                  value={reportForm.date_rdv}
                  onChange={e => setReportForm(f => ({ ...f, date_rdv: e.target.value }))}
                  required
                />
                {reportForm.date_rdv && estPlein(reportForm.date_rdv) && reportForm.date_rdv !== reportModal.date_rdv?.slice(0, 10) && (
                  <p className="text-xs text-red-600 mt-1">Cette date est complète. Une autre date sera proposée.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle heure</label>
                <input
                  type="time"
                  className="input"
                  min="07:00"
                  max="17:00"
                  value={reportForm.heure_rdv}
                  onChange={e => setReportForm(f => ({ ...f, heure_rdv: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setReportModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">
                  Fermer
                </button>
                <button className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-1">
                  <MdEditCalendar size={17} /> Reporter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Rendezvous
