import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
export const RAIZ = resolve(aqui, '..');
export const RAIZ_REPO = resolve(RAIZ, '..');

/**
 * Lee el archivo .env sin dependencias externas.
 * Solo admite el formato basico CLAVE=VALOR y descarta lineas comentadas.
 * Un .env de git jamas contiene secretos reales: son valores de desarrollo.
 */
function leerEnv(ruta) {
  const valores = {};
  let texto = '';
  try {
    texto = readFileSync(ruta, 'utf8');
  } catch {
    return valores;
  }
  for (const linea of texto.split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const corte = limpia.indexOf('=');
    if (corte < 1) continue;
    const clave = limpia.slice(0, corte).trim();
    let valor = limpia.slice(corte + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    valores[clave] = valor;
  }
  return valores;
}

const env = { ...leerEnv(resolve(RAIZ, '.env')), ...process.env };

const entero = (valor, pordefecto) => {
  const n = Number.parseInt(valor ?? '', 10);
  return Number.isFinite(n) ? n : pordefecto;
};

const lista = (valor, pordefecto) =>
  (valor ? valor.split(',') : pordefecto).map((o) => o.trim()).filter(Boolean);

export const entorno = env.NODE_ENV ?? 'development';
export const esProduccion = entorno === 'production';

/** Falla el arranque en produccion si falta una clave secreta. */
function exigirClave(nombre) {
  const valor = env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Copia backend/.env.example a backend/.env y define un valor.`
    );
  }
  if (esProduccion && valor.length < 32) {
    throw new Error(`${nombre} debe tener al menos 32 caracteres en produccion.`);
  }
  return valor;
}

export const config = {
  entorno,
  esProduccion,
  puerto: entero(env.PORT, 3000),
  host: env.HOST ?? '127.0.0.1',

  /** Origenes permitidos por CORS. Nunca usar comodin con credenciales. */
  origenesPermitidos: lista(env.ORIGENES_PERMITIDOS, [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]),

  /** Secreto de firma. En produccion es obligatorio y largo (ver exigirClave). */
  secretoSesion: exigirClave('SECRETO_SESION'),

  baseDatos: {
    archivo: resolve(RAIZ, env.BASE_DATOS ?? 'datos/educa.db'),
    esquema: resolve(RAIZ_REPO, 'base-datos/esquema.sql'),
  },

  contrasena: {
    /** Costo de derivacion de scrypt. 2^15 = 32768 bloques. */
    coste: entero(env.COSTE_SCRYPT, 32768),
    longitud: 64,
    salBytes: 16,
  },

  sesion: {
    nombreCookie: env.NOMBRE_COOKIE ?? 'educa_sesion',
    /** 8 horas de sesion por peticion nueva. */
    duracionHoras: entero(env.DURACION_SESION_HORAS, 8),
    /** 30 dias cuando la persona marca "recordarme". */
    duracionRecordarDias: entero(env.DURACION_SESION_RECORDAR_DIAS, 30),
    /** Si esta activo, la cookie exige HTTPS. En desarrollo se desactiva. */
    soloHttps: esProduccion,
  },

  limites: {
    /** Tamano maximo del cuerpo de la peticion. 16 KB es suficiente para este dominio. */
    cuerpoBytes: entero(env.CORPULO_MAXIMO_BYTES, 16 * 1024),
    login: {
      ventanaMinutos: entero(env.LIMITE_LOGIN_VENTANA_MINUTOS, 15),
      maxIntentos: entero(env.LIMITE_LOGIN_MAX_INTENTOS, 5),
    },
    registro: {
      ventanaMinutos: entero(env.LIMITE_REGISTRO_VENTANA_MINUTAS, 60),
      // 20 y no 5: el contador es por IP, y detras de un NAT compartido (una
      // sala de clases, una facultad) todas las cuentas comparten la misma
      // direccion. Con 5 el limite se agota entre los primeros usuarios de la
      // demonstracion. En produccion conviene subirlo y vigilar el limite.
      maxIntentos: entero(env.LIMITE_REGISTRO_MAX_INTENTOS, 20),
    },
    general: {
      ventanaMinutos: entero(env.LIMITE_GENERAL_VENTANA_MINUTOS, 1),
      maxPeticiones: entero(env.LIMITE_GENERAL_MAX_PETICIONES, 120),
    },
  },
};
