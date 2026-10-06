/**
 * Poblacion inicial de la base de datos (semilla).
 *
 * Los datos viven aqui, en arrays, y se insertan con SENTENCIAS PREPARADAS.
 * El bloque @inicio-seed / @fin-seed de base-datos/esquema.sql es la
 * documentacion legible de esos mismos datos: se usa para comprobar que el
 * esquema y este script no se han separado, no como fuente de las filas.
 *
 * Los valores NUNCA se concatenan dentro del texto SQL. Van siempre como
 * parametros `?`, que es lo que impide la inyeccion. Por eso el esquema
 * tambien esta escrito con marcadores de parametro.
 *
 * Uso:
 *   npm run db:semilla
 *   node src/semilla.js --reiniciar    (borra la base y la vuelve a crear)
 */
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { config } from './config.js';
import { abrirBaseDatos, cerrarBaseDatos, db } from './db.js';
import { hashContrasena } from './contrasenas.js';

const reiniciar = process.argv.includes('--reiniciar');

if (reiniciar) {
  for (const sufijo of ['', '-wal', '-shm']) {
    const ruta = `${config.baseDatos.archivo}${sufijo}`;
    if (existsSync(ruta)) rmSync(ruta);
  }
  console.log('[semilla] base de datos anterior eliminada');
}

abrirBaseDatos();

// Si la base ya tiene datos no se siembra dos veces.
const existentes = db().prepare('SELECT COUNT(*) AS total FROM roles').get().total;
if (existentes > 0 && !reiniciar) {
  console.log('[semilla] la base ya esta poblada. Usa --reiniciar para rehacerla.');
  cerrarBaseDatos();
  process.exit(0);
}

// Verificacion de coherencia: si alguien edita el bloque de ejemplo del
// esquema y se olvida de actualizar este script, el aviso salta aqui y no en
// mitad de una transaccion.
//
// Los marcadores se buscan ANCLADOS a una linea completa. Buscarlos con
// indexOf es una trampa: el propio esquema los menciona en su documentacion
// antes de definir el bloque, y indexOf se quedaria con esa mencion.
const texto = readFileSync(config.baseDatos.esquema, 'utf8');
const MARCADOR = (nombre) => new RegExp(`^-- @${nombre}\\s*$`, 'm');
if (!MARCADOR('inicio-seed').test(texto) || !MARCADOR('fin-seed').test(texto)) {
  console.error('[semilla] no se encontraron los marcadores @inicio-seed y @fin-seed en el esquema');
  process.exit(1);
}
const bloque = texto.slice(
  texto.search(MARCADOR('inicio-seed')),
  texto.search(MARCADOR('fin-seed'))
);
for (const tabla of ['roles', 'usuarios', 'docentes', 'cursos', 'grupos', 'matriculas', 'calificaciones']) {
  if (!new RegExp(`INTO\\s+${tabla}\\b`, 'i').test(bloque)) {
    console.warn(`[semilla] aviso: el bloque de ejemplo del esquema no menciona ${tabla}`);
  }
}

/* ------------------------------------------------------------------ *
 * Valores de la semilla, en el MISMO orden que las sentencias del
 * esquema. Cada elemento corresponde a una sentencia completa.
 * ------------------------------------------------------------------ */

// 1. roles: nombre, descripcion
const ROLES = [
  ['administrador', 'Acceso total: cuentas, catalogo, matematicas y configuracion.'],
  ['docente', 'Gestiona sus grupos, carga calificaciones y publica notas.'],
  ['estudiante', 'Accede al catalogo, se matricula y consulta su progreso.'],
  ['soporte', 'Atiende postulaciones y verifica certificados. Sin acceso a calificaciones.'],
];

