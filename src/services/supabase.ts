import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve Supabase credentials from Vite environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

/**
 * Checks if real Supabase credentials have been configured in .env
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
};

// Create a singleton Supabase client
// If environment variables are missing, instantiate with a placeholder domain
// so imports won't crash at startup; operations will gracefully check isSupabaseConfigured()
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'hostel_ease_supabase_auth'
    }
  }
);

export default supabase;
