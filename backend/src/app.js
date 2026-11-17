const express = require('express');
const cors = require('cors');

const rutaSalud = require('./routes/salud');
const rutaWebhook = require('./routes/webhook');

// Crea la aplicación Express sin abrir el puerto, para poder usarla en las pruebas.
function crearApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/salud', rutaSalud);
  app.use('/webhook', rutaWebhook);

  return app;
}

module.exports = crearApp;
