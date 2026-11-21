// Protege las rutas del panel: exige token válido y un usuario activo en la base.
const { verificarToken } = require('../services/auth');
const usuarios = require('../services/usuarios');

function extraerToken(cabecera) {
  const coincidencia = /^Bearer\s+(\S+)$/i.exec(cabecera || '');
  return coincidencia ? coincidencia[1] : null;
}

// Valida el token y confirma en la base que el usuario sigue activo y con su rol actual.
// Devuelve el usuario ({ id, nombre, usuario, rol }) o null.
async function autenticarToken(token) {
  if (!token) return null;
  let carga;
  try {
    carga = verificarToken(token);
  } catch {
    return null;
  }
  const usuario = await usuarios.buscarPorId(carga.id);
  if (!usuario || !usuario.activo) return null;
  return { id: usuario.id, nombre: usuario.nombre, usuario: usuario.usuario, rol: usuario.rol };
}

async function requerirAuth(req, res, next) {
  try {
    const usuario = await autenticarToken(extraerToken(req.headers.authorization));
    if (!usuario) return res.status(401).json({ error: 'Inicia sesión para continuar' });
    req.usuario = usuario;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requerirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    return next();
  };
}

module.exports = { extraerToken, autenticarToken, requerirAuth, requerirRol };
