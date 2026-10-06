import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
import { config } from './config.js';

const scrypt = promisify(scryptCallback);

/**
 * Hash de contrasenas con scrypt (node:crypto).
 *
 * Por que scrypt y no bcrypt:
 *   - scrypt es resistente a hardware (memory-hard): un atacante con GPU no
 *     puede calcular tantos hashes en paralelo como con bcrypt.
 *   - no requiere modulo nativo ni binario descargado, asi que no arrastra
 *     dependencias con vulnerabilidades conocidas (bcrypt trae node-pre-gyp).
 *   - es la funcion de derivacion que recomienda OWASP cuando se dispone
 *     del modulo nativo del lenguaje.
 *
 * Formato almacenado, en una sola columna:
 *   scrypt$N$r$p$<sal-hex>$<hash-hex>
 * Los parametros N, r y p viajan con el hash, de modo que el costo puede
 * subirse en el futuro sin invalidar las contrasenas ya guardadas.
 */
const FORMATO = 'scrypt';

export async function hashContrasena(claro) {
  const { coste, longitud, salBytes } = config.contrasena;
  const sal = randomBytes(salBytes);
  const derivado = await scrypt(claro.normalize('NFKC'), sal, longitud, {
    N: coste,
    r: 8,
    p: 1,
    maxmem: 256 * 1024 * 1024,
  });
  return [
    FORMATO,
    coste.toString(),
    '8',
    '1',
    sal.toString('hex'),
    Buffer.from(derivado).toString('hex'),
  ].join('$');
}

/**
 * Verifica una contrasena contra un hash almacenado.
 *
 * Devuelve SIEMPRE un booleano y nunca lanza por un hash corrupto: un
 * registro con hash invalido debe behave como una contrasena incorrecta, no
 * como un error de servidor.
 *
 * La comparacion usa timingSafeEqual, que tarda lo mismo exista o no la
 * coincidencia. Con un === normal, un atacante mide cuanto tarda cada
 * intento y deduce el hash caracter a caracter.
 */
export async function verificarContrasena(claro, hashAlmacenado) {
  try {
    const partes = String(hashAlmacenado).split('$');
    if (partes.length !== 6 || partes[0] !== FORMATO) return false;

    const [, n, r, p, salHex, hashHex] = partes;
    const esperado = Buffer.from(hashHex, 'hex');
    const derivado = await scrypt(claro.normalize('NFKC'), Buffer.from(salHex, 'hex'), esperado.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 256 * 1024 * 1024,
    });

    const calculado = Buffer.from(derivado);
    if (calculado.length !== esperado.length) return false;
    return timingSafeEqual(calculado, esperado);
  } catch {
    return false;
  }
}

/**
 * Hash de alta velocidad (SHA-256) para los tokens de sesion y CSRF.
 *
 * Aqui NO se necesita scrypt: el token se genera con 32 bytes de entropia
 * criptografica, no lo elige una persona, y no se puede adivinar ni por
 * fuerza bruta. El unico requisito es que si alguien lee la base de datos no
 * pueda reconstruir el token, y SHA-256 cumple ese objetivo sin el costo de
 * scrypt en cada peticion.
 */
export function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Genera un token opaco de 32 bytes codificado en base64url. */
export function generarToken() {
  return randomBytes(32).toString('base64url');
}

/** Comparacion en tiempo constante de dos cadenas hexadecimales. */
export function compararHash(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Politica de contrasenas.
 * Reglas: entre 10 y 128 caracteres, al menos una minuscula, una mayuscula,
 * un digito y un simbolo, y no puede ser una de las contrasenas frecuentes.
 */
const FRECUENTES = new Set([
  'contrasena123',
  'password123',
  '123456789',
  'qwerty12345',
  'admin12345',
  'educa2026',
  'bienvenido1',
]);

export function cumplePoliticaContrasena(claro) {
  const fallos = [];
  const valor = String(claro ?? '');

  if (valor.length < 10) fallos.push('debe tener al menos 10 caracteres');
  if (valor.length > 128) fallos.push('no puede superar 128 caracteres');
  if (!/[a-záéíóúñ]/.test(valor)) fallos.push('debe incluir al menos una letra minuscula');
  if (!/[A-ZÁÉÍÓÚÑ]/.test(valor)) fallos.push('debe incluir al menos una letra mayuscula');
  if (!/[0-9]/.test(valor)) fallos.push('debe incluir al menos un digito');
  if (!/[^A-Za-z0-9]/.test(valor)) fallos.push('debe incluir al menos un simbolo');
  if (FRECUENTES.has(valor.toLowerCase())) fallos.push('es demasiado comun, elige otra');

  return { valida: fallos.length === 0, fallos };
}

/**
 * Hash de correo para buscar sin exponer el dato.
 * Permite localizar una cuenta por correo aunque la columna este cifrada o
 * enmascarada en una copia de la base de datos.
 */
export function hashCorreo(correo) {
  return createHash('sha256')
    .update(`${correo.trim().toLowerCase()}|${config.secretoSesion}`, 'utf8')
    .digest('hex');
}
