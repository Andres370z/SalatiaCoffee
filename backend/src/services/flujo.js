// Flujo conversacional del cliente (HU-01) como máquina de estados.
//
// Cada mensaje entra con el estado guardado en sesion_chat y produce:
//   - la respuesta para el cliente
//   - la sesión actualizada (estado, mesa y carrito)
// Las dependencias (base de datos) se inyectan en `deps` para poder probar el flujo sin PostgreSQL.

const repositorio = require('./repositorio');
const { crearPedido, ErrorPedido } = require('./pedidos');
const { calcularTotal, formatearPrecio } = require('./total');

const ESTADOS = Object.freeze({
  INICIO: 'inicio',
  AUTORIZACION: 'autorizacion',
  CATEGORIA: 'categoria',
  PRODUCTO: 'producto',
  CANTIDAD: 'cantidad',
  OBSERVACION: 'observacion',
  AGREGAR_MAS: 'agregar_mas',
  RESUMEN: 'resumen',
  QUITAR: 'quitar',
});

const CANTIDAD_MAXIMA = 20;
const LARGO_MAXIMO_NOTA = 200;

const depsPorDefecto = { ...repositorio, crearPedido };

const AYUDA_MENU = "En cualquier momento puedes escribir *menu* para empezar de nuevo.";

const TEXTO_AUTORIZACION = [
  'Antes de tomar tu pedido necesitamos tu autorización para el tratamiento de tus datos personales ' +
    '(número de teléfono y pedidos), conforme a la Ley 1581 de 2012. Los usaremos solo para gestionar ' +
    'tus pedidos en SalatiaCoffee.',
  '',
  '¿Autorizas el tratamiento de tus datos?',
  '1. Sí, autorizo',
  '2. No autorizo',
].join('\n');

// ---------- utilidades ----------

const { carritoVacio } = repositorio;

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// RF-01: el código de mesa llega en el texto prellenado del QR, por ejemplo "MESA-3"
function extraerNumeroMesa(texto) {
  const coincidencia = String(texto ?? '').match(/\bMESA-(\d{1,4})\b/i);
  return coincidencia ? Number(coincidencia[1]) : null;
}

// Devuelve el número elegido si está entre 1 y `maximo`, o null
function elegirOpcion(texto, maximo) {
  if (!/^\d+$/.test(texto)) return null;
  const numero = Number(texto);
  return numero >= 1 && numero <= maximo ? numero : null;
}

const RESPUESTAS_SI = ['1', 'si', 'acepto', 'autorizo', 'si autorizo'];
const RESPUESTAS_NO = ['2', 'no', 'no autorizo'];
const SIN_OBSERVACION = ['no', 'ninguna', 'ninguno', 'nada', 'n', '0'];

function lista(opciones) {
  return opciones.map((texto, i) => `${i + 1}. ${texto}`).join('\n');
}

function fueraDelFlujo(resultado) {
  return { ...resultado, respuesta: `No entendí tu respuesta.\n\n${resultado.respuesta}\n\n${AYUDA_MENU}` };
}

function unir(...partes) {
  return partes.filter(Boolean).join('\n\n');
}

// ---------- pasos que se reutilizan ----------

function pedirMesa(sesion, encabezado) {
  return {
    sesion: { ...sesion, estado: ESTADOS.INICIO, id_mesa: null, carrito: carritoVacio() },
    respuesta: unir(
      encabezado,
      'Para tomar tu pedido necesito saber en qué mesa estás: escanea el código QR de tu mesa o escribe su código, por ejemplo *MESA-3*.',
    ),
  };
}

async function mostrarCategorias(sesion, deps, encabezado) {
  const categorias = await deps.listarCategorias();
  const carrito = { ...sesion.carrito, seleccion: null };
  if (categorias.length === 0) {
    return {
      sesion: { ...sesion, estado: ESTADOS.CATEGORIA, carrito },
      respuesta: unir(encabezado, 'En este momento no hay productos disponibles. Escribe *menu* más tarde.'),
    };
  }
  return {
    sesion: { ...sesion, estado: ESTADOS.CATEGORIA, carrito },
    respuesta: unir(
      encabezado,
      `*Menú* - elige una categoría:\n${lista(categorias.map((c) => c.nombre))}`,
      'Responde con el número de la categoría.',
    ),
  };
}

function textoProductos(productos) {
  return [
    'Elige un producto:',
    lista(productos.map((p) => `${p.nombre} - ${formatearPrecio(p.precio)}`)),
    '0. Volver a las categorías',
  ].join('\n');
}

