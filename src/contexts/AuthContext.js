'use client';
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) {
      setUser(data?.session?.user ?? null)
    })
    supabase.auth.onAuthStateChange((event, session) => setUser(session?.user)
    
    return () => unsub()
  }, [])

  const login = (email, password) => supabase.auth.signInWithPassword({email, password})
  const signup = (email, password) => supabase.auth.signUp({email, password})
  const logout = () => supbase.auth.signOut()
  
  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth() {
  return useContext(AuthCtx)
}

function ProtectedRoute({children}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
}

