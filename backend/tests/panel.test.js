// Integración del panel con PostgreSQL real: login (RF-10), pedidos en tiempo real (RF-05, RNF-02),
// cambio de estado con historial (RF-06, CP-04), aviso de listo (RF-07), acceso sin sesión (CP-05)
// y menú (RF-08, CP-06).
// Requisitos: backend/.env con la conexión y la base con schema.sql, seed.sql y la migración aplicados.
// Crea y borra sus propios datos: usuarios prueba_int_*, clientes 579998xxxxxx y un producto de prueba.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.JWT_SECRET ||= 'secreto-de-pruebas';

const { io: conectar } = require('socket.io-client');
const pool = require('../src/db');
const crearServidor = require('../src/servidor');
const { cerrarTiempoReal } = require('../src/realtime');
const { hashearContrasena } = require('../src/services/auth');
const whatsapp = require('../src/services/whatsapp');

jest.setTimeout(30000);

const CONTRASENA = 'Clave-de-prueba-1';
const USUARIOS = {
  admin: { usuario: 'prueba_int_admin', nombre: 'Admin Prueba', rol: 'administrador', activo: true },
  personal: { usuario: 'prueba_int_personal', nombre: 'Personal Prueba', rol: 'personal', activo: true },
  inactivo: { usuario: 'prueba_int_inactivo', nombre: 'Inactivo Prueba', rol: 'personal', activo: false },
};
const USUARIO_CREADO_POR_API = 'prueba_int_creado';
const NOMBRES_USUARIO = [...Object.values(USUARIOS).map((u) => u.usuario), USUARIO_CREADO_POR_API];
const PREFIJO_TELEFONO = '579998';
const TEL_PEDIDOS = `${PREFIJO_TELEFONO}000001`;
const TEL_MENU = `${PREFIJO_TELEFONO}000002`;
const PRODUCTO_PRUEBA = 'Producto de prueba CP-06';
const LIMITE_RNF02_MS = 5000;

let servidor;
let urlBase;
let mesa;
let tokens = {};
let sockets = [];
let envioWhatsApp;

async function limpiar() {
  await pool.query(
    'DELETE FROM pedido WHERE id_cliente IN (SELECT id FROM cliente WHERE telefono LIKE $1)',
    [`${PREFIJO_TELEFONO}%`],
  );
  await pool.query('DELETE FROM cliente WHERE telefono LIKE $1', [`${PREFIJO_TELEFONO}%`]);
  await pool.query('DELETE FROM sesion_chat WHERE telefono LIKE $1', [`${PREFIJO_TELEFONO}%`]);
  await pool.query('DELETE FROM producto WHERE nombre = $1', [PRODUCTO_PRUEBA]);
  await pool.query('DELETE FROM usuario_personal WHERE usuario = ANY($1)', [NOMBRES_USUARIO]);
}

async function api(metodo, ruta, { token, cuerpo } = {}) {
  const respuesta = await fetch(`${urlBase}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await respuesta.text();
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

async function iniciarSesion(usuario, contrasena = CONTRASENA) {
  return api('POST', '/auth/login', { cuerpo: { usuario, contrasena } });
}

async function chat(telefono, texto) {
  const { status, cuerpo } = await api('POST', '/simulador/mensaje', { cuerpo: { telefono, texto } });
  if (status !== 200) throw new Error(`Simulador respondió ${status}: ${JSON.stringify(cuerpo)}`);
  return cuerpo.respuesta;
}

async function conversar(telefono, mensajes) {
  let respuesta;
  for (const texto of mensajes) respuesta = await chat(telefono, texto);
  return respuesta;
}

// Pedido de 2 unidades del primer producto del menú con observación. Devuelve el id del pedido.
async function hacerPedido(telefono, { primeraVez }) {
  const inicio = primeraVez ? [`MESA-${mesa.numero}`, '1'] : ['menu'];
  const confirmacion = await conversar(telefono, [...inicio, '1', '1', '2', 'sin azúcar', '2', '1']);
  const id = confirmacion.match(/#(\d+)/);
  if (!id) throw new Error(`No se creó el pedido. Última respuesta del bot: ${confirmacion}`);
  return Number(id[1]);
}

function conectarSocket(token) {
  const socket = conectar(urlBase, { auth: { token }, reconnection: false, transports: ['websocket'] });
  sockets.push(socket);
  return socket;
}

function esperarEvento(socket, evento, ms = 8000) {
  return new Promise((resolver, rechazar) => {
    const temporizador = setTimeout(() => rechazar(new Error(`No llegó el evento ${evento} en ${ms} ms`)), ms);
    socket.once(evento, (datos) => {
      clearTimeout(temporizador);
      resolver(datos);
    });
  });
}

async function esperarHasta(condicion, ms = 3000) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (condicion()) return true;
    await new Promise((resolver) => setTimeout(resolver, 25));
  }
  return false;
}

beforeAll(async () => {
  try {
    await pool.query('SELECT 1 FROM sesion_chat LIMIT 1');
  } catch (error) {
    throw new Error(`No se pudo usar la base de datos. Revisa backend/.env y las migraciones. Detalle: ${error.message}`);
  }
  await limpiar();

  const hash = await hashearContrasena(CONTRASENA);
  for (const u of Object.values(USUARIOS)) {
    await pool.query(
      'INSERT INTO usuario_personal (nombre, usuario, contrasena_hash, rol, activo) VALUES ($1, $2, $3, $4, $5)',
      [u.nombre, u.usuario, hash, u.rol, u.activo],
    );
  }

  const mesas = await pool.query('SELECT id, numero FROM mesa WHERE activa ORDER BY numero LIMIT 1');
  if (mesas.rows.length === 0) throw new Error('La base no tiene mesas activas (¿aplicaste seed.sql?)');
  mesa = mesas.rows[0];

  envioWhatsApp = jest.spyOn(whatsapp, 'enviarMensaje').mockResolvedValue({ simulado: true });

  servidor = crearServidor();
  await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
  urlBase = `http://127.0.0.1:${servidor.address().port}`;

  tokens = {
    admin: (await iniciarSesion(USUARIOS.admin.usuario)).cuerpo.token,
    personal: (await iniciarSesion(USUARIOS.personal.usuario)).cuerpo.token,
  };
});

