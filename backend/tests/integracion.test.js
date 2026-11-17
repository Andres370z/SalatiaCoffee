// Prueba de integración del flujo completo con el simulador y la base PostgreSQL real.
// Requisitos: backend/.env con la conexión, y la base con schema.sql, seed.sql y
// migracion_01_sesion_chat.sql aplicados. Los datos de prueba usan teléfonos 579999xxxxxx
// y se borran antes y después de las pruebas.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const crearApp = require('../src/app');
const pool = require('../src/db');

const PREFIJO_TELEFONO = '579999';
const TEL_CP01 = `${PREFIJO_TELEFONO}000001`;
const TEL_CP02 = `${PREFIJO_TELEFONO}000002`;
const TEL_CP03 = `${PREFIJO_TELEFONO}000003`;
const MESA_INEXISTENTE = 9999;
const MESA_INACTIVA = 9998;
const PRODUCTO_AGOTADO = 'Producto agotado de prueba';
const MARCA_PRUEBA = 'PRUEBA-INTEGRACION'; // codigo_qr de la mesa creada por la prueba

let servidor;
let urlBase;
let mesaActiva;

async function limpiarDatosDePrueba() {
  const patron = `${PREFIJO_TELEFONO}%`;
  await pool.query(
    'DELETE FROM pedido WHERE id_cliente IN (SELECT id FROM cliente WHERE telefono LIKE $1)',
    [patron],
  );
  await pool.query('DELETE FROM cliente WHERE telefono LIKE $1', [patron]);
  await pool.query('DELETE FROM sesion_chat WHERE telefono LIKE $1', [patron]);
  await pool.query('DELETE FROM producto WHERE nombre = $1', [PRODUCTO_AGOTADO]);
  await pool.query('DELETE FROM mesa WHERE numero = $1 AND codigo_qr = $2', [MESA_INACTIVA, MARCA_PRUEBA]);
}

async function enviar(telefono, texto) {
  const respuesta = await fetch(`${urlBase}/simulador/mensaje`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefono, texto }),
  });
  const cuerpo = await respuesta.json();
  if (respuesta.status !== 200) throw new Error(`Simulador respondió ${respuesta.status}: ${JSON.stringify(cuerpo)}`);
  return cuerpo.respuesta;
}

async function conversar(telefono, mensajes) {
  let respuesta;
  for (const texto of mensajes) respuesta = await enviar(telefono, texto);
  return respuesta;
}

async function contarPedidos(telefono) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS n FROM pedido p JOIN cliente c ON c.id = p.id_cliente WHERE c.telefono = $1',
    [telefono],
  );
  return rows[0].n;
}

beforeAll(async () => {
  try {
    await pool.query('SELECT 1 FROM sesion_chat LIMIT 1');
  } catch (error) {
    throw new Error(
      'No se pudo usar la base de datos para la prueba de integración. Revisa backend/.env y aplica ' +
        `schema.sql, seed.sql y migracion_01_sesion_chat.sql. Detalle: ${error.message}`,
    );
  }
  await limpiarDatosDePrueba();

  const { rows } = await pool.query('SELECT id, numero FROM mesa WHERE activa ORDER BY numero LIMIT 1');
  if (rows.length === 0) throw new Error('La base no tiene mesas activas (¿aplicaste seed.sql?)');
  mesaActiva = rows[0];

  const existe = await pool.query('SELECT 1 FROM mesa WHERE numero = $1', [MESA_INEXISTENTE]);
  if (existe.rows.length > 0) throw new Error(`La mesa ${MESA_INEXISTENTE} existe; la prueba CP-03 la necesita libre`);

  await pool.query('INSERT INTO mesa (numero, codigo_qr, activa) VALUES ($1, $2, FALSE)', [MESA_INACTIVA, MARCA_PRUEBA]);
  // Producto no disponible en la primera categoría: no debe aparecer en el menú
  await pool.query(
    `INSERT INTO producto (nombre, precio, disponible, id_categoria)
     SELECT $1, 1000, FALSE, id FROM categoria ORDER BY orden, id LIMIT 1`,
    [PRODUCTO_AGOTADO],
  );

  servidor = crearApp().listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  urlBase = `http://127.0.0.1:${servidor.address().port}`;
});

afterAll(async () => {
  try {
    if (servidor) await limpiarDatosDePrueba();
  } finally {
    if (servidor) await new Promise((resolver) => servidor.close(resolver));
    await pool.end();
  }
});

