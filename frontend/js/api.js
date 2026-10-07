/**
 * Cliente de la API del Sistema Educa con soporte para Liquid Glass UI
 * y respaldo de demostración en modo desconectado.
 */

const BASE_API = 'http://localhost:3000/api';
const CLAVE_TOKEN = 'educa:csrf';
const CLAVE_SESION_DEMO = 'educa:sesion_demo';

let tokenCsrf = null;
try {
  tokenCsrf = localStorage.getItem(CLAVE_TOKEN);
} catch {
  tokenCsrf = null;
}

export function establecerTokenCsrf(token) {
  if (typeof token !== 'string' || token.length < 16) return;
  tokenCsrf = token;
  try {
    localStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    /* memoria */
  }
}

export function olvidarTokenCsrf() {
  tokenCsrf = null;
  try {
    localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* vacio */
  }
}

export function obtenerTokenCsrf() {
  return tokenCsrf;
}

export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, detalles = null) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

const ERRORES_DE_RED =
  'No se pudo conectar con el servidor backend en el puerto 3000.';

/* ------------------------------------------------------------------ *
 * Generador de portadas SVG líquidas en alta definición (offline-first)
 * ------------------------------------------------------------------ */
function generarSvgPortada(titulo, categoria, gradiente, iconoPath) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradiente[0]}" />
        <stop offset="100%" stop-color="${gradiente[1]}" />
      </linearGradient>
      <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.4)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.08)" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="35" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="600" height="350" fill="url(#bg)" />
    <!-- Burbujas decorativas liquid glass -->
    <circle cx="100" cy="80" r="140" fill="${gradiente[2]}" opacity="0.35" filter="url(#glow)" />
    <circle cx="520" cy="280" r="160" fill="${gradiente[3]}" opacity="0.4" filter="url(#glow)" />
    <circle cx="380" cy="100" r="80" fill="rgba(255,255,255,0.25)" filter="url(#glow)" />
    <!-- Panel glass central -->
    <rect x="50" y="45" width="500" height="260" rx="24" fill="url(#glass)" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" />
    <rect x="50" y="45" width="500" height="2" fill="rgba(255,255,255,0.8)" />
    <!-- Icono central -->
    <g transform="translate(260, 95)" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      ${iconoPath}
    </g>
    <!-- Texto ilustrativo -->
    <text x="300" y="215" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, sans-serif" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${titulo}</text>
    <text x="300" y="245" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, sans-serif" font-size="14" font-weight="600" fill="rgba(255,255,255,0.85)" text-anchor="middle" letter-spacing="1">${categoria.toUpperCase()}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ------------------------------------------------------------------ *
 * Semilla de demostración (Cursos, programas, estadísticas, usuarios)
 * ------------------------------------------------------------------ */
const DATOS_SEMILLA = {
  estadisticas: {
    cursosPublicados: 8,
    estudiantesActivos: 1420,
    certificadosEmitidos: 580,
    vacantesPublicadas: 24,
  },
  programas: [
    { id: 1, nombre: 'Ingeniería en Software', facultad: 'Facultad de Ingeniería y Sistemas' },
    { id: 2, nombre: 'Tecnología en Analítica de Datos', facultad: 'Facultad de Ingeniería y Sistemas' },
    { id: 3, nombre: 'Licenciatura en Administración y Finanzas', facultad: 'Facultad de Ciencias Económicas' },
    { id: 4, nombre: 'Diplomado en Marketing Digital', facultad: 'Facultad de Comunicación y Diseño' },
  ],
  cursos: [
    {
      id: 1,
      programa_id: 1,
      programa_nombre: 'Ingeniería en Software',
      nombre: 'Programación Web Fullstack',
      slug: 'web',
      codigo: 'EDU-WEB',
      descripcion: 'Desarrollo web moderno con HTML5, CSS semántico, JavaScript moderno y arquitectura orientada a componentes con APIs REST.',
      creditos: 6,
      precio: 320,
      precio_antes: 520,
      modalidad: 'online_en_vivo',
      dificultad: 'intermedio',
      nivel_descripcion: 'Principiante a intermedio',
      duracion_semanas: 8,
      horas: 6,
      destacado: 1,
      imagen_url: generarSvgPortada(
        'Programación Web',
        'Ingeniería de Software',
        ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'],
        '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline><line x1="14" y1="4" x2="10" y2="20"></line>'
      ),
      modulos: [
        { orden: 1, nombre: 'Arquitectura Frontend y Semántica', descripcion: 'HTML5 moderno, accesibilidad y maquetación desktop-first.', duracion_minutos: 120 },
        { orden: 2, nombre: 'CSS Avanzado y Efectos Liquid Glass', descripcion: 'Variables CSS, backdrop-filter, responsive grids y animaciones.', duracion_minutos: 180 },
        { orden: 3, nombre: 'JavaScript Moderno y Asincronía', descripcion: 'Módulos ES, Promesas, Fetch API y manejo seguro del estado.', duracion_minutos: 210 },
        { orden: 4, nombre: 'Integración con APIs y Seguridad', descripcion: 'Tokens CSRF, cookies seguras, validación y despliegue continuo.', duracion_minutos: 240 },
      ],
      grupos: [
        { codigo: 'WEB-G1', horario: 'Sábados 9:00 - 13:00', aula: 'Aula Virtual 101', fecha_inicio: '2026-11-01', disponibles: 6 },
        { codigo: 'WEB-G2', horario: 'Martes y Jueves 19:00 - 21:00', aula: 'Aula Virtual 102', fecha_inicio: '2026-11-10', disponibles: 3 },
      ],
    },
    {
      id: 2,
      programa_id: 1,
      programa_nombre: 'Ingeniería en Software',
      nombre: 'Bases de Datos y SQL Avanzado',
      slug: 'bd',
      codigo: 'EDU-BD',
      descripcion: 'Diseño relacional, modelado normalizado, consultas SQL optimizadas, índices eficientes y transacciones ACID.',
      creditos: 6,
      precio: 280,
      precio_antes: 450,
      modalidad: 'hibrida',
      dificultad: 'intermedio',
      nivel_descripcion: 'Intermedio',
      duracion_semanas: 6,
      horas: 5,
      destacado: 0,
      imagen_url: generarSvgPortada(
        'Bases de Datos',
        'Ingeniería de Software',
        ['#0f172a', '#1e40af', '#38bdf8', '#818cf8'],
        '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>'
      ),
      modulos: [
        { orden: 1, nombre: 'Modelado Entidad-Relación', descripcion: 'Normalización, llaves foráneas e integridad referencial.', duracion_minutos: 120 },
        { orden: 2, nombre: 'Consultas SQL y Agrupamiento', descripcion: 'JOINs avanzados, subconsultas y funciones de ventana.', duracion_minutos: 180 },
        { orden: 3, nombre: 'Optimización e Índices', descripcion: 'Planes de ejecución, índices B-Tree y rendimiento.', duracion_minutos: 180 },
      ],
      grupos: [
        { codigo: 'BD-G1', horario: 'Miércoles y Viernes 18:00 - 20:30', aula: 'Laboratorio 3B', fecha_inicio: '2026-11-15', disponibles: 8 },
      ],
    },
    {
      id: 3,
      programa_id: 3,
      programa_nombre: 'Licenciatura en Administración y Finanzas',
      nombre: 'Diseño UI/UX y Sistemas de Diseño',
      slug: 'ux',
      codigo: 'EDU-UX',
      descripcion: 'Fundamentos de diseño de interfaces, heurísticas de usabilidad, prototipado interactivo y estética Apple iOS Glass.',
      creditos: 5,
      precio: 260,
      precio_antes: 410,
      modalidad: 'online',
      dificultad: 'principiante',
      nivel_descripcion: 'Principiante',
      duracion_semanas: 5,
      horas: 4,
      destacado: 0,
      imagen_url: generarSvgPortada(
        'Diseño UI/UX',
        'Diseño Digital',
        ['#4338ca', '#7c3aed', '#c084fc', '#f472b6'],
        '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>'
      ),
      modulos: [
        { orden: 1, nombre: 'Principios Visuales y Accesibilidad', descripcion: 'Tipografía, color, contraste y ergonomía visual.', duracion_minutos: 120 },
        { orden: 2, nombre: 'Sistemas de Diseño y Componentes', descripcion: 'Tokens, variantes, estados y micro-interacciones.', duracion_minutos: 150 },
      ],
      grupos: [
        { codigo: 'UX-G1', horario: 'Flexible / Asincrónico', aula: 'Campus Virtual', fecha_inicio: '2026-11-05', disponibles: 15 },
      ],
    },
    {
      id: 4,
      programa_id: 1,
      programa_nombre: 'Ingeniería en Software',
      nombre: 'Ciberseguridad y Defensa Digital',
      slug: 'cyber',
      codigo: 'EDU-SEC',
      descripcion: 'Auditoría de seguridad, defensa en profundidad, criptografía aplicada (scrypt, hashing, TLS) y prevención de vulnerabilidades web.',
      creditos: 8,
      precio: 390,
      precio_antes: 620,
      modalidad: 'presencial',
      dificultad: 'intermedio',
      nivel_descripcion: 'Intermedio',
      duracion_semanas: 6,
      horas: 8,
      destacado: 1,
      imagen_url: generarSvgPortada(
        'Ciberseguridad',
        'Seguridad Informática',
        ['#065f46', '#059669', '#34d399', '#6ee7b7'],
        '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>'
      ),
      modulos: [
        { orden: 1, nombre: 'Fundamentos de Seguridad Ofensiva', descripcion: 'Amenazas OWASP Top 10 y vectores de ataque.', duracion_minutos: 180 },
        { orden: 2, nombre: 'Criptografía y Autenticación Segura', descripcion: 'Hashing seguro, cookies HttpOnly y protección anti-CSRF.', duracion_minutos: 210 },
      ],
      grupos: [
        { codigo: 'SEC-G1', horario: 'Lunes y Miércoles 18:00 - 21:00', aula: 'Edificio Central A-12', fecha_inicio: '2026-11-20', disponibles: 4 },
      ],
    },
    {
      id: 5,
      programa_id: 1,
      programa_nombre: 'Ingeniería en Software',
      nombre: 'Inteligencia Artificial & Deep Learning',
      slug: 'ia',
      codigo: 'EDU-IA',
      descripcion: 'Entrenamiento de modelos de aprendizaje automático, redes neuronales profundas, procesamiento de lenguaje natural y visión artificial.',
      creditos: 7,
      precio: 450,
      precio_antes: 700,
      modalidad: 'online_en_vivo',
      dificultad: 'intermedio',
      nivel_descripcion: 'Intermedio a avanzado',
      duracion_semanas: 10,
      horas: 7,
      destacado: 1,
      imagen_url: generarSvgPortada(
        'Inteligencia Artificial',
        'Ingeniería & IA',
        ['#1e1b4b', '#4f46e5', '#a855f7', '#ec4899'],
        '<circle cx="12" cy="12" r="3"></circle><circle cx="5" cy="8" r="2"></circle><circle cx="19" cy="8" r="2"></circle><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle><line x1="7" y1="8" x2="10" y2="10"></line><line x1="17" y1="8" x2="14" y2="10"></line><line x1="8" y1="16" x2="10" y2="14"></line><line x1="16" y1="16" x2="14" y2="14"></line>'
      ),
      modulos: [
        { orden: 1, nombre: 'Matemáticas para Machine Learning', descripcion: 'Álgebra lineal, cálculo multivariable y probabilidad.', duracion_minutos: 240 },
        { orden: 2, nombre: 'Redes Neuronales y Tensores', descripcion: 'Perceptrón multicapa, backpropagation y optimizadores.', duracion_minutos: 240 },
      ],
      grupos: [
        { codigo: 'IA-G1', horario: 'Martes y Jueves 18:30 - 21:30', aula: 'Campus Virtual Lab 1', fecha_inicio: '2026-11-18', disponibles: 5 },
      ],
    },
    {
      id: 6,
      programa_id: 4,
      programa_nombre: 'Diplomado en Marketing Digital',
      nombre: 'Estrategias de Marketing Digital',
      slug: 'marketing',
      codigo: 'EDU-MKT',
      descripcion: 'Posicionamiento orgánico en buscadores (SEO), campañas publicitarias de alto rendimiento, embudos de conversión y analítica.',
      creditos: 4,
      precio: 220,
      precio_antes: 360,
      modalidad: 'hibrida',
      dificultad: 'principiante',
      nivel_descripcion: 'Principiante',
      duracion_semanas: 4,
      horas: 4,
      destacado: 0,
      imagen_url: generarSvgPortada(
        'Marketing Digital',
        'Comunicación y Medios',
        ['#78350f', '#d97706', '#fbbf24', '#fde68a'],
        '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>'
      ),
      modulos: [
        { orden: 1, nombre: 'Estrategia y Buyer Persona', descripcion: 'Definición de público objetivo y propuesta de valor.', duracion_minutos: 120 },
      ],
      grupos: [
        { codigo: 'MKT-G1', horario: 'Sábados 14:00 - 18:00', aula: 'Aula 204', fecha_inicio: '2026-12-01', disponibles: 10 },
      ],
    },
    {
      id: 7,
      programa_id: 4,
      programa_nombre: 'Diplomado en Marketing Digital',
      nombre: 'Inglés Técnico Profesional',
      slug: 'ingles',
      codigo: 'EDU-ENG',
      descripcion: 'Comunicación fluida en entornos internacionales de tecnología, vocabulario especializado, redacción técnica y entrevistas en inglés.',
      creditos: 3,
      precio: 180,
      precio_antes: 300,
      modalidad: 'online',
      dificultad: 'intermedio',
      nivel_descripcion: 'Intermedio',
      duracion_semanas: 12,
      horas: 3,
      destacado: 0,
      imagen_url: generarSvgPortada(
        'Inglés Técnico',
        'Idiomas Globales',
        ['#1e293b', '#0284c7', '#38bdf8', '#bae6fd'],
        '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>'
      ),
      modulos: [
        { orden: 1, nombre: 'Vocabulario Técnico y Lectura Ágil', descripcion: 'Documentación técnica, pull requests y arquitectura en inglés.', duracion_minutos: 150 },
      ],
      grupos: [
        { codigo: 'ENG-G1', horario: 'Martes 19:00 - 21:00', aula: 'Aula Virtual English Hub', fecha_inicio: '2026-11-25', disponibles: 12 },
      ],
    },
    {
      id: 8,
      programa_id: 1,
      programa_nombre: 'Ingeniería en Software',
      nombre: 'Desarrollo de Aplicaciones Móviles',
      slug: 'movil',
      codigo: 'EDU-MOV',
      descripcion: 'Construcción de aplicaciones nativas y multiplataforma con interfaces fluidas estilo iOS, gestión de estados y conectividad en tiempo real.',
      creditos: 6,
      precio: 340,
      precio_antes: 540,
      modalidad: 'presencial',
      dificultad: 'intermedio',
      nivel_descripcion: 'Intermedio',
      duracion_semanas: 8,
      horas: 6,
      destacado: 0,
      imagen_url: generarSvgPortada(
        'Desarrollo Móvil',
        'Ingeniería de Software',
        ['#0f172a', '#0284c7', '#06b6d4', '#67e8f9'],
        '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>'
      ),
      modulos: [
        { orden: 1, nombre: 'Arquitectura Móvil y Ciclo de Vida', descripcion: 'Vistas declarativas, navegación fluida y ciclo de vida de la app.', duracion_minutos: 180 },
      ],
      grupos: [
        { codigo: 'MOV-G1', horario: 'Sábados 9:00 - 14:00', aula: 'Laboratorio Apple / Mac Hub', fecha_inicio: '2026-12-05', disponibles: 7 },
      ],
    },
  ],
  misCursos: [
    {
      id: 1,
      nombre: 'Desarrollo Web Fullstack con React y Node.js',
      codigo: 'EDU-FS01',
      progreso: 72,
      aula: 'Laboratorio de Software B-201',
      docente: 'Prof. Luis Fernández Ramírez',
      horario: 'Martes y Jueves 18:00 - 21:00',
      proximaClase: 'Mañana a las 18:00',
      totalModulos: 3,
      modulosCompletados: 2,
      creditos: 6,
      estado: 'en_curso',
    },
    {
      id: 2,
      nombre: 'Python para Ciencia de Datos e Inteligencia Artificial',
      codigo: 'EDU-PY02',
      progreso: 38,
      aula: 'Campus Virtual Sala 4 (En Vivo)',
      docente: 'Dra. Elena Vargas',
      horario: 'Sábados 09:00 - 13:00',
      proximaClase: 'Sábado a las 09:00',
      totalModulos: 2,
      modulosCompletados: 1,
      creditos: 5,
      estado: 'en_curso',
    },
  ],
  misPostulaciones: [
    {
      id: 101,
      cursoNombre: 'Ciberseguridad y Defensa Digital',
      codigoGrupo: 'SEC-G1',
      fecha: '2026-10-02',
      estado: 'Aprobada',
      cupo: 'Confirmado',
      horario: 'Lunes y Miércoles 18:00 - 21:00',
      aula: 'Edificio Central A-12',
    },
    {
      id: 102,
      cursoNombre: 'Inteligencia Artificial & Deep Learning',
      codigoGrupo: 'IA-G2',
      fecha: '2026-10-06',
      estado: 'En revisión',
      cupo: 'Lista preferencial',
      horario: 'Jueves 19:00 - 22:00',
      aula: 'Campus Virtual Stream HD',
    },
  ],
  misCertificados: [
    {
      id: 'CERT-2026-9812A',
      titulo: 'Fundamentos de Arquitectura Web y Servicios Cloud',
      programa: 'Ingeniería en Software',
      fechaEmision: '15 de Septiembre de 2026',
      promedio: '96 / 100',
      horas: 120,
      codigoVerificacion: 'sha256:7b91d3e84a20f0119c836a9ef42',
      estado: 'Válido y Verificado',
    },
  ],
};

const USUARIOS_DEMO = {
  'estudiante@educa.com': {
    nombre: 'María',
    apellidos: 'Restrepo Cardona',
    correo: 'estudiante@educa.com',
    rol: 'estudiante',
  },
  'docente@educa.com': {
    nombre: 'Prof. Luis',
    apellidos: 'Fernández Ramírez',
    correo: 'docente@educa.com',
    rol: 'docente',
  },
  'admin@educa.com': {
    nombre: 'Ana',
    apellidos: 'Restrepo Cardona',
    correo: 'admin@educa.com',
    rol: 'administrador',
  },
};

/* ------------------------------------------------------------------ *
 * Motor de peticiones HTTP con fallback automático y seguro
 * ------------------------------------------------------------------ */
async function peticion(metodo, ruta, cuerpo = null) {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== null) cabeceras['Content-Type'] = 'application/json';
  if (tokenCsrf && metodo !== 'GET') cabeceras['X-CSRF-Token'] = tokenCsrf;

  try {
    const respuesta = await fetch(BASE_API + ruta, {
      method: metodo,
      headers: cabeceras,
      credentials: 'include',
      body: cuerpo === null ? undefined : JSON.stringify(cuerpo),
    });

    const texto = await respuesta.text();
    let cuerpoRespuesta = null;
    if (texto) {
      try {
        cuerpoRespuesta = JSON.parse(texto);
      } catch {
        throw new ErrorApi(
          respuesta.status,
          'respuesta_inesperada',
          'El servidor devolvió un formato no reconocido.'
        );
      }
    }

    if (!respuesta.ok) {
      throw new ErrorApi(
        respuesta.status,
        cuerpoRespuesta?.error ?? 'error',
        cuerpoRespuesta?.mensaje ?? 'Ocurrió un error inesperado.',
        cuerpoRespuesta?.detalles ?? null
      );
    }

    return cuerpoRespuesta;
  } catch (err) {
    if (err instanceof ErrorApi) throw err;
    // Fallback cuando el servidor backend local aún no ha sido encendido
    return procesarFallbackLocal(metodo, ruta, cuerpo);
  }
}

