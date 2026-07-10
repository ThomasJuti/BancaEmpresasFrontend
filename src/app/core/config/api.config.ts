import { environment } from '../../../environments/environment';

// Raíz del API del backend de Banca Empresas (p. ej. https://host/api).
// El valor real se define en src/environments/*.ts. En producción,
// environment.prod.ts se genera en build-time a partir de la variable
// de entorno API_BASE_URL configurada en Vercel (ver scripts/generate-env.js).
export const API_BASE_URL = environment.apiBaseUrl;

// Rutas base por feature del backend (clean architecture: cada feature
// expone su propio prefijo bajo el mismo API root).
export const SALES_CALLS_API = `${API_BASE_URL}/sales-calls`;
export const FILE_MATCHING_API = `${API_BASE_URL}/file-matching`;
export const POWER_APPS_API = `${API_BASE_URL}/power-apps`;
export const PIPELINE_API = `${API_BASE_URL}/pipeline`;
