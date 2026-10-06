import { Router } from 'express';
import { consultarUno } from '../db.js';
import { ErrorApi, MENSAJE_CREDENCIALES, controlador } from '../errores.js';
import { limiteLogin } from '../seguridad.js';
import { hashContrasena, verificarContrasena } from '../contrasenas.js';
import {
  crearSesion,
  resolverSesion,
  revocarSesion,
  csrfValido,
  tocarSesion,
} from '../sesiones.js';
import { bloqueoActivo, registrarIntento, limpiarIntentosFallidos, auditar } from '../throttle.js';
import { requiereSesion } from '../autorizacion.js';
import { correo as validarCorreo, texto as validarTexto } from '../validacion.js';
import { config } from '../config.js';

export const rutasAuth = Router();

/**
 * Datos publicos de una cuenta.
 *
 * NEVER se devuelve contrasena_hash. La funcion recibe la fila completa de
 * usuarios porque la consulta trae el hash para compararlo, pero aqui se
 * construye la respuesta con una lista blanca de campos. Es el unico modo
 * seguro de hacerlo cuando el SELECT trae columnas sensibles.
 */
function perfilPublico(fila) {
  return {
    id: fila.id ?? fila.usuario_id,
    correo: fila.correo,
    nombre: fila.nombre,
    apellidos: fila.apellidos ?? null,
    rol: fila.rol ?? null,
    estado: fila.estado_usuario ?? fila.estado ?? null,
  };
}

/** Consulta minima de la cuenta, sin el hash, para cuando no hace falta. */
const CUENTA_SIN_HASH = `
  SELECT u.id, u.correo, u.nombre, u.apellidos, u.estado, r.nombre AS rol
    FROM usuarios u JOIN roles r ON r.id = u.rol_id`;

function contexto(req) {
  return { ip: req.ip ?? null, agente: req.get('user-agent') ?? null };
}

/**
 * POST /api/auth/login
 * Inicio de sesion con correo y contrasena.
 *
 * Secuencia de seguridad:
 *   1. limite en memoria por IP (express-rate-limit);
 *   2. throttle persistente por IP y por correo (intentos_sesion);
 *   3. validacion de formato;
 *   4. consulta parametrizada del hash;
 *   5. comparacion con timingSafeEqual;
 *   6. creacion de sesion con token hasheado y cookie HttpOnly;
 *   7. registro en la bitacora.
 *
 * La respuesta es SIEMPRE la misma ante credenciales invalidas, exista o no
 * el correo, para no revelar que correos estan registrados.
 */
rutasAuth.post(
  '/login',
  limiteLogin(),
  controlador(async (req, res) => {
    const cuerpo = req.body ?? {};

    // Se validan los formatos DENTRO del try para que un campo mal formado
    // no se confunda con credenciales invalidas en la bitacora.
    let correo;
    try {
      correo = validarCorreo(cuerpo.correo);
      validarTexto(cuerpo.contrasena, { campo: 'contrasena', min: 1, max: 128 });
    } catch (error) {
      registrarIntento({
        correo: typeof cuerpo.correo === 'string' ? cuerpo.correo.slice(0, 254) : 'desconocido',
        ...contexto(req),
        exitoso: false,
        motivo: 'credenciales_invalidas',
      });
      throw error;
    }

    const contrasena = cuerpo.contrasena;
    const { ip, agente: agenteActual } = contexto(req);

    // Barrera 2: bloqueo persistente, que sobrevive al reinicio del servidor.
    const bloqueo = bloqueoActivo({ correo, ip });
    if (bloqueo) {
      registrarIntento({ correo, ip, agente: agenteActual, exitoso: false, motivo: 'throttling' });
      res.set('Retry-After', String(bloqueo));
      throw new ErrorApi(429, 'throttling', `Demasiados intentos fallidos. Espera ${bloqueo} segundos.`);
    }

    // Consulta parametrizada: el correo viaja como dato, no como codigo SQL.
    const cuenta = consultarUno(
      `SELECT u.id, u.correo, u.nombre, u.apellidos, u.estado, u.contrasena_hash,
              r.nombre AS rol
         FROM usuarios u JOIN roles r ON r.id = u.rol_id
        WHERE u.correo = ?`,
      correo
    );

    // Si la cuenta no existe se verifica igualmente contra un hash ficticio.
    // Asi el tiempo de respuesta es el mismo exista o no el correo, y no se
    // puede enumerar la base de datos midiendo tiempos.
    const hashComparar = cuenta?.contrasena_hash ?? '$scrypt$32768$8$1$00$00';
    const coincide = await verificarContrasena(contrasena, hashComparar);

    if (!cuenta || !coincide) {
      registrarIntento({
        correo,
        usuarioId: cuenta?.id ?? null,
        ip,
        agente: agenteActual,
        exitoso: false,
        motivo: cuenta ? 'credenciales_invalidas' : 'correo_inexistente',
      });
      throw new ErrorApi(401, 'credenciales_invalidas', MENSAJE_CREDENCIALES);
    }

    if (cuenta.estado !== 'activo') {
      registrarIntento({
        correo,
        usuarioId: cuenta.id,
        ip,
        agente: agenteActual,
        exitoso: false,
        motivo: cuenta.estado === 'bloqueado' ? 'cuenta_bloqueada' : 'cuenta_inactiva',
      });
      throw new ErrorApi(403, 'cuenta_no_activa', 'La cuenta no esta activa. Contacta a soporte.');
    }

    // Todo correcto: se limpia el historial fallido de ese correo.
    limpiarIntentosFallidos({ correo, ip });

    const recordar = cuerpo.recordarme === true || cuerpo.recordarme === 'true';
    const sesion = crearSesion(cuenta.id, { ip, agente: agenteActual, recordar });

    registrarIntento({ correo, usuarioId: cuenta.id, ip, agente: agenteActual, exitoso: true, motivo: 'exitoso' });
    auditar({
      usuarioId: cuenta.id,
      accion: 'iniciar_sesion',
      entidad: 'sesiones',
      entidadId: sesion.id,
      datos: { despues: { recordar } },
      ip,
      agente: agenteActual,
    });

    // El token de sesion viaja en la cookie; el CSRF en el cuerpo, porque el
    // frontend lo necesita para las siguientes peticiones que modifican datos.
    res.setHeader('Set-Cookie', sesion.cookie);
    res.json({
      datos: {
        usuario: perfilPublico(cuenta),
        csrfToken: sesion.csrfToken,
        expiraEn: sesion.expiraEn,
      },
    });
  })
);

