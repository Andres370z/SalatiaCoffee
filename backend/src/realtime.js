// Tiempo real con Socket.IO: el panel recibe pedido:nuevo y pedido:estado sin recargar.
// Solo se aceptan conexiones con un token de sesión válido (RNF-04).
const { Server } = require('socket.io');
const { autenticarToken } = require('./middleware/auth');

const SALA_PERSONAL = 'personal';
let io = null;

function iniciarTiempoReal(servidorHttp) {
  io = new Server(servidorHttp, { cors: { origin: true } });

  // El token viaja en el handshake: io(url, { auth: { token } })
  io.use(async (socket, next) => {
    try {
      const usuario = await autenticarToken(socket.handshake.auth?.token);
      if (!usuario) return next(new Error('No autorizado'));
      socket.data.usuario = usuario;
      return next();
    } catch (error) {
      console.error('Error autenticando la conexión de tiempo real:', error);
      return next(new Error('Error de autenticación'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(SALA_PERSONAL);
  });

  return io;
}

// Envía un evento a todo el personal conectado. Si el tiempo real no está iniciado
// (por ejemplo en pruebas del flujo), no hace nada.
function emitir(evento, datos) {
  if (io) io.to(SALA_PERSONAL).emit(evento, datos);
}

// Cierra Socket.IO (y el servidor HTTP al que está unido)
async function cerrarTiempoReal() {
  if (!io) return;
  const actual = io;
  io = null;
  await new Promise((resolver) => actual.close(resolver));
}

module.exports = { iniciarTiempoReal, emitir, cerrarTiempoReal, SALA_PERSONAL };
