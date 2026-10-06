import { consultarUno, ejecutar, enTransaccion } from './db.js';
import { generarToken, hashToken, compararHash } from './contrasenas.js';
import { config } from './config.js';

const NOMBRE_COOKIE = config.sesion.nombreCookie;

/** Fecha-hora UTC en el formato ISO que usa el CHECK de la tabla sesiones. */
export function ahoraIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function desdeIso(iso) {
  return new Date(`${iso.replace(' ', 'T')}Z`);
}

function masAdelante({ horas = 0, dias = 0 }) {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  fecha.setUTCHours(fecha.getUTCHours() + horas);
  return fecha;
}

/**
 * Crea una sesion y devuelve el token EN CLARO una sola vez.
 *
 * En la base de datos solo queda token_hash (SHA-256). Si alguien lee el
 * archivo de la base de datos no puede suplantar a ninguna persona, porque el
 * valor que viaja al navegador no se puede reconstruir a partir del hash.
 *
 * El token CSRF tambien se guarda solo hasheado: se devuelve al cliente una
 * vez y luego el frontend lo reenvia en la cabecera X-CSRF-Token.
 */
export function crearSesion(usuarioId, { ip, agente, recordar = false }) {
  const token = generarToken();
  const csrfToken = generarToken();
  const duracion = recordar
    ? { dias: config.sesion.duracionRecordarDias }
    : { horas: config.sesion.duracionHoras };

  const creadaEn = ahoraIso();
  const expiraEn = masAdelante(duracion).toISOString().replace('T', ' ').slice(0, 19);

  const resultado = ejecutar(
    `INSERT INTO sesiones (usuario_id, token_hash, csrf_token_hash, agente_usuario, ip, creada_en, expira_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    usuarioId,
    hashToken(token),
    hashToken(csrfToken),
    recortar(agente, 255),
    recortar(ip, 64),
    creadaEn,
    expiraEn
  );

  return {
    id: Number(resultado.lastInsertRowid),
    token,
    csrfToken,
    expiraEn,
    cookie: construirCookie(token, expiraEn, recordar),
  };
}

/** Construye la cabecera Set-Cookie con todos los atributos de seguridad. */
function construirCookie(token, expiraEn, recordar) {
  const partes = [
    `${NOMBRE_COOKIE}=${token}`,
    'Path=/',
    `Expires=${new Date(expiraEn.replace(' ', 'T') + 'Z').toUTCString()}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  // Secure solo en produccion: en local el frontend habla http y la cookie se
  // descartaria, dejando el login inutilizable durante el desarrollo.
  if (config.sesion.soloHttps) partes.push('Secure');
  if (recordar) partes.push('Max-Age=' + config.sesion.duracionRecordarDias * 24 * 60 * 60);
  return partes.join('; ');
}

/** Cabecera para borrar la cookie: debe coincidir con los atributos de creacion. */
export function cookieDeBorrado() {
  const partes = [`${NOMBRE_COOKIE}=`, 'Path=/', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT', 'HttpOnly', 'SameSite=Lax'];
  if (config.sesion.soloHttps) partes.push('Secure');
  return partes.join('; ');
}

/**
 * Resuelve una sesion a partir del token en claro.
 * Devuelve null si el token no existe, ya expiro o fue revocado.
 */
export function resolverSesion(token) {
  if (!token || typeof token !== 'string') return null;

  const sesion = consultarUno(
    `SELECT s.id, s.usuario_id, s.csrf_token_hash, s.expira_en, s.ip, s.agente_usuario,
            u.correo, u.nombre, u.apellidos, u.estado AS estado_usuario, u.ultimo_acceso_en,
            r.nombre AS rol
       FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id
       JOIN roles   r ON r.id = u.rol_id
      WHERE s.token_hash = ?`,
    hashToken(token)
  );

  if (!sesion) return null;
  if (sesion.revocada_en) return null;
  if (sesion.expira_en <= ahoraIso()) return null;
  if (['eliminado', 'bloqueado', 'inactivo'].includes(sesion.estado_usuario)) return null;

  return sesion;
}

/** Marca una sesion como cerrada. Idempotente: cerrar dos veces no falla. */
export function revocarSesion(id, motivo = 'cierre_sesion') {
  ejecutar(
    'UPDATE sesiones SET revocada_en = ?, motivo_revocacion = ? WHERE id = ? AND revocada_en IS NULL',
    ahoraIso(),
    motivo,
    id
  );
}

/**
 * Cierra TODAS las sesiones de una persona.
 * Se usa al cambiar la contrasena o al bloquear una cuenta: un atacante con una
 * sesion abierta la pierde de inmediato.
 */
export function revocarTodasLasSesiones(usuarioId, motivo) {
  const resultado = ejecutar(
    'UPDATE sesiones SET revocada_en = ?, motivo_revocacion = ? WHERE usuario_id = ? AND revocada_en IS NULL',
    ahoraIso(),
    motivo,
    usuarioId
  );
  return Number(resultado.changes);
}

/** Elimina en cascada las sesiones de una persona dentro de una transaccion. */
export function cerrarSesionesEnTransaccion(usuarioId, motivo) {
  return enTransaccion(() => revocarTodasLasSesiones(usuarioId, motivo));
}

/**
 * Comprueba el token anti-CSRF de una peticion que modifica datos.
 *
 * Patron de doble envio: el navegador mantiene el token en memoria y lo
 * envia en la cabecera X-CSRF-Token. Un sitio atacante puede hacer que el
 * navegador envie la cookie, pero no puede leer el token (esta en una
 * respuesta de origen legitimo) ni ponerlo en una cabecera que el navegador
 * bloquea. Comparar el hash con timingSafeEqual evita adivinarlo.
 */
export function csrfValido(sesion, tokenRecibido) {
  if (!sesion || !tokenRecibido) return false;
  return compararHash(hashToken(String(tokenRecibido)), sesion.csrf_token_hash);
}

/** Marca la sesion como usada y renueva su caducidad (ventana deslizante). */
export function tocarSesion(id) {
  ejecutar('UPDATE sesiones SET ultimo_uso_en = ? WHERE id = ?', ahoraIso(), id);
}

/** Limpieza periodica de sesiones caducadas o revocadas hace tiempo. */
export function purgarSesiones(diasAntiguedad = 30) {
  const limite = new Date();
  limite.setUTCDate(limite.getUTCDate() - diasAntiguedad);
  const iso = limite.toISOString().replace('T', ' ').slice(0, 19);
  const resultado = ejecutar('DELETE FROM sesiones WHERE expira_en < ? OR (revocada_en IS NOT NULL AND revocada_en < ?)', iso, iso);
  return Number(resultado.changes);
}

function recortar(texto, max) {
  return texto ? String(texto).slice(0, max) : null;
}
