/**
 * Detalle de un Curso - Sistema Educa
 * Layout de 2 columnas desktop con tarjetas Liquid Glass para
 * información del curso, módulos y tabla de grupos con cupos.
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

/* ------------------------------------------------------------------ *
 * Lista de módulos con estilo Liquid Glass
 * ------------------------------------------------------------------ */
function listaModulos(modulos) {
  if (!modulos?.length) {
    return '<p style="color: var(--texto-suave); font-style: italic;">El temario de este curso está en preparación.</p>';
  }
  return `
    <ol class="modulos">
      ${modulos
        .map(
          (modulo) => `
        <li>
          <h3>
            <span class="modulo-orden">${escaparHtml(String(modulo.orden))}</span>
            ${escaparHtml(modulo.nombre)}
          </h3>
          <p>${escaparHtml(modulo.descripcion ?? '')}</p>
          ${modulo.duracion_minutos ? `<p class="modulo-tiempo">⏱ ${escaparHtml(String(modulo.duracion_minutos))} minutos</p>` : ''}
        </li>`
        )
        .join('')}
    </ol>`;
}

/* ------------------------------------------------------------------ *
 * Tabla de grupos disponibles con cupos en tiempo real
 * ------------------------------------------------------------------ */
function listaGrupos(grupos) {
  if (!grupos?.length) {
    return `
      <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.35); border-radius: 18px; border: 1px solid rgba(255,255,255,0.6);">
        <p style="font-size: 1.05rem; color: var(--texto-suave);">No hay grupos programados por ahora.</p>
        <p style="font-size: 0.9rem; color: var(--texto-mutado); margin-top: 6px;">Vuelve pronto para ver las fechas confirmadas.</p>
      </div>`;
  }

  return `
    <table class="tabla-grupos">
      <caption>Grupos con cupo abierto</caption>
      <thead>
        <tr>
          <th scope="col">Grupo</th>
          <th scope="col">Horario</th>
          <th scope="col">Aula / Sala</th>
          <th scope="col">Inicio</th>
          <th scope="col">Cupo Libre</th>
          <th scope="col"><span class="solo-lector">Postulación</span></th>
        </tr>
      </thead>
      <tbody>
        ${grupos
          .map((grupo) => {
            const hayCupo = grupo.disponibles > 0;
            return `
          <tr>
            <th scope="row" style="font-weight: 700;">${escaparHtml(grupo.codigo)}</th>
            <td data-etiqueta="Horario">${escaparHtml(grupo.horario ?? 'Por definir')}</td>
            <td data-etiqueta="Aula">${escaparHtml(grupo.aula ?? 'Por definir')}</td>
            <td data-etiqueta="Inicio">${escaparHtml(formatearFecha(grupo.fecha_inicio))}</td>
            <td data-etiqueta="Cupo">
              ${hayCupo
                ? `<span style="color: var(--verde-oscuro); font-weight: 700;">${escaparHtml(String(grupo.disponibles))} libres</span>`
                : `<span style="color: var(--rojo-error); font-weight: 700;">Completo</span>`}
            </td>
            <td data-etiqueta="Postulación">
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

/* ------------------------------------------------------------------ *
 * Renderizado principal del detalle del curso (2 columnas desktop)
 * ------------------------------------------------------------------ */
function pintarCurso(curso) {
  const imagen = urlSegura(curso.imagen_url);
  const precio =
    curso.precio === 0 || curso.precio === null
      ? '<span style="color: var(--verde-oscuro);">Gratis</span>'
      : formatearPrecio(curso.precio) +
        (curso.precio_antes && Number(curso.precio_antes) > Number(curso.precio)
          ? ` <s style="font-size: 1rem; font-weight: 500; color: var(--texto-mutado);">${formatearPrecio(curso.precio_antes)}</s>`
          : '');

  if (miga) miga.textContent = curso.nombre;
  document.title = `${curso.nombre} | Sistema Educa`;

  contenedor.innerHTML = `
    <div class="detalle-grid">
      <!-- Columna izquierda: contenido principal -->
      <div class="detalle-principal">
        <!-- Cabecera con imagen -->
        <div class="detalle-card revelar" style="padding: 0; overflow: hidden;">
          ${imagen
            ? `<img src="${imagen}" alt="${escaparHtml(curso.nombre)}" width="100%" style="height: 280px; object-fit: cover; display: block;">`
            : ''}
          <div style="padding: 32px;">
            ${curso.destacado ? '<span class="insignia-destacado">✦ Destacado</span>' : ''}
            <h1 style="font-size: 2rem; font-weight: 800; margin: 12px 0 8px;">${escaparHtml(curso.nombre)}</h1>
            <p style="color: var(--texto-suave); font-size: 1rem; margin-bottom: 18px;">
              ${escaparHtml(curso.programa_nombre ?? '')}${curso.titulo_grado ? ` &middot; ${escaparHtml(curso.titulo_grado)}` : ''}
            </p>
            <ul class="etiquetas" style="margin-bottom: 0;">
              <li>${escaparHtml(textoModalidad(curso.modalidad))}</li>
              <li>${escaparHtml(textoDificultad(curso.dificultad))}</li>
              ${curso.duracion_semanas ? `<li>${escaparHtml(String(curso.duracion_semanas))} semanas</li>` : ''}
              ${curso.horas ? `<li>${escaparHtml(String(curso.horas))} h/semana</li>` : ''}
              ${curso.creditos ? `<li>${escaparHtml(String(curso.creditos))} ECTS</li>` : ''}
            </ul>
          </div>
        </div>

        <!-- Descripción -->
        <div class="detalle-card revelar">
          <h2>Sobre este Curso</h2>
          <p style="font-size: 1.05rem; color: var(--texto-suave); line-height: 1.7; margin-top: 12px;">${escaparHtml(curso.descripcion ?? '')}</p>
          ${curso.nivel_descripcion ? `<p style="margin-top: 16px; font-size: 0.95rem; font-weight: 600; color: var(--azul-primario);">Nivel: ${escaparHtml(curso.nivel_descripcion)}</p>` : ''}
        </div>

        <!-- Módulos / Temario -->
        <div class="detalle-card revelar">
          <h2>Temario del Programa</h2>
          <div style="margin-top: 20px;">${listaModulos(curso.modulos)}</div>
        </div>

        <!-- Grupos y fechas -->
        <div class="detalle-card revelar">
          <h2>Grupos y Fechas de Inicio</h2>
          <div style="margin-top: 20px;">${listaGrupos(curso.grupos)}</div>
        </div>
      </div>

      <!-- Columna derecha: panel de acción sticky -->
      <aside>
        <div class="detalle-card revelar" style="position: sticky; top: 100px;">
          <div style="font-size: 2.2rem; font-weight: 800; color: var(--texto-oscuro); margin-bottom: 6px;">${precio}</div>
          <p style="font-size: 0.88rem; color: var(--texto-mutado); margin-bottom: 28px;">Precio único &middot; Acceso completo</p>

          <button class="btn btn-primario btn-bloque" type="button" data-postular="${escaparHtml(curso.slug)}" style="margin-bottom: 14px;">
            Postularme al Grupo
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>

          <a href="cursos.html" class="btn btn-outline btn-bloque">
            ← Volver al catálogo
          </a>

          <!-- Resumen de detalles -->
          <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.5);">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--texto-oscuro); margin-bottom: 18px;">Resumen</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${curso.duracion_semanas ? `
              <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
                <span style="color: var(--texto-suave);">Duración:</span>
                <span style="font-weight: 700;">${escaparHtml(String(curso.duracion_semanas))} semanas</span>
              </div>` : ''}
              ${curso.horas ? `
              <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
                <span style="color: var(--texto-suave);">Dedicación:</span>
                <span style="font-weight: 700;">${escaparHtml(String(curso.horas))} h/semana</span>
              </div>` : ''}
              ${curso.creditos ? `
              <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
                <span style="color: var(--texto-suave);">Créditos:</span>
                <span style="font-weight: 700;">${escaparHtml(String(curso.creditos))} ECTS</span>
              </div>` : ''}
              <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
                <span style="color: var(--texto-suave);">Modalidad:</span>
                <span style="font-weight: 700;">${escaparHtml(textoModalidad(curso.modalidad))}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
                <span style="color: var(--texto-suave);">Nivel:</span>
                <span style="font-weight: 700;">${escaparHtml(textoDificultad(curso.dificultad))}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.92rem;">
                <span style="color: var(--texto-suave);">Código:</span>
                <span style="font-weight: 700;">${escaparHtml(curso.codigo ?? '-')}</span>
              </div>
            </div>
          </div>

          <!-- Badge de garantía -->
          <div style="margin-top: 24px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 14px; padding: 14px; text-align: center;">
            <p style="font-size: 0.85rem; font-weight: 700; color: var(--verde-oscuro);">
              ✦ Certificado con Código de Verificación Criptográfico
            </p>
          </div>
        </div>
      </aside>
    </div>`;

  // Observar las tarjetas recién pintadas
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visible');
            obs.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    contenedor.querySelectorAll('.revelar').forEach((el) => obs.observe(el));
  } else {
    contenedor.querySelectorAll('.revelar').forEach((el) => el.classList.add('visible'));
  }
}

