/**
 * Inicio de sesión con soporte Liquid Glass UI.
 * - Auto-relleno al hacer click en las cuentas de demostración
 * - Validación local instantánea con feedback en campos
 */
import { iniciarSesion } from './api.js';
import { avisar } from './main.js';

const formulario = document.getElementById('formLogin');
const boton = document.getElementById('botonEntrar');
const errorGeneral = document.getElementById('error-general');
const campoCorreo = document.getElementById('correo');
const campoContrasena = document.getElementById('contrasena');

function limpiarErrores() {
  if (errorGeneral) errorGeneral.textContent = '';
  for (const id of ['error-correo', 'error-contrasena']) {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  }
  campoCorreo?.removeAttribute('aria-invalid');
  campoContrasena?.removeAttribute('aria-invalid');
}

function marcarError(campo, mensaje) {
  const destino = document.getElementById(`error-${campo}`);
  if (destino) destino.textContent = mensaje;
  const input = campo === 'correo' ? campoCorreo : campoContrasena;
  input?.setAttribute('aria-invalid', 'true');
}

if (formulario) {
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarErrores();

    const correo = campoCorreo.value.trim();
    const contrasena = campoContrasena.value;

    if (!correo) return marcarError('correo', 'Escribe tu correo electrónico.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
      return marcarError('correo', 'Ese correo no tiene un formato válido.');
    }
    if (!contrasena) return marcarError('contrasena', 'Escribe tu contraseña.');

    boton.disabled = true;
    boton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      Verificando...`;

    try {
      const datos = await iniciarSesion(correo, contrasena);
      avisar(`Bienvenido de nuevo, ${datos.usuario.nombre}. ✦`, 'exito');
      setTimeout(() => (window.location.href = 'dashboard.html'), 600);
    } catch (error) {
      boton.disabled = false;
      boton.innerHTML = `Entrar al Campus <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

      if (error.codigo === 'credenciales_invalidas') {
        marcarError('contrasena', error.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
      } else if (error.codigo === 'throttling') {
        errorGeneral.textContent = error.message;
      } else if (error.estado === 422) {
        errorGeneral.textContent = 'Revisa el correo y la contraseña.';
      } else {
        errorGeneral.textContent = error.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.';
      }
    }
  });
}

// Botón ver/ocultar contraseña
document.querySelectorAll('[data-ver-contrasena]').forEach((botonVer) => {
  botonVer.addEventListener('click', () => {
    if (!campoContrasena) return;
    const visible = campoContrasena.type === 'text';
    campoContrasena.type = visible ? 'password' : 'text';
    botonVer.textContent = visible ? 'Ver' : 'Ocultar';
    botonVer.setAttribute('aria-label', visible ? 'Mostrar la contraseña' : 'Ocultar la contraseña');
    campoContrasena.focus();
  });
});

// Auto-rellenar formulario al hacer clic en cuentas de demostración
document.addEventListener('click', (e) => {
  const item = e.target.closest('[data-auto-correo]');
  if (!item) return;
  const correo = item.dataset.autoCorreo;
  const pass = item.dataset.autoPass;
  if (campoCorreo && correo) campoCorreo.value = correo;
  if (campoContrasena && pass) campoContrasena.value = pass;
  // Enfocar el botón de envío para facilitar el flujo
  if (boton) boton.focus();
  limpiarErrores();
  avisar('Cuenta de demostración cargada. Haz clic en Entrar.', 'info');
});
