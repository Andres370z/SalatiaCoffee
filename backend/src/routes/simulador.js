// Simulador del chat: ejecuta el mismo flujo que el webhook y devuelve la respuesta en JSON,
// para probar sin WhatsApp. Solo se monta cuando NODE_ENV no es "production" (ver app.js).
const { Router } = require('express');
const { procesarMensaje } = require('../services/flujo');
const { crearPedido, ErrorPedido } = require('../services/pedidos');
const repositorio = require('../services/repositorio');

const router = Router();

const PATRON_TELEFONO = /^\d{7,20}$/;
const MAXIMO_ITEMS = 20;
const CANTIDAD_MAXIMA = 20;
const LARGO_MAXIMO_NOTA = 200;

router.post('/mensaje', async (req, res) => {
  const { telefono, texto } = req.body || {};
  if (typeof telefono !== 'string' || !PATRON_TELEFONO.test(telefono)) {
    return res.status(400).json({ error: 'telefono es obligatorio: solo dígitos, entre 7 y 20 (ej. 573001234567)' });
  }
  if (typeof texto !== 'string') {
    return res.status(400).json({ error: 'texto es obligatorio y debe ser un texto' });
  }
  try {
    const respuesta = await procesarMensaje(telefono, texto);
    return res.json({ telefono, respuesta });
  } catch (error) {
    console.error('Error en el simulador:', error);
    return res.status(500).json({ error: 'Error procesando el mensaje', detalle: error.message });
  }
});

// Valida los productos del pedido; devuelve la lista limpia o un texto con el error
function leerItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAXIMO_ITEMS) {
    return { error: `items debe ser una lista de 1 a ${MAXIMO_ITEMS} productos` };
  }
  const limpios = [];
  for (const [i, item] of items.entries()) {
    const posicion = `items[${i}]`;
    if (!Number.isInteger(item?.id_producto) || item.id_producto <= 0 || item.id_producto > 2147483647) {
      return { error: `${posicion}.id_producto debe ser un entero positivo` };
    }
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > CANTIDAD_MAXIMA) {
      return { error: `${posicion}.cantidad debe ser un entero entre 1 y ${CANTIDAD_MAXIMA}` };
    }
    if (item.nota !== undefined && item.nota !== null && (typeof item.nota !== 'string' || item.nota.length > LARGO_MAXIMO_NOTA)) {
      return { error: `${posicion}.nota debe ser un texto de hasta ${LARGO_MAXIMO_NOTA} caracteres` };
    }
    limpios.push({ id_producto: item.id_producto, cantidad: item.cantidad, nota: item.nota?.trim() || null });
  }
  return { items: limpios };
}

// POST /simulador/pedido { telefono, mesa, items? }
// Atajo SOLO PARA PRUEBAS: crea un pedido de una vez, sin conversar con el bot. Pasa por la misma
// lógica que el chat (total calculado con los precios de la base, historial, evento pedido:nuevo),
// pero registra por su cuenta la autorización de datos del teléfono de prueba.
// Si no envías items, pide 1 unidad del primer producto disponible.
router.post('/pedido', async (req, res) => {
  const { telefono, mesa, items } = req.body || {};
  if (typeof telefono !== 'string' || !PATRON_TELEFONO.test(telefono)) {
    return res.status(400).json({ error: 'telefono es obligatorio: solo dígitos, entre 7 y 20 (ej. 573001234567)' });
  }
  if (!Number.isInteger(mesa) || mesa <= 0 || mesa > 2147483647) {
    return res.status(400).json({ error: 'mesa es obligatoria: el número de la mesa (ej. 3)' });
  }

  try {
    const laMesa = await repositorio.buscarMesaPorNumero(mesa);
    if (!laMesa) return res.status(404).json({ error: `No existe la mesa ${mesa}` });
    if (!laMesa.activa) return res.status(400).json({ error: `La mesa ${mesa} no está activa` });

    let productos;
    if (items === undefined) {
      const primero = await repositorio.primerProductoDisponible();
      if (!primero) return res.status(400).json({ error: 'No hay productos disponibles en el menú' });
      productos = [{ id_producto: primero.id, cantidad: 1, nota: null }];
    } else {
      const lectura = leerItems(items);
      if (lectura.error) return res.status(400).json({ error: lectura.error });
      productos = lectura.items;
    }

    await repositorio.registrarAutorizacion(telefono);
    const pedido = await crearPedido({ telefono, idMesa: laMesa.id, items: productos });
    return res.status(201).json({ id: pedido.id, total: pedido.total, mesa, items: productos });
  } catch (error) {
    if (error instanceof ErrorPedido && error.codigo === 'producto_no_disponible') {
      return res.status(400).json({
        error: 'Algún producto no existe o no está disponible',
        ids_no_disponibles: error.detalle.ids,
      });
    }
    console.error('Error en el simulador de pedidos:', error);
    return res.status(500).json({ error: 'Error creando el pedido', detalle: error.message });
  }
});

module.exports = router;
