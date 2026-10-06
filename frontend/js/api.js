/**
 * Cliente de la API del Sistema Educa.
 *
 * Decisiones de seguridad que sostienen todo el frontend:
 *
 * 1. `credentials: 'include'`. La cookie de sesion es HttpOnly, es decir, el
 *    JavaScript de la pagina NO puede leerla. Por eso la unica manera de
 *    enviarla es pedirle al navegador que la adjunte. Esto es exactamente lo
 *    que impide que un XSS robe la sesion.
 *
 * 2. Nada de la sesion se guarda en localStorage ni en sessionStorage. La
 *    version anterior de este proyecto guardaba ahi el usuario y dava por hecho
 *    que con eso habia sesion: cualquier persona podia abrir la consola,
 *    escribir una linea y entrar como administradora. La sesion vive en el
 *    servidor; el navegador solo tiene una cookie opaca que no puede leer.
 *
 * 3. El token anti-CSRF si se guarda en localStorage, y es deliberado: esta
 *    hecho para que el JavaScript lo lea y lo devuelva, y ademas debe
 *    sobrevivir a la navegacion. Lo que nunca se guarda es el token de sesion.
 *
 * 4. Todo lo que se dibuja en pantalla pasa por `escaparHtml`. Los datos
 *    vienen de la base de datos, y la base de datos un dia contendra cosas que
 *    escribieron otras personas.
 */

const BASE_API = 'http://localhost:3000/api';

/* ------------------------------------------------------------------ *
 * Token anti-CSRF.
 *
 * OJO, distincion importante: esto guarda el token ANTI-CSRF, no el token de
 * sesion. No es una rebaja de seguridad, por dos razones:
 *
 *  - el token de sesion nunca llega a este codigo. Va en una cookie HttpOnly y
 *    el navegador la adjunta solo; no existe en ninguna variable de JavaScript;
 *  - el token anti-CSRF esta hecho para que el JavaScript lo lea y lo devuelva.
 *    Es la parte del protocolo que el navegador tiene que poder presentar.
 *
 * Se guarda en localStorage (y no en una variable) porque debe sobrevivir a la
 * navegacion entre paginas y ser el mismo en todas las pestanas abiertas. Si
 * solo viviera en memoria, al cambiar de pagina el frontend se quedaria sin
 * token y no podria enviar ni un formulario.
 * ------------------------------------------------------------------ */
const CLAVE_TOKEN = 'educa:csrf';

let tokenCsrf = null;

try {
  tokenCsrf = localStorage.getItem(CLAVE_TOKEN);
} catch {
  // Con el almacenamiento bloqueado (modo privado estricto) se sigue en
  // memoria: peor la paginacion, pero la sesion funciona igual.
  tokenCsrf = null;
}

export function establecerTokenCsrf(token) {
  if (typeof token !== 'string' || token.length < 16) return;
  tokenCsrf = token;
  try {
    localStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    /* se conserva solo en memoria */
  }
}

export function olvidarTokenCsrf() {
  tokenCsrf = null;
  try {
    localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* nada que limpiar */
  }
}

export function obtenerTokenCsrf() {
  return tokenCsrf;
}

/* ------------------------------------------------------------------ *
 * Error de la API, con el codigo y el mensaje que devuelve el backend.
 * ------------------------------------------------------------------ */
export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, detalles = null) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

const ERRORES_DE_RED =
  'No se pudo conectar con el servidor. Comprueba que el backend este encendido en el puerto 3000.';

