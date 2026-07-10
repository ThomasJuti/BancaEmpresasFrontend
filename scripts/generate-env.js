// Genera src/environments/environment.prod.ts a partir de variables de entorno
// configuradas en Vercel. Angular no expone process.env en el navegador, así que
// estos valores públicos deben "hornearse" en el bundle durante el build.
const fs = require('fs');
const path = require('path');

const fallbackUrl = 'https://bebackend.vercel.app/api';
const apiBaseUrl = process.env['API_BASE_URL'] || fallbackUrl;
const supabaseUrl =
  process.env['SUPABASE_URL'] || 'https://eewlfdnhmzkgqshzfkeu.supabase.co';
const supabasePublishableKey =
  process.env['SUPABASE_PUBLISHABLE_KEY'] || 'sb_publishable_F7zoNxKxenw73wvf5YcWpQ_8juApRkG';

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

const fileContent = `export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}',
  supabase: {
    url: '${supabaseUrl}',
    publishableKey: '${supabasePublishableKey}',
  },
};
`;

fs.writeFileSync(targetPath, fileContent);
console.log(`[generate-env] environment.prod.ts -> apiBaseUrl = ${apiBaseUrl}, supabaseUrl = ${supabaseUrl}`);
