const { Router } = require('express');
const auth = require('../services/auth');
const usuarios = require('../services/usuarios');

const router = Router();

const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos';
const LARGO_MAXIMO = 200;

// Hash de relleno: se compara aunque el usuario no exista, para que la respuesta tarde
// lo mismo y no revele qué usuarios existen.
let hashDeRelleno;
function obtenerHashDeRelleno() {
  hashDeRelleno ??= auth.hashearContrasena('relleno-sin-uso');
  return hashDeRelleno;
}

// POST /auth/login { usuario, contrasena } -> { token, usuario }
router.post('/login', async (req, res, next) => {
  const { usuario, contrasena } = req.body || {};
  if (
    typeof usuario !== 'string' || typeof contrasena !== 'string' ||
    !usuario.trim() || !contrasena ||
    usuario.length > LARGO_MAXIMO || contrasena.length > LARGO_MAXIMO
  ) {
    return res.status(400).json({ error: 'usuario y contrasena son obligatorios' });
  }
  try {
    const encontrado = await usuarios.buscarPorUsuario(usuario.trim());
    const hash = encontrado ? encontrado.contrasena_hash : await obtenerHashDeRelleno();
    const coincide = await auth.verificarContrasena(contrasena, hash);
    if (!encontrado || !encontrado.activo || !coincide) {
      return res.status(401).json({ error: MENSAJE_CREDENCIALES });
    }
    return res.json({
      token: auth.firmarToken(encontrado),
      expira_en: auth.EXPIRACION_TOKEN,
      usuario: { id: encontrado.id, nombre: encontrado.nombre, usuario: encontrado.usuario, rol: encontrado.rol },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