async function peticion(metodo, ruta, cuerpo = null) {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== null) cabeceras['Content-Type'] = 'application/json';
  // El token solo se envia en metodos que modifican datos.
  if (tokenCsrf && metodo !== 'GET') cabeceras['X-CSRF-Token'] = tokenCsrf;

  let respuesta;
  try {
    respuesta = await fetch(BASE_API + ruta, {
      method: metodo,
      headers: cabeceras,
      credentials: 'include',
      body: cuerpo === null ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(0, 'sin_conexion', ERRORES_DE_RED);
  }

  const texto = await respuesta.text();
  let cuerpoRespuesta = null;
  if (texto) {
    try {
      cuerpoRespuesta = JSON.parse(texto);
    } catch {
      // Una respuesta que no es JSON casi siempre significa que hay un proxy o
      // un servidor de por medio devolviendo HTML de error.
      throw new ErrorApi(
        respuesta.status,
        'respuesta_inesperada',
        'El servidor devolvio una respuesta que no se entiende.'
      );
    }
  }

  if (!respuesta.ok) {
    throw new ErrorApi(
      respuesta.status,
      cuerpoRespuesta?.error ?? 'error',
      cuerpoRespuesta?.mensaje ?? 'Ocurrio un error inesperado.',
      cuerpoRespuesta?.detalles ?? null
    );
  }

  return cuerpoRespuesta;
}

/* ------------------------------------------------------------------ *
 * Endpoints
 * ------------------------------------------------------------------ */

/**
 * Sesion actual. Es la unica fuente de verdad sobre quien esta dentro.
 *
 * Presenta el token que ya tiene guardado, para no invalidarlo. Si el backend
 * no lo reconoce, devuelve uno nuevo y se guarda.
 */
export async function obtenerSesion() {
  const cabeceras = tokenCsrf ? { 'X-CSRF-Token': tokenCsrf } : {};
  const respuesta = await fetch(BASE_API + '/auth/yo', {
    headers: { Accept: 'application/json', ...cabeceras },
    credentials: 'include',
  });

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, 'error', 'No se pudo verificar la sesion.');
  }

  const cuerpo = await respuesta.json();
  const datos = cuerpo?.datos ?? { autenticado: false, usuario: null };
  if (datos.autenticado && datos.csrfToken) establecerTokenCsrf(datos.csrfToken);
  return datos;
}

export async function iniciarSesion(correo, contrasena) {
  const r = await peticion('POST', '/auth/login', { correo, contrasena });
  if (r?.datos?.csrfToken) establecerTokenCsrf(r.datos.csrfToken);
  return r.datos;
}

export async function cerrarSesion() {
  try {
    await peticion('POST', '/auth/logout');
  } finally {
    olvidarTokenCsrf();
  }
}

/* ------------------------------------------------------------------ *
 * Utilidades de presentacion
 * ------------------------------------------------------------------ */

/**
 * Escapa el texto antes de insertarlo con innerHTML.
 *
 * Un `&` o un `<` sin escapar bastan para que un nombre de curso rompa la
 * pagina o inyecte HTML. Este es el unico punto del frontend donde se construye
 * HTML con datos, y por eso concentra la proteccion.
 */
export function escaparHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Solo admite direcciones http(s). Bloquea javascript: y data:. */
export function urlSegura(valor, pordefecto = '') {
  if (typeof valor !== 'string') return pordefecto;
  try {
    const url = new URL(valor, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? escaparHtml(url.href) : pordefecto;
  } catch {
    return pordefecto;
  }
}

export function formatearPrecio(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'Consultar';
  return '$' + numero.toLocaleString('es-DO');
}

export function formatearFecha(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ------------------------------------------------------------------ *
 * Endpoints del catalogo y del registro. Son de lectura y de alta, asi que no
 * necesitan sesion: se pueden consultar sin haber entrado.
 * ------------------------------------------------------------------ */

/** 'online_en_vivo' -> 'Online en vivo' */
export function textoModalidad(valor) {
  const tabla = {
    presencial: 'Presencial',
    hibrida: 'Híbrida',
    online: 'Online',
    online_en_vivo: 'Online en vivo',
  };
  return tabla[valor] ?? valor ?? '';
}

export function textoDificultad(valor) {
  const tabla = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };
  return tabla[valor] ?? valor ?? '';
}

/* ------------------------------------------------------------------ *
 * Endpoints del catalogo y del registro. No exigen sesion.
 * ------------------------------------------------------------------ */

export async function registrarCuenta(datos) {
  return (await peticion('POST', '/auth/registro', datos)).datos;
}

export async function listarProgramas() {
  return (await peticion('GET', '/auth/programas')).datos ?? [];
}

export async function listarCursos(filtros = {}) {
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor) query.set(clave, valor);
  }
  const sufijo = query.toString() ? `?${query}` : '';
  return (await peticion('GET', `/catalogo/cursos${sufijo}`)).datos ?? [];
}

export async function obtenerCurso(slug) {
  return (await peticion('GET', `/catalogo/cursos/${encodeURIComponent(slug)}`)).datos;
}

export async function obtenerEstadisticas() {
  return (await peticion('GET', '/catalogo/estadisticas')).datos ?? {};
}
