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
}

export const notifierRendezvousClient = async () => {
  playUrgenceSound()
  const title = 'Rendez-vous DiagAuto Mada'
  const body = 'Nouveau message ou mise a jour de votre rendez-vous.'

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
    // The in-app sound remains available.
  }
}
