/**
 * Dashboard de Estudiante - Mi Campus Educa PRO
 * Experiencia Liquid Glass con seguimiento de cursos en curso,
 * postulaciones activas y credenciales oficiales.
 */
import {
  obtenerMisCursos,
  obtenerMisPostulaciones,
  obtenerMisCertificados,
  escaparHtml,
  formatearFecha,
  ErrorApi,
} from './api.js';
import { avisar, estado, sesionLista } from './main.js';

const avatarEl = document.getElementById('avatarUsuario');
const nombreEl = document.getElementById('nombreUsuario');
const correoEl = document.getElementById('correoUsuario');
const rolEl = document.getElementById('rolUsuario');

const panelCursos = document.getElementById('panelCursos');
const panelPostulaciones = document.getElementById('panelPostulaciones');
const panelCertificados = document.getElementById('panelCertificados');

const listaCursos = document.getElementById('listaCursosActivos');
const contenedorPostulaciones = document.getElementById('contenedorPostulaciones');
const contenedorCertificados = document.getElementById('contenedorCertificados');

const statCursosEl = document.getElementById('statCursosActivos');
const statCertificadosEl = document.getElementById('statCertificados');

/* ------------------------------------------------------------------ *
 * Verificación de Sesión y Perfil
 * ------------------------------------------------------------------ */
