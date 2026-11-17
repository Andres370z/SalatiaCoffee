const express = require('express');
const cors = require('cors');

const rutaSalud = require('./routes/salud');
const rutaWebhook = require('./routes/webhook');
const rutaMesas = require('./routes/mesas');

// Crea la aplicación Express sin abrir el puerto, para poder usarla en las pruebas.
function crearApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/salud', rutaSalud);
  app.use('/webhook', rutaWebhook);
  app.use('/mesas', rutaMesas);

  // El simulador no existe en producción
  if (process.env.NODE_ENV !== 'production') {
    app.use('/simulador', require('./routes/simulador'));
  }

  return app;
}

module.exports = crearApp;