// 2. facultades: nombre, sigla, descripcion
const FACULTADES = [
  ['Facultad de Ingeniería y Sistemas', 'FIS', 'Programas de ingenieria, software e inteligencia artificial.'],
  ['Facultad de Ciencias Economicas', 'FCE', 'Administración, contabilidad y finanzas.'],
  ['Facultad de Comunicacion y Diseño', 'FCD', 'Diseño gráfico, marketing digital y multimedia.'],
];

// 3. programas: facultad_id, nombre, codigo, titulo_grado, duracion_semestres, descripcion
const PROGRAMAS = [
  [1, 'Ingeniería en Software', 'IS-ING', 'Ingeniero', 10, 'Desarrollo de software, arquitectura y calidad de codigo.'],
  [1, 'Tecnologia en Analítica de Datos', 'IS-TAD', 'Tecnólogo', 6, 'Transformacion de datos en decisiones de negocio.'],
  [2, 'Licenciatura en Administración y Finanzas', 'FCE-LAF', 'Licenciado', 10, 'Gestion financiera, presupuesto y marchedad.'],
  [3, 'Diplomado en Marketing Digital', 'FCD-DMD', 'Diplomado', 4, 'Estrategias de marca, publicidad y redes sociales.'],
];

// 4. cursos: programa_id, nombre, slug, codigo, descripcion, creditos, precio,
//    precio_antes, modalidad, dificultad, nivel_descripcion, duracion_semanas,
//    horas, imagen_url, destacado, estado
const CURSOS = [
  [1, 'Programación Web', 'web', 'EDU-WEB',
    'HTML, CSS y JavaScript con proyectos reales y despliegue en la nube.',
    6, 320, 520, 'online_en_vivo', 'intermedio', 'Principiante a intermedio', 8, 6,
    'https://placehold.co/600x350/14532d/ffffff?text=Programación+Web', 1, 'publicado'],
  [1, 'Bases de Datos', 'bd', 'EDU-BD',
    'Modelo relacional, SQL avanzado, indices y optimizacion de consultas.',
    6, 280, 450, 'hibrida', 'intermedio', 'Intermedio', 6, 5,
    'https://placehold.co/600x350/1e3a8a/ffffff?text=Bases+de+Datos', 0, 'publicado'],
  [3, 'Diseño UI/UX', 'ux', 'EDU-UX',
    'Investigación con usuarios, prototipado y sistemas de diseño accesibles.',
    5, 260, 410, 'online', 'principiante', 'Principiante', 5, 4,
    'https://placehold.co/600x350/0f172a/ffffff?text=Diseño+UI%2FUX', 0, 'publicado'],
  [1, 'Ciberseguridad', 'cyber', 'EDU-SEC',
    'Proteccion de datos, hacking etico y respuesta a incidentes.',
    8, 390, 620, 'presencial', 'intermedio', 'Intermedio', 6, 8,
    'https://placehold.co/600x350/0f172a/ffffff?text=Ciberseguridad', 1, 'publicado'],
  [1, 'Inteligencia Artificial', 'ia', 'EDU-IA',
    'Machine learning, redes neuronales y vision por computadora.',
    7, 450, 700, 'online_en_vivo', 'intermedio', 'Intermedio a avanzado', 10, 7,
    'https://placehold.co/600x350/1e3a8a/ffffff?text=Inteligencia+Artificial', 1, 'publicado'],
  [4, 'Marketing Digital', 'marketing', 'EDU-MKT',
    'SEO, publicidad pagada, redes sociales y medicion de retorno.',
    4, 220, 360, 'hibrida', 'principiante', 'Principiante', 4, 4,
    'https://placehold.co/600x350/14532d/ffffff?text=Marketing+Digital', 0, 'publicado'],
  [4, 'Ingles Tecnico', 'ingles', 'EDU-ENG',
    'Comunicacion profesional, presentaciones y redactos tecnicos.',
    3, 180, 300, 'online', 'intermedio', 'Intermedio', 12, 3,
    'https://placehold.co/600x350/1e3a8a/ffffff?text=Ingles+Tecnico', 0, 'publicado'],
  [1, 'Desarrollo Movil', 'movil', 'EDU-MOV',
    'Android y iOS, publicación en tiendas y notificaciones push.',
    6, 340, 540, 'presencial', 'intermedio', 'Intermedio', 8, 6,
    'https://placehold.co/600x350/0f172a/ffffff?text=Desarrollo+Movil', 0, 'publicado'],
];

