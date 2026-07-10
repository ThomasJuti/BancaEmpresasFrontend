# Pruebas locales — integración RUES (Cámara de Comercio)

Flujo con **tres servicios**: frontend Angular, backend Node y microservicio Python RUES.

## 1. Microservicio RUES (`microservicio camara de comercio/`)

Tras renombrar la carpeta, recrea el entorno virtual si los scripts fallan:

```bash
cd "/Users/JTORREN/Documents/VsCode/Hackaton/microservicio camara de comercio"
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
uvicorn api_server:app --host 0.0.0.0 --port 8765
```

Verificar:

```bash
curl http://localhost:8765/health
```

Mock local (sin scrape):

```bash
curl -X POST http://localhost:8765/consultar/mock \
  -H "Content-Type: application/json" \
  -d '{"nit":"901183139"}'
```

**Producción (Railway):** `https://microservicio-camara-comercio-production.up.railway.app`

## 2. Backend (`BancaEmpresasBackend`)

En `.env`:

```env
RUES_ENABLED=true
# Local:
RUES_SERVICE_URL=http://localhost:8765
# O Railway:
# RUES_SERVICE_URL=https://microservicio-camara-comercio-production.up.railway.app
RUES_MOCK_ENABLED=true
RUES_REQUEST_TIMEOUT_MS=240000
```

`RUES_MOCK_ENABLED=true` hace que el backend use `/consultar/mock` cuando el scrape real falle o en desarrollo.

Arrancar:

```bash
cd BancaEmpresasBackend
npm run dev
```

Verificar:

```bash
curl http://localhost:3000/api/power-apps/rues/health
```

## 3. Frontend (`BancaEmpresasFrontend`)

En `src/environments/environment.ts` apuntar al backend local:

```ts
apiBaseUrl: 'http://localhost:3000/api',
```

Arrancar:

```bash
npm start
```

## 4. Flujo en Power App

1. Abrir pipeline de una empresa → **Solicitud LATAM Business**.
2. Pestaña **Documentos** → **Consultar Cámara de Comercio (RUES)**.
3. Revisar panel de comparación (NIT, razón social, matrícula, representantes).
4. Si hay advertencia de representante legal ≠ tarjetahabiente, marcar el checkbox de confirmación.
5. Alternativa: subir PDF manual (genera advertencia `RUES_MANUAL_PDF_SIN_CONSULTA`).
6. Enviar solicitud.

## Variables en Vercel (backend producción)

```env
RUES_ENABLED=true
RUES_SERVICE_URL=https://microservicio-camara-comercio-production.up.railway.app
RUES_MOCK_ENABLED=false
RUES_REQUEST_TIMEOUT_MS=240000
```

Redeploy del backend tras cambiar variables.
