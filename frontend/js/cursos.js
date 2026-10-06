/**
 * Catalogo de cursos.
 *
 * hecho a mano en este mismo archivo. Eso hacia dos cosas malas: los datos se
 * veian desactualizados en cuanto alguien anadia un curso en la base de datos,
 * y no habia forma de saber si un curso existia de verdad. Ahora la lista
 * llega de la API.
 *
 * El catalogo es publico y asi se comporta: se lee sin sesion. Solo la
 * postulacion pide estar dentro, y eso lo comprueba el boton al pulsarlo.
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

/** Etiqueta visual para el precio rebajado, sin inventar un porcentaje. */
function etiquetaPrecio(curso) {
  if (curso.precio === 0 || curso.precio === null) return 'Gratis';
  const partes = [formatearPrecio(curso.precio)];
  if (curso.precio_antes && Number(curso.precio_antes) > Number(curso.precio)) {
    partes.push(`<s>${formatearPrecio(curso.precio_antes)}</s>`);
  }
  return partes.join(' ');
}

function tarjetaCurso(curso) {
  // La imagen viene de la base de datos. `urlSegura` descarta cualquier
  // esquema que no sea http/https, para que un `javascript:` en esa columna
  // no llegue a ejecutarse.
  const imagen = urlSegura(curso.imagen_url);
  const portada = imagen
    ? `<img src="${imagen}" alt="" loading="lazy" width="320" height="180">`
    : '';

  return `
    <article class="tarjeta-curso revelar">
      ${portada}
      <div class="tarjeta-cuerpo">
        ${curso.destacado ? '<span class="insignia insignia-destacado">Destacado</span>' : ''}
        <h3><a href="detalle.html?curso=${encodeURIComponent(curso.slug)}">${escaparHtml(curso.nombre)}</a></h3>
        <p class="tarjeta-meta">${escaparHtml(curso.programa_nombre ?? '')}</p>
        <ul class="etiquetas">
          <li>${escaparHtml(textoModalidad(curso.modalidad))}</li>
          <li>${escaparHtml(textoDificultad(curso.dificultad))}</li>
          ${curso.duracion_semanas ? `<li>${escaparHtml(curso.duracion_semanas)} semanas</li>` : ''}
        </ul>
        <div class="tarjeta-pie">
          <span class="precio">${etiquetaPrecio(curso)}</span>
          <button class="btn btn-primario btn-pequeno" type="button" data-postular="${escaparHtml(curso.slug)}">
            Postularme
          </button>
        </div>
      </div>
    </article>`;
}

async function cargarCursos() {
  const filtros = {
    dificultad: document.getElementById('dificultad').value,
    modalidad: document.getElementById('modalidad').value,
  };

  lista.setAttribute('aria-busy', 'true');
  resultados.textContent = 'Cargando cursos...';

  try {
    const cursos = await listarCursos(filtros);
    lista.innerHTML = cursos.map(tarjetaCurso).join('');
    const total = cursos.length;
    resultados.textContent = total
      ? `${total} ${total === 1 ? 'curso encontrado' : 'cursos encontrados'}`
      : 'Sin resultados';
    sinResultados.hidden = total > 0;
    lista.hidden = total === 0;
    observarNuevasTarjetas();
  } catch (error) {
    lista.innerHTML = '';
    lista.hidden = true;
    sinResultados.hidden = true;
    resultados.textContent = error instanceof ErrorApi ? error.message : 'No se pudieron cargar los cursos.';
  } finally {
    lista.setAttribute('aria-busy', 'false');
  }
}

/**
 * Las tarjetas recien pintadas se anaden al observador de scroll que ya creo
 * `main.js`. Sin esto aparecerian sin animarse, porque en el momento de arrancar
 * todavia no existian.
 */
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
    { threshold: 0.1 }
  );
  lista.querySelectorAll('.revelar').forEach((el) => observador.observe(el));
}

/* ------------------------------------------------------------------ *
 * Filtros
 * ------------------------------------------------------------------ */
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const query = new URLSearchParams();
  const dificultad = document.getElementById('dificultad').value;
  const modalidad = document.getElementById('modalidad').value;
  if (dificultad) query.set('dificultad', dificultad);
  if (modalidad) query.set('modalidad', modalidad);
  // El estado del filtro va en la URL, para que se pueda compartir o recargar.
  const url = query.toString() ? `cursos.html?${query}` : 'cursos.html';
  history.replaceState(null, '', url);
  cargarCursos();
});

formulario.addEventListener('reset', () => {
  setTimeout(() => {
    history.replaceState(null, '', 'cursos.html');
    cargarCursos();
  });
});

document.getElementById('quitarFiltros').addEventListener('click', () => formulario.reset());

/* ------------------------------------------------------------------ *
 * Postulacion
 *
 * Todavia no hay endpoint de postulacion en la API, asi que el boton no finge
 * exito: comprueba la sesion y avisa de que la funcionalidad sigue en
 * desarrollo. Cuando exista, aqui se haria el POST.
 * ------------------------------------------------------------------ */
lista.addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-postular]');
  if (!boton) return;

  if (!exigirSesion('postularte a un curso')) return;

  const slug = boton.dataset.postular;
  boton.disabled = true;
  try {
    if (!estado.autenticado) throw new ErrorApi(401, 'sin_sesion', 'Tu sesion expiro.');
    if (!obtenerTokenCsrf()) throw new ErrorApi(0, 'sin_token', 'Falta el token de seguridad. Recarga la pagina.');

    // La API aun no expone el alta de postulaciones. Se avisa en lugar de
    // simular un registro que no se guardaria en ningun sitio.
    avisar(
      `La postulacion a "${slug}" todavia no esta disponible: el backend no expone todavia ese endpoint.`,
      'info'
    );
  } catch (error) {
    avisar(error.message, 'error');
  } finally {
    boton.disabled = false;
  }
});

/* ------------------------------------------------------------------ *
 * Arranque
 * ------------------------------------------------------------------ *
 * Se leen los filtros de la URL antes de la primera peticion, para que un
 * enlace como cursos.html?modalidad=online abra ya filtrado. El catalogo es de
 * lectura y no necesita sesion ni token: `main.js` se encarga de lo otro.
 * ------------------------------------------------------------------ */
const parametros = new URLSearchParams(window.location.search);
const dificultadInicial = parametros.get('dificultad');
const modalidadInicial = parametros.get('modalidad');
if (dificultadInicial) document.getElementById('dificultad').value = dificultadInicial;
if (modalidadInicial) document.getElementById('modalidad').value = modalidadInicial;

cargarCursos();
