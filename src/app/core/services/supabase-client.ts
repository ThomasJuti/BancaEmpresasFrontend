import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) {
    return client;
  }

  const { url, publishableKey } = environment.supabase;

  client = createClient(url, publishableKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      storageKey: 'orus.auth',
    },
  });

  return client;
}
