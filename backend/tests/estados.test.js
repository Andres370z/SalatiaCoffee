const { ESTADOS, esEstadoValido, siguientesEstados, puedeCambiar } = require('../src/services/estados');

describe('estados del pedido', () => {
  test('el orden normal es recibido -> en_preparacion -> listo -> entregado', () => {
    expect(puedeCambiar('recibido', 'en_preparacion')).toBe(true);
    expect(puedeCambiar('en_preparacion', 'listo')).toBe(true);
    expect(puedeCambiar('listo', 'entregado')).toBe(true);
  });

  test.each([
    ['recibido', 'listo'],
    ['recibido', 'entregado'],
    ['en_preparacion', 'recibido'],
    ['en_preparacion', 'entregado'],
    ['listo', 'en_preparacion'],
    ['recibido', 'recibido'],
  ])('no se puede saltar ni retroceder: %s -> %s', (actual, nuevo) => {
    expect(puedeCambiar(actual, nuevo)).toBe(false);
  });

  test('solo se cancela mientras está recibido (RF-12)', () => {
    expect(puedeCambiar('recibido', 'cancelado')).toBe(true);
    expect(puedeCambiar('en_preparacion', 'cancelado')).toBe(false);
    expect(puedeCambiar('listo', 'cancelado')).toBe(false);
  });

  test('entregado y cancelado son finales', () => {
    expect(siguientesEstados('entregado')).toEqual([]);
    expect(siguientesEstados('cancelado')).toEqual([]);
  });

  test('un estado desconocido no tiene siguientes', () => {
    expect(siguientesEstados('inventado')).toEqual([]);
    expect(puedeCambiar('inventado', 'listo')).toBe(false);
  });

  test('esEstadoValido coincide con los estados de la base', () => {
    expect(ESTADOS.every(esEstadoValido)).toBe(true);
    expect(esEstadoValido('Listo')).toBe(false);
    expect(esEstadoValido(undefined)).toBe(false);
  });

  test('siguientesEstados devuelve una copia', () => {
    siguientesEstados('recibido').push('listo');
    expect(siguientesEstados('recibido')).toEqual(['en_preparacion', 'cancelado']);
  });
});
