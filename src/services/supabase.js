import { createClient } from '@supabase/supabase-js'

// Get credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate credentials
if (!supabaseUrl) {
  throw new Error('❌ VITE_SUPABASE_URL is not defined in .env file')
}

if (!supabaseAnonKey) {
  throw new Error('❌ VITE_SUPABASE_ANON_KEY is not defined in .env file')
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

console.log('✅ Supabase connected to:', supabaseUrl)