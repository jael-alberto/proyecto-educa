/**
 * Comportamiento comun a todas las paginas: navegacion, sesion, avisos y
 * animaciones de entrada.
 *
 * El HTML de cada pagina es estatico y no lleva datos. Todo lo que depende de
 * quien ha entrado se pinta desde aqui, despues de preguntar al backend.
 * Asi el navegador no decide nada sobre la sesion: solo refleja lo que el
 * servidor responde.
 */
import { obtenerSesion, cerrarSesion, escaparHtml, ErrorApi } from './api.js';

/** Estado de la sesion en esta pagina. Lo consultan el resto de scripts. */
export const estado = { usuario: null, autenticado: false, consultado: false };

/* ------------------------------------------------------------------ *
 * Avisos accesibles
 * ------------------------------------------------------------------ */
let contenedorAvisos = null;

/**
 * Muestra un aviso. `role="status"` + `aria-live` hacen que un lector de
 * pantalla lo pronuncie, en vez de que el usuario se entere solo al mirar.
 */
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
  aviso.textContent = mensaje;
  contenedorAvisos.appendChild(aviso);
  setTimeout(() => aviso.remove(), 6000);
}

/* ------------------------------------------------------------------ *
 * Navegacion
 * ------------------------------------------------------------------ */
function pintarSesionEnNav() {
  const zona = document.querySelector('[data-zona-sesion]');
  if (!zona) return;

  if (estado.autenticado && estado.usuario) {
    const iniciales = escaparHtml(
      (estado.usuario.nombre ?? '?').trim().charAt(0).toUpperCase()
    );
    zona.innerHTML = `
      <details class="perfil">
        <summary aria-label="Abrir menu de ${escaparHtml(estado.usuario.nombre)}">
          <span class="avatar" aria-hidden="true">${iniciales}</span>
          <span class="perfil-nombre">${escaparHtml(estado.usuario.nombre)}</span>
        </summary>
        <div class="menu-perfil">
          <p class="nombre-perfil">${escaparHtml(estado.usuario.nombre)} ${escaparHtml(estado.usuario.apellidos ?? '')}</p>
          <p class="correo-perfil">${escaparHtml(estado.usuario.correo)}</p>
          <p class="rol-perfil">${escaparHtml(estado.usuario.rol ?? '')}</p>
          <button type="button" class="btn btn-outline btn-bloque" data-cerrar-sesion>Cerrar sesion</button>
        </div>
      </details>`;
  } else {
    zona.innerHTML = `
      <a href="login.html" class="btn-nav">Iniciar sesion</a>
      <a href="registro.html" class="btn btn-primario btn-pequeno">Crear cuenta</a>`;
  }
}

/* ------------------------------------------------------------------ *
 * Pie de pagina
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
          <p>Plataforma educativa con catalogo de cursos, seguimiento de matriculas y certificacion verificable.</p>
        </div>
        <div>
          <h4>Plataforma</h4>
          <ul>
            <li><a href="index.html">Inicio</a></li>
            <li><a href="cursos.html">Cursos</a></li>
            <li><a href="login.html">Iniciar sesion</a></li>
            <li><a href="registro.html">Crear cuenta</a></li>
          </ul>
        </div>
        <div>
          <h4>Cursos</h4>
          <ul>
            <li><a href="cursos.html">Ver todo el catalogo</a></li>
            <li><a href="cursos.html?dificultad=principiante">Principiante</a></li>
            <li><a href="cursos.html?modalidad=online">Online</a></li>
            <li><a href="cursos.html?modalidad=presencial">Presencial</a></li>
          </ul>
        </div>
        <div>
          <h4>Contacto</h4>
          <ul>
            <li>hola@educa.com</li>
            <li>+1 (809) 555-0134</li>
            <li>Santo Domingo, Republica Dominicana</li>
            <li>Lunes a viernes, 8:00 a 18:00</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">&copy; ${ANIO} Sistema Educa. Proyecto educativo de demostracion.</div>
    </div>`;
  document.body.appendChild(pie);
}

/* ------------------------------------------------------------------ *
 * Animaciones al hacer scroll
 * ------------------------------------------------------------------ */
function observarScroll() {
  // Si quien esta usando el sistema pidio menos movimiento, no se anima nada.
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
    { threshold: 0.12 }
  );
  objetivos.forEach((el) => observador.observe(el));
}

/* ------------------------------------------------------------------ *
 * Enlace a saltar al contenido: lo usan los lectores de pantalla y
 * el teclado. Es lo primero que aparece al tabular.
 * ------------------------------------------------------------------ */
function crearSaltoContenido() {
  if (document.querySelector('.salto-contenido')) return;
  const enlace = document.createElement('a');
  enlace.className = 'salto-contenido';
  enlace.href = '#contenido';
  enlace.textContent = 'Saltar al contenido principal';
  document.body.prepend(enlace);
}

/* ------------------------------------------------------------------ *
 * Arranque
 * ------------------------------------------------------------------ */
/**
 * Promesa que se resuelve cuando ya se sabe quien esta dentro.
 *
 * Los scripts de cada pagina la esperan para pintar lo que depende de la
 * sesion. Se resuelve siempre, tambien si el backend no respondio: en ese caso
 * `estado.consultado` sigue en false y `estado.autenticado` en false, que es
 * justo lo que necesita saber quien la espera.
 */
export const sesionLista = iniciar();

async function iniciar() {
  crearSaltoContenido();
  crearFooter();

  try {
    const sesion = await obtenerSesion();
    estado.autenticado = Boolean(sesion.autenticado);
    estado.usuario = sesion.usuario ?? null;
    estado.consultado = true;
  } catch (error) {
    // Sin backend no se cae la pagina: se muestra como visitante y se avisa.
    // `consultado` sigue en false, y por eso no se redirige a nadie: sin
    // respuesta del servidor no se puede afirmar que no hay sesion.
    if (error instanceof ErrorApi && error.estado === 0) avisar(error.message, 'error');
  }

  pintarSesionEnNav();

  document.addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-cerrar-sesion]');
    if (!boton) return;
    boton.disabled = true;
    try {
      await cerrarSesion();
      avisar('Sesion cerrada correctamente.', 'exito');
      setTimeout(() => (window.location.href = 'index.html'), 600);
    } catch (error) {
      boton.disabled = false;
      avisar(error.message ?? 'No se pudo cerrar la sesion.', 'error');
    }
  });

  observarScroll();
  document.body.dataset.listo = 'true';
}

/**
 * Comprueba si hay sesion antes de una accion que la necesita, como postular a
 * un curso.
 *
 * El catalogo es publico y se puede ver sin entrar, igual que en la API: los
 * endpoints de catalogo no exigen sesion. Lo que exige sesion es actuar sobre
 * los datos. Por eso esta funcion se llama desde un boton y no al cargar una
 * pagina.
 *
 * Si el backend no respondio, no se redirige a nadie: sin respuesta del
 * servidor no se puede afirmar que no hay sesion, y expulsar al visitante de una
 * pagina publica seria un error.
 */
export function exigirSesion(accion = 'continuar') {
  if (!estado.consultado) {
    avisar('No se pudo verificar la sesion. Intenta de nuevo en unos segundos.', 'error');
    return false;
  }
  if (estado.autenticado) return true;
  avisar(`Inicia sesion para ${accion}.`, 'info');
  setTimeout(() => (window.location.href = 'login.html'), 1400);
  return false;
}
