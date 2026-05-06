'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'

type Auth = {
  user: User | null
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => void
}

const AuthContext = createContext({ user: undefined, signIn, signOut })  
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children, user, sign
Out }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(r => setUser(r.data.session?.user))
    const sub = supabase.auth.onAuthStateChange((e, s) => setUser(s?.user))
    return () => sub.subscription.unsubscribe()
  })

  const signOut = () => supabase.auth.signOut()
  
return (
    <AuthContext.Provider value={{
     user, signIn: (e,p) => supabase.auth.signIn({email: e, password: p}), signOut}>
      {children}
    </AuthContext.Provider>
  )
}