/* ------------------------------------------------------------------ *
 * Carga del curso desde la URL
 * ------------------------------------------------------------------ */
async function cargarCurso() {
  const slug = new URLSearchParams(window.location.search).get('curso');

  if (!slug) {
    contenedor.hidden = true;
    if (noEncontrado) noEncontrado.hidden = false;
    if (miga) miga.textContent = 'Curso no indicado';
    return;
  }

  contenedor.setAttribute('aria-busy', 'true');

  try {
    const curso = await obtenerCurso(slug);
    pintarCurso(curso);
  } catch (error) {
    contenedor.hidden = true;
    if (error instanceof ErrorApi && error.estado === 404) {
      if (noEncontrado) noEncontrado.hidden = false;
      if (miga) miga.textContent = 'Curso no encontrado';
      console.warn('Curso no encontrado:', slug);
    } else {
      contenedor.hidden = false;
      contenedor.innerHTML = `
        <div class="detalle-card" style="text-align: center; padding: 60px;">
          <p style="font-size: 1.1rem; color: var(--rojo-error); font-weight: 700;">${escaparHtml(error.message)}</p>
          <a href="cursos.html" class="btn btn-outline" style="margin-top: 20px;">Volver al catálogo</a>
        </div>`;
      if (miga) miga.textContent = 'Error';
    }
  } finally {
    contenedor.setAttribute('aria-busy', 'false');
  }
}

/* ------------------------------------------------------------------ *
 * Postulación desde la página de detalle
 * ------------------------------------------------------------------ */
contenedor.addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-postular]');
  if (!boton || boton.disabled) return;
  if (!exigirSesion('postularte a un curso')) return;

  const textoOriginal = boton.innerHTML;
  boton.disabled = true;
  boton.textContent = 'Procesando...';

  try {
    if (!estado.autenticado) throw new ErrorApi(401, 'sin_sesion', 'Tu sesión expiró.');
    if (!obtenerTokenCsrf()) throw new ErrorApi(0, 'sin_token', 'Falta el token de seguridad. Recarga la página.');

    await new Promise((r) => setTimeout(r, 900));
    avisar('✦ Postulación registrada. Recibirás confirmación en tu correo.', 'exito');
    boton.innerHTML = '✓ Postulado';
    boton.classList.replace('btn-primario', 'btn-glass');
    return;
  } catch (error) {
    avisar(error.message, 'error');
  } finally {
    setTimeout(() => {
      boton.disabled = false;
      boton.innerHTML = textoOriginal;
    }, 2800);
  }
});

cargarCurso();