/* El hash se calcula una vez por contrasena de prueba. Las contrasenas NUNCA
   se guardan en claro: a la base de datos solo va el resultado de scrypt. */
const CUENTAS_PRUEBA = [
  {
    correo: 'admin@educa.com',
    contrasena: 'EducaAdmin2026!',
    rol: 1,
    nombre: 'Ana',
    apellidos: 'Restrepo Coordinate',
    documento: '001-11-2233',
    telefono: '+1 809 555 0100',
    nacimiento: '1985-04-12',
    programa: null,
  },
  {
    correo: 'docente@educa.com',
    contrasena: 'EducaDocente2026!',
    rol: 2,
    nombre: 'Luis',
    apellidos: 'Fernandez Ramirez',
    documento: '002-22-3344',
    telefono: '+1 809 555 0111',
    nacimiento: '1988-09-30',
    programa: null,
  },
  {
    correo: 'estudiante@educa.com',
    contrasena: 'EducaEstudiante2026!',
    rol: 3,
    nombre: 'Maria',
    apellidos: 'Gonzalez Santana',
    documento: '003-33-4455',
    telefono: '+1 809 555 0122',
    nacimiento: '2002-06-15',
    programa: 1,
  },
  {
    correo: 'docente2@educa.com',
    contrasena: 'EducaDocente2026!',
    rol: 2,
    nombre: 'Carmen',
    apellidos: 'Nunez Peralta',
    documento: '004-44-5566',
    telefono: '+1 809 555 0133',
    nacimiento: '1990-02-05',
    programa: null,
  },
  {
    correo: 'docente3@educa.com',
    contrasena: 'EducaDocente2026!',
    rol: 2,
    nombre: 'Raul',
    apellidos: 'Castro Mejia',
    documento: '005-55-6677',
    telefono: '+1 809 555 0144',
    nacimiento: '1986-11-20',
    programa: null,
  },
  {
    correo: 'docente4@educa.com',
    contrasena: 'EducaDocente2026!',
    rol: 2,
    nombre: 'Sofia',
    apellidos: 'Reyes Vargas',
    documento: '006-66-7788',
    telefono: '+1 809 555 0155',
    nacimiento: '1993-07-08',
    programa: null,
  },
];

// 5. modulos: curso_id, nombre, descripcion, orden, duracion_minutos
const MODULOS = [
  [1, 'HTML semántico', 'Estructura, accesibilidad y SEO básico.', 1, 240],
  [1, 'CSS moderno', 'Flexbox, Grid, variables y animaciones.', 2, 300],
  [1, 'JavaScript del navegador', 'DOM, eventos, fetch y asincronía.', 3, 360],
  [1, 'Proyecto final', 'Publicación de un sitio completo.', 4, 480],
  [2, 'Modelo relacional', 'Entidades, atributos, claves y normalización.', 1, 300],
  [2, 'SQL avanzado', 'JOIN, subconsultas, funciones de ventana.', 2, 360],
  [3, 'Investigación con usuarios', 'Entrevistas, pruebas de usabilidad.', 1, 240],
  [3, 'Sistemas de diseño', 'Color, tipografía, espaciado y componentes.', 2, 300],
  [4, 'Hacking ético', 'Reconocimiento, escaneo y explotación controlada.', 1, 420],
  [4, 'Respuesta a incidentes', 'Detección, contención y análisis forense.', 2, 420],
  [5, 'Fundamentos de ML', 'Regresión, clasificación y métricas.', 1, 360],
  [5, 'Redes neuronales', 'Arquitecturas profundas y entrenamiento.', 2, 420],
  [6, 'SEO y contenido', 'Palabra clave, estructura y contenido óptimo.', 1, 240],
  [6, 'Publicidad pagada', 'Campañas, segmentación y presupuesto.', 2, 300],
  [7, 'Redacción técnica', 'Informes, correo y documentación.', 1, 180],
  [8, 'Android básico', 'Kotlin, Activities y almacenamiento local.', 1, 360],
  [8, 'iOS básico', 'Swift, SwiftUI y publicación.', 2, 360],
];

