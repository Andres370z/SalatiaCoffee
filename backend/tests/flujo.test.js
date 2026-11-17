// Pruebas unitarias de la máquina de estados con una base de datos falsa en memoria.
const { procesarMensaje, extraerNumeroMesa, ESTADOS } = require('../src/services/flujo');
const { ErrorPedido } = require('../src/services/pedidos');
const { enlaceWhatsApp } = require('../src/services/qr');

const TELEFONO = '573000000001';

function crearDepsFalsas({ clienteAutorizado = false } = {}) {
  const mesas = [
    { id: 10, numero: 3, activa: true },
    { id: 11, numero: 4, activa: false },
  ];
  const categorias = [
    { id: 1, nombre: 'Bebidas calientes' },
    { id: 2, nombre: 'Panadería' },
  ];
  const productos = [
    { id: 1, nombre: 'Tinto', precio: '3000.00', disponible: true, id_categoria: 1 },
    { id: 2, nombre: 'Cappuccino', precio: '7000.00', disponible: true, id_categoria: 1 },
    { id: 3, nombre: 'Agotado', precio: '1000.00', disponible: false, id_categoria: 1 },
    { id: 4, nombre: 'Croissant', precio: '6500.00', disponible: true, id_categoria: 2 },
  ];
  const sesiones = new Map();
  const clientes = new Map(clienteAutorizado ? [[TELEFONO, { autoriza_datos: true }]] : []);

  return {
    datos: { sesiones, clientes, productos },
    obtenerSesion: jest.fn(async (telefono) =>
      structuredClone(
        sesiones.get(telefono) || { telefono, estado: 'inicio', id_mesa: null, carrito: { items: [], seleccion: null } },
      ),
    ),
    guardarSesion: jest.fn(async (sesion) => sesiones.set(sesion.telefono, structuredClone(sesion))),
    buscarMesaPorNumero: jest.fn(async (numero) => mesas.find((m) => m.numero === numero) || null),
    obtenerCliente: jest.fn(async (telefono) => clientes.get(telefono) || null),
    registrarAutorizacion: jest.fn(async (telefono) => clientes.set(telefono, { autoriza_datos: true })),
    listarCategorias: jest.fn(async () => categorias),
    listarProductosDisponibles: jest.fn(async (idCategoria) =>
      productos.filter((p) => p.id_categoria === idCategoria && p.disponible),
    ),
    obtenerProductos: jest.fn(async (ids) => productos.filter((p) => ids.includes(p.id))),
    crearPedido: jest.fn(async () => ({ id: 42, total: 17000 })),
  };
}

// Envía varios mensajes seguidos y devuelve la última respuesta
async function conversar(deps, mensajes) {
  let respuesta;
  for (const texto of mensajes) respuesta = await procesarMensaje(TELEFONO, texto, deps);
  return respuesta;
}

function sesionDe(deps) {
  return deps.datos.sesiones.get(TELEFONO);
}

describe('extraerNumeroMesa', () => {
  test.each([
    ['MESA-3', 3],
    ['Hola, estoy en la mesa-12', 12],
    ['quiero pedir MESA-7 por favor', 7],
    ['mesa 3', null],
    ['MESA-', null],
    ['', null],
  ])('%p -> %p', (texto, esperado) => {
    expect(extraerNumeroMesa(texto)).toBe(esperado);
  });
});

describe('Inicio e identificación de mesa (RF-01)', () => {
  test('sin código de mesa pide escanear el QR', async () => {
    const deps = crearDepsFalsas();
    const respuesta = await conversar(deps, ['hola']);
    expect(respuesta).toMatch(/MESA-3/);
    expect(sesionDe(deps)).toMatchObject({ estado: ESTADOS.INICIO, id_mesa: null });
  });

  test('mesa inexistente se informa y no avanza', async () => {
    const deps = crearDepsFalsas();
    const respuesta = await conversar(deps, ['MESA-99']);
    expect(respuesta).toMatch(/No encontramos la mesa 99/);
    expect(sesionDe(deps)).toMatchObject({ estado: ESTADOS.INICIO, id_mesa: null });
  });

  test('mesa inactiva se informa y no avanza', async () => {
    const deps = crearDepsFalsas();
    const respuesta = await conversar(deps, ['MESA-4']);
    expect(respuesta).toMatch(/mesa 4 no está disponible/);
    expect(sesionDe(deps)).toMatchObject({ estado: ESTADOS.INICIO, id_mesa: null });
  });

  test('mesa válida queda guardada en la sesión', async () => {
    const deps = crearDepsFalsas();
    const respuesta = await conversar(deps, ['Hola MESA-3']);
    expect(respuesta).toMatch(/mesa 3/);
    expect(sesionDe(deps).id_mesa).toBe(10);
  });
});

