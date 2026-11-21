// Lista de categorías para que el panel arme el formulario de productos (solo lectura).
const { Router } = require('express');
const { requerirAuth } = require('../middleware/auth');
const { listarTodasLasCategorias } = require('../services/productos');

const router = Router();
router.use(requerirAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await listarTodasLasCategorias());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
