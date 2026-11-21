// Pruebas de Socket.IO sin base de datos: la autenticación se simula.
jest.mock('../src/middleware/auth', () => ({ autenticarToken: jest.fn() }));

const http = require('http');
const { io: conectar } = require('socket.io-client');
const { autenticarToken } = require('../src/middleware/auth');
const { iniciarTiempoReal, emitir, cerrarTiempoReal } = require('../src/realtime');

let servidor;
let url;
const clientes = [];

beforeEach(async () => {
  autenticarToken.mockReset();
  servidor = http.createServer();
  iniciarTiempoReal(servidor);
  await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
  url = `http://127.0.0.1:${servidor.address().port}`;
});

afterEach(async () => {
  clientes.splice(0).forEach((cliente) => cliente.close());
  await cerrarTiempoReal();
});

function nuevoCliente(token) {
  const cliente = conectar(url, { auth: { token }, reconnection: false, transports: ['websocket'] });
  clientes.push(cliente);
  return cliente;
}

const esperar = (cliente, evento) => new Promise((resolver) => cliente.once(evento, resolver));

describe('tiempo real', () => {
  test('rechaza la conexión sin token válido', async () => {
    autenticarToken.mockResolvedValue(null);
    const cliente = nuevoCliente('falso');
    const error = await esperar(cliente, 'connect_error');
    expect(error.message).toBe('No autorizado');
  });

  test('el personal autenticado recibe los eventos emitidos', async () => {
    autenticarToken.mockResolvedValue({ id: 1, rol: 'personal' });
    const cliente = nuevoCliente('bueno');
    await esperar(cliente, 'connect');
    // la unión a la sala ocurre justo después de conectar
    await new Promise((resolver) => setTimeout(resolver, 50));

    const recibido = esperar(cliente, 'pedido:nuevo');
    emitir('pedido:nuevo', { id: 5, estado: 'recibido' });
    expect(await recibido).toEqual({ id: 5, estado: 'recibido' });
  });

  test('emitir sin tiempo real iniciado no falla', async () => {
    await cerrarTiempoReal();
    expect(() => emitir('pedido:nuevo', {})).not.toThrow();
  });
});
