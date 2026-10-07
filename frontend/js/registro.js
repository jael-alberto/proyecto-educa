/**
 * Registro de cuenta - Sistema Educa
 * Validación local con feedback visual en tiempo real (reglas de contraseña).
 */
import { registrarCuenta, listarProgramas, ErrorApi } from './api.js';
import { avisar } from './main.js';

const formulario = document.getElementById('formRegistro');
const boton = document.getElementById('botonRegistro');
const errorGeneral = document.getElementById('error-general');
const campoContrasena = document.getElementById('contrasena');

const CAMPOS = [
  'nombre', 'apellidos', 'correo', 'documento', 'telefono',
  'fecha_nacimiento', 'programa_id', 'contrasena', 'confirmar', 'acepta_terminos',
];

/* ------------------------------------------------------------------ *
 * Programas del servidor (o fallback de la semilla local)
 * ------------------------------------------------------------------ */
async function cargarProgramas() {
  const select = document.getElementById('programa_id');
  if (!select) return;
  try {
    const programas = await listarProgramas();
    for (const programa of programas) {
      const opcion = document.createElement('option');
      opcion.value = String(programa.id);
      opcion.textContent = `${programa.nombre} · ${programa.facultad}`;
      select.appendChild(opcion);
    }
    if (!programas.length) {
      avisar('No se pudieron cargar los programas. Puedes crear la cuenta sin elegir uno.', 'info');
    }
  } catch {
    avisar('No se pudieron cargar los programas. Puedes continuar sin seleccionar uno.', 'info');
  }
}

/* ------------------------------------------------------------------ *
 * Utilidades de validación y errores
 * ------------------------------------------------------------------ */
function limpiarErrores() {
  if (errorGeneral) errorGeneral.textContent = '';
  for (const campo of CAMPOS) {
    const destino = document.getElementById(`error-${campo}`);
    if (destino) destino.textContent = '';
    document.getElementById(campo)?.removeAttribute('aria-invalid');
  }
}

function marcarError(campo, mensaje) {
  const destino = document.getElementById(`error-${campo}`);
  if (destino) destino.textContent = mensaje;
  document.getElementById(campo)?.setAttribute('aria-invalid', 'true');
}

/** Reglas que la contraseña aún NO cumple */
function reglasPendientes(valor) {
  const pendientes = [];
  if (valor.length < 10 || valor.length > 128) pendientes.push('largo');
  if (!/[a-záéíóúñü]/.test(valor)) pendientes.push('minuscula');
  if (!/[A-ZÁÉÍÓÚÑÜ]/.test(valor)) pendientes.push('mayuscula');
  if (!/[0-9]/.test(valor)) pendientes.push('digito');
  if (!/[^A-Za-z0-9]/.test(valor)) pendientes.push('simbolo');
  return pendientes;
}

function pintarReglas() {
  if (!campoContrasena) return;
  const pendientes = new Set(reglasPendientes(campoContrasena.value));
  for (const item of document.querySelectorAll('[data-regla]')) {
    item.classList.toggle('cumple', !pendientes.has(item.dataset.regla));
  }
}

campoContrasena?.addEventListener('input', pintarReglas);

/* ------------------------------------------------------------------ *
 * Envío del formulario
 * ------------------------------------------------------------------ */