async function continuarTrasMesa(sesion, deps, saludo) {
  const cliente = await deps.obtenerCliente(sesion.telefono);
  if (!cliente || !cliente.autoriza_datos) {
    return {
      sesion: { ...sesion, estado: ESTADOS.AUTORIZACION },
      respuesta: unir(saludo, TEXTO_AUTORIZACION),
    };
  }
  return mostrarCategorias(sesion, deps, saludo);
}

// Quita del carrito los productos que dejaron de estar disponibles y devuelve sus precios actuales
async function revisarCarrito(items, deps) {
  const productos = await deps.obtenerProductos([...new Set(items.map((i) => i.id_producto))]);
  const disponibles = new Map(productos.filter((p) => p.disponible).map((p) => [p.id, p]));
  const vigentes = items.filter((i) => disponibles.has(i.id_producto));
  const retirados = items.filter((i) => !disponibles.has(i.id_producto));
  const precios = new Map([...disponibles].map(([id, p]) => [id, p.precio]));
  return { vigentes, retirados, precios };
}

function avisoRetirados(retirados) {
  if (retirados.length === 0) return null;
  const nombres = [...new Set(retirados.map((i) => i.nombre))].join(', ');
  return `Lo sentimos, ya no está disponible: ${nombres}. Lo quitamos de tu pedido.`;
}

// RF-04: resumen con productos, cantidades, observaciones y total
async function mostrarResumen(sesion, deps, encabezado) {
  const { vigentes, retirados, precios } = await revisarCarrito(sesion.carrito.items, deps);
  const aviso = avisoRetirados(retirados);
  const carrito = { items: vigentes, seleccion: null };

  if (vigentes.length === 0) {
    return mostrarCategorias({ ...sesion, carrito }, deps, unir(encabezado, aviso, 'Tu pedido está vacío.'));
  }

  const lineas = vigentes.map((item, i) => {
    const subtotal = calcularTotal([item], precios);
    const nota = item.nota ? `\n   Observación: ${item.nota}` : '';
    return `${i + 1}. ${item.cantidad} x ${item.nombre} - ${formatearPrecio(subtotal)}${nota}`;
  });
  const total = calcularTotal(vigentes, precios);

  return {
    sesion: { ...sesion, estado: ESTADOS.RESUMEN, carrito },
    respuesta: unir(
      encabezado,
      aviso,
      `*Resumen de tu pedido*\n${lineas.join('\n')}\n\n*Total: ${formatearPrecio(total)}*`,
      '¿Qué deseas hacer?\n1. Confirmar pedido\n2. Agregar otro producto\n3. Quitar un producto\n4. Vaciar el pedido y empezar de nuevo',
    ),
  };
}

// ---------- manejadores por estado ----------

async function iniciarConMesa(sesion, numeroMesa, deps) {
  const mesa = await deps.buscarMesaPorNumero(numeroMesa);
  if (!mesa) {
    return pedirMesa(sesion, `No encontramos la mesa ${numeroMesa}. Revisa el código del QR o pide ayuda al personal.`);
  }
  if (!mesa.activa) {
    return pedirMesa(sesion, `La mesa ${mesa.numero} no está disponible en este momento. Por favor pide ayuda al personal.`);
  }
  const conMesa = { ...sesion, id_mesa: mesa.id, carrito: carritoVacio() };
  return continuarTrasMesa(conMesa, deps, `¡Hola! Bienvenido a SalatiaCoffee. Estás en la *mesa ${mesa.numero}*.`);
}

async function manejarInicio(sesion, deps) {
  if (sesion.id_mesa) {
    return { sesion, respuesta: 'Escribe *menu* para hacer un nuevo pedido.' };
  }
  return pedirMesa(sesion, 'Hola, soy el asistente de pedidos de SalatiaCoffee.');
}

async function manejarAutorizacion(sesion, texto, deps) {
  if (RESPUESTAS_SI.includes(texto)) {
    await deps.registrarAutorizacion(sesion.telefono);
    return mostrarCategorias(sesion, deps, 'Gracias, registramos tu autorización.');
  }
  if (RESPUESTAS_NO.includes(texto)) {
    return {
      sesion,
      respuesta:
        'Sin tu autorización no podemos tomar tu pedido por WhatsApp. Puedes pedir directamente al personal.\n\nSi cambias de opinión, responde *1*.',
    };
  }
  return fueraDelFlujo({ sesion, respuesta: TEXTO_AUTORIZACION });
}

