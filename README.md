# SalatiaCoffee

Prototipo funcional (TRL5) para automatizar la toma y gestión de pedidos en cafeterías independientes mediante un flujo conversacional en WhatsApp y un panel administrativo web. Proyecto de grado, UNAD (curso 202016907), Fase 4.

**Metodología:** Scrum. **Tablero:** Jira (agregar enlace). **Documento maestro:** ver anexos del proyecto.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `backend/` | Servidor Node.js + Express: webhook de WhatsApp y API REST |
| `panel/` | Panel administrativo en Angular (Sprint 2) |
| `database/` | Esquema SQL y datos de ejemplo de PostgreSQL |
| `docs/evidencias/` | Pantallazos y registros de cada sprint |

## Puesta en marcha (Sprint 0)

1. Requisitos: Node.js 20 o superior, Docker y Git.
2. Base de datos:
   ```
   docker compose up -d
   ```
   Crea la base `salatiacoffee` con las tablas y datos de ejemplo.
3. Backend:
   ```
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```
4. Comprobar: abrir http://localhost:3000/salud. Debe responder `servidor: ok` y `baseDeDatos: ok`.

## Tecnologías

Node.js, Express, PostgreSQL, Angular, Socket.IO (Sprint 2), WhatsApp Business Platform (Cloud API), Docker, GitHub.
