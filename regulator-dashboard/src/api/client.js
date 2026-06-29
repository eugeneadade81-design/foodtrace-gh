import axios from 'axios'

// Where the JWT lives between sessions. Role 1 (Auth) issues the real token;
// this app only stores and attaches it.
const TOKEN_KEY = 'foodtrace_jwt'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// Single axios instance for the whole app. Base URL comes from the build-time
// env so Day 12 can point it at the deployed Elastic Beanstalk backend.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081',
})

// Attach the bearer token to every outgoing request.
client.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A 401 means the token is missing/expired — drop it so ProtectedRoute bounces
// the user back to the login screen.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear()
    }
    return Promise.reject(error)
  },
)

export default client
