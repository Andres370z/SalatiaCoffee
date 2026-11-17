require('dotenv').config();
const crearApp = require('./app');

const app = crearApp();
const puerto = process.env.PORT || 3000;
app.listen(puerto, () => console.log(`SalatiaCoffee backend en el puerto ${puerto}`));
