// API del menú (RF-08). Consultar: personal y administrador. Crear y editar: solo administrador.
const { Router } = require('express');
const { requerirAuth, requerirRol } = require('../middleware/auth');
const productos = require('../services/productos');

const router = Router();
router.use(requerirAuth);

const CODIGO_FK_VIOLADA = '23503';

function leerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

// GET /productos -> todos, incluso los no disponibles, con su categoría
router.get('/', async (req, res, next) => {
  try {
    res.json(await productos.listarProductos());
  } catch (error) {
    next(error);
  }
});

// POST /productos { nombre, precio, id_categoria, descripcion?, disponible? }
router.post('/', requerirRol('administrador'), async (req, res, next) => {
  const { errores, valores } = productos.validarProducto(req.body);
  if (errores.length > 0) return res.status(400).json({ error: errores.join('; '), errores });
  try {
    return res.status(201).json(await productos.crearProducto(valores));
  } catch (error) {
    if (error.code === CODIGO_FK_VIOLADA) return res.status(400).json({ error: 'La categoría indicada no existe' });
    return next(error);
  }
});

// PUT /productos/:id con los campos a cambiar (también sirve para desactivar: { disponible: false })
router.put('/:id', requerirRol('administrador'), async (req, res, next) => {
  const id = leerId(req);
  if (!id) return res.status(400).json({ error: 'El id del producto debe ser un entero positivo' });

  const { errores, valores } = productos.validarProducto(req.body, { parcial: true });
  if (errores.length > 0) return res.status(400).json({ error: errores.join('; '), errores });
  try {
    const actualizado = await productos.actualizarProducto(id, valores);
    if (!actualizado) return res.status(404).json({ error: `No existe el producto ${id}` });
    return res.json(actualizado);
  } catch (error) {
    if (error.code === CODIGO_FK_VIOLADA) return res.status(400).json({ error: 'La categoría indicada no existe' });
    return next(error);
  }
});

module.exports = router;
