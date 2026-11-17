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

## Sprint 1 (HU-01): flujo conversacional

1. Con PostgreSQL local (sin Docker), crea la base y aplica los scripts en orden:
   ```
   psql -U postgres -c "CREATE DATABASE salatiacoffee"
   psql -U postgres -d salatiacoffee -f database/schema.sql
   psql -U postgres -d salatiacoffee -f database/seed.sql
   psql -U postgres -d salatiacoffee -f database/migracion_01_sesion_chat.sql
   ```
   Si usas Docker con un volumen ya creado, aplica solo la migración.
2. Ajusta `backend/.env` (ver `backend/.env.example`). Sin `WHATSAPP_ACCESS_TOKEN` o
   `WHATSAPP_PHONE_NUMBER_ID`, las respuestas del bot se imprimen en consola (modo simulado).
3. Probar sin WhatsApp con el simulador (no existe si `NODE_ENV=production`):
   ```
   curl -X POST http://localhost:3000/simulador/mensaje -H "Content-Type: application/json" -d "{\"telefono\":\"573001234567\",\"texto\":\"Hola MESA-3\"}"
   ```
4. Enlace para el QR de una mesa: `GET /mesas/:id/qr` (requiere `WHATSAPP_NUMERO_PUBLICO`).
5. Pruebas: `cd backend && npm test`. La prueba de integración usa la base de `backend/.env`
   y borra al terminar los datos que crea (teléfonos `579999...`).

## Tecnologías

Node.js, Express, PostgreSQL, Angular, Socket.IO (Sprint 2), WhatsApp Business Platform (Cloud API), Docker, GitHub.
