// RF-05 (parte servidor): creación del pedido confirmado.
const { conTransaccion } = require('../db');
const { calcularTotal } = require('./total');

// Error de negocio que el flujo conversacional sabe explicar al cliente
class ErrorPedido extends Error {
  constructor(codigo, detalle = {}) {
    super(codigo);
    this.name = 'ErrorPedido';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}

/**
 * Guarda pedido, detalle e historial en una sola transacción.
 * El total y los precios unitarios se toman de la base de datos, nunca del carrito.
 * @param {{telefono:string, idMesa:number, items:Array<{id_producto:number, cantidad:number, nota:?string}>}} datos
 * @returns {Promise<{id:number, total:number}>}
 */
async function crearPedido({ telefono, idMesa, items }) {
  if (!items || items.length === 0) throw new ErrorPedido('carrito_vacio');

  return conTransaccion(async (db) => {
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
}

module.exports = { crearPedido, ErrorPedido };
