/**
 * Detalle de un curso.
 *
 * Este archivo es nuevo, pero la version anterior "funcionaba" con cursos
 * escritos a mano: si alguien pedia un slug inexistente, la pagina se quedaba
 * en blanco sin decir nada. Ahora el slug sale de la URL y se le pide a la API,
 * que responde 404 con un mensaje claro.
 */
import {
  obtenerCurso,
  obtenerTokenCsrf,
  ErrorApi,
  escaparHtml,
  urlSegura,
  formatearPrecio,
  formatearFecha,
  textoModalidad,
  textoDificultad,
} from './api.js';
import { avisar, estado, exigirSesion } from './main.js';

const contenedor = document.getElementById('detalleCurso');
const miga = document.getElementById('migaCurso');
const noEncontrado = document.getElementById('cursoNoEncontrado');

function listaModulos(modulos) {
  if (!modulos?.length) {
    return '<p>El temario de este curso esta en preparacion.</p>';
  }
  return `
    <ol class="modulos">
      ${modulos
        .map(
          (modulo) => `
        <li>
          <h3><span class="modulo-orden">${escaparHtml(modulo.orden)}</span> ${escaparHtml(modulo.nombre)}</h3>
          <p>${escaparHtml(modulo.descripcion ?? '')}</p>
          ${modulo.duracion_minutos ? `<p class="modulo-tiempo">${escaparHtml(modulo.duracion_minutos)} minutos</p>` : ''}
        </li>`
        )
        .join('')}
    </ol>`;
}

function listaGrupos(grupos) {
  if (!grupos?.length) {
    return '<p>No hay grupos programados por ahora. Vuelve pronto para ver las fechas.</p>';
  }
  return `
    <table class="tabla-grupos">
      <caption>Grupos con cupo abierto</caption>
      <thead>
        <tr>
          <th scope="col">Grupo</th>
          <th scope="col">Horario</th>
          <th scope="col">Aula</th>
          <th scope="col">Inicio</th>
          <th scope="col">Cupo</th>
          <th scope="col"><span class="solo-lector">Postularme</span></th>
        </tr>
      </thead>
      <tbody>
        ${grupos
          .map((grupo) => {
            const hayCupo = grupo.disponibles > 0;
            return `
          <tr>
            <th scope="row">${escaparHtml(grupo.codigo)}</th>
            <td data-etiqueta="Horario">${escaparHtml(grupo.horario ?? 'Por definir')}</td>
            <td data-etiqueta="Aula">${escaparHtml(grupo.aula ?? 'Por definir')}</td>
            <td data-etiqueta="Inicio">${escaparHtml(formatearFecha(grupo.fecha_inicio))}</td>
            <td data-etiqueta="Cupo">${hayCupo ? `${escaparHtml(grupo.disponibles)} libres` : 'Completo'}</td>
            <td data-etiqueta="Postulacion">
              <button class="btn ${hayCupo ? 'btn-primario' : 'btn-outline'} btn-pequeno"
                      type="button" data-postular="${escaparHtml(grupo.codigo)}"
                      ${hayCupo ? '' : 'disabled aria-disabled="true"'}>
                ${hayCupo ? 'Postularme' : 'Sin cupo'}
              </button>
            </td>
          </tr>`;
          })
          .join('')}
      </tbody>
    </table>`;
}

