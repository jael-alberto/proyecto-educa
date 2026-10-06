import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { cabecerasSeguridad, corsPermitido, limiteGeneral } from './seguridad.js';
import { ErrorApi, enviarError } from './errores.js';
import { leerSesion } from './autorizacion.js';
import { rutasAuth } from './rutas/auth.js';
import { rutasCatalogo } from './rutas/catalogo.js';

export function crearAplicacion() {
  const app = express();

  // 1. La app no anuncia su tecnologia.
  app.disable('x-powered-by');
  // 2. Detras de un proxy inverso, para que req.ip refleje la IP real.
  app.set('trust proxy', 1);

  // 3. Cabeceras de seguridad y CORS antes de cualquier ruta.
  app.use(cabecerasSeguridad());
  app.use(corsPermitido());

  // 4. Limite de tamano del cuerpo: evita agotar memoria con un cuerpo enorme.
  app.use(express.json({ limit: config.limites.cuerpoBytes, strict: true }));
  app.use(express.urlencoded({ extended: false, limit: config.limites.cuerpoBytes }));
  app.use(cookieParser());

  // 5. Limite global de peticiones.
  app.use('/api', limiteGeneral());

  // 6. Resolver la sesion actual a partir de la cookie. No bloquea: cada
  //    ruta decide si la necesita. Va antes de las rutas de la API.
  app.use('/api', leerSesion);

  // 7. Comprobacion de salud: util para verificar que el servidor arranca.
  app.get('/api/salud', (req, res) => {
    res.json({
      estado: 'activo',
      entorno: config.entorno,
      hora: new Date().toISOString(),
    });
  });

  // 8. Rutas de la API.
  app.use('/api/auth', rutasAuth);
  app.use('/api/catalogo', rutasCatalogo);

  // 9. Ruta no encontrada, dentro y fuera de /api.
  app.use((req, res) => {
    enviarError(res, ErrorApi.noEncontrado('El endpoint'));
  });

  // 10. Manejador central de errores.
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    enviarError(res, error);
  });

  return app;
}
