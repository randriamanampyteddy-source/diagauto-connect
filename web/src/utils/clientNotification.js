import { playUrgenceSound } from './alertSound'

export const demanderPermissionNotificationClient = async () => {
  try {
    const localNotifications = window.Capacitor?.Plugins?.LocalNotifications
    if (localNotifications) await localNotifications.requestPermissions()
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  } catch {
    // Permission refusal must not block the client application.
  }
}

export const notifierReponseUrgenceClient = async () => {
  playUrgenceSound()
  const title = 'Réponse urgence DiagAuto Mada'
  const body = 'L’admin a vu, répondu ou modifié votre demande de dépannage.'

  try {
    const localNotifications = window.Capacitor?.Plugins?.LocalNotifications
    if (localNotifications) {
      await localNotifications.schedule({
        notifications: [{
          id: Date.now() % 2147483647,
          title,
          body,
          schedule: { at: new Date(Date.now() + 250) },
          sound: 'default',
        }],
      })
      return
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  } catch {
    // The in-app sound and banner remain available.
  }
}
