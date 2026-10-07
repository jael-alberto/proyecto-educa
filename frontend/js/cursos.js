/**
 * Catálogo de Cursos - Sistema Educa
 * Grid de 3 columnas desktop con tarjetas Liquid Glass, filtros en barra
 * horizontal y animaciones de scroll.
 */
import {
  listarCursos,
  obtenerTokenCsrf,
  ErrorApi,
  escaparHtml,
  urlSegura,
  formatearPrecio,
  textoModalidad,
  textoDificultad,
} from './api.js';
import { avisar, estado, exigirSesion } from './main.js';

const formulario = document.getElementById('formFiltros');
const lista = document.getElementById('listaCursos');
const resultados = document.getElementById('resultados');
const sinResultados = document.getElementById('sinResultados');

/** Precio con tachado si hay precio anterior */
function etiquetaPrecio(curso) {
  if (curso.precio === 0 || curso.precio === null) return 'Gratis';
  const partes = [formatearPrecio(curso.precio)];
  if (curso.precio_antes && Number(curso.precio_antes) > Number(curso.precio)) {
    partes.push(`<s>${formatearPrecio(curso.precio_antes)}</s>`);
  }
  return partes.join(' ');
}

function tarjetaCurso(curso) {
  const imagen = urlSegura(curso.imagen_url);
  const portada = imagen
    ? `<img src="${imagen}" alt="${escaparHtml(curso.nombre)}" loading="lazy" width="360" height="200">`
    : '';

  return `
    <article class="tarjeta-curso revelar">
      ${portada}
      <div class="tarjeta-cuerpo">
        ${curso.destacado ? '<span class="insignia-destacado">✦ Destacado</span>' : ''}
        <h3><a href="detalle.html?curso=${encodeURIComponent(curso.slug)}">${escaparHtml(curso.nombre)}</a></h3>
        <p class="tarjeta-meta">${escaparHtml(curso.programa_nombre ?? 'Programa Oficial')}</p>
        <ul class="etiquetas">
          <li>${escaparHtml(textoModalidad(curso.modalidad))}</li>
          <li>${escaparHtml(textoDificultad(curso.dificultad))}</li>
          ${curso.duracion_semanas ? `<li>${escaparHtml(String(curso.duracion_semanas))} semanas</li>` : ''}
          ${curso.horas ? `<li>${escaparHtml(String(curso.horas))} h/semana</li>` : ''}
        </ul>
        <p style="font-size: 0.9rem; color: var(--texto-suave); margin-bottom: 16px; line-height: 1.5;">
          ${escaparHtml((curso.descripcion ?? '').substring(0, 120))}${(curso.descripcion ?? '').length > 120 ? '…' : ''}
        </p>
        <div class="tarjeta-pie">
          <span class="precio">${etiquetaPrecio(curso)}</span>
          <div style="display: flex; gap: 8px;">
            <a class="btn btn-outline btn-pequeno" href="detalle.html?curso=${encodeURIComponent(curso.slug)}">
              Ver detalles
            </a>
            <button class="btn btn-primario btn-pequeno" type="button" data-postular="${escaparHtml(curso.slug)}">
              Postularme
            </button>
          </div>
        </div>
      </div>
    </article>`;
}

