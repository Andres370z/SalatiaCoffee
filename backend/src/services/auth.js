// RF-10: contraseñas con hash y token de sesión (JWT) para el personal.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ROLES = Object.freeze(['administrador', 'personal']);
const EXPIRACION_TOKEN = '8h';
const COSTO_HASH = 10;
const SECRETO_DE_EJEMPLO = 'cambia_este_secreto';

function obtenerSecreto() {
  const secreto = process.env.JWT_SECRET;
  if (!secreto) throw new Error('JWT_SECRET no está configurado en el entorno');
  if (process.env.NODE_ENV === 'production' && secreto === SECRETO_DE_EJEMPLO) {
    throw new Error('JWT_SECRET sigue con el valor de ejemplo: cámbialo antes de usar producción');
  }
  return secreto;
}

function hashearContrasena(contrasena) {
  return bcrypt.hash(contrasena, COSTO_HASH);
}

function verificarContrasena(contrasena, hash) {
  return bcrypt.compare(contrasena, hash);
}

function firmarToken(usuario) {
  return jwt.sign({ sub: String(usuario.id), rol: usuario.rol, nombre: usuario.nombre }, obtenerSecreto(), {
    algorithm: 'HS256',
    expiresIn: EXPIRACION_TOKEN,
  });
}

// Devuelve { id, rol, nombre } o lanza un error si el token es inválido o venció
function verificarToken(token) {
  const carga = jwt.verify(token, obtenerSecreto(), { algorithms: ['HS256'] });
  return { id: Number(carga.sub), rol: carga.rol, nombre: carga.nombre };
}

module.exports = { ROLES, EXPIRACION_TOKEN, hashearContrasena, verificarContrasena, firmarToken, verificarToken };
