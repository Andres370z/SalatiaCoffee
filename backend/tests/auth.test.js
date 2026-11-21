// Pruebas unitarias de autenticación (RF-10): hash, token y middleware.
jest.mock('../src/services/usuarios');

const jwt = require('jsonwebtoken');
const usuarios = require('../src/services/usuarios');
const auth = require('../src/services/auth');
const { extraerToken, requerirAuth, requerirRol } = require('../src/middleware/auth');

const SECRETO = 'secreto-de-pruebas';
const entornoOriginal = { ...process.env };

beforeEach(() => {
  process.env.JWT_SECRET = SECRETO;
  process.env.NODE_ENV = 'test';
  jest.resetAllMocks();
});

afterAll(() => {
  process.env = entornoOriginal;
});

function respuestaFalsa() {
  const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
  return res;
}

describe('contraseñas', () => {
  test('se guardan con hash y se verifican', async () => {
    const hash = await auth.hashearContrasena('Clave-segura-1');
    expect(hash).not.toContain('Clave-segura-1');
    expect(await auth.verificarContrasena('Clave-segura-1', hash)).toBe(true);
    expect(await auth.verificarContrasena('otra-clave', hash)).toBe(false);
  });

  test('el mismo texto da hashes distintos (con sal)', async () => {
    const [a, b] = await Promise.all([auth.hashearContrasena('igual'), auth.hashearContrasena('igual')]);
    expect(a).not.toBe(b);
  });
});

describe('token de sesión', () => {
  const usuario = { id: 7, nombre: 'Ana', rol: 'personal' };

  test('firma y verifica un token', () => {
    expect(auth.verificarToken(auth.firmarToken(usuario))).toEqual({ id: 7, rol: 'personal', nombre: 'Ana' });
  });

  test('rechaza un token firmado con otro secreto', () => {
    const ajeno = jwt.sign({ sub: '7', rol: 'administrador' }, 'otro-secreto');
    expect(() => auth.verificarToken(ajeno)).toThrow();
  });

  test('rechaza un token vencido', () => {
    const vencido = jwt.sign({ sub: '7', rol: 'personal' }, SECRETO, { expiresIn: -10 });
    expect(() => auth.verificarToken(vencido)).toThrow(/expired/);
  });

  test('rechaza un token sin firma (alg none)', () => {
    const sinFirma = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"sub":"1","rol":"administrador"}').toString('base64url')}.`;
    expect(() => auth.verificarToken(sinFirma)).toThrow();
  });

  test('falla si JWT_SECRET no está configurado', () => {
    delete process.env.JWT_SECRET;
    expect(() => auth.firmarToken(usuario)).toThrow(/JWT_SECRET/);
  });

  test('en producción no acepta el secreto de ejemplo', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'cambia_este_secreto';
    expect(() => auth.firmarToken(usuario)).toThrow(/ejemplo/);
  });
});

describe('extraerToken', () => {
  test.each([
    ['Bearer abc.def.ghi', 'abc.def.ghi'],
    ['bearer abc', 'abc'],
    ['Basic abc', null],
    ['Bearer', null],
    ['', null],
    [undefined, null],
  ])('%p -> %p', (cabecera, esperado) => {
    expect(extraerToken(cabecera)).toBe(esperado);
  });
});

describe('requerirAuth', () => {
  const activo = { id: 7, nombre: 'Ana', usuario: 'ana', rol: 'personal', activo: true };

  test('sin token responde 401', async () => {
    const res = respuestaFalsa();
    const next = jest.fn();
    await requerirAuth({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('con token válido y usuario activo deja pasar y guarda el usuario', async () => {
    usuarios.buscarPorId.mockResolvedValue(activo);
    const req = { headers: { authorization: `Bearer ${auth.firmarToken(activo)}` } };
    const next = jest.fn();
    await requerirAuth(req, respuestaFalsa(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.usuario).toEqual({ id: 7, nombre: 'Ana', usuario: 'ana', rol: 'personal' });
  });

  test('un usuario desactivado pierde el acceso aunque su token no haya vencido', async () => {
    usuarios.buscarPorId.mockResolvedValue({ ...activo, activo: false });
    const res = respuestaFalsa();
    await requerirAuth({ headers: { authorization: `Bearer ${auth.firmarToken(activo)}` } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('usa el rol actual de la base, no el del token', async () => {
    usuarios.buscarPorId.mockResolvedValue({ ...activo, rol: 'personal' });
    const tokenDeAdmin = auth.firmarToken({ ...activo, rol: 'administrador' });
    const req = { headers: { authorization: `Bearer ${tokenDeAdmin}` } };
    await requerirAuth(req, respuestaFalsa(), jest.fn());
    expect(req.usuario.rol).toBe('personal');
  });
});

describe('requerirRol', () => {
  test('permite solo los roles indicados', () => {
    const middleware = requerirRol('administrador');

    const resPersonal = respuestaFalsa();
    const nextPersonal = jest.fn();
    middleware({ usuario: { rol: 'personal' } }, resPersonal, nextPersonal);
    expect(resPersonal.status).toHaveBeenCalledWith(403);
    expect(nextPersonal).not.toHaveBeenCalled();

    const nextAdmin = jest.fn();
    middleware({ usuario: { rol: 'administrador' } }, respuestaFalsa(), nextAdmin);
    expect(nextAdmin).toHaveBeenCalled();
  });

  test('sin usuario responde 403', () => {
    const res = respuestaFalsa();
    requerirRol('personal')({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
