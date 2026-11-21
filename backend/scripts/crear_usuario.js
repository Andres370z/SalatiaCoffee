// Crea un usuario del panel (RF-10). La contraseña se guarda con hash.
//
// Uso:
//   npm run usuario:crear -- <usuario> "<Nombre completo>" <administrador|personal>
//
// La contraseña se pide por consola sin mostrarla. También puede venir en la variable de
// entorno CONTRASENA (útil para automatizar); no se acepta como argumento para que no quede
// en el historial del terminal.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const readline = require('readline');

const pool = require('../src/db');
const { ROLES, hashearContrasena } = require('../src/services/auth');
const { crearUsuario } = require('../src/services/usuarios');

const LARGO_MINIMO_CONTRASENA = 8;

function pedirContrasena(pregunta) {
  return new Promise((resolver) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let oculto = false;
    rl._writeToOutput = (texto) => {
      if (!oculto) rl.output.write(texto);
    };
    rl.question(pregunta, (respuesta) => {
      rl.close();
      process.stdout.write('\n');
      resolver(respuesta);
    });
    oculto = true;
  });
}

async function main() {
  const [usuario, nombre, rol] = process.argv.slice(2);
  if (!usuario || !nombre || !ROLES.includes(rol)) {
    console.error(`Uso: npm run usuario:crear -- <usuario> "<Nombre completo>" <${ROLES.join('|')}>`);
    process.exitCode = 1;
    return;
  }
  if (!/^[A-Za-z0-9._-]{3,60}$/.test(usuario)) {
    console.error('El usuario debe tener de 3 a 60 caracteres: letras, números, punto, guion o guion bajo.');
    process.exitCode = 1;
    return;
  }

  let contrasena = process.env.CONTRASENA;
  if (!contrasena) {
    contrasena = await pedirContrasena('Contraseña: ');
    const repetida = await pedirContrasena('Repite la contraseña: ');
    if (contrasena !== repetida) {
      console.error('Las contraseñas no coinciden.');
      process.exitCode = 1;
      return;
    }
  }
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    console.error(`La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`);
    process.exitCode = 1;
    return;
  }

  try {
    const creado = await crearUsuario({
      nombre: nombre.trim(),
      usuario,
      contrasenaHash: await hashearContrasena(contrasena),
      rol,
    });
    console.log(`Usuario creado: ${creado.usuario} (${creado.rol}), id ${creado.id}`);
  } catch (error) {
    if (error.code === '23505') console.error(`Ya existe un usuario llamado "${usuario}".`);
    else console.error('No se pudo crear el usuario:', error.message);
    process.exitCode = 1;
  }
}

main().finally(() => pool.end());
