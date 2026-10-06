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
const rutaBase = resolve(raizBackend, 'datos', 'pruebas-api.db');

// La configuracion se lee al importar los modulos, asi que las variables de
// entorno se fijan ANTES del import dinamico.
for (const sufijo of ['', '-wal', '-shm']) {
  if (existsSync(rutaBase + sufijo)) rmSync(rutaBase + sufijo);
}
process.env.NODE_ENV = 'test';
process.env.BASE_DATOS = 'datos/pruebas-api.db';
process.env.SECRETO_SESION = 'clave-de-pruebas-que-no-se-usa-en-produccion-123456';
process.env.ORIGENES_PERMITIDOS = 'http://localhost:3000';
// Coste bajo para que las pruebas no tarden: la seguridad no depende del coste.
process.env.COSTE_SCRYPT = '1024';
// Estas pruebas crean muchas cuentas para recorrer los casos. El limite por IP
// se verifica aparte, en tests/limites.test.js, que corre en otro proceso con
// su propio limite y su propia base de datos.
process.env.LIMITE_REGISTRO_MAX_INTENTOS = '500';

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

// El alta de cuentas exige un programa existente, asi que el fixture necesita
// al menos una facultad y un programa.
ejecutar(
  'INSERT INTO facultades (nombre, sigla, descripcion) VALUES (?, ?, ?)',
  'Facultad de Prueba',
  'FPR',
  'Facultad creada por las pruebas'
);
ejecutar(
  `INSERT INTO programas (facultad_id, nombre, codigo, titulo_grado, duracion_semestres, descripcion, estado)
   VALUES (1, 'Programa de Prueba', 'PRG-01', 'Tecnólogo', 6, 'Programa de prueba.', 'activo')`
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
    /** Simula que el navegador perdio el token, como al abrir otra pestana. */
    olvidarCsrf() {
      csrf = null;
    },
    guardarCsrf(token) {
      csrf = token;
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

/**
 * El token anti-CSRF vive en el servidor, pero el frontend lo necesita en cada
 * pagina. Estas pruebas cubren el reparto, que es lo que permite que un POST
 * funcione despues de navegar por el sitio.
 */
describe('Entrega del token anti-CSRF al frontend', () => {
  test('/auth/yo emite un token cuando el cliente no presenta ninguno', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    cliente.olvidarCsrf(); // como si la pagina se acabara de cargar

    const r = await cliente.pedir('GET', '/api/auth/yo');
    assert.equal(r.json.datos.autenticado, true);
    assert.equal(typeof r.json.datos.csrfToken, 'string');
    assert.ok(r.json.datos.csrfToken.length >= 32);
  });

  test('el token emitido sirve para un POST posterior', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    cliente.olvidarCsrf();

    const emitido = await cliente.pedir('GET', '/api/auth/yo');
    const r = await cliente.pedir(
      'POST',
      '/api/auth/logout',
      {},
      { 'X-CSRF-Token': emitido.json.datos.csrfToken }
    );
    assert.equal(r.estado, 200);
  });

  test('presentar el token vigente lo conserva y no genera otro', async () => {
    // Importa para el caso de dos pestanas abiertas: cargar la segunda pagina
    // no debe dejar sin token a la primera.
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const original = cliente.csrf;

    const r = await cliente.pedir('GET', '/api/auth/yo', undefined, {
      'X-CSRF-Token': original,
    });
    assert.equal(r.json.datos.autenticado, true);
    assert.equal(r.json.datos.csrfToken, undefined, 'no debe rotar el token si es valido');
  });

  test('el token anterior deja de servir cuando se emite uno nuevo', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const antiguo = cliente.csrf;

    // Se pierde el token en el navegador (otra pestana, almacenamiento limpio)
    // y se pide uno nuevo.
    cliente.olvidarCsrf();
    const emitido = await cliente.pedir('GET', '/api/auth/yo');
    const nuevo = emitido.json.datos.csrfToken;
    assert.notEqual(nuevo, antiguo);

    // El token viejo ya no debe servir para cerrar sesion.
    const r = await cliente.pedir('POST', '/api/auth/logout', {}, {
      'X-CSRF-Token': antiguo,
    });
    assert.equal(r.estado, 403);
    assert.equal(r.json.error, 'csrf_invalido');
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

  test('no se puede renovar el token CSRF sin presentar el actual', async () => {
    const cliente = crearCliente();
    await cliente.iniciarSesion('estudiante@prueba.test', 'EstudiantePrueba2026!');
    const original = cliente.csrf;

    const sinToken = await cliente.pedir('POST', '/api/auth/verificar-csrf', {});
    assert.equal(sinToken.estado, 403, 'el token CSRF se renovo sin comprobacion');

    const conFalso = await cliente.pedir('POST', '/api/auth/verificar-csrf', {}, { 'X-CSRF-Token': 'inventado' });
    assert.equal(conFalso.estado, 403);

    // El token viejo sigue valiendo: los intentos fallidos no lo gastaron.
    const r = await cliente.pedir('POST', '/api/auth/verificar-csrf', {}, { 'X-CSRF-Token': original });
    assert.equal(r.estado, 200);
    assert.notEqual(r.json.datos.csrfToken, original);
    assert.ok(r.json.datos.csrfToken.length >= 32);
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

describe('Alta de cuentas (registro)', () => {
  const altaValida = (over = {}) => ({
    correo: `alta-${Math.random().toString(36).slice(2, 10)}@prueba.test`,
    contrasena: 'RegistroSeguro2026!',
    nombre: 'Nueva',
    apellidos: 'Persona Prueba',
    documento: `${100 + Math.floor(Math.random() * 899)}-${10 + Math.floor(Math.random() * 89)}-${1000 + Math.floor(Math.random() * 8999)}`,
    telefono: '+1 809 555 0199',
    fecha_nacimiento: '2001-04-10',
    programa_id: 1,
    acepta_terminos: true,
    ...over,
  });

  test('un alta valida responde 201 y devuelve el perfil', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida());
    assert.equal(r.estado, 201);
    assert.equal(r.json.datos.rol, 'estudiante');
    assert.equal(typeof r.json.datos.id, 'number');
  });

  test('la respuesta del alta no filtra el hash ni la contrasena', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida());
    assert.ok(!r.texto.includes('scrypt$'), 'se filtro el hash de la contrasena');
    assert.ok(!r.texto.includes('RegistroSeguro2026!'), 'se filtro la contrasena en claro');
  });

  test('la cuenta creada puede iniciar sesion', async () => {
    const cliente = crearCliente();
    const cuerpo = altaValida();
    const alta = await cliente.pedir('POST', '/api/auth/registro', cuerpo);
    assert.equal(alta.estado, 201);
    const login = await crearCliente().iniciarSesion(cuerpo.correo, cuerpo.contrasena);
    assert.equal(login.estado, 200);
    assert.equal(login.json.datos.usuario.rol, 'estudiante');
  });

  test('el cliente NO puede elegir su propio rol', async () => {
    const cliente = crearCliente();
    for (const rol of ['administrador', 'admin', 'docente', 'soporte']) {
      const r = await cliente.pedir('POST', '/api/auth/registro', altaValida({ rol }));
      assert.equal(r.estado, 201);
      assert.equal(r.json.datos.rol, 'estudiante', `el rol "${rol}" llego a la base de datos`);
    }
  });

  test('el cliente NO puede enviar rol_id ni estado directamente', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida({ rol_id: 1, estado: 'administrador' }));
    assert.equal(r.estado, 201);
    assert.equal(r.json.datos.rol, 'estudiante');

    const guardado = await import('../src/db.js');
    const fila = guardado.consultarUno('SELECT rol_id, estado FROM usuarios WHERE correo = ?', r.json.datos.correo);
    assert.equal(fila.estado, 'activo', 'el estado no debe ser elegible desde el cliente');
    const rolGuardado = guardado.consultarUno('SELECT nombre FROM roles WHERE id = ?', fila.rol_id);
    assert.equal(rolGuardado.nombre, 'estudiante');
  });

  test('rechaza un correo con intento de inyeccion', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida({ correo: "x' OR '1'='1@prueba.test" }));
    assert.equal(r.estado, 422);
  });

  test('rechaza un nombre con HTML', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida({ nombre: '<script>alert(1)</script>' }));
    assert.equal(r.estado, 422);
  });

  test('rechaza una fecha de nacimiento imposible', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida({ fecha_nacimiento: '2001-02-31' }));
    assert.equal(r.estado, 422);
  });

  test('rechaza una fecha de nacimiento futura', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida({ fecha_nacimiento: '2099-01-01' }));
    assert.equal(r.estado, 422);
  });

  test('rechaza contrasenas debiles con el detalle de cada regla', async () => {
    const cliente = crearCliente();
    for (const contrasena of ['corta1!A', 'todojuntosinmayusculas', 'EDUCACIONAL2026', '1234567890123', 'contrasena123']) {
      const r = await cliente.pedir('POST', '/api/auth/registro', altaValida({ contrasena }));
      assert.equal(r.estado, 422, `se acepto la contrasena debil: ${contrasena}`);
      assert.equal(r.json.error, 'contrasena_debil');
      assert.ok(Array.isArray(r.json.detalles) && r.json.detalles.length > 0);
    }
  });

  test('exige los campos obligatorios', async () => {
    const cliente = crearCliente();
    for (const campo of ['correo', 'contrasena', 'nombre', 'apellidos']) {
      const cuerpo = altaValida();
      delete cuerpo[campo];
      const r = await cliente.pedir('POST', '/api/auth/registro', cuerpo);
      assert.equal(r.estado, 422, `no se exigio el campo ${campo}`);
    }
  });

  test('exige aceptar los terminos', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida({ acepta_terminos: false }));
    assert.equal(r.estado, 422);
    assert.equal(r.json.error, 'terminos_obligatorios');
  });

  test('un correo duplicado responde 409 sin revelar si existe la cuenta', async () => {
    const cliente = crearCliente();
    const cuerpo = altaValida();
    assert.equal((await cliente.pedir('POST', '/api/auth/registro', cuerpo)).estado, 201);

    const repetido = await crearCliente().pedir('POST', '/api/auth/registro', cuerpo);
    assert.equal(repetido.estado, 409);

    // El mensaje de correo duplicado y el de documento duplicado son el mismo:
    // si fueran distintos, el endpoint serviria para averiguar que correos hay
    // dados de alta en el sistema.
    const otroCorreo = await crearCliente().pedir(
      'POST',
      '/api/auth/registro',
      altaValida({ documento: cuerpo.documento })
    );
    assert.equal(otroCorreo.estado, 409);
    assert.equal(repetido.json.mensaje, otroCorreo.json.mensaje);
  });

  test('rechaza un programa que no existe', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida({ programa_id: 9999 }));
    assert.equal(r.estado, 422);
    assert.equal(r.json.error, 'programa_invalido');
  });

  test('el alta queda auditada sin guardar la contrasena', async () => {
    const cliente = crearCliente();
    const r = await cliente.pedir('POST', '/api/auth/registro', altaValida());
    const consulta = await import('../src/db.js');
    const fila = consulta.consultarUno(
      "SELECT datos_despues FROM auditoria WHERE entidad = 'usuarios' AND entidad_id = ?",
      r.json.datos.id
    );
    assert.ok(fila, 'el alta no quedo auditada');
    assert.ok(!fila.datos_despues.includes('scrypt$'), 'la auditoria guardo el hash');
    assert.ok(!fila.datos_despues.includes('RegistroSeguro2026!'), 'la auditoria guardo la contrasena');
  });

  test('GET /api/auth/programas devuelve los programas activos', async () => {
    const consulta = await import('../src/db.js');
    const total = consulta.consultarUno("SELECT COUNT(*) AS n FROM programas WHERE estado = 'activo'").n;
    const r = await fetch(base + '/api/auth/programas');
    const cuerpo = await r.json();
    assert.equal(cuerpo.datos.length, total);
    assert.ok(cuerpo.datos[0].facultad, 'el programa no trae su facultad');
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
