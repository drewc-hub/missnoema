'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      alert('Login failed')
    } else {
      router.push('/companions')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <form onSubmit={handleLogin} className="flex flex-col gap-4 p-6 bg-slate-800 rounded-xl">
        <input 
          className="rounded p-2 bg-slate-700 w-64" 
          onChange={e => setEmail(e.target.value)} 
        />
        <input 
          type="password" 
          className="rounded p-2 bg-slate-700" 
          onChange={(e) => setPassword(e.target.value)} 
        />
        <button className="bg-blue-600 text-white p-2 rounded">Sign In</button>
      </form>
    </div>
  )
}