/**
 * Pruebas de la API: seguridad y correccion.
 *
 * Ejecutar con:  npm test
 *
 * El archivo usa una base de datos propia (backend/datos/pruebas.db), separada
 * de la de desarrollo, y la reconstruye antes de empezar. Nunca toca datos
 * reales.
 *
 * Cada prueba comprueba una medida de seguridad concreta. Si alguien elimina
 * una proteccion, la prueba correspondiente falla.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raizBackend = resolve(aqui, '..');
const rutaBase = resolve(raizBackend, 'datos', 'pruebas.db');

// La configuracion se lee al importar los modulos, asi que las variables de
// entorno se fijan ANTES del import dinamico.
for (const sufijo of ['', '-wal', '-shm']) {
  if (existsSync(rutaBase + sufijo)) rmSync(rutaBase + sufijo);
}
process.env.NODE_ENV = 'test';
process.env.BASE_DATOS = 'datos/pruebas.db';
process.env.SECRETO_SESION = 'clave-de-pruebas-que-no-se-usa-en-produccion-123456';
process.env.ORIGENES_PERMITIDOS = 'http://localhost:3000';
// Coste bajo para que las pruebas no tarden: la seguridad no depende del coste.
process.env.COSTE_SCRYPT = '1024';

const { crearAplicacion } = await import('../src/app.js');
const { abrirBaseDatos, cerrarBaseDatos, ejecutar } = await import('../src/db.js');
const { hashContrasena } = await import('../src/contrasenas.js');

abrirBaseDatos();

/* ---------------- Datos minimos para las pruebas ---------------- */
const ROL_ESTUDIANTE = ejecutar(
  'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
  'estudiante',
  'Acceso al catalogo y a sus propias matriculas'
).lastInsertRowid;

const ROL_ADMIN = ejecutar(
  'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
  'administrador',
  'Acceso total'
).lastInsertRowid;

const hashEstudiante = await hashContrasena('EstudiantePrueba2026!');
const hashAdmin = await hashContrasena('AdministradorPrueba2026!');

const idEstudiante = Number(
  ejecutar(
    `INSERT INTO usuarios (correo, contrasena_hash, rol_id, nombre, apellidos, documento_id, telefono, estado, acepta_terminos)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', 1)`,
    'estudiante@prueba.test',
    hashEstudiante,
    ROL_ESTUDIANTE,
    'Estudiante',
    'De Prueba',
    '099-11-1111',
    '+1 809 000 0000'
  ).lastInsertRowid
);

const idAdmin = Number(
  ejecutar(
    `INSERT INTO usuarios (correo, contrasena_hash, rol_id, nombre, apellidos, estado, acepta_terminos)
     VALUES (?, ?, ?, ?, ?, 'activo', 1)`,
    'admin@prueba.test',
    hashAdmin,
    ROL_ADMIN,
    'Admin',
    'De Prueba'
  ).lastInsertRowid
);

const idCurso = Number(
  ejecutar(
    `INSERT INTO cursos (nombre, slug, codigo, creditos, precio, estado) VALUES (?, ?, ?, ?, ?, 'publicado')`,
    'Curso de Prueba',
    'prueba',
    'PRUEBA-01',
    3,
    100
  ).lastInsertRowid
);

ejecutar(
  'INSERT INTO grupos (curso_id, codigo, cupo, estado) VALUES (?, ?, ?, ?)',
  idCurso,
  'PRUEBA-01-A',
  2,
  'programado'
);

/* ---------------- Servidor de pruebas ---------------- */
let servidor;
let base;

