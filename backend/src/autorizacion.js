import { consultarUno } from './db.js';
import { resolverSesion, csrfValido } from './sesiones.js';
import { config } from './config.js';

/**
 * Middleware que resuelve la sesion actual a partir de la cookie.
 * No bloquea: adjunta req.sesion (null si no hay) y req.usuario (null si no hay).
 * Asi cada ruta decide si necesita sesion.
 */
export function leerSesion(req, res, next) {
  const token = req.cookies?.[config.sesion.nombreCookie] ?? null;
  req.sesion = resolverSesion(token);
  req.usuario = null;

  if (req.sesion) {
    req.usuario = {
      id: req.sesion.usuario_id,
      correo: req.sesion.correo,
      nombre: req.sesion.nombre,
      apellidos: req.sesion.apellidos,
      rol: req.sesion.rol,
    };
  }

  next();
}

/** Exige una sesion valida. */
export function requiereSesion(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({
      error: 'no_autorizado',
      mensaje: 'Necesitas iniciar sesion para continuar.',
    });
  }
  next();
}

/**
 * Exige sesion Y token anti-CSRF valido.
 * Se aplica a POST, PUT, PATCH y DELETE. GET no lo necesita porque por
 * definicion no modifica datos.
 */
export function requiereCsrf(req, res, next) {
  const metodo = req.method.toUpperCase();
  if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') return next();

  if (!req.usuario) {
    return res.status(401).json({ error: 'no_autorizado', mensaje: 'Necesitas iniciar sesion para continuar.' });
  }

  const recibido = req.get('x-csrf-token') ?? req.body?._csrf;
  if (!csrfValido(req.sesion, recibido)) {
    return res.status(403).json({
      error: 'csrf_invalido',
      mensaje: 'La solicitud no supero la verificacion de seguridad. Recarga la pagina e intenta de nuevo.',
    });
  }

  next();
}

/** Exige uno de los roles indicados. Se usa siempre despues de requiereSesion. */
export function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'no_autorizado', mensaje: 'Necesitas iniciar sesion para continuar.' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'prohibido',
        mensaje: 'Tu perfil no tiene acceso a esta seccion.',
      });
    }
    next();
  };
}

/**
 * Indica si el usuario puede ver una matricula concreta.
 *
 * El control de acceso se basa en la RELACION, no solo en el rol: un docente
 * solo ve los grupos que imparte y un administrador ve todo. Un estudiante que
 * cambia un identificador en la URL para leer la matricula de otra persona
 * recibe 404, no los datos.
 */
export function puedeVerMatricula(usuario, matricula) {
  if (!usuario || !matricula) return false;
  if (usuario.rol === 'administrador') return true;
  if (usuario.rol === 'soporte') return true;
  if (matricula.estudiante_id === usuario.id) return true;
  if (usuario.rol === 'docente') {
    const docente = consultarUno('SELECT id FROM docentes WHERE usuario_id = ?', usuario.id);
    return !!docente && docente.id === matricula.docente_id;
  }
  return false;
}
