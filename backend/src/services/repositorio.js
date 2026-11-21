// Consultas a PostgreSQL que usa el flujo conversacional.
const pool = require('../db');

function carritoVacio() {
  return { items: [], seleccion: null };
}

async function obtenerSesion(telefono) {
  const { rows } = await pool.query(
    'SELECT telefono, estado, id_mesa, carrito FROM sesion_chat WHERE telefono = $1',
    [telefono],
  );
  if (rows.length === 0) {
    return { telefono, estado: 'inicio', id_mesa: null, carrito: carritoVacio() };
  }
  return rows[0];
}

async function guardarSesion(sesion) {
  await pool.query(
    `INSERT INTO sesion_chat (telefono, estado, id_mesa, carrito, actualizado_en)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (telefono) DO UPDATE
       SET estado = EXCLUDED.estado,
           id_mesa = EXCLUDED.id_mesa,
           carrito = EXCLUDED.carrito,
           actualizado_en = NOW()`,
    [sesion.telefono, sesion.estado, sesion.id_mesa, JSON.stringify(sesion.carrito)],
  );
}

async function buscarMesaPorNumero(numero) {
  const { rows } = await pool.query('SELECT id, numero, activa FROM mesa WHERE numero = $1', [numero]);
  return rows[0] || null;
}

async function obtenerMesa(id) {
  const { rows } = await pool.query('SELECT id, numero, activa FROM mesa WHERE id = $1', [id]);
  return rows[0] || null;
}

async function obtenerCliente(telefono) {
  const { rows } = await pool.query(
    'SELECT id, telefono, autoriza_datos, fecha_autorizacion FROM cliente WHERE telefono = $1',
    [telefono],
  );
  return rows[0] || null;
}

// RF-11: registra la autorización de tratamiento de datos con su fecha
async function registrarAutorizacion(telefono) {
  await pool.query(
    `INSERT INTO cliente (telefono, autoriza_datos, fecha_autorizacion)
     VALUES ($1, TRUE, NOW())
     ON CONFLICT (telefono) DO UPDATE
       SET autoriza_datos = TRUE, fecha_autorizacion = NOW()`,
    [telefono],
  );
}

// Solo las categorías que tienen al menos un producto disponible
async function listarCategorias() {
  const { rows } = await pool.query(
    `SELECT c.id, c.nombre
       FROM categoria c
      WHERE EXISTS (SELECT 1 FROM producto p WHERE p.id_categoria = c.id AND p.disponible)
      ORDER BY c.orden, c.id`,
  );
  return rows;
}

async function listarProductosDisponibles(idCategoria) {
  const { rows } = await pool.query(
    `SELECT id, nombre, precio
       FROM producto
      WHERE id_categoria = $1 AND disponible
      ORDER BY id`,
    [idCategoria],
  );
  return rows;
}

async function primerProductoDisponible() {
  const { rows } = await pool.query('SELECT id FROM producto WHERE disponible ORDER BY id LIMIT 1');
  return rows[0] || null;
}

async function obtenerProductos(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    'SELECT id, nombre, precio, disponible FROM producto WHERE id = ANY($1::int[])',
    [ids],
  );
  return rows;
}

module.exports = {
  carritoVacio,
  obtenerSesion,
  guardarSesion,
  buscarMesaPorNumero,
  obtenerMesa,
  obtenerCliente,
  registrarAutorizacion,
  listarCategorias,
  listarProductosDisponibles,
  primerProductoDisponible,
  obtenerProductos,
};
