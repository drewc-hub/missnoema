'use client'

import { useDescope, useSession, useUser } from '@descope/nextjs-sdk/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
    const sdk = useDescope()
    const { isAuthenticated, isLoading, isAuthenticated } = useSession()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleLogin = async (e) => {
        e.preventDefault()
        try {
            await sdk.login.emailPassword.login(email, password)
            router.push('/companions')
        } catch (err) {
            setError('Login failed')
        }
    }

    if (isLoading) return <p>Loading...</p>
    if (isAuthenticated) {
        if (typeof window !== 'undefined')
            router.push('/companions')
        return null
    }

    return (
        <form onSubmit={handleLogin} style={{display: 'grid', gap: '0.5rem', maxWidth: 300}}>
            <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit">Login</button>
            {error && <div style={{color: 'red'}}>{error}</div>}
        </form> 
    ) 
}
