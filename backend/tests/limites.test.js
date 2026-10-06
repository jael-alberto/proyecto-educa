/**
 * Pruebas de los limites de peticiones.
 *
 * Corren en un archivo aparte, y por tanto en otro proceso, con su propia base
 * de datos y sus propios limites en memoria. Si compartieran proceso con
 * tests/api.test.js, el contador de esa suite (que se sube para poder crear
 * muchas cuentas) dejaria sin efecto a estas pruebas.
 *
 * Ejecutar con:  npm test
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raizBackend = resolve(aqui, '..');
const rutaBase = resolve(raizBackend, 'datos', 'pruebas-limites.db');

for (const sufijo of ['', '-wal', '-shm']) {
  if (existsSync(rutaBase + sufijo)) rmSync(rutaBase + sufijo);
}
process.env.NODE_ENV = 'test';
process.env.BASE_DATOS = 'datos/pruebas-limites.db';
process.env.SECRETO_SESION = 'clave-de-pruebas-que-no-se-usa-en-produccion-123456';
process.env.ORIGENES_PERMITIDOS = 'http://localhost:3000';
process.env.COSTE_SCRYPT = '1024';
// Valores bajos a proposito: la prueba debe rebotar en pocas peticiones.
process.env.LIMITE_REGISTRO_MAX_INTENTOS = '3';
process.env.LIMITE_REGISTRO_VENTANA_MINUTOS = '60';
process.env.LIMITE_GENERAL_MAX_PETICIONES = '15';
process.env.LIMITE_GENERAL_VENTANA_MINUTOS = '1';

const { crearAplicacion } = await import('../src/app.js');
const { abrirBaseDatos, ejecutar, cerrarBaseDatos } = await import('../src/db.js');
const { hashContrasena } = await import('../src/contrasenas.js');

abrirBaseDatos();

const ROL_ESTUDIANTE = ejecutar(
  'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
  'estudiante',
  'Acceso de estudiante'
).lastInsertRowid;

let servidor;
let base;

before(async () => {
  const hash = await hashContrasena('LimitesPrueba2026!');
  ejecutar(
    `INSERT INTO usuarios (correo, contrasena_hash, rol_id, nombre, apellidos, estado, acepta_terminos)
     VALUES ('existente@prueba.test', ?, ?, 'Existente', 'De Prueba', 'activo', 1)`,
    hash,
    ROL_ESTUDIANTE
  );

  const app = crearAplicacion();
  await new Promise((r) => {
    servidor = app.listen(0, '127.0.0.1', r);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((r) => servidor.close(r));
  cerrarBaseDatos();
  for (const sufijo of ['', '-wal', '-shm']) {
    if (existsSync(rutaBase + sufijo)) rmSync(rutaBase + sufijo);
  }
});

async function post(ruta, cuerpo) {
  const r = await fetch(base + ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  return { estado: r.status, texto, cabeceras: r.headers, json: JSON.parse(texto) };
}

describe('Limite de altas de cuenta', () => {
  test('se bloquea al superar el maximo de registros por IP', async () => {
    const alta = (n) => ({
      correo: `limite-${n}-${Math.random().toString(36).slice(2, 8)}@prueba.test`,
      contrasena: 'LimitesSeguro2026!',
      nombre: 'Limite',
      apellidos: 'De Prueba',
      fecha_nacimiento: '2001-04-10',
      acepta_terminos: true,
    });

    const respuestas = [];
    for (let i = 0; i < 5; i++) respuestas.push(await post('/api/auth/registro', alta(i)));

    const aceptadas = respuestas.filter((r) => r.estado === 201);
    const bloqueadas = respuestas.filter((r) => r.estado === 429);

    assert.equal(aceptadas.length, 3, 'debian aceptarse exactamente 3 altas antes del limite');
    assert.equal(bloqueadas.length, 2, 'las peticiones restantes debian rebotar con 429');
    assert.equal(bloqueadas[0].json.error, 'demasiados_registros');
  });
});

describe('Limite general de peticiones', () => {
  test('se bloquea al superar el maximo de peticiones por minuto', async () => {
    const estados = [];
    for (let i = 0; i < 25; i++) {
      const r = await fetch(base + '/api/salud');
      estados.push(r.status);
    }
    assert.ok(estados.includes(429), 'el limite general nunca llego a responder 429');
  });

  test('el bloqueo general no filtra informacion interna', async () => {
    const r = await fetch(base + '/api/salud');
    const cuerpo = await r.json();
    assert.ok(!JSON.stringify(cuerpo).includes('at '), 'se filtro un stack trace');
  });
});