afterAll(async () => {
  sockets.forEach((socket) => socket.close());
  try {
    await limpiar();
  } finally {
    jest.restoreAllMocks();
    await cerrarTiempoReal();
    await pool.end();
  }
});

describe('Login (RF-10)', () => {
  test('con credenciales correctas devuelve token y datos del usuario, sin el hash', async () => {
    const { status, cuerpo } = await iniciarSesion(USUARIOS.personal.usuario);
    expect(status).toBe(200);
    expect(cuerpo.token).toEqual(expect.any(String));
    expect(cuerpo.usuario).toMatchObject({ usuario: USUARIOS.personal.usuario, rol: 'personal' });
    expect(JSON.stringify(cuerpo)).not.toMatch(/hash/i);
  });

  test('contraseña incorrecta, usuario inexistente y usuario inactivo dan el mismo 401', async () => {
    const malaClave = await iniciarSesion(USUARIOS.personal.usuario, 'incorrecta');
    const noExiste = await iniciarSesion('no_existe_nunca');
    const inactivo = await iniciarSesion(USUARIOS.inactivo.usuario);
    for (const respuesta of [malaClave, noExiste, inactivo]) {
      expect(respuesta.status).toBe(401);
      expect(respuesta.cuerpo).toEqual(malaClave.cuerpo);
    }
  });

  test('exige usuario y contraseña', async () => {
    expect((await api('POST', '/auth/login', { cuerpo: {} })).status).toBe(400);
    expect((await api('POST', '/auth/login', { cuerpo: { usuario: 'x', contrasena: 123 } })).status).toBe(400);
  });

  test('un JSON mal formado responde 400', async () => {
    const respuesta = await fetch(`${urlBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"usuario": ',
    });
    expect(respuesta.status).toBe(400);
  });
});

describe('Usuarios (RF-10)', () => {
  const nuevo = { usuario: USUARIO_CREADO_POR_API, nombre: 'Creado por API', contrasena: 'Otra-clave-1', rol: 'personal' };

  test('el administrador crea un usuario que luego puede iniciar sesión', async () => {
    const creado = await api('POST', '/usuarios', { token: tokens.admin, cuerpo: nuevo });
    expect(creado.status).toBe(201);
    expect(creado.cuerpo).toMatchObject({ usuario: nuevo.usuario, rol: 'personal', activo: true });
    expect(JSON.stringify(creado.cuerpo)).not.toMatch(/hash|contrasena/i);

    const { rows } = await pool.query('SELECT contrasena_hash FROM usuario_personal WHERE usuario = $1', [nuevo.usuario]);
    expect(rows[0].contrasena_hash).toMatch(/^\$2[aby]\$/);

    const sesion = await iniciarSesion(nuevo.usuario, nuevo.contrasena);
    expect(sesion.status).toBe(200);
    expect(sesion.cuerpo.usuario.rol).toBe('personal');
  });

  test('un usuario repetido responde 409', async () => {
    expect((await api('POST', '/usuarios', { token: tokens.admin, cuerpo: nuevo })).status).toBe(409);
  });

  test('el personal no puede crear usuarios', async () => {
    const respuesta = await api('POST', '/usuarios', { token: tokens.personal, cuerpo: { ...nuevo, usuario: 'prueba_int_otro' } });
    expect(respuesta.status).toBe(403);
  });

  test('POST /auth/primer-admin no hace nada si ya existen usuarios', async () => {
    process.env.ADMIN_INICIAL_TOKEN = 'clave-de-pruebas';
    try {
      const respuesta = await api('POST', '/auth/primer-admin', {
        cuerpo: { clave_inicial: 'clave-de-pruebas', usuario: 'prueba_int_intruso', nombre: 'Intruso', contrasena: 'Clave-intruso-1' },
      });
      expect(respuesta.status).toBe(409);
      const { rows } = await pool.query("SELECT 1 FROM usuario_personal WHERE usuario = 'prueba_int_intruso'");
      expect(rows).toHaveLength(0);
    } finally {
      delete process.env.ADMIN_INICIAL_TOKEN;
    }
  });
});

describe('CP-05: acceso sin sesión', () => {
  test.each([
    ['GET', '/pedidos'],
    ['GET', '/pedidos/1'],
    ['PATCH', '/pedidos/1/estado'],
    ['GET', '/productos'],
    ['POST', '/productos'],
    ['PUT', '/productos/1'],
    ['GET', '/categorias'],
  ])('%s %s sin token responde 401', async (metodo, ruta) => {
    expect((await api(metodo, ruta, { cuerpo: metodo === 'GET' ? undefined : {} })).status).toBe(401);
  });

  test('un token falso responde 401', async () => {
    expect((await api('GET', '/pedidos', { token: 'no.es.un.token' })).status).toBe(401);
  });

  test('el tiempo real rechaza conexiones sin token válido', async () => {
    const socket = conectarSocket('falso');
    const error = await new Promise((resolver) => socket.once('connect_error', resolver));
    expect(error.message).toBe('No autorizado');
  });
});

describe('Pedidos en tiempo real, estados e historial (RF-05, RF-06, RF-07, CP-04, RNF-02)', () => {
  let idPedido;

  test('RNF-02: el pedido confirmado en el chat llega al panel en menos de 5 s, sin el teléfono del cliente', async () => {
    const socket = conectarSocket(tokens.personal);
    await esperarEvento(socket, 'connect');
    await new Promise((resolver) => setTimeout(resolver, 100)); // unión a la sala

    const mensajesPrevios = [`MESA-${mesa.numero}`, '1', '1', '1', '2', 'sin azúcar', '2'];
    await conversar(TEL_PEDIDOS, mensajesPrevios);

    const llegada = esperarEvento(socket, 'pedido:nuevo');
    const inicio = Date.now();
    const confirmacion = await chat(TEL_PEDIDOS, '1');
    const evento = await llegada;
    expect(Date.now() - inicio).toBeLessThan(LIMITE_RNF02_MS);

    idPedido = Number(confirmacion.match(/#(\d+)/)[1]);
    expect(evento).toMatchObject({
      id: idPedido,
      estado: 'recibido',
      tipo: 'local',
      mesa: { numero: mesa.numero },
      items: [expect.objectContaining({ cantidad: 2, nota: 'sin azúcar' })],
    });
    expect(evento.total).toBe(evento.items[0].precio_unitario * 2);
    expect(JSON.stringify(evento)).not.toContain(TEL_PEDIDOS);
  });

  test('GET /pedidos lista y filtra por estado y fecha', async () => {
    const { status, cuerpo } = await api('GET', '/pedidos?estado=recibido', { token: tokens.personal });
    expect(status).toBe(200);
    expect(cuerpo.map((p) => p.id)).toContain(idPedido);
    expect(cuerpo.every((p) => p.estado === 'recibido')).toBe(true);

    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const deHoy = await api('GET', `/pedidos?fecha=${hoy}`, { token: tokens.personal });
    expect(deHoy.cuerpo.map((p) => p.id)).toContain(idPedido);

    const antiguos = await api('GET', '/pedidos?fecha=2000-01-01', { token: tokens.personal });
    expect(antiguos.cuerpo).toEqual([]);
  });

  test.each([
    ['estado inventado', '?estado=volando'],
    ['fecha mal escrita', '?fecha=21-11-2026'],
    ['fecha que no existe', '?fecha=2026-02-30'],
    ['límite en cero', '?limite=0'],
  ])('GET /pedidos con %s responde 400', async (_, consulta) => {
    expect((await api('GET', `/pedidos${consulta}`, { token: tokens.personal })).status).toBe(400);
  });

  test('GET /pedidos/:id muestra el detalle con el historial inicial', async () => {
    const { status, cuerpo } = await api('GET', `/pedidos/${idPedido}`, { token: tokens.personal });
    expect(status).toBe(200);
    expect(cuerpo.historial).toEqual([expect.objectContaining({ estado: 'recibido', usuario: null })]);
    expect((await api('GET', '/pedidos/99999999', { token: tokens.personal })).status).toBe(404);
    expect((await api('GET', '/pedidos/abc', { token: tokens.personal })).status).toBe(400);
  });

  test('no permite saltarse estados', async () => {
    const { status, cuerpo } = await api('PATCH', `/pedidos/${idPedido}/estado`, {
      token: tokens.personal,
      cuerpo: { estado: 'listo' },
    });
    expect(status).toBe(409);
    expect(cuerpo.estados_permitidos).toEqual(['en_preparacion', 'cancelado']);
  });

  test('valida el cuerpo y la existencia del pedido', async () => {
    expect((await api('PATCH', `/pedidos/${idPedido}/estado`, { token: tokens.personal, cuerpo: { estado: 'volando' } })).status).toBe(400);
    expect((await api('PATCH', `/pedidos/${idPedido}/estado`, { token: tokens.personal, cuerpo: {} })).status).toBe(400);
    expect((await api('PATCH', '/pedidos/99999999/estado', { token: tokens.personal, cuerpo: { estado: 'en_preparacion' } })).status).toBe(404);
  });

  test('CP-04: recibido -> en_preparacion -> listo -> entregado, con evento, historial y aviso al cliente', async () => {
    const socket = conectarSocket(tokens.personal);
    await esperarEvento(socket, 'connect');
    await new Promise((resolver) => setTimeout(resolver, 100));
    envioWhatsApp.mockClear();

    const recorrido = ['en_preparacion', 'listo', 'entregado'];
    for (const estado of recorrido) {
      const evento = esperarEvento(socket, 'pedido:estado');
      const { status, cuerpo } = await api('PATCH', `/pedidos/${idPedido}/estado`, {
        token: tokens.personal,
        cuerpo: { estado },
      });
      expect(status).toBe(200);
      expect(cuerpo).toMatchObject({ id: idPedido, estado });
      expect(await evento).toMatchObject({ id: idPedido, estado });
    }

    // RF-07: al quedar listo, el cliente recibe un mensaje (no antes ni después)
    expect(await esperarHasta(() => envioWhatsApp.mock.calls.length > 0)).toBe(true);
    expect(envioWhatsApp).toHaveBeenCalledTimes(1);
    expect(envioWhatsApp).toHaveBeenCalledWith(TEL_PEDIDOS, expect.stringMatching(new RegExp(`#${idPedido}.*listo`)));

    const { cuerpo } = await api('GET', `/pedidos/${idPedido}`, { token: tokens.personal });
    expect(cuerpo.estado).toBe('entregado');
    expect(cuerpo.historial.map((h) => h.estado)).toEqual(['recibido', 'en_preparacion', 'listo', 'entregado']);
    expect(cuerpo.historial.slice(1).every((h) => h.usuario === USUARIOS.personal.nombre)).toBe(true);
    const horas = cuerpo.historial.map((h) => new Date(h.cambiado_en).getTime());
    expect([...horas].sort((a, b) => a - b)).toEqual(horas);
  });

  test('un pedido entregado ya no cambia', async () => {
    const { status, cuerpo } = await api('PATCH', `/pedidos/${idPedido}/estado`, {
      token: tokens.personal,
      cuerpo: { estado: 'listo' },
    });
    expect(status).toBe(409);
    expect(cuerpo.estados_permitidos).toEqual([]);
  });

  test('RF-12: se cancela solo mientras está recibido', async () => {
    const primero = await hacerPedido(TEL_PEDIDOS, { primeraVez: false });
    const cancelado = await api('PATCH', `/pedidos/${primero}/estado`, { token: tokens.personal, cuerpo: { estado: 'cancelado' } });
    expect(cancelado.status).toBe(200);

    const segundo = await hacerPedido(TEL_PEDIDOS, { primeraVez: false });
    await api('PATCH', `/pedidos/${segundo}/estado`, { token: tokens.personal, cuerpo: { estado: 'en_preparacion' } });
    const tarde = await api('PATCH', `/pedidos/${segundo}/estado`, { token: tokens.personal, cuerpo: { estado: 'cancelado' } });
    expect(tarde.status).toBe(409);
  });

  test('dos cambios simultáneos del mismo pedido: solo uno prospera y el historial queda consistente', async () => {
    const id = await hacerPedido(TEL_PEDIDOS, { primeraVez: false });
    const intentos = await Promise.all([
      api('PATCH', `/pedidos/${id}/estado`, { token: tokens.personal, cuerpo: { estado: 'en_preparacion' } }),
      api('PATCH', `/pedidos/${id}/estado`, { token: tokens.admin, cuerpo: { estado: 'en_preparacion' } }),
    ]);
    expect(intentos.map((i) => i.status).sort()).toEqual([200, 409]);
    const { cuerpo } = await api('GET', `/pedidos/${id}`, { token: tokens.personal });
    expect(cuerpo.historial.map((h) => h.estado)).toEqual(['recibido', 'en_preparacion']);
  });
});

describe('Menú (RF-08, CP-06)', () => {
  let idCategoria;
  let idProducto;

  test('GET /categorias y GET /productos están disponibles para el personal', async () => {
    const categorias = await api('GET', '/categorias', { token: tokens.personal });
    expect(categorias.status).toBe(200);
    expect(categorias.cuerpo.length).toBeGreaterThan(0);
    idCategoria = categorias.cuerpo[0].id;

    const lista = await api('GET', '/productos', { token: tokens.personal });
    expect(lista.status).toBe(200);
    expect(lista.cuerpo[0]).toEqual(
      expect.objectContaining({ id: expect.any(Number), precio: expect.any(Number), disponible: expect.any(Boolean), categoria: expect.any(String) }),
    );
  });

  test('el personal no puede crear ni editar productos (403); el administrador sí', async () => {
    const nuevo = { nombre: PRODUCTO_PRUEBA, precio: 4500, id_categoria: idCategoria };
    expect((await api('POST', '/productos', { token: tokens.personal, cuerpo: nuevo })).status).toBe(403);
    expect((await api('PUT', '/productos/1', { token: tokens.personal, cuerpo: { disponible: false } })).status).toBe(403);

    const creado = await api('POST', '/productos', { token: tokens.admin, cuerpo: nuevo });
    expect(creado.status).toBe(201);
    expect(creado.cuerpo).toMatchObject({ nombre: PRODUCTO_PRUEBA, precio: 4500, disponible: true, id_categoria: idCategoria });
    idProducto = creado.cuerpo.id;
  });

  test('valida los datos al crear y editar', async () => {
    const malo = await api('POST', '/productos', { token: tokens.admin, cuerpo: { nombre: 'X', precio: -1, id_categoria: idCategoria } });
    expect(malo.status).toBe(400);
    const sinCategoria = await api('POST', '/productos', { token: tokens.admin, cuerpo: { nombre: 'X', precio: 1, id_categoria: 99999999 } });
    expect(sinCategoria.status).toBe(400);
    expect((await api('PUT', `/productos/${idProducto}`, { token: tokens.admin, cuerpo: {} })).status).toBe(400);
    expect((await api('PUT', '/productos/99999999', { token: tokens.admin, cuerpo: { disponible: false } })).status).toBe(404);
    expect((await api('PUT', '/productos/abc', { token: tokens.admin, cuerpo: { disponible: false } })).status).toBe(400);
  });

  test('editar el precio se refleja en el producto', async () => {
    const { status, cuerpo } = await api('PUT', `/productos/${idProducto}`, { token: tokens.admin, cuerpo: { precio: 5000 } });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ id: idProducto, precio: 5000, nombre: PRODUCTO_PRUEBA });
  });

  test('CP-06: un producto desactivado deja de aparecer en el menú del chat', async () => {
    const activo = await conversar(TEL_MENU, [`MESA-${mesa.numero}`, '1', '1']);
    expect(activo).toContain(PRODUCTO_PRUEBA);

    const desactivado = await api('PUT', `/productos/${idProducto}`, { token: tokens.admin, cuerpo: { disponible: false } });
    expect(desactivado.cuerpo.disponible).toBe(false);

    const sinProducto = await conversar(TEL_MENU, ['menu', '1']);
    expect(sinProducto).not.toContain(PRODUCTO_PRUEBA);

    // y sigue visible para el administrador en el panel
    const lista = await api('GET', '/productos', { token: tokens.admin });
    expect(lista.cuerpo.find((p) => p.id === idProducto)).toMatchObject({ disponible: false });
  });
});
