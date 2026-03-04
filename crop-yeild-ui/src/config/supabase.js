import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// ✅ Better developer diagnostics (non-blocking in prod)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase env missing. Check REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
  );
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-application-name': 'cropwise-app'
      }
    }
  }
);