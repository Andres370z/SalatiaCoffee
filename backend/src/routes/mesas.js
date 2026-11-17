const { Router } = require('express');
const { obtenerMesa } = require('../services/repositorio');
const { textoMesa, enlaceWhatsApp } = require('../services/qr');

const router = Router();

// GET /mesas/:id/qr -> enlace de WhatsApp con "MESA-<numero>" prellenado (RF-01)
router.get('/:id/qr', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'El id de la mesa debe ser un entero positivo' });
  }
  if (!String(process.env.WHATSAPP_NUMERO_PUBLICO || '').replace(/\D/g, '')) {
    return res.status(500).json({ error: 'Configura WHATSAPP_NUMERO_PUBLICO en el archivo .env' });
  }
  try {
    const mesa = await obtenerMesa(id);
    if (!mesa) return res.status(404).json({ error: `No existe la mesa con id ${id}` });
    return res.json({
      id_mesa: mesa.id,
      numero: mesa.numero,
      activa: mesa.activa,
      texto: textoMesa(mesa.numero),
      enlace: enlaceWhatsApp(process.env.WHATSAPP_NUMERO_PUBLICO, mesa.numero),
    });
  } catch (error) {
    console.error('Error generando el QR de la mesa:', error);
    return res.status(500).json({ error: 'Error consultando la mesa', detalle: error.message });
  }
});

module.exports = router;
