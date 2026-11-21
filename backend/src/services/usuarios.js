// Consultas y reglas sobre usuario_personal (personal y administradores del panel).
const pool = require('../db');
const { conTransaccion } = require('../db');
const { ROLES } = require('./auth');

const COLUMNAS = 'id, nombre, usuario, contrasena_hash, rol, activo';
const COLUMNAS_PUBLICAS = 'id, nombre, usuario, rol, activo';
const LARGO_MINIMO_CONTRASENA = 8;
const LARGO_MAXIMO_CONTRASENA = 200;
const LARGO_MAXIMO_NOMBRE = 120;
// Número fijo para el candado que impide crear dos "primeros" administradores a la vez
const CANDADO_PRIMER_ADMIN = 727001;

/**
 * Valida los datos para crear un usuario.
 * @param {object} datos { usuario, nombre, contrasena, rol }
 * @param {{rolFijo?:string}} opciones rolFijo = rol que se asigna sin pedirlo en el cuerpo
 */
function validarUsuario(datos, { rolFijo } = {}) {
  const errores = [];
  const entrada = datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};

  const usuario = typeof entrada.usuario === 'string' ? entrada.usuario.trim() : '';
  if (!/^[A-Za-z0-9._-]{3,60}$/.test(usuario)) {
    errores.push('usuario debe tener de 3 a 60 caracteres: letras, números, punto, guion o guion bajo');
  }

  const nombre = typeof entrada.nombre === 'string' ? entrada.nombre.trim() : '';
  if (!nombre || nombre.length > LARGO_MAXIMO_NOMBRE) {
    errores.push(`nombre es obligatorio y debe tener hasta ${LARGO_MAXIMO_NOMBRE} caracteres`);
  }

  const contrasena = entrada.contrasena;
  if (
    typeof contrasena !== 'string' ||
    contrasena.length < LARGO_MINIMO_CONTRASENA ||
    contrasena.length > LARGO_MAXIMO_CONTRASENA
  ) {
    errores.push(`contrasena debe tener entre ${LARGO_MINIMO_CONTRASENA} y ${LARGO_MAXIMO_CONTRASENA} caracteres`);
  }

  const rol = rolFijo ?? entrada.rol;
  if (!ROLES.includes(rol)) errores.push(`rol debe ser uno de: ${ROLES.join(', ')}`);

  return { errores, valores: { usuario, nombre, contrasena, rol } };
}

async function buscarPorUsuario(usuario) {
  const { rows } = await pool.query(`SELECT ${COLUMNAS} FROM usuario_personal WHERE usuario = $1`, [usuario]);
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(`SELECT ${COLUMNAS} FROM usuario_personal WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function crearUsuario({ nombre, usuario, contrasenaHash, rol }) {
  const { rows } = await pool.query(
    `INSERT INTO usuario_personal (nombre, usuario, contrasena_hash, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNAS_PUBLICAS}`,
    [nombre, usuario, contrasenaHash, rol],
  );
  return rows[0];
}

/**
 * Crea el primer administrador solo si la tabla está vacía. Devuelve null si ya hay usuarios.
 * El candado evita que dos peticiones simultáneas creen dos "primeros" administradores.
 */
function crearPrimerAdministrador({ nombre, usuario, contrasenaHash }) {
  return conTransaccion(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock($1)', [CANDADO_PRIMER_ADMIN]);
    const { rows } = await db.query(
      `INSERT INTO usuario_personal (nombre, usuario, contrasena_hash, rol)
       SELECT $1, $2, $3, 'administrador'
        WHERE NOT EXISTS (SELECT 1 FROM usuario_personal)
       RETURNING ${COLUMNAS_PUBLICAS}`,
      [nombre, usuario, contrasenaHash],
    );
    return rows[0] || null;
  });
}

module.exports = {
  validarUsuario,
  buscarPorUsuario,
  buscarPorId,
  crearUsuario,
  crearPrimerAdministrador,
};
