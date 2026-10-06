import { ErrorApi } from './errores.js';

/**
 * Validacion y normalizacion de la entrada.
 *
 * Regla central: NUNCA se confia en lo que llega del cliente. Todo dato que
 * va a la base de datos pasa primero por aqui, se convierte al tipo correcto y
 * se acota su longitud. Un campo numerico llega como texto ("7; DROP TABLE")
 * y debe convertirse a numero o rechazarse, nunca interpolarse.
 *
 * Los valores se devuelven ya limpios, de modo que la consulta SQL solo tiene
 * que pasarlos como parametro.
 */

/** Colapsa espacios, recorta y limita la longitud. */
export function texto(valor, { campo, requerido = true, min = 0, max = 255 } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (requerido) throw ErrorApi.validar('campo_requerido', `El campo ${campo} es obligatorio.`);
    return null;
  }
  if (typeof valor !== 'string') {
    throw ErrorApi.validar('tipo_invalido', `El campo ${campo} debe ser texto.`);
  }

  const limpio = valor.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (limpio.length < min) {
    throw ErrorApi.validar('demasiado_corto', `El campo ${campo} debe tener al menos ${min} caracteres.`);
  }
  // Se trunca, no se rechaza: un texto largo no es un ataque, y truncar es
  // preferible a devolver un 500 por un campo de texto plano.
  return limpio.slice(0, max);
}

/**
 * Correo electronico.
 * El limite de 254 caracteres es el maximo del RFC 5321; se valida con un
 * patron deliberadamente conservador en lugar de una expresion regular
 * gigante que nadie mantiene.
 */
const PATRON_CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/;

export function correo(valor, { campo = 'correo', requerido = true } = {}) {
  const limpio = texto(valor, { campo, requerido, min: 5, max: 254 });
  if (limpio === null) return null;

  const normal = limpio.toLowerCase();
  if (!PATRON_CORREO.test(normal) || normal.includes('..') || normal.startsWith('.') || normal.includes('.@')) {
    throw ErrorApi.validar('correo_invalido', 'El correo electronico no tiene un formato valido.');
  }
  return normal;
}

/** Contrasena en texto plano: solo se valida, nunca se recorta ni se transforma. */
export function contrasena(valor, { campo = 'contrasena', requerido = true } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (requerido) throw ErrorApi.validar('campo_requerido', `El campo ${campo} es obligatorio.`);
    return null;
  }
  if (typeof valor !== 'string') {
    throw ErrorApi.validar('tipo_invalido', `El campo ${campo} debe ser texto.`);
  }
  if (valor.length > 128) {
    throw ErrorApi.validar('demasiado_largo', 'La contrasena no puede superar 128 caracteres.');
  }
  return valor;
}

/** Entero dentro de un rango. Rechaza NaN, decimales y valores fuera de rango. */
export function entero(valor, { campo, min = 0, max = Number.MAX_SAFE_INTEGER, pordefecto = null } = {}) {
  if (valor === undefined || valor === null || valor === '') return pordefecto;
  const n = typeof valor === 'number' ? valor : Number(String(valor).trim());
  if (!Number.isInteger(n)) {
    throw ErrorApi.validar('no_entero', `El campo ${campo} debe ser un numero entero.`);
  }
  if (n < min || n > max) {
    throw ErrorApi.validar('fuera_de_rango', `El campo ${campo} debe estar entre ${min} y ${max}.`);
  }
  return n;
}

/** Decimal dentro de un rango. */
export function decimal(valor, { campo, min = 0, max = 1, pordefecto = null } = {}) {
  if (valor === undefined || valor === null || valor === '') return pordefecto;
  const n = typeof valor === 'number' ? valor : Number(String(valor).trim());
  if (!Number.isFinite(n)) {
    throw ErrorApi.validar('no_numero', `El campo ${campo} debe ser un numero.`);
  }
  if (n < min || n > max) {
    throw ErrorApi.validar('fuera_de_rango', `El campo ${campo} debe estar entre ${min} y ${max}.`);
  }
  return n;
}

