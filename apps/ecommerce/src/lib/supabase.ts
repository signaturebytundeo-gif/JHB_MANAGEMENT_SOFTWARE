import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

/**
 * Server-side Supabase client. Uses the service role key (bypasses RLS)
 * when available, falling back to the anon key.
 * Only call from API routes / server actions — never from client components.
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceKey || anonKey

  if (!url || !key) {
    throw new Error('Supabase URL and key must be set in environment variables')
  }

  _supabase = createClient(url, key)
  return _supabase
}
