const { Router } = require('express');
const pool = require('../db');

const router = Router();

// Comprobación de que el servidor y la base de datos responden
router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ servidor: 'ok', baseDeDatos: 'ok' });
  } catch (error) {
    res.status(500).json({ servidor: 'ok', baseDeDatos: 'error', detalle: error.message });
  }
});

module.exports = router;
