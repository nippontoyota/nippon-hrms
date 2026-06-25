import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for Nippon Toyota HRMS.
 *
 * Environment variables are loaded from .env.local (git-ignored).
 * Copy .env.local.example → .env.local and fill in your project credentials.
 *
 * VITE_SUPABASE_URL        → Project URL (e.g. https://xxxx.supabase.co)
 * VITE_SUPABASE_ANON_KEY   → Public anon key (safe to expose in browser)
 */
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
  // Warn loudly in dev; in prod the app still loads but DB calls will fail.
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.\n' +
    'Copy apps/web/.env.local.example → apps/web/.env.local and add your credentials.'
  );
}

export const supabase = createClient(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseAnon ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export default supabase;
