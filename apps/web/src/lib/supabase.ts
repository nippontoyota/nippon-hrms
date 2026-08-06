import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://urtbiaobabeyexsfdjhw.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MunarmAa-9wPPJNeoecsmg_8gjubDdw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
