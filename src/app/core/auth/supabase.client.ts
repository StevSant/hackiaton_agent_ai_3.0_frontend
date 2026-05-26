import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../config/env';

export const supabase: SupabaseClient = createClient(
  environment.supabaseUrl || 'http://localhost',
  environment.supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
