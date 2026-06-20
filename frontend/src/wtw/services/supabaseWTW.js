import { createClient } from '@supabase/supabase-js'

export const supabaseWTW = createClient(
  import.meta.env.VITE_WTW_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_WTW_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'kairos-wtw-auth' } }
)