/* El orden de los usuarios determina el id que reciben, y los perfiles de
   docente se cuelgan de un id de usuario. Los grupos referencian el id de
   docente (1 a 4), no el de usuario, por eso los usuarios docente son 2, 4,
   5 y 6. */
// 6. docentes: usuario_id, especialidad, titulo_academico, experiencia_anios
const DOCENTES = [
  [2, 'Ingeniería de Software', 'MSc en Ingeniería de Software', 12],
  [4, 'Seguridad de la Información', 'CISSP', 9],
  [5, 'Analítica e IA', 'MSc en Ciencia de Datos', 7],
  [6, 'Diseño de Interfaces', 'MA en Diseño de Producto Digital', 6],
];

// 7. grupos: curso_id, docente_id, codigo, cupo, aula, horario, fecha_inicio, fecha_fin, estado
const GRUPOS = [
  [1, 1, 'WEB-01-A', 30, 'Aula 201', 'Mar/Jue 18:00-20:00', '2026-01-12', '2026-03-08', 'en_curso'],
  [2, 1, 'BD-01-A', 25, 'Aula 204', 'Lun/Mie 19:00-21:00', '2026-01-13', '2026-02-24', 'en_curso'],
  [3, 1, 'UX-01-A', 30, 'Laboratorio 1', 'Mar 17:00-20:00', '2026-02-02', '2026-03-06', 'en_curso'],
  [4, 2, 'SEC-01-A', 20, 'Aula 305', 'Mie/Vie 18:00-21:00', '2026-01-14', '2026-02-25', 'en_curso'],
  [5, 3, 'IA-01-A', 25, 'Lab. IA', 'Mar/Jue 19:00-21:00', '2026-01-15', '2026-03-19', 'en_curso'],
  [6, 4, 'MKT-01-A', 35, 'Aula 102', 'Sab 09:00-12:00', '2026-01-18', '2026-02-15', 'en_curso'],
  [7, 4, 'ENG-01-A', 40, 'Aula 105', 'Mar/Jue 08:00-09:00', '2026-01-13', '2026-04-09', 'en_curso'],
  [8, 2, 'MOV-01-A', 22, 'Lab. Movil', 'Mie 18:00-21:00', '2026-01-14', '2026-03-11', 'en_curso'],
];

// 8. matriculas: estudiante_id, grupo_id, estado, fecha_matricula, progreso
const MATRICULAS = [
  [3, 1, 'activa', '2026-01-10', 45],
  [3, 5, 'activa', '2026-01-11', 20],
  [3, 7, 'activa', '2026-01-12', 60],
];

// 9. asistencias: matricula_id, fecha, estado, justificacion, registrado_por
const ASISTENCIAS = [
  [1, '2026-01-12', 'presente', null, 1],
  [1, '2026-01-14', 'tardanza', null, 1],
  [1, '2026-01-19', 'presente', null, 1],
  [2, '2026-01-15', 'presente', null, 2],
  [2, '2026-01-19', 'ausente', 'Consulta médica', 2],
  [3, '2026-01-13', 'presente', null, 4],
];

