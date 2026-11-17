// Cálculo del total de un pedido. Se trabaja en centavos (enteros) para evitar
// errores de redondeo de los números decimales de JavaScript.

function aCentavos(precio) {
  const valor = Number(precio);
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`Precio inválido: ${precio}`);
  }
  return Math.round(valor * 100);
}

/**
 * @param {Array<{id_producto:number, cantidad:number}>} items
 * @param {Map<number, number|string>} precios precio unitario por id de producto
 *        (pg devuelve NUMERIC como texto, por eso se acepta string)
 * @returns {number} total en pesos
 */
function calcularTotal(items, precios) {
  let centavos = 0;
  for (const item of items) {
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      throw new Error(`Cantidad inválida para el producto ${item.id_producto}`);
    }
    if (!precios.has(item.id_producto)) {
      throw new Error(`No hay precio para el producto ${item.id_producto}`);
    }
    centavos += aCentavos(precios.get(item.id_producto)) * item.cantidad;
  }
  return centavos / 100;
}

// Formato de pesos colombianos para los mensajes: 7000 -> "$7.000"
function formatearPrecio(valor) {
  return `$${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
}

module.exports = { calcularTotal, formatearPrecio };
