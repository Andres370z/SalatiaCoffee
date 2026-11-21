// Creación de usuarios: validación y rutas /auth/primer-admin y /usuarios, con la base simulada.
jest.mock('../src/services/usuarios', () => ({
  ...jest.requireActual('../src/services/usuarios'),
  buscarPorId: jest.fn(),
  buscarPorUsuario: jest.fn(),
  crearUsuario: jest.fn(),
  crearPrimerAdministrador: jest.fn(),
}));

const http = require('http');
const usuarios = require('../src/services/usuarios');
const { firmarToken } = require('../src/services/auth');
const crearApp = require('../src/app');

const SECRETO = 'secreto-de-pruebas';
const CLAVE_INICIAL = 'clave-inicial-de-pruebas';
const entornoOriginal = { ...process.env };

const valido = { usuario: 'admin', nombre: 'Ana Admin', contrasena: 'Clave-segura-1' };

describe('validarUsuario', () => {
  test('acepta datos válidos y limpia espacios', () => {
    const { errores, valores } = usuarios.validarUsuario({ ...valido, usuario: ' ana ', rol: 'personal' });
    expect(errores).toEqual([]);
    expect(valores).toMatchObject({ usuario: 'ana', rol: 'personal' });
  });

  test('rolFijo ignora el rol del cuerpo', () => {
    const { errores, valores } = usuarios.validarUsuario({ ...valido, rol: 'personal' }, { rolFijo: 'administrador' });
    expect(errores).toEqual([]);
    expect(valores.rol).toBe('administrador');
  });

  test.each([
    ['usuario con espacios', { usuario: 'ana perez' }, /usuario/],
    ['usuario muy corto', { usuario: 'ab' }, /usuario/],
    ['nombre vacío', { nombre: '  ' }, /nombre/],
    ['contraseña corta', { contrasena: 'corta' }, /contrasena/],
    ['contraseña que no es texto', { contrasena: 12345678 }, /contrasena/],
    ['rol desconocido', { rol: 'jefe' }, /rol/],
  ])('rechaza %s', (_, cambio, patron) => {
    const { errores } = usuarios.validarUsuario({ ...valido, rol: 'personal', ...cambio });
    expect(errores.join(' ')).toMatch(patron);
  });

  test.each([undefined, null, 'texto', []])('un cuerpo inválido (%p) no rompe la validación', (cuerpo) => {
    expect(usuarios.validarUsuario(cuerpo).errores.length).toBeGreaterThan(0);
  });
});

describe('rutas de creación de usuarios', () => {
  let servidor;
  let url;

  beforeAll(async () => {
    servidor = http.createServer(crearApp());
    await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
    url = `http://127.0.0.1:${servidor.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolver) => servidor.close(resolver));
    process.env = entornoOriginal;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = SECRETO;
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_INICIAL_TOKEN = CLAVE_INICIAL;
  });

  async function enviar(ruta, cuerpo, token) {
    const respuesta = await fetch(`${url}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(cuerpo),
    });
    return { status: respuesta.status, cuerpo: await respuesta.json() };
  }

  describe('POST /auth/primer-admin', () => {
    test('está desactivado si no hay ADMIN_INICIAL_TOKEN', async () => {
      delete process.env.ADMIN_INICIAL_TOKEN;
      const { status, cuerpo } = await enviar('/auth/primer-admin', { clave_inicial: '', ...valido });
      expect(status).toBe(403);
      expect(cuerpo.error).toMatch(/desactivado/);
      expect(usuarios.crearPrimerAdministrador).not.toHaveBeenCalled();
    });

    test.each([
      ['sin clave', {}],
      ['clave incorrecta', { clave_inicial: 'otra' }],
      ['clave que no es texto', { clave_inicial: 123 }],
    ])('rechaza %s con 403', async (_, extra) => {
      const { status } = await enviar('/auth/primer-admin', { ...valido, ...extra });
      expect(status).toBe(403);
      expect(usuarios.crearPrimerAdministrador).not.toHaveBeenCalled();
    });

    test('crea el administrador con la contraseña hasheada y sin devolver el hash', async () => {
      usuarios.crearPrimerAdministrador.mockImplementation(async ({ nombre, usuario }) => ({
        id: 1, nombre, usuario, rol: 'administrador', activo: true,
      }));
      const { status, cuerpo } = await enviar('/auth/primer-admin', { clave_inicial: CLAVE_INICIAL, ...valido, rol: 'personal' });
      expect(status).toBe(201);
      expect(cuerpo).toEqual({ id: 1, nombre: 'Ana Admin', usuario: 'admin', rol: 'administrador', activo: true });

      const [argumentos] = usuarios.crearPrimerAdministrador.mock.calls[0];
      expect(argumentos.contrasenaHash).toMatch(/^\$2[aby]\$/);
      expect(JSON.stringify(argumentos)).not.toContain(valido.contrasena);
    });

    test('si ya existen usuarios responde 409', async () => {
      usuarios.crearPrimerAdministrador.mockResolvedValue(null);
      const { status, cuerpo } = await enviar('/auth/primer-admin', { clave_inicial: CLAVE_INICIAL, ...valido });
      expect(status).toBe(409);
      expect(cuerpo.error).toMatch(/Ya existe/);
    });

    test('valida los datos con 400', async () => {
      const { status } = await enviar('/auth/primer-admin', { clave_inicial: CLAVE_INICIAL, ...valido, contrasena: 'corta' });
      expect(status).toBe(400);
      expect(usuarios.crearPrimerAdministrador).not.toHaveBeenCalled();
    });
  });

  describe('POST /usuarios', () => {
    const tokenDe = (rol) => firmarToken({ id: 5, nombre: 'Quien sea', rol });

    function sesionDe(rol) {
      usuarios.buscarPorId.mockResolvedValue({ id: 5, nombre: 'Quien sea', usuario: 'quien', rol, activo: true });
      return tokenDe(rol);
    }

    test('sin sesión responde 401', async () => {
      expect((await enviar('/usuarios', { ...valido, rol: 'personal' })).status).toBe(401);
    });

    test('el personal no puede crear usuarios (403)', async () => {
      const { status } = await enviar('/usuarios', { ...valido, rol: 'personal' }, sesionDe('personal'));
      expect(status).toBe(403);
      expect(usuarios.crearUsuario).not.toHaveBeenCalled();
    });

    test('el administrador crea un usuario con la contraseña hasheada', async () => {
      usuarios.crearUsuario.mockImplementation(async ({ nombre, usuario, rol }) => ({ id: 9, nombre, usuario, rol, activo: true }));
      const { status, cuerpo } = await enviar('/usuarios', { ...valido, usuario: 'cocina', rol: 'personal' }, sesionDe('administrador'));
      expect(status).toBe(201);
      expect(cuerpo).toMatchObject({ id: 9, usuario: 'cocina', rol: 'personal' });
      expect(usuarios.crearUsuario.mock.calls[0][0].contrasenaHash).toMatch(/^\$2[aby]\$/);
    });

    test('un usuario repetido responde 409', async () => {
      usuarios.crearUsuario.mockRejectedValue(Object.assign(new Error('duplicado'), { code: '23505' }));
      const { status } = await enviar('/usuarios', { ...valido, rol: 'personal' }, sesionDe('administrador'));
      expect(status).toBe(409);
    });

    test('un rol inválido responde 400', async () => {
      const { status } = await enviar('/usuarios', { ...valido, rol: 'jefe' }, sesionDe('administrador'));
      expect(status).toBe(400);
      expect(usuarios.crearUsuario).not.toHaveBeenCalled();
    });
  });
});
