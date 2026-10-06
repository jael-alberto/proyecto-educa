/**
 * Respuestas de error en un unico formato, para que el frontend pueda
 * mostrar el mensaje sin adivinar.
 *
 * Regla de seguridad: el mensaje NUNCA explica el motivo real de un fallo de
 * autenticacion. Ante un correo inexistente y ante una contrasena incorrecta se
 * devuelve exactamente el mismo texto, para no revelar que correos estan
 * registrados en el sistema.
 */

export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, detalles = null) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }

  static validar(codigo, mensaje, detalles = null) {
    return new ErrorApi(422, codigo, mensaje, detalles);
  }

  static noAutorizado(codigo = 'no_autorizado', mensaje = 'Necesitas iniciar sesion para continuar.') {
    return new ErrorApi(401, codigo, mensaje);
  }

  static prohibido(codigo = 'prohibido', mensaje = 'No tienes permiso para realizar esta accion.') {
    return new ErrorApi(403, codigo, mensaje);
  }

  static noEncontrado(recurso = 'El recurso') {
    return new ErrorApi(404, 'no_encontrado', `${recurso} no existe.`);
  }

  static conflicto(codigo, mensaje) {
    return new ErrorApi(409, codigo, mensaje);
  }
}

/** Mensaje unico para cualquier fallo de credenciales. */
export const MENSAJE_CREDENCIALES = 'Correo o contrasena incorrectos.';

export function enviarError(res, error) {
  if (error instanceof ErrorApi) {
    return res.status(error.estado).json({
      error: error.codigo,
      mensaje: error.mensaje,
      ...(error.detalles ? { detalles: error.detalles } : {}),
    });
  }

  // Errores de las capas intermedias (body-parser, CORS) traen su propio
  // codigo HTTP en status o statusCode. Respetarlo es lo correcto: un cuerpo
  // demasiado grande es un 413, no un fallo del servidor, y un JSON mal
  // formado es un 400. Ademas evita llenar el log con ruido.
  const codigo = error?.status ?? error?.statusCode;
  if (Number.isInteger(codigo) && codigo >= 400 && codigo < 500) {
    if (codigo === 413) {
      return res.status(413).json({
        error: 'cuerpo_demasiado_grande',
        mensaje: 'La peticion supera el tamano maximo admitido.',
      });
    }
    if (codigo === 400 || error?.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: 'peticion_invalida',
        mensaje: 'El cuerpo de la peticion no es un JSON valido.',
      });
    }
    return res.status(codigo).json({ error: 'peticion_rechazada', mensaje: 'La peticion fue rechazada.' });
  }

  // Cualquier otro error es un fallo no previsto: se registra en el servidor
  // y se responde con un mensaje generico. Nunca se devuelve el stack trace,
  // porque revela rutas, versiones y estructura interna.
  console.error('[error no controlado]', error);
  return res.status(500).json({
    error: 'error_interno',
    mensaje: 'Ocurrio un error inesperado. Intenta de nuevo mas tarde.',
  });
}

/**
 * Envuelve un manejador async para que los rechazos lleguen a enviarError.
 * Express 4 no captura promesas rechazadas por si solo.
 */
export function controlador(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
