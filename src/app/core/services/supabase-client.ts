import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Cliente Supabase único para el navegador. Se usa exclusivamente para
 * autenticación (Google OAuth). Consideraciones de seguridad:
 *
 * - `flowType: 'pkce'`: flujo OAuth con PKCE, recomendado para SPAs; evita
 *   exponer el token en el fragmento de URL como en el flujo implícito.
 * - `storage: sessionStorage`: la sesión no sobrevive al cierre de la pestaña
 *   (minimización de datos). sessionStorage persiste durante la redirección de
 *   OAuth porque ocurre en la misma pestaña.
 * - La clave publishable es pública por diseño; la autorización real vive en el
 *   backend (verificación de JWT + RLS), nunca en el cliente.
 */
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
