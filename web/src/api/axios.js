import axios from 'axios'
import { getApiBaseUrl } from '../utils/apiServer'
import { getDeviceId } from '../utils/deviceId'

const api = axios.create({
  baseURL: getApiBaseUrl()
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Device-Id'] = getDeviceId()
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
