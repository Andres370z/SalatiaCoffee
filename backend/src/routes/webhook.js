const { Router } = require('express');

const router = Router();

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

// Recepción de mensajes de WhatsApp
router.post('/', (req, res) => {
  console.log('Mensaje recibido:', JSON.stringify(req.body));
  res.sendStatus(200);
});

module.exports = router;
