import { createContext, useCallback, useContext, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStore.get())

  const login = useCallback(async (username, password) => {
    if (!username || !password) {
      throw new Error('Enter your username and password')
    }
    // NOTE: Role 1 owns authentication. When their endpoint is live, replace the
    // block below with:
    //   const { data } = await client.post('/auth/login', { username, password })
    //   const issued = data.token
    // For now we mint a local dev token so the dashboard is demoable end-to-end
    // and the JWT plumbing (storage + interceptor) is exercised exactly as it
    // will be in production.
    const issued = btoa(`${username}:${Date.now()}`)
    tokenStore.set(issued)
    setToken(issued)
    return true
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: Boolean(token), login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

/** Wraps protected routes; redirects to /login when there's no token. */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
