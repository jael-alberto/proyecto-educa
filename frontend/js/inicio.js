/**
 * Portada.
 *
 * Antes las cifras de la portada estaban escritas en el HTML: "12.000
 * estudiantes", "34 cursos", "96% de aprobacion", "3.200 empleos generados".
 * Ninguno de esos numeros salia de la base de datos, asi que eran-fiction: en
 * cuanto alguien abria el proyecto con la semilla de 8 cursos, la portada
 * seguia prometiendo 34. Ahora salen de /catalogo/estadisticas.
 */
import {
  obtenerEstadisticas,
  listarCursos,
  escaparHtml,
  urlSegura,
  formatearPrecio,
  textoModalidad,
  textoDificultad,
  ErrorApi,
} from './api.js';
import { avisar, estado, sesionLista } from './main.js';

const zonaEstadisticas = document.getElementById('estadisticas');
const zonaDestacados = document.getElementById('cursosDestacados');
const zonaSaludo = document.getElementById('saludoSesion');
const insigniaHero = document.getElementById('insigniaHero');

/* ------------------------------------------------------------------ *
 * Saludo: solo aparece si hay sesion, y lo decide el backend.
 * ------------------------------------------------------------------ */
function pintarSaludo() {
  if (!estado.autenticado || !estado.usuario) {
    insigniaHero.textContent = 'Crea tu cuenta y accede a todos los grupos';
    return;
  }
  const nombre = escaparHtml(estado.usuario.nombre);
  insigniaHero.textContent = `Sesion iniciada como ${nombre}`;
  zonaSaludo.hidden = false;
  zonaSaludo.innerHTML = `
    <h2>Hola de nuevo, ${nombre}</h2>
    <p>
      Entra al catalogo para ver los grupos con cupo disponible y postularte.
    </p>
    <a href="cursos.html" class="btn btn-primario">Seguir aprendiendo</a>`;
}

/* ------------------------------------------------------------------ *
 * Estadisticas
 * ------------------------------------------------------------------ */
function tarjetaEstadistica(valor, etiqueta) {
  return `
    <div class="stat">
      <h2>${escaparHtml(valor.toLocaleString('es-DO'))}</h2>
      <p>${escaparHtml(etiqueta)}</p>
    </div>`;
}

async function cargarEstadisticas() {
  try {
    const datos = await obtenerEstadisticas();
    zonaEstadisticas.innerHTML = [
      tarjetaEstadistica(datos.cursosPublicados ?? 0, 'Cursos publicados'),
      tarjetaEstadistica(datos.estudiantesActivos ?? 0, 'Usuarios activos'),
      tarjetaEstadistica(datos.certificadosEmitidos ?? 0, 'Certificados emitidos'),
      tarjetaEstadistica(datos.vacantesPublicadas ?? 0, 'Vacantes publicadas'),
    ].join('');
  } catch (error) {
    zonaEstadisticas.innerHTML = '';
    const mensaje = document.createElement('p');
    mensaje.className = 'cargando';
    // No se inventan numeros de relleno. Si la API no responde, se dice que no
    // se pudo consultar.
    mensaje.textContent =
      error instanceof ErrorApi
        ? 'No se pudieron cargar las estadisticas del sistema.'
        : 'No se pudieron cargar las estadisticas del sistema.';
    zonaEstadisticas.appendChild(mensaje);
  } finally {
    zonaEstadisticas.setAttribute('aria-busy', 'false');
  }
}

/* ------------------------------------------------------------------ *
 * Cursos destacados
 * ------------------------------------------------------------------ */
function tarjetaCurso(curso) {
  const imagen = urlSegura(curso.imagen_url);
  const precio =
    curso.precio === 0 || curso.precio === null ? 'Gratis' : formatearPrecio(curso.precio);

  return `
    <article class="tarjeta-curso revelar">
      ${imagen ? `<img src="${imagen}" alt="" loading="lazy" width="320" height="180">` : ''}
      <div class="tarjeta-cuerpo">
        <h3><a href="detalle.html?curso=${encodeURIComponent(curso.slug)}">${escaparHtml(curso.nombre)}</a></h3>
        <p class="tarjeta-meta">${escaparHtml(curso.programa_nombre ?? '')}</p>
        <ul class="etiquetas">
          <li>${escaparHtml(textoModalidad(curso.modalidad))}</li>
          <li>${escaparHtml(textoDificultad(curso.dificultad))}</li>
        </ul>
        <div class="tarjeta-pie">
          <span class="precio">${precio}</span>
          <a class="btn btn-outline btn-pequeno" href="detalle.html?curso=${encodeURIComponent(curso.slug)}">Ver curso</a>
        </div>
      </div>
    </article>`;
}

async function cargarDestacados() {
  try {
    // El catalogo ordena por destacado y luego por precio, asi que los
    // primeros tres son los destacados.
    const cursos = await listarCursos({ limite: 3 });
    if (!cursos.length) {
      zonaDestacados.innerHTML = '<p class="cargando">Todavia no hay cursos publicados.</p>';
      return;
    }
    zonaDestacados.innerHTML = cursos.map(tarjetaCurso).join('');
    observarNuevasTarjetas();
  } catch (error) {
    zonaDestacados.innerHTML = '';
    const mensaje = document.createElement('p');
    mensaje.className = 'cargando';
    mensaje.textContent = 'No se pudieron cargar los cursos destacados.';
    zonaDestacados.appendChild(mensaje);
    avisar(error.message, 'error');
  } finally {
    zonaDestacados.setAttribute('aria-busy', 'false');
  }
}

function observarNuevasTarjetas() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    zonaDestacados.querySelectorAll('.revelar').forEach((el) => el.classList.add('visible'));
    return;
  }
  if (!('IntersectionObserver' in window)) return;

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('visible');
        observador.unobserve(entrada.target);
      });
    },
    { threshold: 0.1 }
  );
  zonaDestacados.querySelectorAll('.revelar').forEach((el) => observador.observe(el));
}

/* ------------------------------------------------------------------ *
 * Arranque
 * ------------------------------------------------------------------ *
 * Las dos peticiones al catalogo no dependen de la sesion, asi que salen
 * enseguida y en paralelo. El saludo si depende, asi que espera a
 * `sesionLista`, que `main.js` resuelve cuando ya consulto al backend. De ese
 * modo no se muestra el mensaje de bienvenida a alguien que no ha entrado, ni
 * se esconde a alguien que si.
 */
cargarEstadisticas();
cargarDestacados();
sesionLista.then(pintarSaludo);