describe('Autorización de datos (RF-11)', () => {
  test('cliente nuevo debe autorizar antes de ver el menú', async () => {
    const deps = crearDepsFalsas();
    const respuesta = await conversar(deps, ['MESA-3']);
    expect(respuesta).toMatch(/Ley 1581 de 2012/);
    expect(sesionDe(deps).estado).toBe(ESTADOS.AUTORIZACION);
  });

  test('si no autoriza, no continúa', async () => {
    const deps = crearDepsFalsas();
    const respuesta = await conversar(deps, ['MESA-3', '2']);
    expect(respuesta).toMatch(/Sin tu autorización/);
    expect(deps.registrarAutorizacion).not.toHaveBeenCalled();
    expect(sesionDe(deps).estado).toBe(ESTADOS.AUTORIZACION);

    // Tampoco puede saltarse el paso pidiendo el menú
    const otra = await conversar(deps, ['menu']);
    expect(otra).toMatch(/Ley 1581/);
    expect(sesionDe(deps).estado).toBe(ESTADOS.AUTORIZACION);
  });

  test('si autoriza, se registra y se muestra el menú', async () => {
    const deps = crearDepsFalsas();
    const respuesta = await conversar(deps, ['MESA-3', 'Sí']);
    expect(deps.registrarAutorizacion).toHaveBeenCalledWith(TELEFONO);
    expect(respuesta).toMatch(/1\. Bebidas calientes/);
    expect(sesionDe(deps).estado).toBe(ESTADOS.CATEGORIA);
  });

  test('cliente que ya autorizó va directo al menú', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    const respuesta = await conversar(deps, ['MESA-3']);
    expect(respuesta).not.toMatch(/Ley 1581/);
    expect(respuesta).toMatch(/Bebidas calientes/);
  });
});

describe('Menú y selección (RF-02, RF-03)', () => {
  test('al elegir categoría lista solo productos disponibles con precio', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    const respuesta = await conversar(deps, ['MESA-3', '1']);
    expect(respuesta).toMatch(/1\. Tinto - \$3\.000/);
    expect(respuesta).toMatch(/2\. Cappuccino - \$7\.000/);
    expect(respuesta).not.toMatch(/Agotado/);
  });

  test('opción inválida responde con las opciones y no cambia de paso', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    const respuesta = await conversar(deps, ['MESA-3', 'quiero un café']);
    expect(respuesta).toMatch(/No entendí/);
    expect(respuesta).toMatch(/menu/);
    expect(sesionDe(deps).estado).toBe(ESTADOS.CATEGORIA);
  });

  test.each(['0', '21', 'dos', '-1'])('cantidad inválida %p se vuelve a pedir', async (cantidad) => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    const respuesta = await conversar(deps, ['MESA-3', '1', '1', cantidad]);
    expect(respuesta).toMatch(/del 1 al 20/);
    expect(sesionDe(deps).estado).toBe(ESTADOS.CANTIDAD);
  });

  test('agrega producto con observación y sin observación', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    await conversar(deps, ['MESA-3', '1', '2', '2', 'sin azúcar', '1', '2', '1', '1', 'no']);
    expect(sesionDe(deps).carrito.items).toEqual([
      { id_producto: 2, nombre: 'Cappuccino', cantidad: 2, nota: 'sin azúcar' },
      { id_producto: 4, nombre: 'Croissant', cantidad: 1, nota: null },
    ]);
  });

  test('"0" en productos vuelve a las categorías', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    const respuesta = await conversar(deps, ['MESA-3', '1', '0']);
    expect(respuesta).toMatch(/elige una categoría/);
    expect(sesionDe(deps).estado).toBe(ESTADOS.CATEGORIA);
  });
});