async function manejarCategoria(sesion, texto, deps) {
  const categorias = await deps.listarCategorias();
  const opcion = elegirOpcion(texto, categorias.length);
  if (!opcion) return fueraDelFlujo(await mostrarCategorias(sesion, deps));

  const categoria = categorias[opcion - 1];
  const productos = await deps.listarProductosDisponibles(categoria.id);
  if (productos.length === 0) {
    return mostrarCategorias(sesion, deps, `La categoría ${categoria.nombre} no tiene productos disponibles ahora.`);
  }
  return {
    sesion: {
      ...sesion,
      estado: ESTADOS.PRODUCTO,
      carrito: { ...sesion.carrito, seleccion: { id_categoria: categoria.id } },
    },
    respuesta: `*${categoria.nombre}*\n${textoProductos(productos)}`,
  };
}

async function manejarProducto(sesion, texto, deps) {
  if (texto === '0') return mostrarCategorias(sesion, deps);

  const { seleccion } = sesion.carrito;
  const productos = seleccion ? await deps.listarProductosDisponibles(seleccion.id_categoria) : [];
  if (productos.length === 0) {
    return mostrarCategorias(sesion, deps, 'Esa categoría ya no tiene productos disponibles.');
  }
  const opcion = elegirOpcion(texto, productos.length);
  if (!opcion) return fueraDelFlujo({ sesion, respuesta: textoProductos(productos) });

  const producto = productos[opcion - 1];
  return {
    sesion: {
      ...sesion,
      estado: ESTADOS.CANTIDAD,
      carrito: { ...sesion.carrito, seleccion: { ...seleccion, id_producto: producto.id } },
    },
    respuesta: `¿Cuántas unidades de *${producto.nombre}* deseas? Escribe un número del 1 al ${CANTIDAD_MAXIMA}.`,
  };
}

async function manejarCantidad(sesion, texto, deps) {
  const cantidad = elegirOpcion(texto, CANTIDAD_MAXIMA);
  if (!cantidad) {
    return fueraDelFlujo({ sesion, respuesta: `Escribe la cantidad como un número del 1 al ${CANTIDAD_MAXIMA}.` });
  }
  const { seleccion } = sesion.carrito;
  const [producto] = await deps.obtenerProductos([seleccion.id_producto]);
  if (!producto || !producto.disponible) {
    return mostrarCategorias(sesion, deps, 'Lo sentimos, ese producto ya no está disponible.');
  }
  return {
    sesion: {
      ...sesion,
      estado: ESTADOS.OBSERVACION,
      carrito: { ...sesion.carrito, seleccion: { ...seleccion, cantidad } },
    },
    respuesta: `¿Alguna observación para *${producto.nombre}*? (por ejemplo: sin azúcar, leche deslactosada)\nSi no tienes, responde *no*.`,
  };
}

async function manejarObservacion(sesion, textoOriginal, texto, deps) {
  const nota = SIN_OBSERVACION.includes(texto) ? null : String(textoOriginal).trim();
  if (nota !== null && nota.length === 0) {
    return fueraDelFlujo({ sesion, respuesta: 'Escribe tu observación o responde *no*.' });
  }
  if (nota !== null && nota.length > LARGO_MAXIMO_NOTA) {
    return {
      sesion,
      respuesta: `La observación es muy larga (máximo ${LARGO_MAXIMO_NOTA} caracteres). Escríbela más corta o responde *no*.`,
    };
  }

  const { seleccion } = sesion.carrito;
  const [producto] = await deps.obtenerProductos([seleccion.id_producto]);
  if (!producto || !producto.disponible) {
    return mostrarCategorias(sesion, deps, 'Lo sentimos, ese producto ya no está disponible.');
  }

  const item = { id_producto: producto.id, nombre: producto.nombre, cantidad: seleccion.cantidad, nota };
  const detalleNota = nota ? ` (${nota})` : '';
  return {
    sesion: {
      ...sesion,
      estado: ESTADOS.AGREGAR_MAS,
      carrito: { items: [...sesion.carrito.items, item], seleccion: null },
    },
    respuesta: `Agregado: ${item.cantidad} x ${item.nombre}${detalleNota}.\n\n${textoAgregarMas()}`,
  };
}

function textoAgregarMas() {
  return '¿Qué deseas hacer?\n1. Agregar otro producto\n2. Ver el resumen del pedido';
}

async function manejarAgregarMas(sesion, texto, deps) {
  if (texto === '1') return mostrarCategorias(sesion, deps);
  if (texto === '2') return mostrarResumen(sesion, deps);
  return fueraDelFlujo({ sesion, respuesta: textoAgregarMas() });
}