if (formulario) {
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarErrores();

    const valor = {
      nombre: document.getElementById('nombre')?.value.trim() ?? '',
      apellidos: document.getElementById('apellidos')?.value.trim() ?? '',
      correo: document.getElementById('correo')?.value.trim() ?? '',
      documento: document.getElementById('documento')?.value.trim() ?? '',
      telefono: document.getElementById('telefono')?.value.trim() ?? '',
      fecha_nacimiento: document.getElementById('fecha_nacimiento')?.value ?? '',
      programa_id: document.getElementById('programa_id')?.value ?? '',
      contrasena: campoContrasena?.value ?? '',
      confirmar: document.getElementById('confirmar')?.value ?? '',
      acepta_terminos: document.getElementById('acepta_terminos')?.checked ?? false,
    };

    let primerFallo = null;
    const fallar = (campo, mensaje) => {
      marcarError(campo, mensaje);
      primerFallo ??= campo;
    };

    const PATRON_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;

    if (!valor.nombre) fallar('nombre', 'Escribe tu nombre.');
    else if (valor.nombre.length < 2) fallar('nombre', 'El nombre es demasiado corto.');
    else if (!PATRON_NOMBRE.test(valor.nombre)) {
      fallar('nombre', 'El nombre solo admite letras, espacios, apóstrofes, guiones y puntos.');
    }

    if (!valor.apellidos) fallar('apellidos', 'Escribe tus apellidos.');
    else if (valor.apellidos.length < 2) fallar('apellidos', 'Los apellidos son demasiado cortos.');
    else if (!PATRON_NOMBRE.test(valor.apellidos)) {
      fallar('apellidos', 'Los apellidos solo admiten letras, espacios, apóstrofes, guiones y puntos.');
    }

    if (!valor.correo) fallar('correo', 'Escribe tu correo electrónico.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.correo)) {
      fallar('correo', 'Ese correo no tiene un formato válido.');
    }

    if (valor.documento && !/^[\d-]{6,20}$/.test(valor.documento)) {
      fallar('documento', 'El documento solo admite dígitos y guiones.');
    }

    if (valor.telefono && !/^\+?[\d\s()-]{7,20}$/.test(valor.telefono)) {
      fallar('telefono', 'Ese teléfono no tiene un formato válido.');
    }

    const pendientes = reglasPendientes(valor.contrasena);
    if (!valor.contrasena) {
      fallar('contrasena', 'Escribe una contraseña.');
    } else if (pendientes.length) {
      fallar('contrasena', 'La contraseña todavía no cumple todas las reglas indicadas.');
    }

    if (valor.contrasena !== valor.confirmar) {
      fallar('confirmar', 'Las contraseñas no coinciden.');
    }

    if (!valor.acepta_terminos) {
      fallar('acepta_terminos', 'Debes aceptar los términos para crear la cuenta.');
    }

    if (primerFallo) {
      document.getElementById(primerFallo)?.focus();
      return;
    }

    boton.disabled = true;
    boton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      Creando tu cuenta...`;

    try {
      await registrarCuenta({
        nombre: valor.nombre,
        apellidos: valor.apellidos,
        correo: valor.correo,
        documento: valor.documento || undefined,
        telefono: valor.telefono || undefined,
        fecha_nacimiento: valor.fecha_nacimiento || undefined,
        programa_id: valor.programa_id || undefined,
        contrasena: valor.contrasena,
        acepta_terminos: true,
      });

      avisar('✦ Cuenta creada con éxito. ¡Bienvenido a Sistema Educa!', 'exito');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 900);
    } catch (error) {
      boton.disabled = false;
      boton.innerHTML = `Crear mi cuenta gratis <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

      if (error instanceof ErrorApi && error.codigo === 'datos_no_disponibles') {
        marcarError('correo', error.message);
        document.getElementById('documento')?.setAttribute('aria-invalid', 'true');
      } else if (error.codigo === 'contrasena_debil' && Array.isArray(error.detalles)) {
        marcarError('contrasena', error.detalles.join('. ') + '.');
      } else if (error.codigo === 'programa_invalido') {
        marcarError('programa_id', error.message);
      } else if (error.codigo === 'terminos_obligatorios') {
        marcarError('acepta_terminos', error.message);
      } else {
        if (errorGeneral) errorGeneral.textContent = error.message || 'No se pudo crear la cuenta. Inténtalo de nuevo.';
      }
    }
  });
}

/* ------------------------------------------------------------------ *
 * Ver / ocultar contraseña
 * ------------------------------------------------------------------ */
document.querySelectorAll('[data-ver-contrasena]').forEach((botonVer) => {
  botonVer.addEventListener('click', () => {
    const id = botonVer.dataset.verContrasena;
    const input = id ? document.getElementById(id) : campoContrasena;
    if (!input) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    botonVer.textContent = visible ? 'Ver' : 'Ocultar';
    botonVer.setAttribute('aria-label', visible ? 'Mostrar la contraseña' : 'Ocultar la contraseña');
    input.focus();
  });
});

/* ------------------------------------------------------------------ *
 * Prerrellenar correo si viene de registro exitoso
 * ------------------------------------------------------------------ */
const correoPretestado = new URLSearchParams(window.location.search).get('correo');
if (correoPretestado) {
  const campo = document.getElementById('correo');
  if (campo) campo.value = correoPretestado;
  campoContrasena?.focus();
}

cargarProgramas();
pintarReglas();