async function cargarCursos() {
  const filtros = {
    dificultad: document.getElementById('dificultad')?.value ?? '',
    modalidad: document.getElementById('modalidad')?.value ?? '',
    q: document.getElementById('busqueda')?.value ?? '',
  };

  lista.setAttribute('aria-busy', 'true');
  if (resultados) {
    resultados.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      Cargando catálogo...`;
  }

  try {
    const cursos = await listarCursos(filtros);
    lista.innerHTML = cursos.map(tarjetaCurso).join('');
    const total = cursos.length;
    if (resultados) {
      resultados.textContent = total
        ? `${total} ${total === 1 ? 'curso encontrado' : 'cursos encontrados'}`
        : 'Sin resultados';
    }
    if (sinResultados) sinResultados.hidden = total > 0;
    lista.hidden = total === 0;
    observarNuevasTarjetas();
  } catch (error) {
    lista.innerHTML = '';
    lista.hidden = true;
    if (sinResultados) sinResultados.hidden = true;
    if (resultados) {
      resultados.textContent = error instanceof ErrorApi ? error.message : 'No se pudieron cargar los cursos.';
    }
  } finally {
    lista.setAttribute('aria-busy', 'false');
  }
}

function observarNuevasTarjetas() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lista.querySelectorAll('.revelar').forEach((el) => el.classList.add('visible'));
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
    { threshold: 0.08 }
  );
  lista.querySelectorAll('.revelar').forEach((el) => observador.observe(el));
}

/* ------------------------------------------------------------------ *
 * Filtros y Búsqueda en tiempo real (debounce)
 * ------------------------------------------------------------------ */
let temporizadorBusqueda = null;
const campoBusqueda = document.getElementById('busqueda');
if (campoBusqueda) {
  campoBusqueda.addEventListener('input', () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(() => {
      actualizarUrlFiltros();
      cargarCursos();
    }, 280);
  });
}

function actualizarUrlFiltros() {
  const query = new URLSearchParams();
  const dificultad = document.getElementById('dificultad')?.value;
  const modalidad = document.getElementById('modalidad')?.value;
  const busqueda = document.getElementById('busqueda')?.value?.trim();
  if (busqueda) query.set('q', busqueda);
  if (dificultad) query.set('dificultad', dificultad);
  if (modalidad) query.set('modalidad', modalidad);
  const url = query.toString() ? `cursos.html?${query}` : 'cursos.html';
  history.replaceState(null, '', url);
}

if (formulario) {
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    actualizarUrlFiltros();
    cargarCursos();
  });

  formulario.addEventListener('reset', () => {
    setTimeout(() => {
      history.replaceState(null, '', 'cursos.html');
      cargarCursos();
    });
  });
}

document.getElementById('quitarFiltros')?.addEventListener('click', () => {
  formulario?.reset();
  history.replaceState(null, '', 'cursos.html');
  cargarCursos();
});

/* ------------------------------------------------------------------ *
 * Postulación
 * ------------------------------------------------------------------ */
lista.addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-postular]');
  if (!boton) return;

  if (!exigirSesion('postularte a un curso')) return;

  const slug = boton.dataset.postular;
  boton.disabled = true;
  const textoOriginal = boton.textContent;
  boton.textContent = 'Procesando...';

  try {
    if (!estado.autenticado) throw new ErrorApi(401, 'sin_sesion', 'Tu sesión expiró.');
    if (!obtenerTokenCsrf()) throw new ErrorApi(0, 'sin_token', 'Falta el token de seguridad. Recarga la página.');

    // Simulación de postulación correcta mientras el backend implementa el endpoint
    await new Promise((resolve) => setTimeout(resolve, 800));
    avisar(`✦ Te has postulado a "${slug}". Recibirás confirmación en tu correo.`, 'exito');
    boton.textContent = '✓ Postulado';
    boton.classList.add('btn-glass');
    boton.classList.remove('btn-primario');
    return;
  } catch (error) {
    avisar(error.message, 'error');
  } finally {
    setTimeout(() => {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }, 2500);
  }
});

/* ------------------------------------------------------------------ *
 * Arranque: leer filtros iniciales desde URL
 * ------------------------------------------------------------------ */
const parametros = new URLSearchParams(window.location.search);
const dificultadInicial = parametros.get('dificultad');
const modalidadInicial = parametros.get('modalidad');
const busquedaInicial = parametros.get('q');

if (busquedaInicial && campoBusqueda) {
  campoBusqueda.value = busquedaInicial;
}
if (dificultadInicial) {
  const el = document.getElementById('dificultad');
  if (el) el.value = dificultadInicial;
}
if (modalidadInicial) {
  const el = document.getElementById('modalidad');
  if (el) el.value = modalidadInicial;
}

cargarCursos();
