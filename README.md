# Banca Empresas — Frontend

> Portal del asesor comercial para el pipeline de **Tarjeta de Crédito LATAM Business** — Banco de Bogotá.

**Backend conectado:** [https://bebackend.vercel.app/api](https://bebackend.vercel.app/api)

---

## ¿Qué resuelve?

Es la **interfaz operativa** del pipeline bancario. El asesor ve en un solo lugar:

- Qué empresas son elegibles y en qué etapa está cada caso
- Resultados de llamadas con IA (transcripción, calificación, grabación)
- Formulario Power App **pre-diligenciado** desde la llamada
- Confirmación de entrega y seguimiento post-activación
- Reportes de avance de campaña

El cliente final también interactúa: recibe un email con link para **confirmar recepción de tarjetas** sin necesidad de login.

---

## Recorrido del asesor

```
Portafolio          Detalle empresa         Llamada IA           Power App
(pipeline)    →    (etapas visuales)   →   (Fonema.ia)     →   (prefill + PDF)
     │                                                              │
     └──────────────── Reportes ← Seguimiento ← Confirmar entrega ┘
```

| Pantalla | Ruta | Para qué sirve |
|----------|------|----------------|
| **Portafolio / Pipeline** | `/portafolio/pipeline` | Lista de empresas y casos activos |
| **Detalle empresa** | `/portafolio/:companyId` | Etapas del pipeline, acciones por etapa |
| **Llamadas** | `/llamadas` | Disparar llamadas, transcripciones y campañas batch |
| **Power App** | (desde detalle) | Radicar solicitud con prefill de la llamada |
| **Seguimiento** | `/seguimiento` | Casos post-activación |
| **Reportes** | `/reportes` | Métricas de avance |
| **Confirmar entrega** | `/confirmar-entrega?token=…` | **Pública** — confirmación del cliente |

---

## Momentos clave para evaluar

### 1. Handoff llamada → formulario

Tras una llamada calificada, el frontend consume `GET /api/sales-calls/calls/:id/handoff` y pre-diligencia el formulario Power App. El asesor solo sube el PDF de Cámara de Comercio.

### 2. Pipeline visual

Cada empresa tiene un caso que avanza por etapas. Avance automático (webhook Fonema) o manual (HITL).

### 3. Confirmación de entrega

Flujo público con token de un solo uso. Al confirmar, el backend dispara el seguimiento post-activación.

### 4. Consulta RUES

Validación de Cámara de Comercio vía `POST /api/power-apps/rues/consultar`.

---

## Detalles técnicos

### Arquitectura

**Feature-based architecture** con lazy loading:

```
src/app/
├── core/           # Auth, guards, Supabase client, interceptors
├── shared/         # Layout, componentes reutilizables, validadores
└── features/
    ├── auth/                 # Login, callback OAuth
    ├── portfolio/            # Pipeline y detalle empresa
    ├── calls/                  # Llamadas y campañas
    ├── power-app/              # Formulario de radicación
    ├── delivery-confirmation/  # Página pública de confirmación
    ├── follow-up/              # Seguimiento post-activación
    └── reports/                # Reportes
```

**Reglas de dependencia:**

- Features no importan internals de otras features
- Comunicación entre módulos vía servicios HTTP al backend o contratos en `shared/`
- Componentes = presentación; lógica en servicios inyectables
- Estado reactivo con **Angular Signals** (`signal`, `computed`)

### Stack

| Capa | Tecnología |
|------|------------|
| Framework | Angular 17 — standalone components |
| Routing | Lazy loading por feature (`loadComponent` / `loadChildren`) |
| Estado | Angular Signals |
| Estilos | SCSS + Tailwind CSS |
| Auth | Supabase Auth (Google OAuth) |
| HTTP | `HttpClient` + servicios por feature |
| Tests | Vitest + `@analogjs/vite-plugin-angular` + jsdom |
| Deploy | Vercel (SPA rewrite → `index.html`) |

### Rutas y guards

Definidas en `src/app/app.routes.ts`:

| Ruta | Guard | Carga |
|------|-------|-------|
| `/login` | — | Lazy `auth.routes` |
| `/auth/callback` | — | OAuth callback Supabase |
| `/confirmar-entrega` | — | Pública, sin auth |
| `/portafolio/*` | `authGuard` | Lazy `portfolio.routes` |
| `/llamadas` | `authGuard` | Lazy component |
| `/seguimiento/*` | `authGuard` | Lazy `follow-up.routes` |
| `/reportes/*` | `authGuard` | Lazy `reports.routes` |
| `/` | — | Redirect → `/portafolio/pipeline` |

Layout principal (`MainLayoutComponent`) envuelve todas las rutas autenticadas.

### Autenticación

| Entorno | Comportamiento |
|---------|----------------|
| **Producción** | Supabase OAuth (Google) → `/auth/callback?returnUrl=…` |
| **Desarrollo** | Usuario mock local (sin OAuth) para agilizar pruebas |

Estado en `AuthService` con Signals: `user`, `isAuthenticated`. El guard bloquea rutas internas; la confirmación de entrega es pública por diseño (token en URL).

### Integración con backend

Base URL desde `environment.apiBaseUrl`:

| Servicio frontend | Endpoints consumidos |
|-------------------|---------------------|
| `PortfolioService` / pipeline | `GET /api/file-matching/clientes-finales`, `GET /api/pipeline/cases/by-lead/:id` |
| `SalesCallsService` | `GET/POST /api/sales-calls/calls`, `/batches`, `/calls/:id/handoff`, `/calls/:id/recording` |
| Power App | `POST /api/power-apps/submit`, `POST /api/power-apps/rues/consultar` |
| Delivery | `GET /api/delivery-confirmation/confirmations/:token`, `POST /confirm` |
| Follow-up | `GET/POST /api/activation-follow-up/cases` |

Contrato completo → [OpenAPI del backend](../BancaEmpresasBackend/public/docs/openapi.yaml)

### Handoff — flujo en UI

```
1. Asesor ve llamada calificada en /llamadas o detalle empresa
2. Frontend → GET /calls/:id/handoff
3. Respuesta PowerAppPrefill → bind al formulario reactivo
4. Asesor adjunta PDF Cámara de Comercio
5. POST /power-apps/submit → decision + issues por campo
```

Mapeo de campos alineado con el backend: segmento, identificaciones, cupo, BIN, entrega (`puntoEntrega`, dirección, ciudad, oficina).

### Build y despliegue

Angular no expone `process.env` en el browser. En Vercel:

```
prebuild → scripts/generate-env.js → src/environments/environment.prod.ts
build    → ng build → dist/fe-tmp/browser/
```

**Variables Vercel:**

| Variable | Default prod |
|----------|--------------|
| `API_BASE_URL` | `https://bebackend.vercel.app/api` |
| `SUPABASE_URL` | Proyecto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon/publishable) |

