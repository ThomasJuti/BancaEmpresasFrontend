// Genera src/environments/environment.prod.ts a partir de la variable de
// entorno API_BASE_URL (configurada en Vercel > Project > Settings >
// Environment Variables). Angular no expone process.env en el navegador,
// así que este valor debe "hornearse" en el bundle durante el build.
const fs = require('fs');
const path = require('path');

const fallbackUrl = 'https://bebackend.vercel.app/api';
const apiBaseUrl = process.env['API_BASE_URL'] || fallbackUrl;

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

const fileContent = `export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}',
};
`;

fs.writeFileSync(targetPath, fileContent);
console.log(`[generate-env] environment.prod.ts -> apiBaseUrl = ${apiBaseUrl}`);
