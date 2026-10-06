import { createServer } from 'node:http';
import { config } from './config.js';
import { crearAplicacion } from './app.js';
import { abrirBaseDatos, cerrarBaseDatos } from './db.js';

const app = crearAplicacion();

try {
  abrirBaseDatos();
  console.log(`[base-de-datos] esquema aplicado en ${config.baseDatos.archivo}`);
} catch (error) {
  console.error('[base-de-datos] no se pudo abrir:', error.message);
  process.exit(1);
}

const servidor = createServer(app);

servidor.listen(config.puerto, config.host, () => {
  console.log(`[educa] API escuchando en http://${config.host}:${config.puerto} (${config.entorno})`);
  console.log(`[educa] origenes permitidos: ${config.origenesPermitidos.join(', ')}`);
});

/** Cierre ordenado: deja de aceptar conexiones y cierra la base de datos. */
function apagar(senal) {
  console.log(`\n[educa] ${senal} recibido, cerrando...`);
  servidor.close(() => {
    cerrarBaseDatos();
    process.exit(0);
  });
  // Si alguna conexion se queda colgada, no esperar indefinidamente.
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
