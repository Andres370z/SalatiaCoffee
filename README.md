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
   Crea la base `salatiacoffee` con las tablas, la migración del Sprint 1 y datos de ejemplo.
   Se publica en el puerto **5433** del equipo (para no chocar con un PostgreSQL local en el 5432);
   en `backend/.env` usa `DB_PORT=5433`.
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

## Sprint 2: API del panel (backend)

Todas las rutas, salvo `/auth/login`, exigen el encabezado `Authorization: Bearer <token>`.

1. Crea el primer administrador, de una de estas dos formas (la contraseña se guarda con hash):
   - **Por consola** (la contraseña se pide sin mostrarla):
     ```
     cd backend
     npm run usuario:crear -- admin "Nombre Apellido" administrador
     ```
   - **Por API:** define `ADMIN_INICIAL_TOKEN=<una clave larga>` en `backend/.env`, reinicia el servidor y envía
     `POST /auth/primer-admin` con `{"clave_inicial": "...", "usuario": "admin", "nombre": "Nombre Apellido", "contrasena": "..."}`.
     Solo funciona mientras no exista ningún usuario y está desactivado si la variable está vacía. Después de usarlo, quítala del `.env`.

   Con un administrador ya creado, los demás usuarios se crean con `POST /usuarios` (ver tabla).
2. Inicia sesión: `POST /auth/login` con `{"usuario": "...", "contrasena": "..."}` devuelve un token válido por 8 horas.

| Método y ruta | Rol | Función |
| --- | --- | --- |
| `POST /auth/login` | público | Iniciar sesión (RF-10) |
| `POST /auth/primer-admin` | clave inicial | Crear el primer administrador (solo si no hay usuarios) |
| `POST /usuarios` con `{"usuario","nombre","contrasena","rol"}` | administrador | Crear personal u otros administradores |
| `GET /pedidos?estado=recibido,listo&fecha=AAAA-MM-DD&limite=100` | personal, administrador | Listar pedidos (hora de Colombia) |
| `GET /pedidos/:id` | personal, administrador | Detalle con historial de estados |
| `PATCH /pedidos/:id/estado` con `{"estado": "en_preparacion"}` | personal, administrador | Cambiar estado (RF-06) |
| `GET /productos`, `GET /categorias` | personal, administrador | Consultar el menú |
| `POST /productos`, `PUT /productos/:id` | administrador | Crear, editar o desactivar (`{"disponible": false}`) (RF-08) |

**Atajo para pruebas (no existe con `NODE_ENV=production`):** `POST /simulador/pedido` con
`{"telefono": "573001234567", "mesa": 3}` crea un pedido de una vez (1 unidad del primer producto disponible).
Opcionalmente: `"items": [{"id_producto": 1, "cantidad": 2, "nota": "sin azúcar"}]`. Usa la misma lógica que el chat
(precios y total de la base, historial y evento `pedido:nuevo`) pero registra por su cuenta la autorización de datos del teléfono de prueba.

Estados: `recibido` → `en_preparacion` → `listo` → `entregado`. Solo se puede pasar a `cancelado` desde `recibido`; un salto no permitido responde 409.

**Tiempo real (Socket.IO)**, en el mismo puerto: el panel se conecta con `io(url, { auth: { token } })` y escucha
`pedido:nuevo` (pedido completo) y `pedido:estado` (`{ id, estado, estado_anterior, cambiado_en }`).
Los pedidos que se envían al panel no incluyen el teléfono del cliente.

Cuando un pedido pasa a `listo`, se avisa al cliente por WhatsApp (RF-07); sin credenciales de Meta el mensaje se imprime en consola.

## Tecnologías

Node.js, Express, PostgreSQL, Angular, Socket.IO (Sprint 2), WhatsApp Business Platform (Cloud API), Docker, GitHub.
