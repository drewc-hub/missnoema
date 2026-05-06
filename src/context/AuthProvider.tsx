'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient, User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, anonKey)

export const AuthContext = createContext<{
  user: User | null
  setIsAuthenticated: (val: boolean) => void
  loading: boolean
  login: (eml: string, pw: string) => Promise<void>
  logout: () => void
}>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth() {
  const context= useContext(AuthContext)
  if (!context) throw Error('useAuth must be inside AuthProvider')
  return context
}
