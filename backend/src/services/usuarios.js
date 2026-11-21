// Consultas sobre usuario_personal (personal y administradores del panel).
const pool = require('../db');

const COLUMNAS = 'id, nombre, usuario, contrasena_hash, rol, activo';

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
     RETURNING id, nombre, usuario, rol, activo`,
    [nombre, usuario, contrasenaHash, rol],
  );
  return rows[0];
}

module.exports = { buscarPorUsuario, buscarPorId, crearUsuario };
