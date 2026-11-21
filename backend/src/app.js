const express = require('express');
const cors = require('cors');

const rutaSalud = require('./routes/salud');
const rutaWebhook = require('./routes/webhook');
const rutaMesas = require('./routes/mesas');
const rutaAuth = require('./routes/auth');
const rutaUsuarios = require('./routes/usuarios');
const rutaPedidos = require('./routes/pedidos');
const rutaProductos = require('./routes/productos');
const rutaCategorias = require('./routes/categorias');

// Crea la aplicación Express sin abrir el puerto, para poder usarla en las pruebas.
function crearApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/salud', rutaSalud);
  app.use('/webhook', rutaWebhook);
  app.use('/mesas', rutaMesas);
  app.use('/auth', rutaAuth);
  app.use('/usuarios', rutaUsuarios);
  app.use('/pedidos', rutaPedidos);
  app.use('/productos', rutaProductos);
  app.use('/categorias', rutaCategorias);

  // El simulador no existe en producción
  if (process.env.NODE_ENV !== 'production') {
    app.use('/simulador', require('./routes/simulador'));
  }

  // Errores no controlados: respuesta JSON y sin detalles internos
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
    }
    console.error(`Error en ${req.method} ${req.originalUrl}:`, error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = crearApp;
