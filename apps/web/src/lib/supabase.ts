import { createClient } from '@supabase/supabase-js';

// Same Supabase project as the Go API (nipponhrms / urtbiaobabeyexsfdjhw).
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://urtbiaobabeyexsfdjhw.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MunarmAa-9wPPJNeoecsmg_8gjubDdw';

/** HR dashboard — auth, storage, and authenticated API calls. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Public pages (/refer, etc.) — never reuse a stored HR session.
 * Without this, inserts hit RLS as `authenticated` and return 403.
 */
export const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
