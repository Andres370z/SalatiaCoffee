const http = require('http');
const crearApp = require('./app');
const { iniciarTiempoReal } = require('./realtime');

// Servidor HTTP con la API de Express y Socket.IO en el mismo puerto
function crearServidor() {
  const servidor = http.createServer(crearApp());
  iniciarTiempoReal(servidor);
  return servidor;
}

module.exports = crearServidor;
