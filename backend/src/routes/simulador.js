// Simulador del chat: ejecuta el mismo flujo que el webhook y devuelve la respuesta en JSON,
// para probar sin WhatsApp. Solo se monta cuando NODE_ENV no es "production" (ver app.js).
const { Router } = require('express');
const { procesarMensaje } = require('../services/flujo');

const router = Router();

router.post('/mensaje', async (req, res) => {
  const { telefono, texto } = req.body || {};
  if (typeof telefono !== 'string' || !/^\d{7,20}$/.test(telefono)) {
    return res.status(400).json({ error: 'telefono es obligatorio: solo dígitos, entre 7 y 20 (ej. 573001234567)' });
  }
  if (typeof texto !== 'string') {
    return res.status(400).json({ error: 'texto es obligatorio y debe ser un texto' });
  }
  try {
    const respuesta = await procesarMensaje(telefono, texto);
    return res.json({ telefono, respuesta });
  } catch (error) {
    console.error('Error en el simulador:', error);
    return res.status(500).json({ error: 'Error procesando el mensaje', detalle: error.message });
  }
});

module.exports = router;