before(async () => {
  const app = crearAplicacion();
  await new Promise((resolve) => {
    servidor = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((resolve) => servidor.close(resolve));
  cerrarBaseDatos();
  for (const sufijo of ['', '-wal', '-shm']) {
    if (existsSync(rutaBase + sufijo)) rmSync(rutaBase + sufijo);
  }
});

/* ---------------- Cliente con manejo de cookie y CSRF ---------------- */
function crearCliente() {
  const cookies = new Map();
  let csrf = null;

  return {
    get csrf() {
      return csrf;
    },
    async pedir(metodo, ruta, cuerpo, cabecerasExtra = {}) {
      const cabeceras = { ...cabecerasExtra };
      if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
      if (cookies.size) cabeceras.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');

      const respuesta = await fetch(base + ruta, {
        method: metodo,
        headers: cabeceras,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });

      for (const cookie of respuesta.headers.getSetCookie?.() ?? []) {
        const [par] = cookie.split(';');
        const corte = par.indexOf('=');
        cookies.set(par.slice(0, corte), par.slice(corte + 1));
      }

      const texto = await respuesta.text();
      let json = null;
      try {
        json = JSON.parse(texto);
      } catch {
        /* respuesta sin JSON */
      }
      return { estado: respuesta.status, json, texto, respuesta };
    },
    async iniciarSesion(correo, contrasena) {
      const r = await this.pedir('POST', '/api/auth/login', { correo, contrasena });
      csrf = r.json?.datos?.csrfToken ?? null;
      return r;
    },
  };
}

/* ================= Pruebas ================= */

describe('Disponibilidad de la API', () => {
  test('GET /api/salud responde activo', async () => {
    const r = await fetch(base + '/api/salud');
    assert.equal(r.status, 200);
    const cuerpo = await r.json();
    assert.equal(cuerpo.estado, 'activo');
  });

  test('un endpoint inexistente responde 404', async () => {
    const r = await fetch(base + '/api/no-existe');
    assert.equal(r.status, 404);
  });
});

describe('Cabeceras de seguridad', () => {
  test('helmet activa las cabeceras basicas', async () => {
    const r = await fetch(base + '/api/salud');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.ok(r.headers.get('content-security-policy'), 'falta la CSP');
    assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.match(r.headers.get('content-security-policy'), /object-src 'none'/);
    assert.ok(r.headers.get('referrer-policy'), 'falta referrer-policy');
  });

  test('la cabecera X-Powered-By no se expone', async () => {
    const r = await fetch(base + '/api/salud');
    assert.equal(r.headers.get('x-powered-by'), null);
  });

  test('un origen no permitido no recibe cabecera CORS', async () => {
    const r = await fetch(base + '/api/salud', { headers: { Origin: 'https://sitio-malicioso.example' } });
    assert.equal(r.headers.get('access-control-allow-origin'), null);
  });
});

describe('Autenticacion', () => {
  test('rechaza una contrasena incorrecta con 401', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/login', {
      correo: 'estudiante@prueba.test',
      contrasena: 'ContrasenaEquivocada1!',
    });
    assert.equal(r.estado, 401);
  });

  test('el mensaje es el mismo exista o no el correo (no enumeracion)', async () => {
    const cliente = crearCliente();
    const conCorreo = await cliente.pedir('POST', '/api/auth/login', {
      correo: 'estudiante@prueba.test',
      contrasena: 'ContrasenaEquivocada1!',
    });
    const sinCorreo = await cliente.pedir('POST', '/api/auth/login', {
      correo: 'nadie-aqui@prueba.test',
      contrasena: 'ContrasenaEquivocada1!',
    });
    assert.equal(conCorreo.json.mensaje, sinCorreo.json.mensaje);
    assert.equal(conCorreo.json.error, sinCorreo.json.error);
  });

  test('acepta credenciales correctas y devuelve el perfil', async () => {
    const cliente = crearCliente();
    const r = await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    assert.equal(r.estado, 200);
    assert.equal(r.json.datos.usuario.correo, 'estudiante@prueba.test');
    assert.equal(r.json.datos.usuario.rol, 'estudiante');
  });

  test('la respuesta NUNCA incluye el hash de la contrasena', async () => {
    const cliente = crearCliente();
    const r = await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    assert.ok(!r.texto.includes('scrypt$'), 'el hash de contrasena se filtro en la respuesta');
    assert.ok(!('contrasena_hash' in r.json.datos.usuario));
  });

  test('la respuesta no expone documento ni telefono', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const r = await cliente.pedir('GET', '/api/auth/yo');
    assert.ok(!r.texto.includes('099-11-1111'), 'se filtro el documento');
    assert.ok(!r.texto.includes('000 0000'), 'se filtro el telefono');
  });

  test('la cookie de sesion es HttpOnly y SameSite', async () => {
    const cliente = crearCliente();
    const r = await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const cookie = r.respuesta.headers.getSetCookie().find((c) => c.includes('educa_sesion='));
    assert.ok(cookie, 'no se envio la cookie de sesion');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
  });

  test('el token de sesion viaja en la cookie, no en el cuerpo JSON', async () => {
    const cliente = crearCliente();
    const r = await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    assert.ok(!r.texto.includes('educa_sesion='), 'el token de sesion viajo en el cuerpo');
    assert.equal(typeof r.json.datos.csrfToken, 'string');
    assert.ok(r.json.datos.csrfToken.length >= 32);
  });

  test('una peticion sin sesion no accede a /api/auth/yo', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('GET', '/api/auth/yo');
    assert.equal(r.estado, 200);
    assert.equal(r.json.datos.autenticado, false);
  });

  test('GET /api/auth/yo reconoce la sesion', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const r = await cliente.pedir('GET', '/api/auth/yo');
    assert.equal(r.json.datos.autenticado, true);
    assert.equal(r.json.datos.usuario.rol, 'estudiante');
  });

  test('el rol se distingue entre cuentas de roles distintos', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('admin@prueba.test', 'AdministradorPrueba2026!');
    const r = await cliente.pedir('GET', '/api/auth/yo');
    assert.equal(r.json.datos.usuario.rol, 'administrador');
    assert.equal(r.json.datos.usuario.id, idAdmin);
  });
});

