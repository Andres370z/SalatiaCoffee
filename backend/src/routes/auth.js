const crypto = require('crypto');
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

// Compara dos textos en tiempo constante (se comparan sus huellas para que el largo no filtre nada)
function clavesIguales(recibida, esperada) {
  const huella = (texto) => crypto.createHash('sha256').update(String(texto)).digest();
  return crypto.timingSafeEqual(huella(recibida), huella(esperada));
}

// POST /auth/primer-admin { clave_inicial, usuario, nombre, contrasena }
// Crea el primer administrador. Solo funciona si:
//   1) ADMIN_INICIAL_TOKEN está definido en el entorno (si no, el endpoint está desactivado),
//   2) se envía esa misma clave, y
//   3) todavía no existe ningún usuario.
// Después de crear el administrador se recomienda quitar ADMIN_INICIAL_TOKEN del .env.
router.post('/primer-admin', async (req, res, next) => {
  const claveEsperada = process.env.ADMIN_INICIAL_TOKEN;
  if (!claveEsperada) {
    return res.status(403).json({
      error: 'El registro del primer administrador está desactivado. Define ADMIN_INICIAL_TOKEN en el .env y reinicia el servidor',
    });
  }
  if (typeof req.body?.clave_inicial !== 'string' || !clavesIguales(req.body.clave_inicial, claveEsperada)) {
    return res.status(403).json({ error: 'clave_inicial incorrecta' });
  }

  const { errores, valores } = usuarios.validarUsuario(req.body, { rolFijo: 'administrador' });
  if (errores.length > 0) return res.status(400).json({ error: errores.join('; '), errores });

  try {
    const creado = await usuarios.crearPrimerAdministrador({
      nombre: valores.nombre,
      usuario: valores.usuario,
      contrasenaHash: await auth.hashearContrasena(valores.contrasena),
    });
    if (!creado) {
      return res.status(409).json({ error: 'Ya existe al menos un usuario. Inicia sesión y usa POST /usuarios' });
    }
    return res.status(201).json(creado);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