/** Procesa consultas de prueba locales si el backend no está encendido */
function procesarFallbackLocal(metodo, ruta, cuerpo) {
  if (ruta === '/catalogo/estadisticas') {
    return { exito: true, datos: DATOS_SEMILLA.estadisticas };
  }

  if (ruta.startsWith('/catalogo/cursos')) {
    const url = new URL('http://localhost' + ruta);
    const slug = ruta.replace('/catalogo/cursos/', '').split('?')[0];

    if (slug && slug !== '/catalogo/cursos') {
      const curso = DATOS_SEMILLA.cursos.find((c) => c.slug === decodeURIComponent(slug));
      if (!curso) throw new ErrorApi(404, 'no_encontrado', 'Ese curso no existe.');
      return { exito: true, datos: curso };
    }

    const dificultad = url.searchParams.get('dificultad');
    const modalidad = url.searchParams.get('modalidad');
    const busqueda = (url.searchParams.get('q') || '').trim().toLowerCase();
    const destacado = url.searchParams.get('destacado');
    const limite = Number(url.searchParams.get('limite')) || 0;

    let filtrados = [...DATOS_SEMILLA.cursos];
    if (destacado !== null && destacado !== '') {
      filtrados = filtrados.filter((c) => String(c.destacado) === String(destacado));
    }
    if (dificultad) {
      filtrados = filtrados.filter((c) => c.dificultad === dificultad);
    }
    if (modalidad) {
      filtrados = filtrados.filter((c) => c.modalidad === modalidad);
    }
    if (busqueda) {
      filtrados = filtrados.filter((c) =>
        (c.nombre || '').toLowerCase().includes(busqueda) ||
        (c.descripcion || '').toLowerCase().includes(busqueda) ||
        (c.programa_nombre || '').toLowerCase().includes(busqueda)
      );
    }
    filtrados.sort((a, b) => (b.destacado ?? 0) - (a.destacado ?? 0));
    if (limite > 0) {
      filtrados = filtrados.slice(0, limite);
    }

    return { exito: true, datos: filtrados };
  }

  if (ruta === '/estudiante/cursos') {
    return { exito: true, datos: DATOS_SEMILLA.misCursos };
  }

  if (ruta === '/estudiante/postulaciones') {
    return { exito: true, datos: DATOS_SEMILLA.misPostulaciones };
  }

  if (ruta === '/estudiante/certificados') {
    return { exito: true, datos: DATOS_SEMILLA.misCertificados };
  }

  if (ruta === '/auth/programas') {
    return { exito: true, datos: DATOS_SEMILLA.programas };
  }

  if (ruta === '/auth/login' && metodo === 'POST') {
    const correo = cuerpo?.correo?.toLowerCase()?.trim();
    const demo = USUARIOS_DEMO[correo];
    if (demo) {
      const sesionDemo = {
        autenticado: true,
        usuario: demo,
        csrfToken: 'token_csrf_demo_liquid_glass_2026',
      };
      localStorage.setItem(CLAVE_SESION_DEMO, JSON.stringify(sesionDemo));
      establecerTokenCsrf(sesionDemo.csrfToken);
      return { exito: true, datos: sesionDemo };
    }
    // Si no es de prueba, simula inicio correcto de demostración
    const usuarioPersonalizado = {
      nombre: correo.split('@')[0],
      apellidos: 'Educa',
      correo: correo,
      rol: 'estudiante',
    };
    const sesionDemo = {
      autenticado: true,
      usuario: usuarioPersonalizado,
      csrfToken: 'token_csrf_demo_liquid_glass_2026',
    };
    localStorage.setItem(CLAVE_SESION_DEMO, JSON.stringify(sesionDemo));
    establecerTokenCsrf(sesionDemo.csrfToken);
    return { exito: true, datos: sesionDemo };
  }

  if (ruta === '/auth/registro' && metodo === 'POST') {
    const usuarioNuevo = {
      nombre: cuerpo.nombre,
      apellidos: cuerpo.apellidos,
      correo: cuerpo.correo,
      rol: 'estudiante',
    };
    const sesionDemo = {
      autenticado: true,
      usuario: usuarioNuevo,
      csrfToken: 'token_csrf_demo_liquid_glass_2026',
    };
    localStorage.setItem(CLAVE_SESION_DEMO, JSON.stringify(sesionDemo));
    establecerTokenCsrf(sesionDemo.csrfToken);
    return { exito: true, datos: sesionDemo };
  }

  if (ruta === '/auth/logout') {
    localStorage.removeItem(CLAVE_SESION_DEMO);
    olvidarTokenCsrf();
    return { exito: true };
  }

  throw new ErrorApi(0, 'sin_conexion', ERRORES_DE_RED);
}

