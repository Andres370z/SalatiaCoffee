// API de pedidos para el panel (RF-05, RF-06). Requiere sesión; la pueden usar personal y administrador.
const { Router } = require('express');
const { requerirAuth } = require('../middleware/auth');
const { ESTADOS, esEstadoValido } = require('../services/estados');
const pedidos = require('../services/pedidos');
const notificaciones = require('../services/notificaciones');

const router = Router();
router.use(requerirAuth);

const LIMITE_MAXIMO = 500;

function esFechaValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

function leerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

// GET /pedidos?estado=recibido,en_preparacion&fecha=2026-11-21&limite=100
router.get('/', async (req, res, next) => {
  const filtros = {};

  if (req.query.estado !== undefined) {
    const estados = String(req.query.estado).split(',').map((e) => e.trim()).filter(Boolean);
    const invalidos = estados.filter((e) => !esEstadoValido(e));
    if (estados.length === 0 || invalidos.length > 0) {
      return res.status(400).json({ error: `estado inválido. Valores permitidos: ${ESTADOS.join(', ')}` });
    }
    filtros.estados = estados;
  }
  if (req.query.fecha !== undefined) {
    if (!esFechaValida(String(req.query.fecha))) {
      return res.status(400).json({ error: 'fecha inválida. Usa el formato AAAA-MM-DD' });
    }
    filtros.fecha = String(req.query.fecha);
  }
  if (req.query.limite !== undefined) {
    const limite = Number(req.query.limite);
    if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
      return res.status(400).json({ error: `limite debe ser un entero entre 1 y ${LIMITE_MAXIMO}` });
    }
    filtros.limite = limite;
  }

  try {
    return res.json(await pedidos.listarPedidos(filtros));
  } catch (error) {
    return next(error);
  }
});

// GET /pedidos/:id -> detalle con historial de estados
router.get('/:id', async (req, res, next) => {
  const id = leerId(req);
  if (!id) return res.status(400).json({ error: 'El id del pedido debe ser un entero positivo' });
  try {
    const pedido = await pedidos.obtenerPedidoConHistorial(id);
    if (!pedido) return res.status(404).json({ error: `No existe el pedido ${id}` });
    return res.json(pedido);
  } catch (error) {
    return next(error);
  }
});

// PATCH /pedidos/:id/estado { estado }
router.patch('/:id/estado', async (req, res, next) => {
  const id = leerId(req);
  if (!id) return res.status(400).json({ error: 'El id del pedido debe ser un entero positivo' });

  const nuevoEstado = req.body?.estado;
  if (!esEstadoValido(nuevoEstado)) {
    return res.status(400).json({ error: `estado inválido. Valores permitidos: ${ESTADOS.join(', ')}` });
  }

  try {
    const resultado = await pedidos.cambiarEstado({ id, nuevoEstado, idUsuario: req.usuario.id });
    // RF-07: al quedar listo se avisa al cliente. No se espera la respuesta de WhatsApp para
    // contestar al panel, y avisarPedidoListo nunca lanza errores.
    if (nuevoEstado === 'listo') notificaciones.avisarPedidoListo(id);
    return res.json(resultado);
  } catch (error) {
    if (error instanceof pedidos.ErrorPedido) {
      if (error.codigo === 'pedido_no_existe') return res.status(404).json({ error: `No existe el pedido ${id}` });
      if (error.codigo === 'transicion_invalida') {
        const { actual, permitidos } = error.detalle;
        return res.status(409).json({
          error: `No se puede pasar de ${actual} a ${nuevoEstado}`,
          estado_actual: actual,
          estados_permitidos: permitidos,
        });
      }
    }
    return next(error);
  }
});

module.exports = router;
