// RF-07: aviso de pedido listo, con la base y WhatsApp simulados.
jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/whatsapp', () => ({ enviarMensaje: jest.fn() }));

const pool = require('../src/db');
const whatsapp = require('../src/services/whatsapp');
const { avisarPedidoListo, textoPedidoListo } = require('../src/services/notificaciones');

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('avisarPedidoListo', () => {
  test('envía el mensaje al teléfono del cliente con el número de pedido y la mesa', async () => {
    pool.query.mockResolvedValue({ rows: [{ telefono: '573001112233', autoriza_datos: true, mesa_numero: 3 }] });
    whatsapp.enviarMensaje.mockResolvedValue({ simulado: true });

    const resultado = await avisarPedidoListo(12);

    expect(whatsapp.enviarMensaje).toHaveBeenCalledWith('573001112233', textoPedidoListo(12, 3));
    expect(textoPedidoListo(12, 3)).toMatch(/#12.*mesa 3.*listo/);
    expect(resultado).toEqual({ enviado: true, simulado: true });
  });

  test('no escribe a un cliente que no autorizó el tratamiento de datos', async () => {
    pool.query.mockResolvedValue({ rows: [{ telefono: '573001112233', autoriza_datos: false, mesa_numero: 3 }] });
    const resultado = await avisarPedidoListo(12);
    expect(whatsapp.enviarMensaje).not.toHaveBeenCalled();
    expect(resultado).toEqual({ enviado: false, motivo: 'sin_autorizacion' });
  });

  test('si el pedido no existe no envía nada', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    expect(await avisarPedidoListo(99)).toEqual({ enviado: false, motivo: 'pedido_no_existe' });
    expect(whatsapp.enviarMensaje).not.toHaveBeenCalled();
  });

  test('si WhatsApp falla no lanza error', async () => {
    pool.query.mockResolvedValue({ rows: [{ telefono: '573001112233', autoriza_datos: true, mesa_numero: null }] });
    whatsapp.enviarMensaje.mockRejectedValue(new Error('WhatsApp respondió 401'));
    await expect(avisarPedidoListo(12)).resolves.toEqual({ enviado: false, motivo: 'error_de_envio' });
  });

  test('si la base falla no lanza error', async () => {
    pool.query.mockRejectedValue(new Error('conexión caída'));
    await expect(avisarPedidoListo(12)).resolves.toEqual({ enviado: false, motivo: 'error_de_envio' });
  });
});
