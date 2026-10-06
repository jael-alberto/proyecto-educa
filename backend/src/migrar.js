/**
 * Aplica el esquema a la base de datos e informa del resultado.
 *
 * Ejecutar con:  npm run db:migrar
 *
 * Sirve para los casos en los que no se quiere arrancar el servidor, por
 * ejemplo al preparar el entorno de despliegue o al revisar el estado del
 * esquema. El arranque normal ya aplica el esquema automaticamente, asi que
 * este script es comodo, no obligatorio.
 */
import { abrirBaseDatos, estadoEsquema, cerrarBaseDatos, db } from './db.js';
import { config } from './config.js';

// abrirBaseDatos() ya aplica el esquema si hace falta, asi que no se vuelve a
// llamar a aplicarEsquema(): hacerlo daria un "no habia nada que hacer" que
// contradiria lo que acaba de ocurrir.
abrirBaseDatos();

const resultado = estadoEsquema();

console.log(`[migrar] base de datos: ${config.baseDatos.archivo}`);
console.log(`[migrar] esquema: ${config.baseDatos.esquema}`);

if (resultado.aplicada) {
  console.log(`[migrar] esquema aplicado correctamente, version ${resultado.version}`);
} else {
  console.log(`[migrar] el esquema ya estaba en la version ${resultado.version}, no habia nada que hacer`);
}

// Inventario util para confirmar que la migracion dejo todo en su sitio.
const conteo = (tabla) => db().prepare(`SELECT COUNT(*) AS total FROM ${tabla}`).get().total;
const tablas = db()
  .prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
  .get().total;

console.log(`[migrar] tablas creadas: ${tablas}`);
console.log(`[migrar] registros: roles ${conteo('roles')}, cursos ${conteo('cursos')}, usuarios ${conteo('usuarios')}`);

cerrarBaseDatos();