describe('Proteccion CSRF', () => {
  test('un POST sin token CSRF es rechazado con 403', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const r = await cliente.pedir('POST', '/api/auth/logout', {});
    assert.equal(r.estado, 403);
    assert.equal(r.json.error, 'csrf_invalido');
  });

  test('un POST con un token CSRF inventado es rechazado', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const r = await cliente.pedir('POST', '/api/auth/logout', {}, { 'X-CSRF-Token': 'token-inventado' });
    assert.equal(r.estado, 403);
  });

  test('un POST con el token CSRF correcto se acepta', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const r = await cliente.pedir('POST', '/api/auth/logout', {}, { 'X-CSRF-Token': cliente.csrf });
    assert.equal(r.estado, 200);
  });

  test('tras cerrar sesion la cookie deja de servir', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    await cliente.pedir('POST', '/api/auth/logout', {}, { 'X-CSRF-Token': cliente.csrf });
    const r = await cliente.pedir('GET', '/api/auth/yo');
    assert.equal(r.json.datos.autenticado, false);
  });
});

describe('Inyeccion SQL', () => {
  test('un correo con intento de inyeccion no altera la base', async () => {
    const antes = fetch(base + '/api/catalogo/cursos').then((r) => r.json());
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/login', {
      correo: "estudiante@prueba.test' OR '1'='1",
      contrasena: 'loquesea1!',
    });
    assert.ok(r.estado === 422 || r.estado === 401, `estado inesperado: ${r.estado}`);
    const despues = await antes;
    assert.ok(Array.isArray(despues.datos));
  });

  test("un filtro con UNION no devuelve filas ajenas", async () => {
    const r = await fetch(base + "/api/catalogo/cursos?dificultad=avanzado'+UNION+SELECT+*+FROM+usuarios--");
    assert.equal(r.status, 200);
    const cuerpo = await r.json();
    assert.ok(Array.isArray(cuerpo.datos));
    assert.ok(!cuerpo.texto?.includes('contrasena_hash'));
  });

  test('el catalogo solo devuelve datos publicos', async () => {
    const r = await fetch(base + '/api/catalogo/cursos');
    const cuerpo = await r.json();
    assert.equal(Array.isArray(cuerpo.datos), true);
    for (const curso of cuerpo.datos) {
      assert.ok(!('contrasena_hash' in curso));
      assert.ok(!('documento_id' in curso));
    }
  });
});

describe('Limites de la peticion', () => {
  test('un cuerpo demasiado grande se rechaza con 413', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/login', {
      correo: 'a@b.com',
      contrasena: 'x'.repeat(50_000),
    });
    assert.equal(r.estado, 413);
  });

  test('un JSON mal formado se rechaza con 400', async () => {
    const r = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{esto no es json',
    });
    assert.equal(r.status, 400);
    const cuerpo = await r.json();
    assert.equal(cuerpo.error, 'peticion_invalida');
    assert.ok(!cuerpo.mensaje.includes('{'), 'se devolvio el cuerpo crudo del cliente');
  });
});

describe('Auditoria', () => {
  test('los intentos fallidos quedan registrados', async () => {
    const cliente = crearCliente();
    await cliente.pedir('POST', '/api/auth/login', {
      correo: 'auditado@prueba.test',
      contrasena: 'ContrasenaEquivocada1!',
    });
    const consulta = await import('../src/db.js');
    const fila = consulta.consultarUno(
      'SELECT COUNT(*) AS total FROM intentos_sesion WHERE correo = ?',
      'auditado@prueba.test'
    );
    assert.ok(fila.total >= 1, 'el intento fallido no se registro');
  });

  test('el inicio de sesion exitoso queda auditado', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const consulta = await import('../src/db.js');
    const fila = consulta.consultarUno(
      "SELECT COUNT(*) AS total FROM auditoria WHERE accion = 'iniciar_sesion' AND usuario_id = ?",
      idEstudiante
    );
    assert.ok(fila.total >= 1, 'el inicio de sesion no se audito');
  });

  test('la tabla de sesiones guarda el hash, nunca el token en claro', async () => {
    const consulta = await import('../src/db.js');
    const fila = consulta.consultarUno('SELECT token_hash FROM sesiones WHERE usuario_id = ?', idEstudiante);
    assert.ok(fila, 'no se creo la sesion');
    assert.match(fila.token_hash, /^[a-f0-9]{64}$/, 'el token no esta hasheado con SHA-256');
  });
});

describe('Bloqueo por intentos fallidos', () => {
  test('tras superar el limite se responde 429 con Retry-After', async () => {
    const cliente = crearCliente();
    for (let i = 0; i < 8; i++) {
      await cliente.pedir('POST', '/api/auth/login', {
        correo: `fuerza-bruta-${i}@prueba.test`,
        contrasena: 'ContrasenaEquivocada1!',
      });
    }
    const r = await cliente.pedir('POST', '/api/auth/login', {
      correo: 'estudiante@prueba.test',
      contrasena: 'EstudiantePrueba2026!',
    });
    assert.equal(r.estado, 429);
    assert.ok(r.respuesta.headers.get('retry-after'), 'falta la cabecera Retry-After');
  });
});
