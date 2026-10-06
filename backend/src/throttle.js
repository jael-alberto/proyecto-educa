import { consultarUno, ejecutar } from './db.js';
import { ahoraIso } from './sesiones.js';
import { config } from './config.js';

/**
 * Throttling persistente basado en la tabla intentos_sesion.
 *
 * El limite en memoria de express-rate-limit protege contra rafagas rapidas
 * desde una sola IP, pero se reinicia al reiniciar el servidor y no distingue
 * entre varias cuentas atacadas desde la misma maquina. Este modulo consulta
 * la base de datos, de modo que el bloqueo:
 *   - sobrevive a un reinicio del servidor;
 *   - cuenta por IP y por correo, para frenar las dos variantes del ataque;
 *   - deja constancia en la bitacora, que es requisito del modelo de datos.
 */

function desdeIso(iso) {
  return new Date(`${iso.replace(' ', 'T')}Z`);
}

/** Cuenta los intentos fallidos en la ventana reciente. */
function contarFallos(campo, valor, ventanaMinutos) {
  if (!valor) return 0;
  const desde = new Date(Date.now() - ventanaMinutos * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  const fila = consultarUno(
    `SELECT COUNT(*) AS total FROM intentos_sesion
      WHERE ${campo} = ? AND exitoso = 0 AND creado_en >= ?`,
    valor,
    desde
  );
  return fila?.total ?? 0;
}

/**
 * Devuelve null si el intento esta permitido, o el numero de segundos que
 * faltan para reintentarlo si esta bloqueado.
 *
 * Se bloquea cuando se superan los maxIntentos por IP o por correo. El
 * bloqueo por correo es el mas util: un atacante puede rotar IPs, pero no
 * suele rotar el correo que intenta adivinar.
 */
export function bloqueoActivo({ correo, ip }) {
  const { ventanaMinutos, maxIntentos } = config.limites.login;

  const fallosIp = contarFallos('ip', ip, ventanaMinutos);
  const fallosCorreo = contarFallos('correo', correo ? correo.toLowerCase() : null, ventanaMinutos);

  if (fallosIp < maxIntentos && fallosCorreo < maxIntentos) return null;

  const masReciente = consultarUno(
    `SELECT creado_en FROM intentos_sesion
      WHERE exitoso = 0
        AND (ip = ? OR correo = ?)
      ORDER BY creado_en DESC
      LIMIT 1`,
    ip,
    correo ? correo.toLowerCase() : null
  );

  if (!masReciente) return null;
  const restante = ventanaMinutos * 60 * 1000 - (Date.now() - desdeIso(masReciente.creado_en).getTime());
  return Math.max(Math.ceil(restante / 1000), 1);
}

/** Registra un intento en la bitacora. */
export function registrarIntento({ correo, ip, agente, exitoso, motivo, usuarioId = null }) {
  ejecutar(
    `INSERT INTO intentos_sesion (correo, usuario_id, ip, agente_usuario, exitoso, motivo, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    (correo || 'desconocido').toLowerCase().slice(0, 254),
    usuarioId,
    ip,
    agente ? String(agente).slice(0, 255) : null,
    exitoso ? 1 : 0,
    motivo,
    ahoraIso()
  );
}

/**
 * Al autenticar con exito se limpia el historial fallido de ese correo.
 * Asi un usuario que se equivoco tres veces y luego entra bien no arrastra
 * el bloqueo en el intento siguiente.
 */
export function limpiarIntentosFallidos({ correo, ip }) {
  ejecutar(
    'DELETE FROM intentos_sesion WHERE exitoso = 0 AND correo = ? AND (ip = ? OR ip IS NULL)',
    correo.toLowerCase(),
    ip
  );
}

/** Registra un evento en la tabla de auditoria. */
export function auditar({ usuarioId = null, accion, entidad, entidadId = null, datos = null, ip, agente }) {
  ejecutar(
    `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_antes, datos_despues, ip, agente_usuario, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    usuarioId,
    accion,
    entidad,
    entidadId,
    datos?.antes ? JSON.stringify(datos.antes) : null,
    datos?.despues ? JSON.stringify(datos.despues) : null,
    ip,
    agente ? String(agente).slice(0, 255) : null,
    ahoraIso()
  );
}
