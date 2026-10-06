/**
 * Alta de cuenta contra la API.
 *
 * Aqui estan las reglas que el backend vuelve a comprobar. Repetirlas aqui no
 * es desconfianza del servidor: es para poder responder al instante y con el
 * mensaje exacto en el campo que corresponde, sin una ida y vuelta por red.
 * El backend sigue siendo quien decide.
 */
import { registrarCuenta, listarProgramas, ErrorApi } from './api.js';
import { avisar } from './main.js';

const formulario = document.getElementById('formRegistro');
const boton = document.getElementById('botonRegistro');
const errorGeneral = document.getElementById('error-general');
const campoContrasena = document.getElementById('contrasena');

const CAMPOS = [
  'nombre',
  'apellidos',
  'correo',
  'documento',
  'telefono',
  'fecha_nacimiento',
  'programa_id',
  'contrasena',
  'confirmar',
  'acepta_terminos',
];

/* ------------------------------------------------------------------ *
 * Programas: se piden al servidor, no se escriben en el HTML. Asi el
 * desplegable ofrece lo que existe de verdad y no una lista que se
 * queda vieja en cuanto la base de datos cambie.
 * ------------------------------------------------------------------ */
async function cargarProgramas() {
  const select = document.getElementById('programa_id');
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
    avisar('No se pudieron cargar los programas. Puedes crear la cuenta sin elegir uno.', 'info');
  }
}

/* ------------------------------------------------------------------ *
 * Validacion
 * ------------------------------------------------------------------ */
