// Pedidos: creación desde el chat (RF-05), consulta y cambio de estado desde el panel (RF-06).
const pool = require('../db');
const { conTransaccion } = require('../db');
const { calcularTotal } = require('./total');
const { puedeCambiar, siguientesEstados } = require('./estados');
const { emitir } = require('../realtime');

// Error de negocio que el flujo conversacional o la API saben explicar
class ErrorPedido extends Error {
  constructor(codigo, detalle = {}) {
    super(codigo);
    this.name = 'ErrorPedido';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}

// Pedido con su mesa y productos. Por privacidad (Ley 1581) no incluye el teléfono del cliente.
const SELECT_PEDIDO = `
  SELECT p.id, p.estado, p.tipo, p.observaciones, p.total, p.creado_en,
         m.id AS id_mesa, m.numero AS mesa_numero,
         COALESCE((
           SELECT json_agg(json_build_object(
                    'id_producto', d.id_producto, 'nombre', pr.nombre, 'cantidad', d.cantidad,
                    'precio_unitario', d.precio_unitario, 'nota', d.nota) ORDER BY d.id)
             FROM detalle_pedido d JOIN producto pr ON pr.id = d.id_producto
            WHERE d.id_pedido = p.id
         ), '[]'::json) AS items
    FROM pedido p
    LEFT JOIN mesa m ON m.id = p.id_mesa`;

function aPedido(fila) {
  return {
    id: fila.id,
    estado: fila.estado,
    tipo: fila.tipo,
    observaciones: fila.observaciones,
    total: Number(fila.total),
    creado_en: fila.creado_en,
    mesa: fila.id_mesa ? { id: fila.id_mesa, numero: fila.mesa_numero } : null,
    items: fila.items,
  };
}

/**
 * Guarda pedido, detalle e historial en una sola transacción.
 * El total y los precios unitarios se toman de la base de datos, nunca del carrito.
 * Al terminar avisa al panel con el evento pedido:nuevo.
 * @param {{telefono:string, idMesa:number, items:Array<{id_producto:number, cantidad:number, nota:?string}>}} datos
 * @returns {Promise<{id:number, total:number}>}
 */
async function crearPedido({ telefono, idMesa, items }) {
  if (!items || items.length === 0) throw new ErrorPedido('carrito_vacio');

  const creado = await conTransaccion(async (db) => {
    const mesa = await db.query('SELECT id, activa FROM mesa WHERE id = $1', [idMesa]);
    if (mesa.rows.length === 0 || !mesa.rows[0].activa) throw new ErrorPedido('mesa_inactiva');

    const cliente = await db.query(
      'SELECT id FROM cliente WHERE telefono = $1 AND autoriza_datos',
      [telefono],
    );
    if (cliente.rows.length === 0) throw new ErrorPedido('sin_autorizacion');

    const ids = [...new Set(items.map((item) => item.id_producto))];
    const productos = await db.query(
      'SELECT id, precio FROM producto WHERE id = ANY($1::int[]) AND disponible',
      [ids],
    );
    const precios = new Map(productos.rows.map((p) => [p.id, p.precio]));
    const noDisponibles = ids.filter((id) => !precios.has(id));
    if (noDisponibles.length > 0) throw new ErrorPedido('producto_no_disponible', { ids: noDisponibles });

    const total = calcularTotal(items, precios);

    const pedido = await db.query(
      `INSERT INTO pedido (id_cliente, id_mesa, tipo, estado, total)
       VALUES ($1, $2, 'local', 'recibido', $3)
       RETURNING id`,
      [cliente.rows[0].id, idMesa, total],
    );
    const idPedido = pedido.rows[0].id;

    for (const item of items) {
      await db.query(
        `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, nota)
         VALUES ($1, $2, $3, $4, $5)`,
        [idPedido, item.id_producto, item.cantidad, precios.get(item.id_producto), item.nota || null],
      );
    }

    await db.query(
      "INSERT INTO historial_estado (id_pedido, estado) VALUES ($1, 'recibido')",
      [idPedido],
    );

    return { id: idPedido, total };
  });

  // El pedido ya está guardado: si falla el aviso al panel, el cliente igual recibe su número
  try {
    emitir('pedido:nuevo', await obtenerPedido(creado.id));
  } catch (error) {
    console.error(`No se pudo avisar al panel del pedido ${creado.id}:`, error);
  }
  return creado;
}

async function obtenerPedido(id) {
  const { rows } = await pool.query(`${SELECT_PEDIDO} WHERE p.id = $1`, [id]);
  return rows.length ? aPedido(rows[0]) : null;
}

// Pedido con su historial de estados (quién y cuándo)
async function obtenerPedidoConHistorial(id) {
  const pedido = await obtenerPedido(id);
  if (!pedido) return null;
  const { rows } = await pool.query(
    `SELECT h.estado, h.cambiado_en, u.nombre AS usuario
       FROM historial_estado h
       LEFT JOIN usuario_personal u ON u.id = h.id_usuario
      WHERE h.id_pedido = $1
      ORDER BY h.id`,
    [id],
  );
  return { ...pedido, historial: rows };
}

const LIMITE_POR_DEFECTO = 200;

/**
 * Lista pedidos, del más antiguo al más reciente.
 * @param {{estados?:string[], fecha?:string, limite?:number}} filtros fecha = AAAA-MM-DD en hora de Colombia
 */
async function listarPedidos({ estados, fecha, limite = LIMITE_POR_DEFECTO } = {}) {
  const condiciones = [];
  const valores = [];
  if (estados && estados.length > 0) {
    valores.push(estados);
    condiciones.push(`p.estado = ANY($${valores.length}::text[])`);
  }
  if (fecha) {
    valores.push(fecha);
    condiciones.push(`(p.creado_en AT TIME ZONE 'America/Bogota')::date = $${valores.length}::date`);
  }
  valores.push(limite);
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `${SELECT_PEDIDO} ${donde} ORDER BY p.creado_en, p.id LIMIT $${valores.length}`,
    valores,
  );
  return rows.map(aPedido);
}

/**
 * Cambia el estado respetando el orden permitido y deja el registro en el historial.
 * Bloquea la fila del pedido para que dos cambios simultáneos no se pisen.
 * @returns {Promise<{id:number, estado:string, estado_anterior:string, cambiado_en:Date}>}
 */
async function cambiarEstado({ id, nuevoEstado, idUsuario }) {
  const resultado = await conTransaccion(async (db) => {
    const actual = await db.query('SELECT estado FROM pedido WHERE id = $1 FOR UPDATE', [id]);
    if (actual.rows.length === 0) throw new ErrorPedido('pedido_no_existe');

    const anterior = actual.rows[0].estado;
    if (!puedeCambiar(anterior, nuevoEstado)) {
      throw new ErrorPedido('transicion_invalida', { actual: anterior, permitidos: siguientesEstados(anterior) });
    }

    await db.query('UPDATE pedido SET estado = $1 WHERE id = $2', [nuevoEstado, id]);
    const historial = await db.query(
      `INSERT INTO historial_estado (id_pedido, estado, id_usuario)
       VALUES ($1, $2, $3) RETURNING cambiado_en`,
      [id, nuevoEstado, idUsuario],
    );
    return { id, estado: nuevoEstado, estado_anterior: anterior, cambiado_en: historial.rows[0].cambiado_en };
  });

  emitir('pedido:estado', resultado);
  return resultado;
}

module.exports = {
  crearPedido,
  obtenerPedido,
  obtenerPedidoConHistorial,
  listarPedidos,
  cambiarEstado,
  ErrorPedido,
};
