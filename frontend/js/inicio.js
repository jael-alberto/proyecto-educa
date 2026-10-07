/**
 * Portada Principal - Sistema Educa
 * Con contadores animados y renderizado Liquid Glass de cursos destacados.
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
 * Saludo personalizado para usuarios autenticados
 * ------------------------------------------------------------------ */
function pintarSaludo() {
  if (!estado.autenticado || !estado.usuario) {
    if (insigniaHero) {
      insigniaHero.className = 'badge badge-verde';
      insigniaHero.textContent = '✦ Admisiones abiertas para nuevos grupos 2026';
    }
    return;
  }
  const nombre = escaparHtml(estado.usuario.nombre);
  if (insigniaHero) {
    insigniaHero.className = 'badge badge-azul';
    insigniaHero.textContent = `Sesión activa: ${nombre}`;
  }
  if (zonaSaludo) {
    zonaSaludo.hidden = false;
    zonaSaludo.innerHTML = `
      <div class="card" style="margin-bottom: 40px; background: linear-gradient(135deg, rgba(37,99,235,0.12), rgba(255,255,255,0.4));">
        <h2>Hola de nuevo, ${nombre} 👋</h2>
        <p style="margin: 10px 0 20px;">Continúa donde lo dejaste o explora los nuevos grupos asignados con cupo preferencial.</p>
        <div style="display: flex; gap: 14px; flex-wrap: wrap;">
          <a href="dashboard.html" class="btn btn-primario">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            Ir a Mi Campus
          </a>
          <a href="cursos.html" class="btn btn-outline">Explorar Catálogo Completo</a>
        </div>
      </div>`;
  }
}

/* ------------------------------------------------------------------ *
 * Función de Contador Animado (CountUp)
 * ------------------------------------------------------------------ */
function animarContador(elemento, objetivo, duracion = 1600) {
  let inicio = 0;
  const paso = 16;
  const totalPasos = duracion / paso;
  let pasoActual = 0;

  const temporizador = setInterval(() => {
    pasoActual++;
    const progreso = pasoActual / totalPasos;
    // Curva easeOutExpo
    const factor = progreso === 1 ? 1 : 1 - Math.pow(2, -10 * progreso);
    const valor = Math.round(inicio + (objetivo - inicio) * factor);
    elemento.textContent = valor.toLocaleString('es-DO');

    if (pasoActual >= totalPasos) {
      clearInterval(temporizador);
      elemento.textContent = objetivo.toLocaleString('es-DO');
    }
  }, paso);
}

/* ------------------------------------------------------------------ *
 * Estadísticas con tarjetas Liquid Glass e iconos SVG
 * ------------------------------------------------------------------ */
function tarjetaEstadistica(valor, etiqueta, icono, idContador) {
  return `
    <div class="stat-card revelar">
      <div class="stat-icono">
        ${icono}
      </div>
      <h2 class="stat-numero" id="${idContador}">0</h2>
      <p class="stat-etiqueta">${escaparHtml(etiqueta)}</p>
    </div>`;
}

const ICONOS_STATS = {
  cursos: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
  usuarios: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  certificados: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`,
  vacantes: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
};

async function cargarEstadisticas() {
  if (!zonaEstadisticas) return;
  try {
    const datos = await obtenerEstadisticas();
    const statsData = [
      { val: datos.cursosPublicados ?? 8, label: 'Cursos Activos', icon: ICONOS_STATS.cursos, id: 'stat-cursos' },
      { val: datos.estudiantesActivos ?? 1420, label: 'Estudiantes Registrados', icon: ICONOS_STATS.usuarios, id: 'stat-usuarios' },
      { val: datos.certificadosEmitidos ?? 580, label: 'Certificados Emitidos', icon: ICONOS_STATS.certificados, id: 'stat-certificados' },
      { val: datos.vacantesPublicadas ?? 24, label: 'Vacantes con Cupo', icon: ICONOS_STATS.vacantes, id: 'stat-vacantes' },
    ];

    zonaEstadisticas.innerHTML = statsData
      .map((item) => tarjetaEstadistica(item.val, item.label, item.icon, item.id))
      .join('');

    // Disparar animación de contador
    setTimeout(() => {
      statsData.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) animarContador(el, item.val);
      });
    }, 150);
  } catch (error) {
    zonaEstadisticas.innerHTML = `
      <p class="cargando" style="grid-column: 1 / -1; text-align: center;">
        No se pudieron cargar las estadísticas del sistema.
      </p>`;
  } finally {
    zonaEstadisticas.setAttribute('aria-busy', 'false');
  }
}

/* ------------------------------------------------------------------ *
 * Cursos Destacados en Grid de 3 Columnas
 * ------------------------------------------------------------------ */
function tarjetaCurso(curso) {
  const imagen = urlSegura(curso.imagen_url);
  const precio =
    curso.precio === 0 || curso.precio === null ? 'Gratis' : formatearPrecio(curso.precio);
  const precioAntes =
    curso.precio_antes && Number(curso.precio_antes) > Number(curso.precio)
      ? `<s>${formatearPrecio(curso.precio_antes)}</s>`
      : '';

  return `
    <article class="tarjeta-curso revelar">
      ${imagen ? `<img src="${imagen}" alt="${escaparHtml(curso.nombre)}" loading="lazy" width="360" height="200">` : ''}
      <div class="tarjeta-cuerpo">
        <span class="insignia-destacado">✦ Destacado</span>
        <h3><a href="detalle.html?curso=${encodeURIComponent(curso.slug)}">${escaparHtml(curso.nombre)}</a></h3>
        <p class="tarjeta-meta">${escaparHtml(curso.programa_nombre ?? 'Programa Oficial')}</p>
        <ul class="etiquetas">
          <li>${escaparHtml(textoModalidad(curso.modalidad))}</li>
          <li>${escaparHtml(textoDificultad(curso.dificultad))}</li>
          ${curso.duracion_semanas ? `<li>${escaparHtml(curso.duracion_semanas)} semanas</li>` : ''}
        </ul>
        <div class="tarjeta-pie">
          <span class="precio">${precio} ${precioAntes}</span>
          <a class="btn btn-outline btn-pequeno" href="detalle.html?curso=${encodeURIComponent(curso.slug)}">
            Ver programa
          </a>
        </div>
      </div>
    </article>`;
}

async function cargarDestacados() {
  if (!zonaDestacados) return;
  try {
    const cursos = await listarCursos({ destacado: '1', limite: 3 });
    if (!cursos.length) {
      zonaDestacados.innerHTML = '<p class="cargando">Todavía no hay cursos publicados.</p>';
      return;
    }
    zonaDestacados.innerHTML = cursos.map(tarjetaCurso).join('');
    observarNuevasTarjetas();
  } catch (error) {
    zonaDestacados.innerHTML = '<p class="cargando">No se pudieron cargar los cursos destacados.</p>';
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
 * Inicialización
 * ------------------------------------------------------------------ */
cargarEstadisticas();
cargarDestacados();
sesionLista.then(pintarSaludo);