/* ------------------------------------------------------------------ *
 * Endpoints principales
 * ------------------------------------------------------------------ */

export async function obtenerSesion() {
  try {
    const cabeceras = tokenCsrf ? { 'X-CSRF-Token': tokenCsrf } : {};
    const respuesta = await fetch(BASE_API + '/auth/yo', {
      headers: { Accept: 'application/json', ...cabeceras },
      credentials: 'include',
    });

    if (respuesta.ok) {
      const cuerpo = await respuesta.json();
      const datos = cuerpo?.datos ?? { autenticado: false, usuario: null };
      if (datos.autenticado && datos.csrfToken) establecerTokenCsrf(datos.csrfToken);
      return datos;
    }
  } catch {
    /* Fallback en caso de backend apagado */
  }

  try {
    const guardada = localStorage.getItem(CLAVE_SESION_DEMO);
    if (guardada) {
      const sesionDemo = JSON.parse(guardada);
      if (sesionDemo?.csrfToken) establecerTokenCsrf(sesionDemo.csrfToken);
      return sesionDemo;
    }
  } catch {
    /* memoria */
  }

  return { autenticado: false, usuario: null };
}

export async function iniciarSesion(correo, contrasena) {
  const r = await peticion('POST', '/auth/login', { correo, contrasena });
  if (r?.datos?.csrfToken) establecerTokenCsrf(r.datos.csrfToken);
  return r.datos;
}