function limpiarErrores() {
  errorGeneral.textContent = '';
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

/** Devuelve la lista de reglas que la contrasena NO cumple todavia. */
function reglasPendientes(valor) {
  const pendientes = [];
  if (valor.length < 10 || valor.length > 128) pendientes.push('largo');
  if (!/[a-záéíóúñ]/.test(valor)) pendientes.push('minuscula');
  if (!/[A-ZÁÉÍÓÚÑ]/.test(valor)) pendientes.push('mayuscula');
  if (!/[0-9]/.test(valor)) pendientes.push('digito');
  if (!/[^A-Za-z0-9]/.test(valor)) pendientes.push('simbolo');
  return pendientes;
}

function pintarReglas() {
  const pendientes = new Set(reglasPendientes(campoContrasena.value));
  for (const item of document.querySelectorAll('[data-regla]')) {
    // aria-hidden en el interior para que el lector de pantalla no lea la
    // regla entera cuando el usuario va con el teclado.
    item.classList.toggle('cumple', !pendientes.has(item.dataset.regla));
  }
}

campoContrasena.addEventListener('input', pintarReglas);

/* ------------------------------------------------------------------ *
 * Envio
 * ------------------------------------------------------------------ */
formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarErrores();

  const valor = {
    nombre: document.getElementById('nombre').value.trim(),
    apellidos: document.getElementById('apellidos').value.trim(),
    correo: document.getElementById('correo').value.trim(),
    documento: document.getElementById('documento').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
    programa_id: document.getElementById('programa_id').value,
    contrasena: campoContrasena.value,
    confirmar: document.getElementById('confirmar').value,
    acepta_terminos: document.getElementById('acepta_terminos').checked,
  };

  let primerFallo = null;
  const fallar = (campo, mensaje) => {
    marcarError(campo, mensaje);
    primerFallo ??= campo;
  };

  // El backend solo admite letras, espacios, apostrofos, guiones y puntos en
  // el nombre. Aqui se comprueba lo mismo para señalar el campo concreto en
  // lugar de dejar que el servidor responda con un error generico.
  const PATRON_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;

  if (!valor.nombre) fallar('nombre', 'Escribe tu nombre.');
  else if (valor.nombre.length < 2) fallar('nombre', 'El nombre es demasiado corto.');
  else if (!PATRON_NOMBRE.test(valor.nombre)) {
    fallar('nombre', 'El nombre solo admite letras, espacios, apostrofos, guiones y puntos.');
  }
  if (!valor.apellidos) fallar('apellidos', 'Escribe tus apellidos.');
  else if (valor.apellidos.length < 2) fallar('apellidos', 'Los apellidos son demasiado cortos.');
  else if (!PATRON_NOMBRE.test(valor.apellidos)) {
    fallar('apellidos', 'Los apellidos solo admiten letras, espacios, apostrofos, guiones y puntos.');
  }
  if (!valor.correo) fallar('correo', 'Escribe tu correo electronico.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.correo)) {
    fallar('correo', 'Ese correo no tiene un formato valido.');
  }
  if (valor.documento && !/^[\d-]{6,20}$/.test(valor.documento)) {
    fallar('documento', 'El documento solo admite digitos y guiones.');
  }
  if (valor.telefono && !/^\+?[\d\s()-]{7,20}$/.test(valor.telefono)) {
    fallar('telefono', 'Ese telefono no tiene un formato valido.');
  }

  const pendientes = reglasPendientes(valor.contrasena);
  if (valor.contrasena && pendientes.length) {
    fallar('contrasena', 'La contrasena todavia no cumple todas las reglas de arriba.');
  }
  if (valor.contrasena !== valor.confirmar) {
    fallar('confirmar', 'Las contrasenas no coinciden.');
  }
  if (!valor.acepta_terminos) {
    fallar('acepta_terminos', 'Tienes que aceptar los terminos para crear la cuenta.');
  }

  if (primerFallo) {
    document.getElementById(primerFallo)?.focus();
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Creando cuenta...';

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

    avisar('Cuenta creada. Te llevamos al inicio de sesion.', 'exito');
    // Se lleva el correo en la query para prellenar el formulario siguiente.
    // El correo no es un secreto: viaja en la barra de direcciones y queda en
    // el historial del navegador. Por eso no se manda la contrasena de ninguna
    // manera.
    setTimeout(() => {
      window.location.href = `login.html?correo=${encodeURIComponent(valor.correo)}`;
    }, 900);
  } catch (error) {
    boton.disabled = false;
    boton.textContent = 'Crear mi cuenta';

    if (error instanceof ErrorApi && error.codigo === 'datos_no_disponibles') {
      // El backend no dice si fue el correo o el documento. El formulario lo
      // refleja sin inventar: ambos podrian estar en uso.
      marcarError('correo', error.message);
      document.getElementById('documento')?.setAttribute('aria-invalid', 'true');
    } else if (error.codigo === 'contrasena_debil' && Array.isArray(error.detalles)) {
      marcarError('contrasena', error.detalles.join('. ') + '.');
    } else if (error.codigo === 'programa_invalido') {
      marcarError('programa_id', error.message);
    } else if (error.codigo === 'terminos_obligatorios') {
      marcarError('acepta_terminos', error.message);
    } else if (error.estado === 429) {
      errorGeneral.textContent = error.message;
    } else {
      errorGeneral.textContent = error.message;
    }
  }
});

/* ------------------------------------------------------------------ *
 * Detalles menores
 * ------------------------------------------------------------------ */
document.querySelectorAll('[data-ver-contrasena]').forEach((botonVer) => {
  botonVer.addEventListener('click', () => {
    const input = document.getElementById(botonVer.dataset.verContrasena);
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    botonVer.textContent = visible ? 'Ver' : 'Ocultar';
    botonVer.setAttribute('aria-label', visible ? 'Mostrar la contrasena' : 'Ocultar la contrasena');
    input.focus();
  });
});

// Si se llega desde el alta con ?correo=..., se rellena el campo.
const correoPretestado = new URLSearchParams(window.location.search).get('correo');
if (correoPretestado) {
  const campo = document.getElementById('correo');
  campo.value = correoPretestado;
  document.getElementById('contrasena').focus();
}

cargarProgramas();
pintarReglas();
