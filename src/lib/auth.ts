// src/lib/auth.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type AuthUser = {
  id: string
  email: string
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookies) {
        cookies().set(cookies)
      }
    }
  })
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return {
      id: user.id,
      email: user.email ?? '',
    }
  }

  return null
}
