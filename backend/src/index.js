require('dotenv').config();
const crearServidor = require('./servidor');

const servidor = crearServidor();
const puerto = process.env.PORT || 3000;
servidor.listen(puerto, () => console.log(`SalatiaCoffee backend en el puerto ${puerto}`));
