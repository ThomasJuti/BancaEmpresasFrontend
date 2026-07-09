## Principios de desarrollo

Todo desarrollo en este proyecto debe adherirse estrictamente a los siguientes principios:

### Arquitectura y diseño
- **Clean Architecture**: separar el dominio de negocio de la infraestructura (HTTP, storage) y de la capa de presentación. Los componentes no deben contener lógica de negocio ni llamadas directas a servicios HTTP.
- **Clean Code**: código legible, nombres descriptivos, componentes pequeños con una sola responsabilidad, sin lógica compleja en templates.
- **SOLID**:
  - **S** — Single Responsibility: cada componente/servicio/clase tiene una única razón para cambiar.
  - **O** — Open/Closed: abierto para extensión (herencia, composición), cerrado para modificación.
  - **L** — Liskov Substitution: las implementaciones deben ser sustituibles por sus abstracciones.
  - **I** — Interface Segregation: interfaces pequeñas y específicas.
  - **D** — Dependency Inversion: los componentes dependen de abstracciones (servicios inyectados), no de implementaciones concretas.
- **Modularidad**: organizar el código en módulos Angular cohesivos (`CoreModule`, `SharedModule`, feature modules). Cada módulo debe ser autocontenido y tener responsabilidad clara.
- **DRY**: evitar duplicación en templates, servicios y lógica de estado.
- **YAGNI**: no añadir funcionalidad especulativa ni abstracciones prematuras.

### Ciberseguridad

Al tratarse de un producto financiero (banca de empresas), toda contribución debe seguir estas prácticas:

- **Sin secretos en código**: nunca hardcodear credenciales, API keys, tokens o connection strings. Usar variables de entorno o el gestor de secretos del proyecto (Secret Manager, Vault, etc.). Verificar que no se filtren en logs, commits ni mensajes de error.
- **Validación de entradas**: validar y sanear toda entrada del usuario o de servicios externos (tipo, formato, longitud, rango) tanto en frontend como en backend. Nunca confiar solo en la validación del cliente.
- **Prevención OWASP Top 10**: especial atención a inyección (SQL/NoSQL/command), XSS, deserialización insegura, SSRF y control de acceso roto (broken access control). Usar consultas parametrizadas/ORM, escapar salida HTML (evitar `innerHTML`/`bypassSecurityTrust*` sin justificación), y nunca construir queries o comandos por concatenación de strings.
- **Autenticación y autorización**: verificar autorización en cada endpoint (no solo autenticación), aplicando el principio de mínimo privilegio. No confiar en guards/controles de acceso implementados solo en el frontend; son UX, no seguridad.
- **Gestión de dependencias**: mantener dependencias actualizadas y revisar vulnerabilidades conocidas (`npm audit`, Dependabot/Snyk) antes de introducir librerías nuevas.
- **Comunicación segura**: forzar HTTPS/TLS en todas las integraciones; no deshabilitar validación de certificados.
- **Logging seguro**: no loguear información sensible (contraseñas, tokens, PII, datos financieros) en consola ni en servicios de monitoreo del cliente.
- **Manejo de errores**: no exponer stack traces, rutas internas ni detalles de infraestructura en mensajes mostrados al usuario; mostrar mensajes de error genéricos y registrar el detalle solo en logs internos.

### Tratamiento de datos

Dado que el sistema maneja datos de clientes y operaciones financieras de empresas, aplican los siguientes lineamientos:

- **Minimización de datos**: solicitar, procesar y almacenar (incluyendo `localStorage`/`sessionStorage`/estado en memoria) únicamente los datos estrictamente necesarios para la funcionalidad. Evitar cachear datos sensibles en el cliente más tiempo del necesario.
- **Clasificación de datos sensibles**: tratar como sensibles (mínimo) datos de identificación de clientes/empresas, información financiera, saldos, transacciones y credenciales. No persistir estos datos en almacenamiento del navegador sin cifrado cuando sea evitable.
- **Enmascaramiento/anonimización**: en ambientes no productivos (dev, pruebas, demos) usar datos ficticios o anonimizados; no usar dumps de datos reales de clientes.
- **Control de acceso a datos en UI**: mostrar solo los campos que el rol del usuario necesita ver; evitar renderizar u ocultar solo visualmente datos sensibles que el backend ya envió de más.
- **Trazabilidad**: las acciones del usuario sobre datos sensibles deben quedar auditadas del lado del backend; el frontend no debe ser la única fuente de verdad para el registro de auditoría.
- **Cumplimiento normativo**: seguir lineamientos de protección de datos aplicables al sector financiero (habeas data / normativa local de protección de datos personales); no implementar mecanismos que dificulten el derecho del titular a la consulta, corrección o eliminación de sus datos.