**`vercel.json`:** rewrite SPA `/(.*) → /index.html`, output `dist/fe-tmp/browser`.

### Validaciones (cliente)

Validadores en `shared/utils/` alineados con Zod del backend:

- Cédula colombiana (longitud, dígito verificador)
- NIT (9–10 dígitos, reglas de formato)
- Cupo, campos obligatorios Power App
- Adjuntos PDF

Errores del backend (`issues[]`) se muestran por campo con `severity` y `suggestion`.

---

## Calidad y pruebas

| Métrica | Valor |
|---------|-------|
| Tests | 103 (Vitest) |
| Archivos | 15 `*.spec.ts` |
| Cobertura (utils + services) | >95% líneas |

```bash
npm run test
npm run test:coverage
```

Setup en `src/test-setup.ts` con `@analogjs/vite-plugin-angular` para compatibilidad Zone.js. Los `*.spec.ts` no entran al bundle de producción.

---

## Cómo correrlo localmente

```bash
npm install
npm start          # → http://localhost:4200
```

Config dev en `src/environments/environment.ts`:

```typescript
apiBaseUrl: 'http://localhost:3000/api'  // backend local
```

Levantar backend en paralelo: `cd ../BancaEmpresasBackend && npm run dev`

---

## Seguridad

- OAuth en producción; guards en rutas internas (UX, no seguridad real — eso es backend)
- Solo publishable key de Supabase en el frontend
- Validación en cliente + servidor
- Token de confirmación de entrega: un solo uso, sin sesión
- No persistir PII en `localStorage`

---

## Repos relacionados

| Repo | Rol |
|------|-----|
| **Este repo** | Portal del asesor + confirmación de entrega |
| **BancaEmpresasBackend** | Pipeline, IA de voz, validaciones, emails, crons |

---

*Banca Empresas — Hackathon TC LATAM Business · Banco de Bogotá*
