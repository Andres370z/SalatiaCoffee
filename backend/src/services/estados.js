// Estados del pedido y orden permitido (RF-06, RF-12):
// recibido -> en_preparacion -> listo -> entregado. Solo se cancela mientras está recibido.

const ESTADOS = Object.freeze(['recibido', 'en_preparacion', 'listo', 'entregado', 'cancelado']);

const TRANSICIONES = Object.freeze({
  recibido: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo'],
  listo: ['entregado'],
  entregado: [],
  cancelado: [],
});

function esEstadoValido(estado) {
  return ESTADOS.includes(estado);
}

function siguientesEstados(actual) {
  return TRANSICIONES[actual] ? [...TRANSICIONES[actual]] : [];
}

function puedeCambiar(actual, nuevo) {
  return siguientesEstados(actual).includes(nuevo);
}

module.exports = { ESTADOS, esEstadoValido, siguientesEstados, puedeCambiar };
