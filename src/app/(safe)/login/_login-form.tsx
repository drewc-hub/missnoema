'use client'

import { useDescope, useSession } from '@descope/nextjs-sdk'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const sdk = useDescope()
  const root = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const resp = await sdk.login.emailPassword.login(email, password)
      sessionStorage.setItem('sessionJwt', resp.data.sessionJwt)
      router.push('/companions')
    } catch (err) {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="p-8 max-w-sm mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Continue</button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  )
}