async function inicializarDashboard() {
  await sesionLista;

  if (!estado.autenticado || !estado.usuario) {
    avisar('Debes iniciar sesión para acceder a tu campus personal.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
    return;
  }

  const u = estado.usuario;
  const nombreCompleto = `${u.nombre} ${u.apellidos ?? ''}`.trim();
  const inicial = u.nombre?.trim().charAt(0).toUpperCase() || 'E';

  if (avatarEl) avatarEl.textContent = inicial;
  if (nombreEl) nombreEl.textContent = nombreCompleto;
  if (correoEl) correoEl.textContent = u.correo;
  if (rolEl) rolEl.textContent = `${u.rol || 'Estudiante'} Oficial`;

  cargarCursos();
  cargarPostulaciones();
  cargarCertificados();
}

/* ------------------------------------------------------------------ *
 * Renderizado de Cursos Activos
 * ------------------------------------------------------------------ */
async function cargarCursos() {
  if (!listaCursos) return;

  try {
    const cursos = await obtenerMisCursos();
    if (statCursosEl) statCursosEl.textContent = String(cursos.length);

    if (!cursos.length) {
      listaCursos.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 50px;">
          <p style="font-size: 1.15rem; margin-bottom: 12px; font-weight: 700;">No tienes cursos inscritos en este ciclo.</p>
          <p style="color: var(--texto-suave); margin-bottom: 24px;">Explora el catálogo oficial de convocatorias 2026.</p>
          <a href="cursos.html" class="btn btn-primario">Ver Cursos Disponibles</a>
        </div>`;
      return;
    }

    listaCursos.innerHTML = cursos
      .map(
        (c) => `
      <article class="curso-progreso-card revelar">
        <div>
          <div class="curso-progreso-header">
            <span class="badge badge-verde">✦ En Curso</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--azul-primario); background: rgba(37,99,235,0.08); padding: 4px 10px; border-radius: 8px;">
              ${escaparHtml(c.codigo)}
            </span>
          </div>

          <h3>${escaparHtml(c.nombre)}</h3>
          <p class="curso-progreso-meta">
            ${escaparHtml(c.docente)} &bull; ${escaparHtml(c.aula)}
          </p>

          <div class="barra-progreso-contenedor">
            <div class="barra-progreso-etiquetas">
              <span>Progreso del Programa</span>
              <span>${c.progreso}%</span>
            </div>
            <div class="barra-progreso-fondo">
              <div class="barra-progreso-relleno" style="width: ${c.progreso}%;"></div>
            </div>
          </div>

          <div style="font-size: 0.85rem; color: var(--texto-suave); margin-bottom: 16px;">
            <span>📚 ${c.modulosCompletados} de ${c.totalModulos} módulos completados</span>
            <br>
            <span>⏱ Próxima clase: <strong style="color: var(--texto-oscuro);">${escaparHtml(c.proximaClase)}</strong></span>
          </div>
        </div>

        <div class="curso-progreso-footer">
          <span style="font-size: 0.85rem; font-weight: 700; color: var(--verde-oscuro);">● En horario activo</span>
          <button type="button" class="btn btn-primario btn-pequeno" data-entrar-aula="${escaparHtml(c.codigo)}">
            Entrar al Aula Virtual
          </button>
        </div>
      </article>`
      )
      .join('');
  } catch (error) {
    listaCursos.innerHTML = `
      <p class="cargando" style="grid-column: 1 / -1; text-align: center; color: var(--rojo-error);">
        No se pudieron cargar los cursos activos.
      </p>`;
  }
}

/* ------------------------------------------------------------------ *
 * Renderizado de Postulaciones y Cupos
 * ------------------------------------------------------------------ */
async function cargarPostulaciones() {
  if (!contenedorPostulaciones) return;

  try {
    const postulaciones = await obtenerMisPostulaciones();

    if (!postulaciones.length) {
      contenedorPostulaciones.innerHTML = `
        <p style="text-align: center; color: var(--texto-suave); padding: 30px;">
          No tienes solicitudes de postulación pendientes.
        </p>`;
      return;
    }

    contenedorPostulaciones.innerHTML = `
      <table class="tabla-grupos">
        <caption>Tus postulaciones académicas registradas</caption>
        <thead>
          <tr>
            <th scope="col">Curso Solicitado</th>
            <th scope="col">Grupo</th>
            <th scope="col">Fecha de Envío</th>
            <th scope="col">Estado</th>
            <th scope="col">Asignación de Cupo</th>
          </tr>
        </thead>
        <tbody>
          ${postulaciones
            .map(
              (p) => `
            <tr>
              <th scope="row" style="font-weight: 700; color: var(--texto-oscuro);">
                ${escaparHtml(p.cursoNombre)}
              </th>
              <td>${escaparHtml(p.codigoGrupo)}</td>
              <td>${escaparHtml(formatearFecha(p.fecha))}</td>
              <td>
                <span class="badge ${p.estado === 'Aprobada' ? 'badge-verde' : 'badge-azul'}">
                  ${escaparHtml(p.estado)}
                </span>
              </td>
              <td style="font-weight: 600; color: var(--texto-cuerpo);">
                ${escaparHtml(p.cupo)}
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  } catch (error) {
    contenedorPostulaciones.innerHTML = `
      <p style="color: var(--rojo-error); text-align: center;">Error al cargar tus postulaciones.</p>`;
  }
}

/* ------------------------------------------------------------------ *
 * Renderizado de Certificados Oficiales
 * ------------------------------------------------------------------ */
async function cargarCertificados() {
  if (!contenedorCertificados) return;

  try {
    const certs = await obtenerMisCertificados();
    if (statCertificadosEl) statCertificadosEl.textContent = String(certs.length);

    if (!certs.length) {
      contenedorCertificados.innerHTML = `
        <p style="grid-column: 1 / -1; text-align: center; color: var(--texto-suave); padding: 30px;">
          Aún no tienes certificaciones emitidas. Completa tus programas en curso para obtener credenciales verificables.
        </p>`;
      return;
    }

    contenedorCertificados.innerHTML = certs
      .map(
        (cert) => `
      <div class="credencial-card revelar">
        <div class="credencial-icono">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
          </svg>
        </div>
        <span class="badge badge-verde" style="margin-bottom: 10px;">✦ ${escaparHtml(cert.estado)}</span>
        <h3>${escaparHtml(cert.titulo)}</h3>
        <p style="font-size: 0.9rem; color: var(--texto-suave); margin-bottom: 6px;">
          ${escaparHtml(cert.programa)} &bull; Calificación Final: <strong>${escaparHtml(cert.promedio)}</strong>
        </p>
        <p style="font-size: 0.85rem; color: var(--texto-mutado);">
          Emitido el ${escaparHtml(cert.fechaEmision)} &bull; ${cert.horas} horas lectivas
        </p>

        <div class="credencial-hash">
          Firma Criptográfica: ${escaparHtml(cert.codigoVerificacion)}
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="btn btn-outline btn-pequeno" data-copiar-hash="${escaparHtml(cert.codigoVerificacion)}">
            Copiar Verificador
          </button>
          <button type="button" class="btn btn-primario btn-pequeno" data-descargar-cert="${escaparHtml(cert.id)}">
            Descargar Credencial PDF
          </button>
        </div>
      </div>`
      )
      .join('');
  } catch (error) {
    contenedorCertificados.innerHTML = `
      <p style="grid-column: 1 / -1; color: var(--rojo-error); text-align: center;">Error al cargar certificados.</p>`;
  }
}

/* ------------------------------------------------------------------ *
 * Sistema de Pestañas (Tabs)
 * ------------------------------------------------------------------ */
document.querySelectorAll('.dashboard-tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dashboard-tab-btn').forEach((b) => b.classList.remove('activo'));
    btn.classList.add('activo');

    const destino = btn.dataset.tab;
    if (panelCursos) panelCursos.hidden = destino !== 'cursos';
    if (panelPostulaciones) panelPostulaciones.hidden = destino !== 'postulaciones';
    if (panelCertificados) panelCertificados.hidden = destino !== 'certificados';
  });
});

/* ------------------------------------------------------------------ *
 * Interacciones de Botones del Campus
 * ------------------------------------------------------------------ */
document.addEventListener('click', (e) => {
  const btnAula = e.target.closest('[data-entrar-aula]');
  if (btnAula) {
    const cod = btnAula.dataset.entrarAula;
    avisar(`Conectando con la sala de streaming del grupo ${cod}...`, 'exito');
    return;
  }

  const btnCopiar = e.target.closest('[data-copiar-hash]');
  if (btnCopiar) {
    const hash = btnCopiar.dataset.copiarHash;
    navigator.clipboard?.writeText(hash).catch(() => {});
    avisar('Firma criptográfica copiada al portapapeles.', 'info');
    return;
  }

  const btnCert = e.target.closest('[data-descargar-cert]');
  if (btnCert) {
    const id = btnCert.dataset.descargarCert;
    avisar(`Generando credencial oficial ${id} con firma digital...`, 'exito');
    return;
  }
});

inicializarDashboard();