/**
 * POST /api/auth/logout
 * Cierra la sesion actual. Requiere cabecera X-CSRF-Token valida.
 */
rutasAuth.post(
  '/logout',
  requiereSesion,
  controlador(async (req, res) => {
    const recibido = req.get('x-csrf-token');
    if (!csrfValido(req.sesion, recibido)) {
      throw new ErrorApi(403, 'csrf_invalido', 'La solicitud no supero la verificacion de seguridad.');
    }

    revocarSesion(req.sesion.id, 'cierre_sesion');
    auditar({
      usuarioId: req.usuario.id,
      accion: 'cerrar_sesion',
      entidad: 'sesiones',
      entidadId: req.sesion.id,
      ...contexto(req),
    });

    const { cookieDeBorrado } = await import('../sesiones.js');
    res.setHeader('Set-Cookie', cookieDeBorrado());
    res.json({ datos: { mensaje: 'Sesion cerrada.' } });
  })
);

/**
 * GET /api/auth/yo
 * Devuelve la sesion actual. El frontend lo llama al cargar cada pagina para
 * saber si debe mostrar la portada de visitante o la de estudiante.
 */
rutasAuth.get(
  '/yo',
  controlador((req, res) => {
    if (!req.sesion) {
      return res.json({ datos: { autenticado: false, usuario: null } });
    }
    tocarSesion(req.sesion.id);
    const cuenta = consultarUno(`${CUENTA_SIN_HASH} WHERE u.id = ?`, req.usuario.id);
    res.json({ datos: { autenticado: true, usuario: cuenta ? perfilPublico(cuenta) : null } });
  })
);

/**
 * POST /api/auth/verificar-csrf
 * Entrega un token anti-CSRF nuevo para renovar la sesion actual.
 * Se usa cuando el frontend recarga una pagina y necesita volver a
 * presentar un token sin tener que iniciar sesion otra vez.
 */
rutasAuth.post(
  '/verificar-csrf',
  requiereSesion,
  controlador(async (req, res) => {
    const { generarToken, hashToken } = await import('../contrasenas.js');
    const { ahoraIso } = await import('../sesiones.js');
    const token = generarToken();
    const { ejecutar } = await import('../db.js');
    ejecutar(
      'UPDATE sesiones SET csrf_token_hash = ? WHERE id = ?',
      hashToken(token),
      req.sesion.id
    );
    res.json({ datos: { csrfToken: token, momento: ahoraIso() } });
  })
);

/** GET /api/auth/sesion-activa: comprobacion sin efectos secundarios. */
rutasAuth.get(
  '/sesion-activa',
  controlador((req, res) => {
    const token = req.cookies?.[config.sesion.nombreCookie];
    const sesion = resolverSesion(token);
    res.json({ datos: { activa: !!sesion, expiraEn: sesion?.expira_en ?? null } });
  })
);