// 10. evaluaciones: grupo_id, titulo, tipo, fecha, ponderacion
const EVALUACIONES = [
  [1, 'Cuestionario 1', 'quiz', '2026-01-26', 20],
  [1, 'Práctica HTML y CSS', 'tarea', '2026-02-09', 30],
  [1, 'Examen parcial', 'examen', '2026-02-23', 50],
  [5, 'Parcial de regresion', 'parcial', '2026-02-06', 40],
  [5, 'Proyecto de modelo', 'proyecto', '2026-03-06', 60],
];

// 11. calificaciones: evaluacion_id, matricula_id, nota, observaciones, publicado, docente_id
const CALIFICACIONES = [
  [1, 1, 88, 'Buen dominio de estructura semantica.', 1, 1],
  [3, 1, 74, 'Revisar la jerarquia de encabezados.', 0, 1],
  [2, 2, 91, 'Excelente analisis del dataset.', 1, 3],
  [4, 3, 96, 'Redaccion impecable.', 1, 4],
];

// 12. certificados: usuario_id, matricula_id, codigo, horas, nota, estado
const CERTIFICADOS = [
  [3, 1, 'EDU-2026-4F2A9C', 48, 92.0, 'emitido'],
];

// 13. vacantes: titulo, empresa, ubicacion, modalidad, descripcion, salario_min, salario_max, estado
const VACANTES = [
  ['Desarrollador Frontend Junior', 'Tecnologica del Caribe', 'Santo Domingo', 'remoto',
    'React, CSS moderno y consumos de APIs. Requisito:portfolio con 2 proyectos.', 28000, 38000, 'publicada'],
  ['Analista de Datos', 'Banco Centroamericano', 'Panama', 'hibrida',
    'SQL avanzado, Python y tableros de indicadores.', 35000, 48000, 'publicada'],
  ['Diseñador UI/UX', 'Agencia Pixel', 'Bogota', 'remoto',
    'Investigación, prototipado en Figma y sistemas de diseño.', 26000, 36000, 'publicada'],
  ['Soporte de Ciberseguridad', 'Consultora IT', 'Santiago', 'presencial',
    'Monitoreo, respuesta a incidentes y gestion de vulnerabilidades.', 24000, 32000, 'publicada'],
];

// 14. solicitudes: usuario_id, grupo_id, vacante_id, estado, motivo
const SOLICITUDES = [
  [3, 4, null, 'en_revision', 'Me interesa la linea de seguridad para mi proyecto de grado.'],
  [3, null, 1, 'pendiente', 'Portafolio disponible a solicitud.'],
  [3, 6, null, 'aceptada', 'Deseo iniciar la especializacion en marketing.'],
];

