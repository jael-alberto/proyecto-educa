import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';

let conexion = null;

/**
 * Abre la base de datos SQLite y aplica el esquema.
 * Es el UNICO modulo del backend que habla con la base de datos.
 */
export function abrirBaseDatos() {
  if (conexion) return conexion;

  mkdirSync(dirname(config.baseDatos.archivo), { recursive: true });
  conexion = new DatabaseSync(config.baseDatos.archivo);

  // SQLite desactiva las claves foraneas por defecto en cada conexion.
  conexion.exec('PRAGMA foreign_keys = ON');
  conexion.exec('PRAGMA journal_mode = WAL');
  conexion.exec('PRAGMA synchronous = NORMAL');
  conexion.exec('PRAGMA busy_timeout = 5000');

  aplicarEsquema(conexion);
  return conexion;
}

/** Version del esquema aplicada. Bumpear en cada migracion nueva. */
export const VERSION_ESQUEMA = 1;

/** Resultado de la ultima aplicacion del esquema, para poder informarlo. */
let ultimoResultadoEsquema = null;

export function estadoEsquema() {
  return ultimoResultadoEsquema;
}

/**
 * Ejecuta solo la seccion DDL del esquema (hasta el marcador @fin-ddl).
 *
 * El esquema es deliberadamente estricto: usa CREATE TABLE sin IF NOT EXISTS
 * para que un error de definicion no pase inadvertido. Por eso la aplicacion
 * se controla con PRAGMA user_version, que SQLite guarda en la cabecera del
 * archivo: si la version ya coincide, el DDL no se vuelve a ejecutar.
 */
export function aplicarEsquema(db = conexion) {
  const actual = db.prepare('PRAGMA user_version').get().user_version;
  if (actual >= VERSION_ESQUEMA) {
    ultimoResultadoEsquema = { aplicada: false, version: actual };
    return ultimoResultadoEsquema;
  }

  const texto = readFileSync(config.baseDatos.esquema, 'utf8');
  // El marcador se busca ANCLADO a una linea completa. Con indexOf el esquema
  // se romperia en silencio: su cabecera menciona @fin-ddl antes de definirlo,
  // y el corte caeria en la documentacion en vez del final del DDL.
  const fin = texto.search(/^-- @fin-ddl\s*$/m);
  const ddl = fin > 0 ? texto.slice(0, fin) : texto;

  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(ddl);
    db.exec(`PRAGMA user_version = ${VERSION_ESQUEMA}`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  ultimoResultadoEsquema = { aplicada: true, version: VERSION_ESQUEMA };
  return ultimoResultadoEsquema;
}

export function db() {
  return conexion ?? abrirBaseDatos();
}

export function cerrarBaseDatos() {
  if (conexion) {
    conexion.close();
    conexion = null;
  }
}

/* ------------------------------------------------------------------ *
 * Utilidades de consulta. Todas usan sentencias preparadas con
 * marcadores ?, nunca concatenacion de texto SQL.
 * ------------------------------------------------------------------ */

export function consultarTodos(sql, ...params) {
  return db().prepare(sql).all(...params);
}

export function consultarUno(sql, ...params) {
  return db().prepare(sql).get(...params) ?? null;
}

export function ejecutar(sql, ...params) {
  return db().prepare(sql).run(...params);
}

/**
 * Ejecuta un callback dentro de una transaccion. Si el callback lanza,
 * se revierte todo. Se usa para operaciones que deben ser atomicas,
 * por ejemplo el control de cupo al matricular.
 */
export function enTransaccion(callback) {
  const conexion = db();
  conexion.exec('BEGIN IMMEDIATE');
  try {
    const resultado = callback();
    conexion.exec('COMMIT');
    return resultado;
  } catch (error) {
    conexion.exec('ROLLBACK');
    throw error;
  }
}
