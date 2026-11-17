const { Router } = require('express');
const { procesarMensaje } = require('../services/flujo');
const { enviarMensaje } = require('../services/whatsapp');

const router = Router();

const MENSAJE_ERROR = 'Tuvimos un problema procesando tu mensaje. Intenta de nuevo en un momento o pide ayuda al personal.';

// Extrae los mensajes entrantes del formato de notificación de WhatsApp Cloud API.
// Los mensajes que no son de texto llegan con texto vacío y el flujo responde con las opciones.
function extraerMensajes(cuerpo) {
  const mensajes = [];
  for (const entrada of cuerpo?.entry || []) {
    for (const cambio of entrada.changes || []) {
      for (const mensaje of cambio.value?.messages || []) {
        mensajes.push({ telefono: mensaje.from, texto: mensaje.type === 'text' ? mensaje.text?.body : '' });
      }
    }
  }
  return mensajes;
}

async function atenderMensaje({ telefono, texto }) {
  let respuesta;
  try {
    respuesta = await procesarMensaje(telefono, texto);
  } catch (error) {
    console.error(`Error procesando el mensaje de ${telefono}:`, error);
    respuesta = MENSAJE_ERROR;
  }
  try {
    await enviarMensaje(telefono, respuesta);
  } catch (error) {
    console.error(`Error enviando la respuesta a ${telefono}:`, error);
  }
}

// Verificación del webhook por parte de Meta (RF-01)
router.get('/', (req, res) => {
  const modo = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const desafio = req.query['hub.challenge'];
  if (modo === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(desafio);
  }
  return res.sendStatus(403);
});

// Recepción de mensajes de WhatsApp. Se responde 200 de inmediato (Meta reintenta si tarda)
// y los mensajes se procesan en orden después.
router.post('/', (req, res) => {
  res.sendStatus(200);
  const mensajes = extraerMensajes(req.body);
  (async () => {
    for (const mensaje of mensajes) await atenderMensaje(mensaje);
  })();
});

module.exports = router;
module.exports.extraerMensajes = extraerMensajes;
