'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

type AuthContextType = {
  user: User | null
  loading: boolean
  signOut: () => void
  signIn: (em, pw) => Promise<void>
  signUp: (e, p) => Promise<void>
}

const AuthStateContext = createContext<AuthState>(null)


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Active session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    supabase.auth.onAuthStateChanged((event, session) => {
      setUser(session?.user ?? null)
    })
  }, [])

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }).then(({ error }) => {
      if (error) throw error;
    })
  
  const signUp = (email: string, password: string) =>
    supabase.auth.signUp({ email, password })

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthStateContext.Provider value={{ user, signIn, signUp, logout, loading }}>
      {children}
    </AuthStateContext.Provider>
}

export const useAuth = () => useContext(AuthStateContext)
