// Envío de mensajes de texto por WhatsApp Cloud API.
// Si faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID, funciona en modo simulado:
// imprime la respuesta en consola en lugar de enviarla.

const VERSION_API_POR_DEFECTO = 'v23.0';

function estaSimulado() {
  return !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID;
}

/**
 * @param {string} telefono número del cliente en formato internacional sin "+", como lo envía Meta
 * @param {string} texto
 * @returns {Promise<{simulado:boolean, id?:string}>}
 */
async function enviarMensaje(telefono, texto) {
  if (estaSimulado()) {
    console.log(`[WhatsApp simulado] Para ${telefono}:\n${texto}\n`);
    return { simulado: true };
  }

  const version = process.env.WHATSAPP_API_VERSION || VERSION_API_POR_DEFECTO;
  const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: telefono,
      type: 'text',
      text: { body: texto },
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`WhatsApp respondió ${respuesta.status}: ${detalle}`);
  }
  const datos = await respuesta.json();
  return { simulado: false, id: datos.messages?.[0]?.id };
}

module.exports = { enviarMensaje, estaSimulado };
