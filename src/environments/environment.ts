export const environment = {
  production: false,
  apiBaseUrl: 'https://bebackend.vercel.app/api',
  supabase: {
    // URL pública del proyecto y clave publishable (anon). La clave publishable
    // está diseñada para exponerse en el cliente; la seguridad real la impone
    // RLS + verificación de JWT en el backend, no el secreto de esta clave.
    url: 'https://eewlfdnhmzkgqshzfkeu.supabase.co',
    publishableKey: 'sb_publishable_F7zoNxKxenw73wvf5YcWpQ_8juApRkG',
  },
};
