import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('sms_user')
    const token = localStorage.getItem('sms_token')
    if (saved && token) {
      setUser(JSON.parse(saved))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { data } = res.data
    const token = data.token
    localStorage.setItem('sms_token', token)
    localStorage.setItem('sms_user', JSON.stringify(data))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(data)
    return data
  }

  const logout = () => {
    localStorage.removeItem('sms_token')
    localStorage.removeItem('sms_user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