describe('CP-01: pedido completo', () => {
  test('el pedido queda en la base con estado recibido, detalle e historial', async () => {
    const codigoMesa = `MESA-${mesaActiva.numero}`;

    const bienvenida = await enviar(TEL_CP01, `Hola ${codigoMesa}`);
    expect(bienvenida).toMatch(new RegExp(`mesa ${mesaActiva.numero}`));
    expect(bienvenida).toMatch(/Ley 1581 de 2012/);

    const menu = await enviar(TEL_CP01, '1');
    expect(menu).toMatch(/elige una categoría/);
    const cliente = await pool.query(
      'SELECT autoriza_datos, fecha_autorizacion FROM cliente WHERE telefono = $1',
      [TEL_CP01],
    );
    expect(cliente.rows[0].autoriza_datos).toBe(true);
    expect(cliente.rows[0].fecha_autorizacion).toBeInstanceOf(Date);

    const productos = await enviar(TEL_CP01, '1');
    expect(productos).not.toMatch(PRODUCTO_AGOTADO);

    // Primer producto de la primera categoría, 2 unidades con observación;
    // luego el segundo producto, 1 unidad sin observación
    await conversar(TEL_CP01, ['1', '2', 'sin azúcar', '1', '1', '2', '1', 'no']);
    const resumen = await enviar(TEL_CP01, '2');
    expect(resumen).toMatch(/Resumen de tu pedido/);
    expect(resumen).toMatch(/1\. 2 x /);
    expect(resumen).toMatch(/Observación: sin azúcar/);
    expect(resumen).toMatch(/2\. 1 x /);
    expect(resumen).toMatch(/Total: \$/);
    expect(await contarPedidos(TEL_CP01)).toBe(0);

    const confirmacion = await enviar(TEL_CP01, '1');
    const numero = confirmacion.match(/#(\d+)/);
    expect(numero).not.toBeNull();
    const idPedido = Number(numero[1]);

    const pedido = (await pool.query('SELECT * FROM pedido WHERE id = $1', [idPedido])).rows[0];
    expect(pedido).toMatchObject({ estado: 'recibido', tipo: 'local', id_mesa: mesaActiva.id });

    const detalle = (
      await pool.query(
        `SELECT d.cantidad, d.precio_unitario, d.nota, p.precio
           FROM detalle_pedido d JOIN producto p ON p.id = d.id_producto
          WHERE d.id_pedido = $1 ORDER BY d.id`,
        [idPedido],
      )
    ).rows;
    expect(detalle).toHaveLength(2);
    expect(detalle[0]).toMatchObject({ cantidad: 2, nota: 'sin azúcar' });
    expect(detalle[1]).toMatchObject({ cantidad: 1, nota: null });
    // Precio unitario tomado de la base y total calculado en el servidor
    for (const linea of detalle) expect(linea.precio_unitario).toBe(linea.precio);
    const totalEsperado = detalle.reduce((suma, l) => suma + l.cantidad * Number(l.precio_unitario), 0);
    expect(Number(pedido.total)).toBe(totalEsperado);

    const historial = (await pool.query('SELECT estado FROM historial_estado WHERE id_pedido = $1', [idPedido])).rows;
    expect(historial).toEqual([{ estado: 'recibido' }]);
  });
});

describe('CP-02: no se crea el pedido sin confirmación', () => {
  test('llegar al resumen, responder otra cosa y vaciar no crea pedido', async () => {
    await conversar(TEL_CP02, [`MESA-${mesaActiva.numero}`, '1', '1', '1', '1', 'no', '2']);
    const fuera = await enviar(TEL_CP02, 'ok gracias');
    expect(fuera).toMatch(/No entendí/);
    expect(fuera).toMatch(/1\. Confirmar pedido/);
    await enviar(TEL_CP02, '4');
    expect(await contarPedidos(TEL_CP02)).toBe(0);
  });
});

describe('CP-03: mesa inválida', () => {
  test('mesa inexistente se informa y no se puede seguir', async () => {
    const respuesta = await enviar(TEL_CP03, `MESA-${MESA_INEXISTENTE}`);
    expect(respuesta).toMatch(new RegExp(`No encontramos la mesa ${MESA_INEXISTENTE}`));
    const siguiente = await enviar(TEL_CP03, '1');
    expect(siguiente).toMatch(/MESA-3/);
    const sesion = (await pool.query('SELECT estado, id_mesa FROM sesion_chat WHERE telefono = $1', [TEL_CP03])).rows[0];
    expect(sesion).toMatchObject({ estado: 'inicio', id_mesa: null });
  });

  test('mesa inactiva se informa', async () => {
    const respuesta = await enviar(TEL_CP03, `MESA-${MESA_INACTIVA}`);
    expect(respuesta).toMatch(new RegExp(`mesa ${MESA_INACTIVA} no está disponible`));
    expect(await contarPedidos(TEL_CP03)).toBe(0);
  });
});

describe('Endpoints de apoyo', () => {
  test('GET /mesas/:id/qr devuelve el enlace wa.me con MESA-<numero>', async () => {
    const anterior = process.env.WHATSAPP_NUMERO_PUBLICO;
    process.env.WHATSAPP_NUMERO_PUBLICO = '+57 300 000 0000';
    try {
      const respuesta = await fetch(`${urlBase}/mesas/${mesaActiva.id}/qr`);
      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toMatchObject({
        numero: mesaActiva.numero,
        texto: `MESA-${mesaActiva.numero}`,
        enlace: `https://wa.me/573000000000?text=MESA-${mesaActiva.numero}`,
      });
      const noExiste = await fetch(`${urlBase}/mesas/999999/qr`);
      expect(noExiste.status).toBe(404);
    } finally {
      process.env.WHATSAPP_NUMERO_PUBLICO = anterior;
    }
  });

  test('el simulador valida el cuerpo', async () => {
    const respuesta = await fetch(`${urlBase}/simulador/mensaje`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: 'hola' }),
    });
    expect(respuesta.status).toBe(400);
  });

  test('el simulador no existe en producción', async () => {
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const app = crearApp();
    process.env.NODE_ENV = anterior;
    const otro = app.listen(0);
    await new Promise((resolver) => otro.once('listening', resolver));
    try {
      const respuesta = await fetch(`http://127.0.0.1:${otro.address().port}/simulador/mensaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: TEL_CP03, texto: 'hola' }),
      });
      expect(respuesta.status).toBe(404);
    } finally {
      await new Promise((resolver) => otro.close(resolver));
    }
  });
});
