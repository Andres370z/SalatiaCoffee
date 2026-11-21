// RF-08: administración del menú. Un producto con disponible = false deja de aparecer en el chat.
const pool = require('../db');

const LARGO_MAXIMO_NOMBRE = 120;
const LARGO_MAXIMO_DESCRIPCION = 500;
const PRECIO_MAXIMO = 99999999.99; // NUMERIC(10,2)

/**
 * Valida los datos de un producto.
 * @param {object} datos cuerpo de la petición
 * @param {{parcial?:boolean}} opciones parcial = true en las actualizaciones (todos los campos son opcionales)
 * @returns {{errores:string[], valores:object}} valores solo trae los campos válidos presentes
 */
function validarProducto(datos, { parcial = false } = {}) {
  const errores = [];
  const valores = {};
  const entrada = datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};

  if (entrada.nombre !== undefined) {
    const nombre = typeof entrada.nombre === 'string' ? entrada.nombre.trim() : '';
    if (!nombre || nombre.length > LARGO_MAXIMO_NOMBRE) {
      errores.push(`nombre es obligatorio y debe tener hasta ${LARGO_MAXIMO_NOMBRE} caracteres`);
    } else {
      valores.nombre = nombre;
    }
  } else if (!parcial) {
    errores.push('nombre es obligatorio');
  }

  if (entrada.descripcion !== undefined) {
    if (entrada.descripcion === null) {
      valores.descripcion = null;
    } else if (typeof entrada.descripcion !== 'string' || entrada.descripcion.length > LARGO_MAXIMO_DESCRIPCION) {
      errores.push(`descripcion debe ser un texto de hasta ${LARGO_MAXIMO_DESCRIPCION} caracteres`);
    } else {
      valores.descripcion = entrada.descripcion.trim() || null;
    }
  }

  if (entrada.precio !== undefined) {
    const precio = entrada.precio;
    const tieneMasDeDosDecimales = typeof precio === 'number' && Math.round(precio * 100) / 100 !== precio;
    if (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0 || precio > PRECIO_MAXIMO || tieneMasDeDosDecimales) {
      errores.push('precio debe ser un número entre 0 y 99999999.99, con máximo 2 decimales');
    } else {
      valores.precio = precio;
    }
  } else if (!parcial) {
    errores.push('precio es obligatorio');
  }

  if (entrada.id_categoria !== undefined) {
    if (!Number.isInteger(entrada.id_categoria) || entrada.id_categoria <= 0 || entrada.id_categoria > 2147483647) {
      errores.push('id_categoria debe ser un entero positivo');
    } else {
      valores.id_categoria = entrada.id_categoria;
    }
  } else if (!parcial) {
    errores.push('id_categoria es obligatorio');
  }

  if (entrada.disponible !== undefined) {
    if (typeof entrada.disponible !== 'boolean') errores.push('disponible debe ser true o false');
    else valores.disponible = entrada.disponible;
  }

  if (parcial && errores.length === 0 && Object.keys(valores).length === 0) {
    errores.push('Envía al menos un campo para actualizar: nombre, descripcion, precio, id_categoria o disponible');
  }

  return { errores, valores };
}

const SELECT_PRODUCTO = `
  SELECT p.id, p.nombre, p.descripcion, p.precio, p.disponible, p.id_categoria, c.nombre AS categoria
    FROM producto p
    JOIN categoria c ON c.id = p.id_categoria`;

function aProducto(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precio: Number(fila.precio),
    disponible: fila.disponible,
    id_categoria: fila.id_categoria,
    categoria: fila.categoria,
  };
}

async function listarProductos() {
  const { rows } = await pool.query(`${SELECT_PRODUCTO} ORDER BY c.orden, c.id, p.id`);
  return rows.map(aProducto);
}

async function obtenerProducto(id) {
  const { rows } = await pool.query(`${SELECT_PRODUCTO} WHERE p.id = $1`, [id]);
  return rows.length ? aProducto(rows[0]) : null;
}

async function crearProducto({ nombre, descripcion = null, precio, id_categoria: idCategoria, disponible = true }) {
  const { rows } = await pool.query(
    `INSERT INTO producto (nombre, descripcion, precio, disponible, id_categoria)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [nombre, descripcion, precio, disponible, idCategoria],
  );
  return obtenerProducto(rows[0].id);
}

// Solo actualiza los campos recibidos. Devuelve null si el producto no existe.
async function actualizarProducto(id, valores) {
  const columnas = Object.keys(valores);
  const asignaciones = columnas.map((columna, i) => `${columna} = $${i + 1}`);
  const { rowCount } = await pool.query(
    `UPDATE producto SET ${asignaciones.join(', ')} WHERE id = $${columnas.length + 1}`,
    [...columnas.map((columna) => valores[columna]), id],
  );
  return rowCount === 0 ? null : obtenerProducto(id);
}

// Todas las categorías, incluso las que no tienen productos disponibles (para el panel)
async function listarTodasLasCategorias() {
  const { rows } = await pool.query('SELECT id, nombre, orden FROM categoria ORDER BY orden, id');
  return rows;
}

module.exports = {
  validarProducto,
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  listarTodasLasCategorias,
};
