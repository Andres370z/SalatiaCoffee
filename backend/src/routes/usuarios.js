// Creación de usuarios del panel por API. Solo el administrador puede crear más usuarios.
const { Router } = require('express');
const { requerirAuth, requerirRol } = require('../middleware/auth');
const { hashearContrasena } = require('../services/auth');
const usuarios = require('../services/usuarios');

const router = Router();
router.use(requerirAuth, requerirRol('administrador'));

const CODIGO_DUPLICADO = '23505';

// POST /usuarios { usuario, nombre, contrasena, rol }
router.post('/', async (req, res, next) => {
  const { errores, valores } = usuarios.validarUsuario(req.body);
  if (errores.length > 0) return res.status(400).json({ error: errores.join('; '), errores });
  try {
    const creado = await usuarios.crearUsuario({
      nombre: valores.nombre,
      usuario: valores.usuario,
      contrasenaHash: await hashearContrasena(valores.contrasena),
      rol: valores.rol,
    });
    return res.status(201).json(creado);
  } catch (error) {
    if (error.code === CODIGO_DUPLICADO) {
      return res.status(409).json({ error: `Ya existe un usuario llamado "${valores.usuario}"` });
    }
    return next(error);
  }
});

module.exports = router;