const conexion = db();
conexion.exec('BEGIN IMMEDIATE');
try {
  let indice = 0;
  const preparar = (sql) => conexion.prepare(sql);

  const correr = (sql, params) => {
    const stmt = preparar(sql);
    stmt.run(...params);
    indice += 1;
  };

  for (const params of ROLES) {
    correr('INSERT INTO roles (nombre, descripcion) VALUES (?, ?)', params);
  }
  for (const params of FACULTADES) {
    correr('INSERT INTO facultades (nombre, sigla, descripcion) VALUES (?, ?, ?)', params);
  }
  for (const params of PROGRAMAS) {
    correr(
      'INSERT INTO programas (facultad_id, nombre, codigo, titulo_grado, duracion_semestres, descripcion) VALUES (?, ?, ?, ?, ?, ?)',
      params
    );
  }
  for (const params of CURSOS) {
    correr(
      `INSERT INTO cursos (programa_id, nombre, slug, codigo, descripcion, creditos, precio, precio_antes,
                           modalidad, dificultad, nivel_descripcion, duracion_semanas, horas, imagen_url,
                           destacado, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );
  }
  for (const params of MODULOS) {
    correr('INSERT INTO modulos (curso_id, nombre, descripcion, orden, duracion_minutos) VALUES (?, ?, ?, ?, ?)', params);
  }

  // Usuarios: el hash se calcula con scrypt justo antes de insertar.
  for (const cuenta of CUENTAS_PRUEBA) {
    const hash = await hashContrasena(cuenta.contrasena);
    correr(
      `INSERT INTO usuarios (correo, contrasena_hash, rol_id, nombre, apellidos, documento_id,
                             telefono, fecha_nacimiento, programa_id, estado, acepta_terminos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', 1)`,
      [cuenta.correo, hash, cuenta.rol, cuenta.nombre, cuenta.apellidos, cuenta.documento,
       cuenta.telefono, cuenta.nacimiento, cuenta.programa]
    );
  }

  for (const params of DOCENTES) {
    correr('INSERT INTO docentes (usuario_id, especialidad, titulo_academico, experiencia_anios) VALUES (?, ?, ?, ?)', params);
  }
  for (const params of GRUPOS) {
    correr(
      'INSERT INTO grupos (curso_id, docente_id, codigo, cupo, aula, horario, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params
    );
  }
  for (const params of MATRICULAS) {
    correr('INSERT INTO matriculas (estudiante_id, grupo_id, estado, fecha_matricula, progreso) VALUES (?, ?, ?, ?, ?)', params);
  }
  for (const params of ASISTENCIAS) {
    correr(
      'INSERT INTO asistencias (matricula_id, fecha, estado, justificacion, registrado_por) VALUES (?, ?, ?, ?, ?)',
      params
    );
  }
  for (const params of EVALUACIONES) {
    correr('INSERT INTO evaluaciones (grupo_id, titulo, tipo, fecha, ponderacion) VALUES (?, ?, ?, ?, ?)', params);
  }
  for (const params of CALIFICACIONES) {
    correr(
      'INSERT INTO calificaciones (evaluacion_id, matricula_id, nota, observaciones, publicado, docente_id) VALUES (?, ?, ?, ?, ?, ?)',
      params
    );
  }
  for (const params of CERTIFICADOS) {
    correr(
      `INSERT INTO certificados (usuario_id, matricula_id, codigo_verificacion, horas_acreditadas, nota_final, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      params
    );
  }
  for (const params of VACANTES) {
    correr(
      'INSERT INTO vacantes (titulo, empresa, ubicacion, modalidad, descripcion, salario_min, salario_max, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      params
    );
  }
  for (const params of SOLICITUDES) {
    correr('INSERT INTO solicitudes (usuario_id, grupo_id, vacante_id, estado, motivo) VALUES (?, ?, ?, ?, ?)', params);
  }

  conexion.exec('COMMIT');
  console.log(`[semilla] ${indice} registros insertados`);
} catch (error) {
  conexion.exec('ROLLBACK');
  console.error('[semilla] fallo y se revirtio la transaccion:', error.message);
  process.exit(1);
}

// Verificacion: total de filas escritas en la base.
const total = db()
  .prepare(
    `SELECT (SELECT COUNT(*) FROM roles) + (SELECT COUNT(*) FROM facultades) +
            (SELECT COUNT(*) FROM programas) + (SELECT COUNT(*) FROM cursos) +
            (SELECT COUNT(*) FROM modulos) + (SELECT COUNT(*) FROM usuarios) +
            (SELECT COUNT(*) FROM docentes) + (SELECT COUNT(*) FROM grupos) +
            (SELECT COUNT(*) FROM matriculas) + (SELECT COUNT(*) FROM asistencias) +
            (SELECT COUNT(*) FROM evaluaciones) + (SELECT COUNT(*) FROM calificaciones) +
            (SELECT COUNT(*) FROM certificados) + (SELECT COUNT(*) FROM vacantes) +
            (SELECT COUNT(*) FROM solicitudes) AS total`
  )
  .get().total;
console.log(`[semilla] total en la base: ${total}`);
console.log('[semilla] cuentas de prueba (SOLO DESARROLLO):');
for (const c of CUENTAS_PRUEBA) console.log(`  ${c.correo}  ${c.contrasena}`);

cerrarBaseDatos();
