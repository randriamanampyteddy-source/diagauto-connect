import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { demanderPermissionNotificationClient, notifierReponseUrgenceClient } from '../utils/clientNotification'
import { MdNotifications } from 'react-icons/md'

const ClientUrgenceNotification = () => {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const previousNotification = useRef(null)

  useEffect(() => {
    if (user?.role !== 'client') return
    demanderPermissionNotificationClient()
    const load = () => {
      api.get('/client/urgences/notifications/stats').then(r => {
        const next = Number(r.data.non_lues) || 0
        const notification = r.data.notification_version || r.data.derniere_notification || null
        if (next > 0 && notification && notification !== previousNotification.current) {
          notifierReponseUrgenceClient()
          toast.info('L’admin a vu ou répondu à votre urgence')
        }
        previousNotification.current = notification
        setCount(next)
      }).catch(() => {})
    }
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [user?.role])

  if (user?.role !== 'client' || count <= 0) return null

  return (
    <Link
      to="/urgence"
      className="fixed top-4 right-4 z-[100] max-w-sm bg-yellow-100 border border-yellow-400 text-yellow-950 rounded-xl shadow-xl p-3 flex items-center gap-3"
    >
      <div className="w-10 h-10 bg-yellow-500 text-white rounded-xl flex items-center justify-center shrink-0">
        <MdNotifications size={22} />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm">Notification urgence</p>
        <p className="text-xs">L’admin a vu ou répondu à votre demande.</p>
      </div>
      <span className="bg-red-600 text-white min-w-6 h-6 px-1 rounded-full flex items-center justify-center text-xs font-bold">{count}</span>
    </Link>
  )
}

export default ClientUrgenceNotification