export async function cerrarSesion() {
  try {
    await peticion('POST', '/auth/logout');
  } finally {
    localStorage.removeItem(CLAVE_SESION_DEMO);
    olvidarTokenCsrf();
  }
}

/* ------------------------------------------------------------------ *
 * Utilidades de presentación y sanitización
 * ------------------------------------------------------------------ */

export function escaparHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function urlSegura(valor, pordefecto = '') {
  if (typeof valor !== 'string') return pordefecto;
  if (valor.startsWith('data:image/svg+xml')) return valor;
  try {
    const url = new URL(valor, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? escaparHtml(url.href)
      : pordefecto;
  } catch {
    return pordefecto;
  }
}

export function formatearPrecio(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'Consultar';
  return '$' + numero.toLocaleString('es-DO');
}

export function formatearFecha(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function textoModalidad(valor) {
  const tabla = {
    presencial: 'Presencial',
    hibrida: 'Híbrida',
    online: 'Online',
    online_en_vivo: 'Online en vivo',
  };
  return tabla[valor] ?? valor ?? '';
}

export function textoDificultad(valor) {
  const tabla = {
    principiante: 'Principiante',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
  };
  return tabla[valor] ?? valor ?? '';
}

export async function registrarCuenta(datos) {
  return (await peticion('POST', '/auth/registro', datos)).datos;
}

export async function listarProgramas() {
  return (await peticion('GET', '/auth/programas')).datos ?? [];
}

export async function listarCursos(filtros = {}) {
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor) query.set(clave, valor);
  }
  const sufijo = query.toString() ? `?${query}` : '';
  return (await peticion('GET', `/catalogo/cursos${sufijo}`)).datos ?? [];
}

export async function obtenerCurso(slug) {
  return (await peticion('GET', `/catalogo/cursos/${encodeURIComponent(slug)}`)).datos;
}

export async function obtenerEstadisticas() {
  return (await peticion('GET', '/catalogo/estadisticas')).datos ?? {};
}

export async function obtenerMisCursos() {
  return (await peticion('GET', '/estudiante/cursos')).datos ?? [];
}

export async function obtenerMisPostulaciones() {
  return (await peticion('GET', '/estudiante/postulaciones')).datos ?? [];
}

export async function obtenerMisCertificados() {
  return (await peticion('GET', '/estudiante/certificados')).datos ?? [];
}