async function confirmarPedido(sesion, deps) {
  try {
    const pedido = await deps.crearPedido({
      telefono: sesion.telefono,
      idMesa: sesion.id_mesa,
      items: sesion.carrito.items,
    });
    return {
      sesion: { ...sesion, estado: ESTADOS.INICIO, carrito: carritoVacio() },
      respuesta: unir(
        `¡Listo! Tu pedido *#${pedido.id}* fue recibido.`,
        `Total: ${formatearPrecio(pedido.total)}`,
        'Si quieres pedir algo más, escribe *menu*.',
      ),
    };
  } catch (error) {
    if (!(error instanceof ErrorPedido)) throw error;
    switch (error.codigo) {
      case 'producto_no_disponible':
      case 'carrito_vacio':
        return mostrarResumen(sesion, deps, 'No pudimos confirmar el pedido porque cambió la disponibilidad del menú.');
      case 'mesa_inactiva':
        return pedirMesa(sesion, 'Tu mesa ya no está disponible, así que no pudimos registrar el pedido.');
      case 'sin_autorizacion':
        return { sesion: { ...sesion, estado: ESTADOS.AUTORIZACION }, respuesta: TEXTO_AUTORIZACION };
      default:
        throw error;
    }
  }
}

async function manejarResumen(sesion, texto, deps) {
  switch (texto) {
    case '1':
      return confirmarPedido(sesion, deps);
    case '2':
      return mostrarCategorias(sesion, deps);
    case '3':
      return {
        sesion: { ...sesion, estado: ESTADOS.QUITAR },
        respuesta: textoQuitar(sesion.carrito.items),
      };
    case '4':
      return mostrarCategorias({ ...sesion, carrito: carritoVacio() }, deps, 'Vaciamos tu pedido.');
    default:
      return fueraDelFlujo(await mostrarResumen(sesion, deps));
  }
}

function textoQuitar(items) {
  return [
    '¿Qué producto quieres quitar?',
    lista(items.map((i) => `${i.cantidad} x ${i.nombre}${i.nota ? ` (${i.nota})` : ''}`)),
    '0. Volver al resumen',
  ].join('\n');
}

async function manejarQuitar(sesion, texto, deps) {
  const { items } = sesion.carrito;
  if (texto === '0') return mostrarResumen(sesion, deps);
  const opcion = elegirOpcion(texto, items.length);
  if (!opcion) return fueraDelFlujo({ sesion, respuesta: textoQuitar(items) });

  const restantes = items.filter((_, i) => i !== opcion - 1);
  return mostrarResumen(
    { ...sesion, carrito: { items: restantes, seleccion: null } },
    deps,
    `Quitamos ${items[opcion - 1].nombre}.`,
  );
}

// ---------- punto de entrada ----------

// Calcula la respuesta y la nueva sesión a partir de la sesión actual y el texto recibido
async function avanzar(sesion, textoOriginal, deps = depsPorDefecto) {
  // Escanear (o escribir) un código de mesa siempre inicia un pedido nuevo en esa mesa
  const numeroMesa = extraerNumeroMesa(textoOriginal);
  if (numeroMesa !== null) return iniciarConMesa(sesion, numeroMesa, deps);

  const texto = normalizar(textoOriginal);

  // "menu" reinicia el pedido en la mesa actual
  if (texto === 'menu') {
    if (!sesion.id_mesa) return pedirMesa(sesion);
    return continuarTrasMesa({ ...sesion, carrito: carritoVacio() }, deps, 'Empecemos de nuevo.');
  }

  switch (sesion.estado) {
    case ESTADOS.AUTORIZACION:
      return manejarAutorizacion(sesion, texto, deps);
    case ESTADOS.CATEGORIA:
      return manejarCategoria(sesion, texto, deps);
    case ESTADOS.PRODUCTO:
      return manejarProducto(sesion, texto, deps);
    case ESTADOS.CANTIDAD:
      return manejarCantidad(sesion, texto, deps);
    case ESTADOS.OBSERVACION:
      return manejarObservacion(sesion, textoOriginal, texto, deps);
    case ESTADOS.AGREGAR_MAS:
      return manejarAgregarMas(sesion, texto, deps);
    case ESTADOS.RESUMEN:
      return manejarResumen(sesion, texto, deps);
    case ESTADOS.QUITAR:
      return manejarQuitar(sesion, texto, deps);
    case ESTADOS.INICIO:
    default:
      return manejarInicio(sesion, deps);
  }
}

// Procesa un mensaje de un cliente: lee su sesión, avanza el flujo y guarda el nuevo estado
async function procesarMensaje(telefono, texto, deps = depsPorDefecto) {
  const sesion = await deps.obtenerSesion(telefono);
  const { sesion: nueva, respuesta } = await avanzar(sesion, texto, deps);
  await deps.guardarSesion(nueva);
  return respuesta;
}

module.exports = {
  ESTADOS,
  CANTIDAD_MAXIMA,
  avanzar,
  procesarMensaje,
  extraerNumeroMesa,
  normalizar,
};
