/**
 * Inicio de sesion contra la API.
 *
 * Antes, este formulario daba por buena cualquier correo y guardaba el nombre
 * en localStorage: con escribir un correo ya estabas "dentro". Ahora la
 * decision la toma el servidor, que es el unico que tiene la contrasena.
 */
import { iniciarSesion } from './api.js';
import { avisar } from './main.js';

const formulario = document.getElementById('formLogin');
const boton = document.getElementById('botonEntrar');
const errorGeneral = document.getElementById('error-general');
const campoCorreo = document.getElementById('correo');
const campoContrasena = document.getElementById('contrasena');

function limpiarErrores() {
  errorGeneral.textContent = '';
  for (const id of ['error-correo', 'error-contrasena']) {
    document.getElementById(id).textContent = '';
  }
  campoCorreo.removeAttribute('aria-invalid');
  campoContrasena.removeAttribute('aria-invalid');
}

function marcarError(campo, mensaje) {
  const destino = document.getElementById(`error-${campo}`);
  if (destino) destino.textContent = mensaje;
  const input = campo === 'correo' ? campoCorreo : campoContrasena;
  input.setAttribute('aria-invalid', 'true');
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarErrores();

  const correo = campoCorreo.value.trim();
  const contrasena = campoContrasena.value;

  // El navegador ya valida el formato del correo, pero se comprueba aqui para
  // poder señalar el campo concreto y no dejar que se envie una peticion tonta.
  if (!correo) return marcarError('correo', 'Escribe tu correo electronico.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    return marcarError('correo', 'Ese correo no tiene un formato valido.');
  }
  if (!contrasena) return marcarError('contrasena', 'Escribe tu contrasena.');

  boton.disabled = true;
  boton.textContent = 'Entrando...';

  try {
    const datos = await iniciarSesion(correo, contrasena);
    avisar(`Hola, ${datos.usuario.nombre}. Sesion iniciada.`, 'exito');
    // iniciarSesion ya guardo el token anti-CSRF. No se guarda nada mas: ni la
    // contrasena, ni el token de sesion (que va en una cookie HttpOnly y aqui
    // ni siquiera existe).
    setTimeout(() => (window.location.href = 'index.html'), 500);
  } catch (error) {
    boton.disabled = false;
    boton.textContent = 'Entrar';

    if (error.codigo === 'credenciales_invalidas') {
      // El backend responde siempre el mismo mensaje, exista o no el correo,
      // para no permitir averiguar que correos estan registrados.
      marcarError('contrasena', error.message);
    } else if (error.codigo === 'throttling') {
      errorGeneral.textContent = error.message;
    } else if (error.estado === 422) {
      errorGeneral.textContent = 'Revisa el correo y la contrasena.';
    } else {
      errorGeneral.textContent = error.message;
    }
  }
});

// Mostrar u ocultar la contrasena. Un boton de texto en vez de un icono: se
// entiende sin avoir que adivinar, y un icono sin etiqueta no lo anuncia el
// lector de pantalla.
document.querySelectorAll('[data-ver-contrasena]').forEach((botonVer) => {
  botonVer.addEventListener('click', () => {
    const visible = campoContrasena.type === 'text';
    campoContrasena.type = visible ? 'password' : 'text';
    botonVer.textContent = visible ? 'Ver' : 'Ocultar';
    botonVer.setAttribute('aria-label', visible ? 'Mostrar la contrasena' : 'Ocultar la contrasena');
    campoContrasena.focus();
  });
});
