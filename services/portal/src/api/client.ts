import axios from 'axios'

const DEV_TOKEN = 'dev-token'

export const apiClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${DEV_TOKEN}`,
  },
  timeout: 30000,
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default apiClient
