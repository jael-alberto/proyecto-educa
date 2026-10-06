import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';

/**
 * Cabeceras de seguridad de la respuesta.
 * helmet activa por defecto X-Content-Type-Options, X-Frame-Options,
 * Strict-Transport-Security, X-DNS-Prefetch-Control y elimina la cabecera
 * X-Powered-By. Se ajustan dos cosas:
 *   - la CSP permite los estilos del frontend y bloquea scripts de terceros;
 *   - referrerPolicy limita la fuga de URLs a sitios externos.
 */
export function cabecerasSeguridad() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        // Los estilos del frontend usan estilos en linea en algunas paginas.
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", ...config.origenesPermitidos],
        'font-src': ["'self'", 'data:'],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': config.esProduccion ? [] : null,
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: false,
    hsts: config.esProduccion
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  });
}

/**
 * CORS con lista blanca de origenes. El comodin queda prohibido porque se
 * envian cookies de sesion: con Access-Control-Allow-Origin: * el navegador
 * bloquea la respuesta y, en cualquier caso, permitiria que cualquier sitio
 *ouvera la API con credenciales.
 */
export function corsPermitido() {
  return cors({
    origin(origin, callback) {
      // Sin cabecera Origin: es una peticion del mismo origen o de una
      // herramienta local como curl o Postman.
      if (!origin) return callback(null, true);
      if (config.origenesPermitidos.includes(origin)) return callback(null, true);
      return callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 600,
  });
}

/** Limite global, para frenar el abuso y el forcejeo de recursos. */
export function limiteGeneral() {
  return rateLimit({
    windowMs: config.limites.general.ventanaMinutos * 60 * 1000,
    max: config.limites.general.maxPeticiones,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'demasiadas_peticiones', mensaje: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
  });
}

/**
 * Limite por IP para el inicio de sesion. Es la primera barrera contra la
 * fuerza bruta; la segunda, mas fuerte, consulta la tabla intentos_sesion
 * (ver modulo throttle.js) para bloquear tambien por correo.
 */
export function limiteLogin() {
  return rateLimit({
    windowMs: config.limites.login.ventanaMinutos * 60 * 1000,
    max: config.limites.login.maxIntentos,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      error: 'demasiados_intentos',
      mensaje: 'Demasiados intentos de acceso. Espera unos minutos antes de reintentar.',
    },
  });
}

export function limiteRegistro() {
  return rateLimit({
    windowMs: config.limites.registro.ventanaMinutos * 60 * 1000,
    max: config.limites.registro.maxIntentos,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'demasiados_registros',
      mensaje: 'Se alcanzo el limite de cuentas creadas desde este equipo. Intenta mas tarde.',
    },
  });
}