/** Booleano que acepta true/false, "true"/"false", 1/0, "si"/"no". */
export function booleano(valor, { pordefecto = false } = {}) {
  if (valor === undefined || valor === null || valor === '') return pordefecto;
  if (typeof valor === 'boolean') return valor;
  const s = String(valor).trim().toLowerCase();
  return ['true', '1', 'si', 'sí', 'yes'].includes(s);
}

/**
 * Valor de una lista cerrada (un CHECK del esquema).
 * La lista blanca se deriva del propio CHECK, no de lo que elija el cliente.
 */
export function enumerado(valor, { campo, valores, pordefecto = null } = {}) {
  if (valor === undefined || valor === null || valor === '') return pordefecto;
  const normal = String(valor).trim().toLowerCase();
  if (!valores.includes(normal)) {
    throw ErrorApi.validar('valor_invalido', `El campo ${campo} debe ser uno de: ${valores.join(', ')}.`);
  }
  return normal;
}

/** Fecha en formato AAAA-MM-DD, validada contra el calendario real. */
export function fecha(valor, { campo, requerido = false } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (requerido) throw ErrorApi.validar('campo_requerido', `El campo ${campo} es obligatorio.`);
    return null;
  }
  const s = String(valor).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw ErrorApi.validar('fecha_invalida', `El campo ${campo} debe tener el formato AAAA-MM-DD.`);
  }
  const [a, m, d] = s.split('-').map(Number);
  const fechaReal = new Date(Date.UTC(a, m - 1, d));
  if (fechaReal.getUTCFullYear() !== a || fechaReal.getUTCMonth() !== m - 1 || fechaReal.getUTCDate() !== d) {
    throw ErrorApi.validar('fecha_invalida', `El campo ${campo} no es una fecha valida.`);
  }
  return s;
}

/** Telefono: solo digitos, espacios, +, guiones y parentesis. */
export function telefono(valor, { campo = 'telefono' } = {}) {
  if (valor === undefined || valor === null || valor === '') return null;
  const s = String(valor).trim();
  if (!/^\+?[\d\s()-]{7,20}$/.test(s)) {
    throw ErrorApi.validar('telefono_invalido', `El campo ${campo} no tiene un formato valido.`);
  }
  return s;
}

/**
 * Nombre de una persona: letras, espacios, apostrofos, guiones y puntos.
 * El patron bloquea el HTML, por si el valor acaba en un innerHTML.
 */
export function nombrePersona(valor, { campo, requerido = true, min = 2, max = 80 } = {}) {
  const limpio = texto(valor, { campo, requerido, min, max });
  if (limpio === null) return null;
  if (!/^[\p{L}\p{M}' .-]+$/u.test(limpio)) {
    throw ErrorApi.validar('caracteres_invalidos', `El campo ${campo} solo admite letras, espacios, apostrofos, guiones y puntos.`);
  }
  return limpio;
}

/**
 * Identificador de documento: solo digitos y guiones.
 * Se normaliza sin guiones para comparar, pero se guarda con el formato
 * que la persona escribio.
 */
export function documento(valor, { campo = 'documento_id' } = {}) {
  if (valor === undefined || valor === null || valor === '') return null;
  const s = String(valor).trim();
  if (!/^[\d-]{6,20}$/.test(s)) {
    throw ErrorApi.validar('documento_invalido', `El campo ${campo} solo admite digitos y guiones.`);
  }
  return s;
}

/**
 * Slug de curso: se valida con el mismo patron que el CHECK del esquema,
 * para que un slug invalido no llegue a la base de datos.
 */
export function slug(valor, { campo = 'slug' } = {}) {
  const s = texto(valor, { campo, min: 2, max: 60 });
  if (s === null) return null;
  const normal = s.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(normal)) {
    throw ErrorApi.validar('slug_invalido', `El campo ${campo} solo admite letras minusculas, digitos y guiones.`);
  }
  return normal;
}

/** Recorta y acota el User-Agent antes de guardarlo en la bitacora. */
export function agente(valor) {
  return valor ? String(valor).replace(/[^\x20-\x7E]/g, '').slice(0, 255) : null;
}
