import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { demanderPermissionNotificationClient, notifierReponseUrgenceClient } from '../utils/clientNotification'

const ClientUrgenceNotification = () => {
  const { user } = useAuth()
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
        }
        previousNotification.current = notification
      }).catch(() => {})
    }
    load()
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [user?.role])

  return null
}

export default ClientUrgenceNotification
