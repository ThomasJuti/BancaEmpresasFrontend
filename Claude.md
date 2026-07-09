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