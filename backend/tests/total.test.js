const { calcularTotal, formatearPrecio } = require('../src/services/total');

describe('calcularTotal', () => {
  const precios = new Map([
    [1, '3000.00'], // pg devuelve NUMERIC como texto
    [2, 7000],
    [3, '0.10'],
  ]);

  test('suma cantidad x precio unitario de cada ítem', () => {
    const items = [
      { id_producto: 1, cantidad: 3 },
      { id_producto: 2, cantidad: 2 },
    ];
    expect(calcularTotal(items, precios)).toBe(23000);
  });

  test('carrito vacío da total 0', () => {
    expect(calcularTotal([], precios)).toBe(0);
  });

  test('no acumula errores de redondeo con decimales', () => {
    // 0.10 * 3 en coma flotante daría 0.30000000000000004
    expect(calcularTotal([{ id_producto: 3, cantidad: 3 }], precios)).toBe(0.3);
  });

  test('el mismo producto en varias líneas se suma', () => {
    const items = [
      { id_producto: 2, cantidad: 1 },
      { id_producto: 2, cantidad: 1 },
    ];
    expect(calcularTotal(items, precios)).toBe(14000);
  });

  test('falla si falta el precio de un producto', () => {
    expect(() => calcularTotal([{ id_producto: 99, cantidad: 1 }], precios)).toThrow(/precio/);
  });

  test.each([0, -1, 1.5, '2'])('falla con cantidad inválida %p', (cantidad) => {
    expect(() => calcularTotal([{ id_producto: 1, cantidad }], precios)).toThrow(/Cantidad/);
  });

  test('falla con precio negativo', () => {
    expect(() => calcularTotal([{ id_producto: 1, cantidad: 1 }], new Map([[1, -5]]))).toThrow(/Precio/);
  });
});

describe('formatearPrecio', () => {
  test('usa separador de miles colombiano', () => {
    expect(formatearPrecio(23000)).toBe('$23.000');
    expect(formatearPrecio('3500.00')).toBe('$3.500');
  });
});
