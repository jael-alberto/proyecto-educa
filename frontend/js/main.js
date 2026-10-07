/**
 * Comportamiento global del Sistema Educa:
 * - Liquid Glass efectos visuales (Blobs flotantes, spotlight, ripple, parallax)
 * - Navegación fija y sesión de usuario
 * - Avisos accesibles y footer oscuro de 4 columnas
 */
import { obtenerSesion, cerrarSesion, escaparHtml, ErrorApi } from './api.js';

export const estado = { usuario: null, autenticado: false, consultado: false };

/* ------------------------------------------------------------------ *
 * Notificaciones Flotantes Accesibles
 * ------------------------------------------------------------------ */
let contenedorAvisos = null;

export function avisar(mensaje, tipo = 'info') {
  if (!contenedorAvisos) {
    contenedorAvisos = document.createElement('div');
    contenedorAvisos.className = 'avisos';
    contenedorAvisos.setAttribute('aria-live', 'polite');
    contenedorAvisos.setAttribute('role', 'status');
    document.body.appendChild(contenedorAvisos);
  }
  const aviso = document.createElement('div');
  aviso.className = `aviso aviso-${tipo}`;
  aviso.innerHTML = `<span>${escaparHtml(mensaje)}</span>`;
  contenedorAvisos.appendChild(aviso);
  setTimeout(() => aviso.remove(), 6000);
}

/* ------------------------------------------------------------------ *
 * Inyección de Efectos Visuales Liquid Glass
 * ------------------------------------------------------------------ */
function inicializarEfectosLiquidGlass() {
  // Inyección de Blobs animados si no existen
  if (!document.querySelector('.fondo-liquido-animado')) {
    const bg = document.createElement('div');
    bg.className = 'fondo-liquido-animado';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = `
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
      <div class="blob blob-4"></div>
    `;
    document.body.prepend(bg);
  }

  // Cursor ambient spotlight follower
  let cursor = document.querySelector('.cursor-luz');
  if (!cursor) {
    cursor = document.createElement('div');
    cursor.className = 'cursor-luz';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
  }

  window.addEventListener('mousemove', (e) => {
    document.body.classList.add('mouse-activo');
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });

  window.addEventListener('mouseleave', () => {
    document.body.classList.remove('mouse-activo');
  });

  // Efecto Ripple interactivo al hacer click en botones
  document.addEventListener('click', (e) => {
    const boton = e.target.closest('.btn');
    if (!boton) return;

    const rect = boton.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple-wave';
    const diametro = Math.max(rect.width, rect.height);
    const radio = diametro / 2;

    ripple.style.width = ripple.style.height = `${diametro}px`;
    ripple.style.left = `${e.clientX - rect.left - radio}px`;
    ripple.style.top = `${e.clientY - rect.top - radio}px`;

    const anterior = boton.querySelector('.ripple-wave');
    if (anterior) anterior.remove();

    boton.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  // Parallax interactivo del Showcase Glass con el mouse
  const cardShowcase = document.querySelector('.showcase-glass-card');
  if (cardShowcase) {
    window.addEventListener('mousemove', (e) => {
      const { innerWidth, innerHeight } = window;
      const xOffset = (e.clientX / innerWidth - 0.5) * 16;
      const yOffset = (e.clientY / innerHeight - 0.5) * -16;
      cardShowcase.style.transform = `rotateY(${xOffset}deg) rotateX(${yOffset}deg) translateY(-4px)`;
    });

    window.addEventListener('mouseleave', () => {
      cardShowcase.style.transform = 'rotateY(0deg) rotateX(0deg) translateY(0px)';
    });
  }

  // Navbar glass blur al hacer scroll
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 25) {
        nav.classList.add('nav-scrolled');
      } else {
        nav.classList.remove('nav-scrolled');
      }
    });
  }
}

/* ------------------------------------------------------------------ *
 * Barra de Navegación y Sesión
 * ------------------------------------------------------------------ */
