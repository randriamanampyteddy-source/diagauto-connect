const STORAGE_KEY = 'diagauto_device_id'

const randomPart = () => Math.random().toString(36).slice(2)

export const getDeviceId = () => {
  let deviceId = localStorage.getItem(STORAGE_KEY)
  if (deviceId) return deviceId

  if (window.crypto?.randomUUID) {
    deviceId = window.crypto.randomUUID()
  } else {
    deviceId = `${Date.now().toString(36)}-${randomPart()}-${randomPart()}`
  }

  localStorage.setItem(STORAGE_KEY, deviceId)
  return deviceId
}