describe('Resumen y confirmación (RF-04, RF-05)', () => {
  const HASTA_RESUMEN = ['MESA-3', '1', '2', '2', 'sin azúcar', '1', '1', '1', '1', 'no', '2'];

  test('el resumen muestra productos, cantidades, observaciones y total', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    const respuesta = await conversar(deps, HASTA_RESUMEN);
    expect(respuesta).toMatch(/2 x Cappuccino - \$14\.000/);
    expect(respuesta).toMatch(/Observación: sin azúcar/);
    expect(respuesta).toMatch(/1 x Tinto - \$3\.000/);
    expect(respuesta).toMatch(/Total: \$17\.000/);
    expect(respuesta).toMatch(/1\. Confirmar pedido/);
    expect(sesionDe(deps).estado).toBe(ESTADOS.RESUMEN);
  });

  test('no se crea el pedido sin confirmación', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    await conversar(deps, [...HASTA_RESUMEN, 'ok', 'listo', '3', '0']);
    expect(deps.crearPedido).not.toHaveBeenCalled();
  });

  test('al confirmar crea el pedido y responde con el número', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    const respuesta = await conversar(deps, [...HASTA_RESUMEN, '1']);
    expect(deps.crearPedido).toHaveBeenCalledTimes(1);
    expect(deps.crearPedido).toHaveBeenCalledWith({
      telefono: TELEFONO,
      idMesa: 10,
      items: [
        { id_producto: 2, nombre: 'Cappuccino', cantidad: 2, nota: 'sin azúcar' },
        { id_producto: 1, nombre: 'Tinto', cantidad: 1, nota: null },
      ],
    });
    expect(respuesta).toMatch(/#42/);
    expect(sesionDe(deps)).toMatchObject({ estado: ESTADOS.INICIO, id_mesa: 10, carrito: { items: [] } });
  });

  test('quitar un producto actualiza el resumen', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    const respuesta = await conversar(deps, [...HASTA_RESUMEN, '3', '1']);
    expect(respuesta).toMatch(/Quitamos Cappuccino/);
    expect(respuesta).not.toMatch(/x Cappuccino/);
    expect(respuesta).toMatch(/Total: \$3\.000/);
  });

  test('si un producto se agota antes de confirmar, se avisa y no se crea el pedido', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    await conversar(deps, HASTA_RESUMEN);
    deps.datos.productos.find((p) => p.id === 2).disponible = false;
    deps.crearPedido.mockRejectedValueOnce(new ErrorPedido('producto_no_disponible', { ids: [2] }));

    const respuesta = await conversar(deps, ['1']);
    expect(respuesta).toMatch(/ya no está disponible: Cappuccino/);
    expect(respuesta).toMatch(/Total: \$3\.000/);
    expect(sesionDe(deps).estado).toBe(ESTADOS.RESUMEN);
  });

  test('"menu" reinicia el pedido y vacía el carrito', async () => {
    const deps = crearDepsFalsas({ clienteAutorizado: true });
    const respuesta = await conversar(deps, [...HASTA_RESUMEN, 'MENU']);
    expect(respuesta).toMatch(/Empecemos de nuevo/);
    expect(sesionDe(deps)).toMatchObject({ estado: ESTADOS.CATEGORIA, carrito: { items: [] } });
  });
});

describe('enlaceWhatsApp (RF-01)', () => {
  test('arma el enlace wa.me con el texto de la mesa', () => {
    expect(enlaceWhatsApp('+57 300 123-4567', 3)).toBe('https://wa.me/573001234567?text=MESA-3');
  });

  test('falla si no hay número configurado', () => {
    expect(() => enlaceWhatsApp('', 3)).toThrow(/WHATSAPP_NUMERO_PUBLICO/);
  });
});