function pintarSesionEnNav() {
  const zona = document.querySelector('[data-zona-sesion]');
  const navEnlaces = document.querySelector('.nav-enlaces');
  if (navEnlaces && estado.autenticado && !navEnlaces.querySelector('.nav-enlace-campus')) {
    const enlaceCampus = document.createElement('a');
    enlaceCampus.href = 'dashboard.html';
    enlaceCampus.className = 'nav-enlace-campus';
    enlaceCampus.innerHTML = '✦ Mi Campus';
    enlaceCampus.style.fontWeight = '700';
    enlaceCampus.style.color = 'var(--azul-primario)';
    navEnlaces.appendChild(enlaceCampus);
  }

  if (!zona) return;

  if (estado.autenticado && estado.usuario) {
    const nombre = escaparHtml(estado.usuario.nombre ?? 'Usuario');
    const rol = escaparHtml(estado.usuario.rol ?? 'Estudiante');
    const inicial = nombre.trim().charAt(0).toUpperCase();

    zona.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <a href="dashboard.html" title="Ir a Mi Campus" style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.45); padding: 5px 14px 5px 6px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.7); text-decoration: none; transition: var(--transicion-ios);" class="nav-usuario-card">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(37,99,235,0.3);">
            ${inicial}
          </div>
          <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.1;">
            <span style="font-size: 0.88rem; font-weight: 700; color: var(--texto-oscuro);">${nombre}</span>
            <span style="font-size: 0.72rem; color: var(--texto-suave); font-weight: 600; text-transform: capitalize;">${rol}</span>
          </div>
        </a>
        <a href="dashboard.html" class="btn btn-primario btn-pequeno">Campus</a>
        <button type="button" class="btn btn-outline btn-pequeno" data-cerrar-sesion title="Cerrar sesión">
          Salir
        </button>
      </div>`;
  } else {
    zona.innerHTML = `
      <a href="login.html" class="btn-nav">Iniciar sesión</a>
      <a href="registro.html" class="btn btn-primario btn-pequeno">Crear cuenta</a>`;
  }
}

/* ------------------------------------------------------------------ *
 * Footer Oscuro Liquid Glass (4 Columnas)
 * ------------------------------------------------------------------ */
const ANIO = new Date().getFullYear();

function crearFooter() {
  if (document.querySelector('footer')) return;
  const pie = document.createElement('footer');
  pie.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>Sistema Educa</h4>
          <p>Plataforma educativa con experiencia Liquid Glass estilo iOS, catálogo de alta tecnología, postulaciones abiertas y credenciales verificables con firma digital.</p>
        </div>
        <div>
          <h4>Navegación</h4>
          <ul>
            <li><a href="index.html">Inicio</a></li>
            <li><a href="cursos.html">Catálogo de Cursos</a></li>
            <li><a href="dashboard.html">Mi Campus</a></li>
            <li><a href="login.html">Iniciar Sesión</a></li>
            <li><a href="registro.html">Crear Cuenta Gratis</a></li>
          </ul>
        </div>
        <div>
          <h4>Especialidades</h4>
          <ul>
            <li><a href="cursos.html">Programación Web</a></li>
            <li><a href="cursos.html">Inteligencia Artificial</a></li>
            <li><a href="cursos.html">Ciberseguridad</a></li>
            <li><a href="cursos.html">Diseño UI/UX</a></li>
          </ul>
        </div>
        <div>
          <h4>Contacto y Soporte</h4>
          <ul>
            <li>soporte@educa.com</li>
            <li>+1 (809) 555-0134</li>
            <li>Edificio Mac Tech, Av. Churchill</li>
            <li>Lunes a Viernes, 8:00 a 19:00</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div>&copy; ${ANIO} Sistema Educa. Todos los derechos reservados. Diseño Liquid Glass iOS.</div>
        <div style="display: flex; gap: 20px;">
          <span>Privacidad</span>
          <span>Términos</span>
          <span>Seguridad</span>
        </div>
      </div>
    </div>`;
  document.body.appendChild(pie);
}

/* ------------------------------------------------------------------ *
 * Animaciones al Scroll
 * ------------------------------------------------------------------ */
function observarScroll() {
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sinMovimiento) {
    document.querySelectorAll('.revelar').forEach((el) => el.classList.add('visible'));
    return;
  }

  const objetivos = document.querySelectorAll('.revelar');
  if (!('IntersectionObserver' in window)) {
    objetivos.forEach((el) => el.classList.add('visible'));
    return;
  }

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
  objetivos.forEach((el) => observador.observe(el));
}

function crearSaltoContenido() {
  if (document.querySelector('.salto-contenido')) return;
  const enlace = document.createElement('a');
  enlace.className = 'salto-contenido';
  enlace.href = '#contenido';
  enlace.textContent = 'Saltar al contenido principal';
  document.body.prepend(enlace);
}

/* ------------------------------------------------------------------ *
 * Arranque de la Plataforma
 * ------------------------------------------------------------------ */
export const sesionLista = iniciar();

async function iniciar() {
  crearSaltoContenido();
  inicializarEfectosLiquidGlass();
  crearFooter();

  try {
    const sesion = await obtenerSesion();
    estado.autenticado = Boolean(sesion.autenticado);
    estado.usuario = sesion.usuario ?? null;
    estado.consultado = true;
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 0) {
      avisar(error.message, 'error');
    }
  }

  pintarSesionEnNav();

  document.addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-cerrar-sesion]');
    if (!boton) return;
    boton.disabled = true;
    try {
      await cerrarSesion();
      avisar('Sesión cerrada correctamente.', 'exito');
      setTimeout(() => (window.location.href = 'index.html'), 500);
    } catch (error) {
      boton.disabled = false;
      avisar(error.message ?? 'No se pudo cerrar la sesión.', 'error');
    }
  });

  observarScroll();
  document.body.dataset.listo = 'true';
}

export function exigirSesion(accion = 'continuar') {
  if (estado.autenticado) return true;
  avisar(`Inicia sesión para ${accion}.`, 'info');
  setTimeout(() => (window.location.href = 'login.html'), 1200);
  return false;
}
