// RF-07: aviso al cliente por WhatsApp cuando su pedido está listo.
// Se llama a whatsapp.enviarMensaje a través del módulo para poder simularlo en las pruebas;
// sin credenciales de Meta imprime el mensaje en consola (modo simulado).
const pool = require('../db');
const whatsapp = require('./whatsapp');

function textoPedidoListo(idPedido, numeroMesa) {
  const lugar = numeroMesa ? ` para la mesa ${numeroMesa}` : '';
  return `¡Tu pedido #${idPedido}${lugar} está listo! Ya puedes recogerlo. Gracias por elegir SalatiaCoffee.`;
}

/**
 * Envía el aviso de "pedido listo". Nunca lanza: el cambio de estado ya quedó guardado y un
 * fallo de WhatsApp no debe deshacerlo ni mostrarse como error al personal.
 * @returns {Promise<{enviado:boolean, simulado?:boolean, motivo?:string}>}
 */
async function avisarPedidoListo(idPedido) {
  try {
    const { rows } = await pool.query(
      `SELECT c.telefono, c.autoriza_datos, m.numero AS mesa_numero
         FROM pedido p
         JOIN cliente c ON c.id = p.id_cliente
         LEFT JOIN mesa m ON m.id = p.id_mesa
        WHERE p.id = $1`,
      [idPedido],
    );
    if (rows.length === 0) return { enviado: false, motivo: 'pedido_no_existe' };
    // Ley 1581: solo se escribe a quien autorizó el tratamiento de sus datos
    if (!rows[0].autoriza_datos) return { enviado: false, motivo: 'sin_autorizacion' };

    const resultado = await whatsapp.enviarMensaje(rows[0].telefono, textoPedidoListo(idPedido, rows[0].mesa_numero));
    return { enviado: true, simulado: resultado.simulado };
  } catch (error) {
    console.error(`No se pudo avisar al cliente que el pedido ${idPedido} está listo:`, error);
    return { enviado: false, motivo: 'error_de_envio' };
  }
}

module.exports = { avisarPedidoListo, textoPedidoListo };