function pintarCurso(curso) {
  const imagen = urlSegura(curso.imagen_url);
  const precio =
    curso.precio === 0 || curso.precio === null
      ? 'Gratis'
      : formatearPrecio(curso.precio) +
        (curso.precio_antes && Number(curso.precio_antes) > Number(curso.precio)
          ? ` <s>${formatearPrecio(curso.precio_antes)}</s>`
          : '');

  miga.textContent = curso.nombre;
  document.title = `${curso.nombre} | Sistema Educa`;

  contenedor.innerHTML = `
    <article class="detalle-curso">
      <div class="detalle-cabecera">
        ${imagen ? `<img class="detalle-imagen" src="${imagen}" alt="" width="640" height="360">` : ''}
        <div>
          ${curso.destacado ? '<span class="insignia insignia-destacado">Destacado</span>' : ''}
          <h1>${escaparHtml(curso.nombre)}</h1>
          <p class="detalle-subtitulo">
            ${escaparHtml(curso.programa_nombre ?? '')}
            ${curso.titulo_grado ? ` &middot; ${escaparHtml(curso.titulo_grado)}` : ''}
          </p>
          <ul class="etiquetas">
            <li>${escaparHtml(textoModalidad(curso.modalidad))}</li>
            <li>${escaparHtml(textoDificultad(curso.dificultad))}</li>
            ${curso.duracion_semanas ? `<li>${escaparHtml(curso.duracion_semanas)} semanas</li>` : ''}
            ${curso.horas ? `<li>${escaparHtml(curso.horas)} horas</li>` : ''}
          </ul>
          <p class="detalle-precio">${precio}</p>
          <button class="btn btn-primario" type="button" data-postular-curso="${escaparHtml(curso.slug)}">
            Postularme a este curso
          </button>
        </div>
      </div>

      <section aria-labelledby="titulo-descripcion">
        <h2 id="titulo-descripcion">Sobre el curso</h2>
        <p class="detalle-descripcion">${escaparHtml(curso.descripcion ?? '')}</p>
        ${curso.nivel_descripcion ? `<p class="detalle-nivel">${escaparHtml(curso.nivel_descripcion)}</p>` : ''}
      </section>

      <section aria-labelledby="titulo-temario">
        <h2 id="titulo-temario">Temario</h2>
        ${listaModulos(curso.modulos)}
      </section>

      <section aria-labelledby="titulo-grupos">
        <h2 id="titulo-grupos">Grupos y fechas</h2>
        ${listaGrupos(curso.grupos)}
      </section>
    </article>`;
}

async function cargarCurso() {
  const slug = new URLSearchParams(window.location.search).get('curso');

  if (!slug) {
    contenedor.hidden = true;
    noEncontrado.hidden = false;
    miga.textContent = 'Curso no indicado';
    return;
  }

  contenedor.setAttribute('aria-busy', 'true');
  try {
    const curso = await obtenerCurso(slug);
    pintarCurso(curso);
  } catch (error) {
    contenedor.hidden = true;
    if (error instanceof ErrorApi && error.estado === 404) {
      noEncontrado.hidden = false;
      miga.textContent = 'Curso no encontrado';
      // Un slug inventado en la URL no es un error que el visitante tenga que
      // ver. Se registra en consola para depurar y se le muestra un mensaje
      // util.
      console.warn('Curso no encontrado:', slug);
    } else {
      contenedor.innerHTML = `<p class="error-general">${escaparHtml(error.message)}</p>`;
      miga.textContent = 'Error';
    }
  } finally {
    contenedor.setAttribute('aria-busy', 'false');
  }
}

/* ------------------------------------------------------------------ *
 * Postulacion. Igual que en el catalogo: se comprueba la sesion y se avisa de
 * que la API aun no expone el alta de postulaciones, en vez de fingir exito.
 * ------------------------------------------------------------------ */
contenedor.addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-postular]');
  if (!boton || boton.disabled) return;
  if (!exigirSesion('postularte a un curso')) return;

  try {
    if (!estado.autenticado) throw new ErrorApi(401, 'sin_sesion', 'Tu sesion expiro.');
    if (!obtenerTokenCsrf()) throw new ErrorApi(0, 'sin_token', 'Falta el token de seguridad. Recarga la pagina.');
    avisar('La postulacion todavia no esta disponible: el backend no expone ese endpoint.', 'info');
  } catch (error) {
    avisar(error.message, 'error');
  }
});

// El detalle es publico: se lee sin sesion y sin token anti-CSRF.
cargarCurso();
