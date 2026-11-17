require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Comprobación de que el servidor y la base de datos responden
app.get('/salud', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ servidor: 'ok', baseDeDatos: 'ok' });
  } catch (error) {
    res.status(500).json({ servidor: 'ok', baseDeDatos: 'error', detalle: error.message });
  }
});

// Verificación del webhook por parte de Meta (RF-01, Sprint 1)
app.get('/webhook', (req, res) => {
  const modo = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const desafio = req.query['hub.challenge'];
  if (modo === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(desafio);
  }
  return res.sendStatus(403);
});

// Recepción de mensajes de WhatsApp. El flujo conversacional se implementa en el Sprint 1.
app.post('/webhook', (req, res) => {
  console.log('Mensaje recibido:', JSON.stringify(req.body));
  res.sendStatus(200);
});

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => console.log(`SalatiaCoffee backend en el puerto ${puerto}`));
