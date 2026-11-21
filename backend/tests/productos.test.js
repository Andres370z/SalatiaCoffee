const { validarProducto } = require('../src/services/productos');

describe('validarProducto (creación)', () => {
  test('acepta un producto completo y limpia los espacios', () => {
    const { errores, valores } = validarProducto({
      nombre: '  Latte  ',
      descripcion: ' Café con leche ',
      precio: 7500,
      id_categoria: 1,
      disponible: false,
    });
    expect(errores).toEqual([]);
    expect(valores).toEqual({ nombre: 'Latte', descripcion: 'Café con leche', precio: 7500, id_categoria: 1, disponible: false });
  });

  test('exige nombre, precio y categoría', () => {
    const { errores } = validarProducto({});
    expect(errores).toHaveLength(3);
    expect(errores.join(' ')).toMatch(/nombre.*precio.*id_categoria/);
  });

  test.each([undefined, null, 'texto', [], 5])('un cuerpo inválido (%p) no rompe la validación', (cuerpo) => {
    expect(validarProducto(cuerpo).errores.length).toBeGreaterThan(0);
  });

  test.each([
    ['precio negativo', { precio: -1 }],
    ['precio como texto', { precio: '3000' }],
    ['precio NaN', { precio: NaN }],
    ['precio infinito', { precio: Infinity }],
    ['más de 2 decimales', { precio: 10.123 }],
    ['precio demasiado grande', { precio: 100000000 }],
  ])('rechaza %s', (_, cambio) => {
    const { errores } = validarProducto({ nombre: 'X', id_categoria: 1, precio: 100, ...cambio });
    expect(errores.join(' ')).toMatch(/precio/);
  });

  test.each([
    ['nombre vacío', { nombre: '   ' }],
    ['nombre que no es texto', { nombre: 123 }],
    ['nombre demasiado largo', { nombre: 'a'.repeat(121) }],
  ])('rechaza %s', (_, cambio) => {
    expect(validarProducto({ precio: 1, id_categoria: 1, ...cambio }).errores.join(' ')).toMatch(/nombre/);
  });

  test.each([0, -2, 1.5, '1', null])('rechaza id_categoria %p', (id) => {
    expect(validarProducto({ nombre: 'X', precio: 1, id_categoria: id }).errores.join(' ')).toMatch(/id_categoria/);
  });

  test('disponible debe ser booleano', () => {
    expect(validarProducto({ nombre: 'X', precio: 1, id_categoria: 1, disponible: 'no' }).errores.join(' ')).toMatch(/disponible/);
  });

  test('acepta precio 0 y descripción null', () => {
    const { errores, valores } = validarProducto({ nombre: 'Cortesía', precio: 0, id_categoria: 1, descripcion: null });
    expect(errores).toEqual([]);
    expect(valores.precio).toBe(0);
    expect(valores.descripcion).toBeNull();
  });
});

describe('validarProducto (actualización parcial)', () => {
  test('permite cambiar solo un campo', () => {
    expect(validarProducto({ disponible: false }, { parcial: true })).toEqual({ errores: [], valores: { disponible: false } });
    expect(validarProducto({ precio: 4000 }, { parcial: true }).valores).toEqual({ precio: 4000 });
  });

  test('exige al menos un campo', () => {
    expect(validarProducto({}, { parcial: true }).errores.join(' ')).toMatch(/al menos un campo/);
  });

  test('ignora campos desconocidos como id', () => {
    const { errores, valores } = validarProducto({ id: 99, disponible: true }, { parcial: true });
    expect(errores).toEqual([]);
    expect(valores).toEqual({ disponible: true });
  });

  test('valida los campos presentes', () => {
    expect(validarProducto({ precio: -5 }, { parcial: true }).errores.join(' ')).toMatch(/precio/);
  });
});
