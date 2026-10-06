-- =====================================================================
-- SISTEMA EDUCA - ESQUEMA DE BASE DE DATOS (SQLite)
-- Versión del esquema : 1.0.0
-- Capa de persistencia del proyecto "Sistema Educa" (reto académico)
--
-- Motor objetivo : SQLite 3.35 o superior (módulo nativo `node:sqlite` de Node.js 24)
-- Codificación   : UTF-8 (sin BOM)
-- Convenciones   : palabras reservadas en MAYÚSCULAS, campos en `snake_case`,
--                  fechas en TEXT ISO-8601 (AAAA-MM-DD) y fechas-hora en
--                  TEXT ISO-8601 UTC (AAAA-MM-DD HH:MM:SS).
--
-- IMPORTANTE - CÓMO EJECUTAR ESTE ARCHIVO
--   1) Las secciones 1 a 8 (DDL) se ejecutan directamente con `db.exec()`.
--   2) La sección 9 "POBLACIÓN INICIAL (SEED)" contiene marcadores de
--      parametro `?` a propósito: NO se deben concatenar valores en el SQL.
--      Debe aplicarse con sentencias preparadas (`db.prepare(...).run(...)`).
--   3) Tres líneas marcador únicas en todo el archivo (sus nombres de
--      sección van precedidos por "@": fin-ddl, inicio-seed y fin-seed)
--      permiten dividir el archivo de forma automática con un simple
--      split. Ver `README.md`.
--
-- CONVENCIONES DEL MODELO
--   * PRIMARY KEY AUTOINCREMENT: clave surrogata `INTEGER PRIMARY KEY AUTOINCREMENT`.
--   * Sin ENUM: los dominios cerrados se validan con `CHECK (columna IN (...))`.
--   * Sin SERIAL: los tipos son primitivos (INTEGER, TEXT, REAL).
--   * Importes monetarios en REAL (suficiente para este alcance).
--   * Baja lógica mediante el campo `estado`; el borrado físico solo está
--     permitido donde la FK usa ON DELETE CASCADE.
--   * Los datos personales se almacenan sin cifrar porque el reto es local:
--     ver las reglas de seguridad en `diccionario-datos.md`.
--
-- Base de datos SIMULADA con fines académicos: no contiene datos reales de
-- personas ni de instituciones. Ver la sección de credenciales al final.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- Configuración recomendada, aplicada una vez por conexión desde el backend.
-- Se dejan comentadas para que `db.exec(esquema.sql)` sea siempre seguro:
-- PRAGMA `journal_mode` = WAL;          -- mejor concurrencia de lectura/escritura
-- PRAGMA synchronous = NORMAL;        -- equilibrio entre rendimiento y durabilidad
-- PRAGMA `busy_timeout` = 5000;         -- espera ante bloqueo de escritura
-- PRAGMA `recursive_triggers` = OFF;    -- evita la reentrada del trigger de fechas


-- =====================================================================
-- SECCIÓN 1. IDENTIDAD, ROLES Y SEGURIDAD
-- Orden de creación: primero `roles`, porque `usuarios` lo referencia.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: `roles`
-- Catálogo de roles de autorización (control de acceso basado en roles,
-- RBAC). Es una tabla y no una constante en el código para que el backend
-- resuelva permisos sin necesidad de desplegar cambios.
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Nombre técnico del rol. UNIQUE impide roles duplicados.
    nombre      TEXT    NOT NULL UNIQUE
                        CHECK (length(trim(nombre)) >= 3),
    -- Descripción funcional del alcance de los permisos del rol.
    descripcion TEXT,
    -- Marca de activación lógica del rol (0 = retirado del catálogo).
    activo      INTEGER NOT NULL DEFAULT 1
                        CHECK (activo IN (0, 1)),
    creado_en   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Tabla: `facultades`
-- Unidad académica de primer nivel que agrupa programas (por ejemplo,
-- "Facultad de Ingeniería y Sistemas").
-- ---------------------------------------------------------------------
CREATE TABLE facultades (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL UNIQUE
                        CHECK (length(trim(nombre)) >= 3),
    sigla       TEXT    NOT NULL UNIQUE
                        CHECK (length(sigla) BETWEEN 2 AND 10),
    descripcion TEXT,
    creado_en   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Tabla: `programas`
-- Programa académico de grado que otorga un título. Un programa agrupa
-- varios `cursos`; un `curso` puede no pertenecer a ningún programa
-- (formación continua), por eso su FK hacia programas es NULLABLE.
-- ---------------------------------------------------------------------
CREATE TABLE programas (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    -- FK a la facultad responsable. RESTRICT: no se elimina una facultad con
    -- programas asociados sin una decisión académica explícita.
    facultad_id        INTEGER NOT NULL
                               REFERENCES facultades (id) ON DELETE RESTRICT,
    nombre             TEXT    NOT NULL
                               CHECK (length(trim(nombre)) >= 3),
    codigo             TEXT    NOT NULL UNIQUE
                               CHECK (length(trim(codigo)) >= 2),
    -- Título que se otorga al graduado.
    titulo_grado       TEXT    NOT NULL
                               CHECK (titulo_grado IN ('Tecnólogo', 'Ingeniero',
                                                       'Licenciado', 'Especialista',
                                                       'Maestro', 'Diplomado')),
    duracion_semestres INTEGER CHECK (duracion_semestres IS NULL
                                      OR duracion_semestres BETWEEN 1 AND 12),
    descripcion        TEXT,
    estado             TEXT    NOT NULL DEFAULT 'activo'
                               CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    creado_en          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Tabla: `usuarios`
-- Registro único de personas: estudiantes, docentes, administradores y
-- soporte. Es la tabla maestra de identidad y autenticación; el rol define
-- los permisos y los perfiles especializados (docente) cuelgan de ella.
--
-- SENSIBLE: `contrasena_hash` NUNCA se expone por la API, NUNCA se escribe en
-- logs y NUNCA se devuelve en un SELECT del backend. Se almacena únicamente
-- el hash (argon2id o bcrypt) con la sal incluida en el mismo valor.
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Correo institucional: identificador de acceso. COLLATE NOCASE hace que
    -- el inicio de sesión y el UNIQUE no distingan mayúsculas de minúsculas.
    correo             TEXT    NOT NULL COLLATE NOCASE UNIQUE
                               CHECK (instr(correo, '@') > 1),
    -- Hash de la contraseña. Formato recomendado:
    -- argon2id$v=19$m=65536,t=3,p=1$<sal-en-base64>$<hash-en-base64>
    contrasena_hash    TEXT    NOT NULL
                               CHECK (length(contrasena_hash) >= 20),
    -- FK al rol que determina los permisos.
    rol_id             INTEGER NOT NULL
                               REFERENCES roles (id) ON DELETE RESTRICT,
    nombre             TEXT    NOT NULL
                               CHECK (length(trim(nombre)) >= 2),
    apellidos           TEXT    CHECK (apellidos IS NULL
                                      OR length(trim(apellidos)) >= 2),
    -- Documento de identidad: dato personal, se enmascara en la API
    -- (por ejemplo ***-45-67890).
    documento_id       TEXT    UNIQUE,
    telefono           TEXT,
    -- Fecha de nacimiento ISO-8601 (AAAA-MM-DD). Dato personal.
    fecha_nacimiento   TEXT    CHECK (fecha_nacimiento IS NULL
                                   OR fecha_nacimiento GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    -- Programa en el que está inscrito el estudiante (NULL para personal).
    programa_id        INTEGER REFERENCES programas (id) ON DELETE SET NULL,
    -- Estado de la cuenta. `eliminado` representa la baja lógica: el
    -- historial académico se conserva y por eso las FKs académicas usan RESTRICT.
    estado             TEXT    NOT NULL DEFAULT 'activo'
                               CHECK (estado IN ('activo', 'inactivo', 'bloqueado',
                                                 'pendiente', 'eliminado')),
    acepta_terminos    INTEGER NOT NULL DEFAULT 0
                               CHECK (acepta_terminos IN (0, 1)),
    ultimo_acceso_en   TEXT,
    creado_en          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Tabla: `tokens_recuperacion`
-- Tokens de un solo uso para recuperación de contraseña y verificación de
-- correo. Se persiste únicamente el hash del token.
--
-- SENSIBLE: `token_hash` NUNCA se expone por la API. El token en claro solo
-- viaja en el correo del usuario y existe únicamente en memoria.
-- ---------------------------------------------------------------------
CREATE TABLE tokens_recuperacion (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id   INTEGER NOT NULL
                         REFERENCES usuarios (id) ON DELETE CASCADE,
    token_hash   TEXT    NOT NULL UNIQUE
                         CHECK (length(token_hash) >= 32),
    proposito    TEXT    NOT NULL DEFAULT 'recuperacion'
                         CHECK (proposito IN ('recuperacion', 'verificacion_correo',
                                              'cambio_contrasena')),
    creado_en    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en    TEXT    NOT NULL,
    usado_en     TEXT,
    ip           TEXT
);


-- =====================================================================
-- SECCIÓN 2. CATÁLOGO ACADÉMICO (cursos y módulos)
-- Solo depende de la sección 1.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: `cursos`
-- Unidad pedagógica y comercial que se publica en el catálogo. El campo
-- `slug` está alineado con `frontend/js/cursos.js` para que el backend
-- resuelva `detalle.html?curso=web` sin lógica adicional.
-- ---------------------------------------------------------------------
CREATE TABLE cursos (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    -- FK NULLABLE: los cursos de formación continua no pertenecen a un
    -- programa de grado. SET NULL evita perder el curso al reorganizar la
    -- oferta académica.
    programa_id        INTEGER REFERENCES programas (id) ON DELETE SET NULL,
    nombre             TEXT    NOT NULL
                               CHECK (length(trim(nombre)) >= 3),
    -- Identificador de URL del frontend (`detalle.html?curso=<slug>`).
    -- Se restringe a ASCII minúsculas, guiones y dígitos.
    slug               TEXT    NOT NULL UNIQUE
                               CHECK (slug NOT GLOB '*[^a-z0-9-]*'
                                      AND length(slug) >= 2),
    codigo             TEXT    NOT NULL UNIQUE
                               CHECK (length(trim(codigo)) >= 2),
    descripcion        TEXT,
    creditos           INTEGER NOT NULL DEFAULT 0
                               CHECK (creditos >= 0),
    -- Valor de venta del programa, sin símbolo de moneda.
    precio             REAL    NOT NULL
                               CHECK (precio >= 0),
    -- Precio de referencia tachado en el catálogo.
    precio_antes       REAL    CHECK (precio_antes IS NULL OR precio_antes >= 0),
    modalidad          TEXT    NOT NULL DEFAULT 'online'
                               CHECK (modalidad IN ('presencial', 'hibrida',
                                                    'online', 'online_en_vivo')),
    -- Nivel técnico del curso (dominio cerrado controlado por CHECK).
    dificultad         TEXT    NOT NULL DEFAULT 'principiante'
                               CHECK (dificultad IN ('principiante', 'intermedio',
                                                     'avanzado')),
    -- Etiqueta comercial de nivel tal como se publica en el frontend
    -- (por ejemplo "Principiante a intermedio").
    nivel_descripcion  TEXT,
    duracion_semanas   INTEGER CHECK (duracion_semanas IS NULL
                                      OR duracion_semanas > 0),
    -- Carga horaria semanal declarada en el catálogo.
    horas              INTEGER NOT NULL DEFAULT 0
                               CHECK (horas >= 0),
    imagen_url         TEXT,
    -- 1 = aparece en la sección destacada del inicio.
    destacado          INTEGER NOT NULL DEFAULT 0
                               CHECK (destacado IN (0, 1)),
    estado             TEXT    NOT NULL DEFAULT 'borrador'
                               CHECK (estado IN ('borrador', 'publicado', 'archivado')),
    creado_en          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Tabla: `modulos`
-- Unidades temáticas ordenadas del plan de estudios de un curso.
-- UNIQUE(`curso_id`, orden) impide dos módulos en la misma posición.
-- ---------------------------------------------------------------------
CREATE TABLE modulos (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id          INTEGER NOT NULL
                              REFERENCES cursos (id) ON DELETE CASCADE,
    nombre            TEXT    NOT NULL
                              CHECK (length(trim(nombre)) >= 3),
    descripcion       TEXT,
    -- Posición dentro del plan de estudios.
    orden             INTEGER NOT NULL
                              CHECK (orden > 0),
    duracion_minutos  INTEGER CHECK (duracion_minutos IS NULL
                                     OR duracion_minutos > 0),
    creado_en         TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_modulos_curso_orden UNIQUE (curso_id, orden)
);


-- =====================================================================
-- SECCIÓN 3. COMUNIDAD ACADÉMICA (personal docente)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: `docentes`
-- Perfil profesional en relacion 1:1 con un usuario (UNIQUE en `usuario_id`).
-- Permite que una persona sea docente sin duplicar identidad ni credenciales.
-- ---------------------------------------------------------------------
CREATE TABLE docentes (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    -- FK 1:1 con `usuarios`. CASCADE: al borrarse el usuario se borra su
    -- perfil docente; los grupos asignados bloquean el borrado por RESTRICT.
    usuario_id         INTEGER NOT NULL UNIQUE
                               REFERENCES usuarios (id) ON DELETE CASCADE,
    especialidad       TEXT    NOT NULL
                               CHECK (length(trim(especialidad)) >= 3),
    -- Título o certificación del docente (por ejemplo "CISSP",
    -- "PhD en Inteligencia Artificial").
    titulo_academico   TEXT,
    biografia          TEXT,
    experiencia_anios  INTEGER CHECK (experiencia_anios IS NULL
                                     OR experiencia_anios >= 0),
    creado_en          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================
-- SECCIÓN 4. OPERACIÓN ACADÉMICA
-- Grupos, matrículas, asistencias, evaluaciones, calificaciones y
-- certificados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: `grupos`
-- Edición o sección concreta de un curso, con docente, cupo y horario.
-- Es la unidad real de matrícula y permite ofrecer el mismo curso varias
-- veces (turnos, modalidades o docentes distintos).
--
-- NOTA DE NORMALIZACIÓN: no se almacena el número de inscritos; se obtiene
-- con COUNT(*) sobre `matriculas` para no duplicar estado derivado ni
-- desincronizar el conteo con el cupo.
-- ---------------------------------------------------------------------
CREATE TABLE grupos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id     INTEGER NOT NULL
                         REFERENCES cursos (id) ON DELETE RESTRICT,
    -- NULLABLE mientras el grupo aún no tiene docente asignado.
    docente_id   INTEGER REFERENCES docentes (id) ON DELETE RESTRICT,
    codigo       TEXT    NOT NULL UNIQUE
                         CHECK (length(trim(codigo)) >= 2),
    cupo         INTEGER NOT NULL
                         CHECK (cupo > 0),
    aula         TEXT,
    -- Descripción del horario (por ejemplo "Mar/Jue 18:00-20:00, salón 3").
    horario      TEXT,
    fecha_inicio TEXT    CHECK (fecha_inicio IS NULL
                               OR fecha_inicio GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    fecha_fin    TEXT    CHECK (fecha_fin IS NULL
                               OR fecha_fin GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    estado       TEXT    NOT NULL DEFAULT 'programado'
                         CHECK (estado IN ('programado', 'en_curso', 'finalizado',
                                           'cancelado')),
    creado_en    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Tabla: `matriculas`
-- Inscripción de un estudiante a un grupo. UNIQUE(`grupo_id`, `estudiante_id`)
-- impide la doble matrícula en el mismo grupo.
--
-- NOTA DE INTEGRIDAD: al validar el cupo el backend debe contar las filas
-- con estado 'activa' dentro de una transacción, para no sobrepasar
-- `grupos.cupo` bajo concurrencia.
-- ---------------------------------------------------------------------
CREATE TABLE matriculas (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    -- FK al usuario con rol estudiante. RESTRICT: el historial académico no
    -- se borra en cascada; la baja de una persona es lógica (`estado`).
    estudiante_id      INTEGER NOT NULL
                               REFERENCES usuarios (id) ON DELETE RESTRICT,
    grupo_id           INTEGER NOT NULL
                               REFERENCES grupos (id) ON DELETE RESTRICT,
    estado             TEXT    NOT NULL DEFAULT 'pendiente'
                               CHECK (estado IN ('pendiente', 'activa',
                                                 'finalizada', 'cancelada')),
    fecha_matricula    TEXT    NOT NULL DEFAULT CURRENT_DATE,
    -- Avance del curso en porcentaje (0 a 100).
    progreso           REAL    NOT NULL DEFAULT 0
                               CHECK (progreso BETWEEN 0 AND 100),
    nota_final         REAL    CHECK (nota_final IS NULL
                                      OR (nota_final >= 0 AND nota_final <= 100)),
    -- Escala de calificación: A >= 90, B >= 80, C >= 70, D >= 60, F < 60.
    -- La calcula el backend a partir de `nota_final`.
    calificacion       TEXT    CHECK (calificacion IS NULL
                                      OR calificacion IN ('A', 'B', 'C', 'D', 'F')),
    fecha_finalizacion TEXT,
    creado_en          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_matriculas_grupo_estudiante UNIQUE (grupo_id, estudiante_id)
);

-- ---------------------------------------------------------------------
-- Tabla: `asistencias`
-- Registro de asistencia por fecha. UNIQUE(`matricula_id`, fecha) impide
-- cargar dos veces la misma sesión del mismo estudiante.
-- ---------------------------------------------------------------------
CREATE TABLE asistencias (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula_id    INTEGER NOT NULL
                            REFERENCES matriculas (id) ON DELETE CASCADE,
    fecha           TEXT    NOT NULL
                            CHECK (fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    estado          TEXT    NOT NULL
                            CHECK (estado IN ('presente', 'ausente', 'tardanza',
                                              'justificada', 'permiso')),
    -- Texto libre con el motivo cuando la ausencia está justificada.
    justificacion   TEXT,
    minutos_tarde   INTEGER CHECK (minutos_tarde IS NULL OR minutos_tarde >= 0),
    -- Usuario que registro la asistencia (docente o soporte).
    registrado_por  INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
    creado_en       TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_asistencias_matricula_fecha UNIQUE (matricula_id, fecha)
);

-- ---------------------------------------------------------------------
-- Tabla: `evaluaciones`
-- Pruebas de un grupo con su peso en la nota final. La suma de
-- `ponderacion` de un grupo debería ser 100; el backend debe validarlo
-- antes de cerrar el grupo.
-- ---------------------------------------------------------------------
CREATE TABLE evaluaciones (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id     INTEGER NOT NULL
                         REFERENCES grupos (id) ON DELETE CASCADE,
    titulo       TEXT    NOT NULL
                         CHECK (length(trim(titulo)) >= 3),
    tipo         TEXT    NOT NULL DEFAULT 'parcial'
                         CHECK (tipo IN ('parcial', 'examen', 'tarea',
                                         'proyecto', 'quiz', 'presentacion')),
    fecha        TEXT    NOT NULL
                         CHECK (fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    -- Peso porcentual dentro de la nota final del grupo (0 < peso <= 100).
    ponderacion  REAL    NOT NULL
                         CHECK (ponderacion > 0 AND ponderacion <= 100),
    descripcion  TEXT,
    creado_en    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_evaluaciones_grupo_titulo UNIQUE (grupo_id, titulo)
);

-- ---------------------------------------------------------------------
-- Tabla: `calificaciones`
-- Nota obtenida por un estudiante en una evaluación.
-- UNIQUE(`evaluacion_id`, `matricula_id`) impide duplicar la calificación.
-- ---------------------------------------------------------------------
CREATE TABLE calificaciones (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluacion_id   INTEGER NOT NULL
                            REFERENCES evaluaciones (id) ON DELETE CASCADE,
    matricula_id    INTEGER NOT NULL
                            REFERENCES matriculas (id) ON DELETE CASCADE,
    -- Escala numérica de 0 a 100.
    nota            REAL    NOT NULL
                            CHECK (nota >= 0 AND nota <= 100),
    observaciones   TEXT,
    -- 0 = nota privada; 1 = nota visible para el estudiante.
    publicado       INTEGER NOT NULL DEFAULT 0
                            CHECK (publicado IN (0, 1)),
    -- Docente que registro la nota (para autoría y auditoría).
    docente_id      INTEGER REFERENCES docentes (id) ON DELETE SET NULL,
    creado_en       TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_calificaciones_evaluacion_matricula
        UNIQUE (evaluacion_id, matricula_id)
);

-- ---------------------------------------------------------------------
-- Tabla: `certificados`
-- Certificado de finalización con código de verificación público.
-- UNIQUE(`matricula_id`): una matrícula genera un único certificado; una
-- revocación se registra sobre el mismo registro (estado + `revocado_en`).
-- ---------------------------------------------------------------------
CREATE TABLE certificados (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Titular del certificado. RESTRICT: un certificado es evidencia académica.
    usuario_id           INTEGER NOT NULL
                                 REFERENCES usuarios (id) ON DELETE RESTRICT,
    matricula_id         INTEGER NOT NULL UNIQUE
                                 REFERENCES matriculas (id) ON DELETE RESTRICT,
    -- Código público de verificación (por ejemplo EDU-2026-4F2A9C). No es secreto.
    codigo_verificacion  TEXT    NOT NULL UNIQUE
                                 CHECK (length(trim(codigo_verificacion)) >= 8),
    horas_acreditadas    REAL    CHECK (horas_acreditadas IS NULL
                                        OR horas_acreditadas >= 0),
    nota_final           REAL    CHECK (nota_final IS NULL
                                        OR (nota_final >= 0 AND nota_final <= 100)),
    url_publico          TEXT,
    emitido_en           TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 0 = certificado inrevocable según la política de la institución.
    revocable            INTEGER NOT NULL DEFAULT 1
                                 CHECK (revocable IN (0, 1)),
    revocado_en          TEXT,
    motivo_revocacion    TEXT,
    estado               TEXT    NOT NULL DEFAULT 'emitido'
                                 CHECK (estado IN ('emitido', 'revocado', 'anulado')),
    -- Coherencia: solo un certificado revocado tiene fecha de revocación.
    CONSTRAINT ck_certificados_revocacion CHECK (
        (estado = 'revocado' AND revocado_en IS NOT NULL) OR (estado <> 'revocado')
    )
);


-- =====================================================================
-- SECCIÓN 5. EMPLEO Y POSTULACIONES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: `vacantes`
-- Oferta laboral de la bolsa de trabajo publicada en el inicio del portal.
-- No contiene datos de personas, solo de la empresa y del puesto.
-- ---------------------------------------------------------------------
CREATE TABLE vacantes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo       TEXT    NOT NULL
                         CHECK (length(trim(titulo)) >= 3),
    empresa      TEXT    NOT NULL
                         CHECK (length(trim(empresa)) >= 2),
    ubicacion    TEXT,
    modalidad    TEXT    NOT NULL DEFAULT 'remoto'
                         CHECK (modalidad IN ('presencial', 'hibrida', 'remoto')),
    descripcion  TEXT,
    salario_min  REAL    CHECK (salario_min IS NULL OR salario_min >= 0),
    salario_max  REAL    CHECK (salario_max IS NULL OR salario_max >= 0),
    -- Programa preferente; sirve para validar la pertinencia de la postulación.
    programa_id  INTEGER REFERENCES programas (id) ON DELETE SET NULL,
    estado       TEXT    NOT NULL DEFAULT 'borrador'
                         CHECK (estado IN ('borrador', 'publicada', 'pausada',
                                           'cerrada')),
    publicada_en TEXT,
    cierra_en    TEXT,
    creado_en    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- El rango salarial nunca puede ser inverso.
    CONSTRAINT ck_vacantes_rango CHECK (
        salario_max IS NULL OR salario_min IS NULL OR salario_max >= salario_min
    )
);

-- ---------------------------------------------------------------------
-- Tabla: `solicitudes`
-- Postulación de un usuario, con dos destinos posibles:
--   * `grupo_id`  -> postulación a un grupo del catálogo (boton
--                    "Postular ahora" de `frontend/js/cursos.js`);
--   * `vacante_id` -> postulación a una vacante de la bolsa de trabajo.
-- El CHECK exige EXACTAMENTE un destino, lo que garantiza la integridad
-- del modelo sin duplicar tablas ni permitir postulaciones huerfanas.
--
-- El par (`usuario_id`, destino) es único gracias a dos índices únicos
-- parciales, soportados de forma nativa por SQLite.
-- ---------------------------------------------------------------------
CREATE TABLE solicitudes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id   INTEGER NOT NULL
                         REFERENCES usuarios (id) ON DELETE CASCADE,
    grupo_id     INTEGER REFERENCES grupos (id) ON DELETE CASCADE,
    vacante_id   INTEGER REFERENCES vacantes (id) ON DELETE CASCADE,
    estado       TEXT    NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente', 'en_revision',
                                           'aceptada', 'rechazada', 'cancelada')),
    -- Carta de presentacion o motivo de la postulación (texto libre).
    motivo       TEXT,
    cv_url       TEXT,
    enviada_en   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisada_en  TEXT,
    -- Usuario (soporte o administrador) que realizó la revisión.
    revisada_por INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
    respuesta    TEXT,
    CONSTRAINT ck_solicitudes_destino CHECK (
        (grupo_id IS NULL) <> (vacante_id IS NULL)
    )
);


-- =====================================================================
-- SECCIÓN 6. AUDITORÍA DE SESIONES Y TRAZABILIDAD
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: `sesiones`
-- Sesiones activas del backend, usadas por la autenticación con cookie.
--
-- SEGURIDAD (lectura obligatoria del backend):
--   * Se genera un token opaco aleatorio de 32 bytes o más para el
--     navegador y se persiste ÚNICAMENTE `token_hash` = SHA-256 del token.
--     Si alguien lee la base de datos, no puede suplantar a ningún usuario.
--   * `csrf_token_hash` guarda el hash del token anti-CSRF por la misma
--     razón: nunca se almacena el valor en claro.
--   * La cookie debe enviarse con HttpOnly, Secure y SameSite=Lax o Strict.
--   * La revocación es lógica: se fija `revocada_en`; invalidar todas las
--     sesiones de un usuario es un único UPDATE sobre esta tabla.
--   * `expira_en` y `creada_en` deben usar siempre el mismo formato ISO-8601
--     UTC, porque el CHECK los compara lexicográficamente.
-- ---------------------------------------------------------------------
CREATE TABLE sesiones (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id        INTEGER NOT NULL
                              REFERENCES usuarios (id) ON DELETE CASCADE,
    -- SHA-256 en hexadecimal (64 caracteres) del token de sesión.
    token_hash        TEXT    NOT NULL UNIQUE
                              CHECK (length(token_hash) >= 32),
    -- SHA-256 del token anti-CSRF entregado en la respuesta de login.
    csrf_token_hash   TEXT    NOT NULL
                              CHECK (length(csrf_token_hash) >= 32),
    -- Metadatos del cliente, para auditoría y detección de anomalías.
    agente_usuario    TEXT,
    ip                TEXT,
    creada_en         TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en         TEXT    NOT NULL,
    ultimo_uso_en     TEXT,
    revocada_en       TEXT,
    motivo_revocacion TEXT,
    CONSTRAINT ck_sesiones_ventana CHECK (expira_en > creada_en)
);

-- ---------------------------------------------------------------------
-- Tabla: `intentos_sesion`
-- Bitácora de intentos de autenticación. Es la base para el throttling
-- (bloqueo temporal por IP o por correo) y para detectar ataques de
-- fuerza bruta. Retención mínima recomendada: 90 días.
-- ---------------------------------------------------------------------
CREATE TABLE intentos_sesion (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Correo intentado; puede no existir en `usuarios`.
    correo         TEXT    NOT NULL COLLATE NOCASE,
    -- Usuario resuelto cuando el correo sí existe (NULL si no existe).
    usuario_id     INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
    ip             TEXT,
    agente_usuario TEXT,
    -- 1 = autenticación exitosa; 0 = fallo.
    exitoso        INTEGER NOT NULL DEFAULT 0
                           CHECK (exitoso IN (0, 1)),
    -- Motivo del resultado. Con `credenciales_invalidas` y
    -- `correo_inexistente` la API debe responder SIEMPRE el mismo mensaje,
    -- para no revelar que correos están registrados.
    motivo         TEXT    NOT NULL
                           CHECK (motivo IN ('exitoso', 'credenciales_invalidas',
                                             'correo_inexistente', 'cuenta_bloqueada',
                                             'cuenta_inactiva', 'throttling',
                                             'token_invalido', 'csrf_invalido')),
    creado_en      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Tabla: `auditoria`
-- Trazabilidad de acciones relevantes (alta, actualizacion, borrado,
-- autenticación, exportación). `datos_antes` y `datos_despues` guardan
-- instantáneas JSON para reconstruir el cambio.
--
-- REGLAS: nunca se vuelca `contrasena_hash`, `token_hash` ni ningún dato
-- sensible en estas columnas; el backend debe filtrarlos antes del INSERT.
-- ---------------------------------------------------------------------
CREATE TABLE auditoria (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    -- NULL cuando la acción no tiene actor (por ejemplo, un intento fallido).
    usuario_id     INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
    accion         TEXT    NOT NULL
                           CHECK (accion IN ('crear', 'leer', 'actualizar', 'eliminar',
                                             'iniciar_sesion', 'cerrar_sesion',
                                             'cambiar_contrasena', 'exportar',
                                             'restaurar', 'acceder_denegado')),
    entidad        TEXT    NOT NULL
                           CHECK (length(trim(entidad)) >= 2),
    entidad_id     INTEGER,
    -- Instantáneas en JSON; `json_valid` impide guardar texto corrupto.
    datos_antes    TEXT    CHECK (datos_antes IS NULL OR json_valid(datos_antes)),
    datos_despues  TEXT    CHECK (datos_despues IS NULL OR json_valid(datos_despues)),
    ip             TEXT,
    agente_usuario TEXT,
    creado_en      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================
-- SECCIÓN 7. ÍNDICES
-- Se indexan las claves foráneas declaradas, las columnas usadas en
-- búsquedas (código, correo, slug), los filtros frecuentes (estado) y el
-- ordenamiento temporal descendente de las bitácoras.
-- Nota: las restricciones UNIQUE ya generan un índice automático, por eso
-- no se repiten aquí los índices de correo, `documento_id`, código, slug,
-- `token_hash` o `codigo_verificacion`.
-- =====================================================================

-- Índices de `usuarios`
CREATE INDEX ix_usuarios_rol             ON usuarios (rol_id);
CREATE INDEX ix_usuarios_estado          ON usuarios (estado);
CREATE INDEX ix_usuarios_programa        ON usuarios (programa_id);
CREATE INDEX ix_usuarios_apellidos       ON usuarios (apellidos);
CREATE INDEX ix_usuarios_creado_en       ON usuarios (creado_en DESC);

-- Índices de `programas`
CREATE INDEX ix_programas_facultad       ON programas (facultad_id);
CREATE INDEX ix_programas_estado         ON programas (estado);
CREATE INDEX ix_programas_nombre         ON programas (nombre);

-- Índices de `cursos` (el catálogo se filtra por estado y ordena por precio)
CREATE INDEX ix_cursos_programa          ON cursos (programa_id);
CREATE INDEX ix_cursos_estado            ON cursos (estado);
CREATE INDEX ix_cursos_dificultad        ON cursos (dificultad);
CREATE INDEX ix_cursos_estado_precio     ON cursos (estado, precio);

-- Índices de `modulos`
CREATE INDEX ix_modulos_curso            ON modulos (curso_id);

-- Índices de `docentes`
CREATE INDEX ix_docentes_especialidad    ON docentes (especialidad);

-- Índices de `grupos`
CREATE INDEX ix_grupos_curso             ON grupos (curso_id);
CREATE INDEX ix_grupos_docente           ON grupos (docente_id);
CREATE INDEX ix_grupos_estado            ON grupos (estado);

-- Índices de `matriculas`
CREATE INDEX ix_matriculas_estudiante    ON matriculas (estudiante_id);
CREATE INDEX ix_matriculas_grupo         ON matriculas (grupo_id);
CREATE INDEX ix_matriculas_estado        ON matriculas (estado);
-- Índice compuesto para el control de cupo: cuenta solo las activas.
CREATE INDEX ix_matriculas_grupo_estado  ON matriculas (grupo_id, estado);

-- Índices de `asistencias`
CREATE INDEX ix_asistencias_matricula    ON asistencias (matricula_id);
CREATE INDEX ix_asistencias_fecha        ON asistencias (fecha);
CREATE INDEX ix_asistencias_estado       ON asistencias (estado);
CREATE INDEX ix_asistencias_registrador  ON asistencias (registrado_por);

-- Índices de `evaluaciones`
CREATE INDEX ix_evaluaciones_grupo       ON evaluaciones (grupo_id);
CREATE INDEX ix_evaluaciones_fecha       ON evaluaciones (fecha);

-- Índices de `calificaciones`
CREATE INDEX ix_calificaciones_matricula ON calificaciones (matricula_id);
CREATE INDEX ix_calificaciones_evaluacion ON calificaciones (evaluacion_id);
CREATE INDEX ix_calificaciones_docente    ON calificaciones (docente_id);

-- Índices de `certificados`
CREATE INDEX ix_certificados_usuario     ON certificados (usuario_id);
CREATE INDEX ix_certificados_emitido     ON certificados (emitido_en DESC);
CREATE INDEX ix_certificados_estado      ON certificados (estado);

-- Índices de `vacantes`
CREATE INDEX ix_vacantes_estado          ON vacantes (estado);
CREATE INDEX ix_vacantes_programa        ON vacantes (programa_id);
CREATE INDEX ix_vacantes_empresa         ON vacantes (empresa);

-- Índices de `solicitudes`
CREATE INDEX ix_solicitudes_usuario      ON solicitudes (usuario_id, estado);
CREATE INDEX ix_solicitudes_grupo        ON solicitudes (grupo_id, estado);
CREATE INDEX ix_solicitudes_vacante      ON solicitudes (vacante_id, estado);
CREATE INDEX ix_solicitudes_revisor      ON solicitudes (revisada_por);
-- Índices únicos parciales: un usuario postula una sola vez a cada destino.
CREATE UNIQUE INDEX ux_solicitudes_usuario_grupo
    ON solicitudes (usuario_id, grupo_id) WHERE grupo_id IS NOT NULL;
CREATE UNIQUE INDEX ux_solicitudes_usuario_vacante
    ON solicitudes (usuario_id, vacante_id) WHERE vacante_id IS NOT NULL;

-- Índices de `sesiones`
CREATE INDEX ix_sesiones_usuario         ON sesiones (usuario_id);
CREATE INDEX ix_sesiones_expira          ON sesiones (expira_en);
-- Consulta crítica de seguridad: sesiones vivas de un usuario.
CREATE INDEX ix_sesiones_usuario_viva    ON sesiones (usuario_id, revocada_en, expira_en);

-- Índices de `intentos_sesion` (soporte del throttling)
CREATE INDEX ix_intentos_correo          ON intentos_sesion (correo, creado_en DESC);
CREATE INDEX ix_intentos_ip              ON intentos_sesion (ip, creado_en DESC);
CREATE INDEX ix_intentos_usuario         ON intentos_sesion (usuario_id);
CREATE INDEX ix_intentos_creado_en       ON intentos_sesion (creado_en DESC);

-- Índices de `auditoria`
CREATE INDEX ix_auditoria_usuario        ON auditoria (usuario_id, creado_en DESC);
CREATE INDEX ix_auditoria_entidad        ON auditoria (entidad, entidad_id);
CREATE INDEX ix_auditoria_creado_en      ON auditoria (creado_en DESC);

-- Índices de `tokens_recuperacion`
CREATE INDEX ix_tokens_usuario           ON tokens_recuperacion (usuario_id, expira_en);
CREATE INDEX ix_tokens_expira            ON tokens_recuperacion (expira_en);


-- =====================================================================
-- SECCIÓN 8. OBJETOS COMPLEMENTARIOS (trigger y vistas)
-- =====================================================================

-- Trigger: SQLite no admite la columna `ON UPDATE CURRENT_TIMESTAMP`, por lo
-- que `usuarios.actualizado_en` se mantiene con un trigger AFTER UPDATE. La
-- cláusula WHEN evita la reentrada: solo se actualiza la marca de tiempo
-- cuando el backend no fijo ya una nueva.
CREATE TRIGGER trg_usuarios_actualizado_en
AFTER UPDATE ON usuarios
FOR EACH ROW
WHEN NEW.actualizado_en = OLD.actualizado_en
BEGIN
    UPDATE usuarios
       SET actualizado_en = CURRENT_TIMESTAMP
     WHERE id = NEW.id;
END;

-- Vista: catálogo público. Expone ÚNICAMENTE datos de curso y programa; no
-- incluye ninguna columna de `usuarios` (mínimo privilegio por diseño). Los
-- conteos de postulaciones y matrículas reemplazan los números quemados en
-- el frontend.
CREATE VIEW vista_catalogo_cursos AS
SELECT
    c.id                AS curso_id,
    c.slug,
    c.nombre,
    c.descripcion,
    c.precio,
    c.precio_antes,
    c.modalidad,
    c.dificultad,
    c.nivel_descripcion,
    c.duracion_semanas,
    c.horas,
    c.imagen_url,
    c.destacado,
    p.codigo            AS programa_codigo,
    p.nombre            AS programa_nombre,
    p.titulo_grado,
    f.sigla             AS facultad_sigla,
    f.nombre            AS facultad_nombre,
    (SELECT COUNT(*)
       FROM solicitudes s
       JOIN grupos g ON g.id = s.grupo_id
      WHERE g.curso_id = c.id)                    AS postulaciones,
    (SELECT COUNT(*)
       FROM matriculas m
       JOIN grupos g ON g.id = m.grupo_id
      WHERE g.curso_id = c.id
        AND m.estado = 'activa')                  AS matriculados
FROM cursos c
LEFT JOIN programas p ON p.id = c.programa_id
LEFT JOIN facultades f ON f.id = p.facultad_id
WHERE c.estado = 'publicado';

-- Vista: verificación pública de certificados. No expone nombre, correo ni
-- documento del titular: solo el código y los datos académicos mínimos.
CREATE VIEW vista_certificados_publicos AS
SELECT
    c.codigo_verificacion,
    c.estado              AS estado_certificado,
    c.emitido_en,
    c.revocado_en,
    c.horas_acreditadas,
    c.nota_final,
    m.calificacion,
    cu.nombre             AS curso,
    cu.slug               AS curso_slug,
    g.codigo              AS grupo_codigo
FROM certificados c
JOIN matriculas m ON m.id = c.matricula_id
JOIN grupos      g ON g.id = m.grupo_id
JOIN cursos      cu ON cu.id = g.curso_id;


-- @fin-ddl


-- =====================================================================
-- SECCIÓN 9. POBLACIÓN INICIAL (SEED)
-- ---------------------------------------------------------------------
-- Los INSERT de esta sección usan MARCADORES DE PARAMETRO (`?`) de forma
-- deliberada: nunca se concatenan valores dentro del texto SQL, lo que
-- elimina por completo la inyeccion SQL. Cada sentencia se ejecuta con una
-- sentencia preparada:
--
--     const stmt = db.prepare(sql);
--     stmt.run(param1, param2, ...);
--
-- Para obtener el id generado: Number(stmt.run(...).lastInsertRowid).
--
-- Esta sección está delimitada por los marcadores `-- @inicio-seed` y
-- `-- @fin-seed`. Debe extraerse y aplicarse aparte para que el archivo
-- siga siendo ejecutable con `db.exec()` (ver `README.md`).
-- Los conteos indicados corresponden al catálogo público visible en
-- `frontend/cursos.html`: 8 programas publicados.
-- =====================================================================

-- @inicio-seed

-- --- 9.1 Roles (4 filas) ----------------------------------------------
-- parametros: nombre, descripción
INSERT INTO roles (nombre, descripcion) VALUES (?, ?);
INSERT INTO roles (nombre, descripcion) VALUES (?, ?);
INSERT INTO roles (nombre, descripcion) VALUES (?, ?);
INSERT INTO roles (nombre, descripcion) VALUES (?, ?);

-- --- 9.2 Facultades (3 filas) -----------------------------------------
-- parametros: nombre, sigla, descripción
INSERT INTO facultades (nombre, sigla, descripcion) VALUES (?, ?, ?);
INSERT INTO facultades (nombre, sigla, descripcion) VALUES (?, ?, ?);
INSERT INTO facultades (nombre, sigla, descripcion) VALUES (?, ?, ?);

-- --- 9.3 Programas académicos (4 filas) --------------------------------
-- parametros: `facultad_id`, nombre, código, `titulo_grado`,
--             `duracion_semestres`, descripción
INSERT INTO programas (facultad_id, nombre, codigo, titulo_grado, duracion_semestres, descripcion)
VALUES (?, ?, ?, ?, ?, ?);
INSERT INTO programas (facultad_id, nombre, codigo, titulo_grado, duracion_semestres, descripcion)
VALUES (?, ?, ?, ?, ?, ?);
INSERT INTO programas (facultad_id, nombre, codigo, titulo_grado, duracion_semestres, descripcion)
VALUES (?, ?, ?, ?, ?, ?);
INSERT INTO programas (facultad_id, nombre, codigo, titulo_grado, duracion_semestres, descripcion)
VALUES (?, ?, ?, ?, ?, ?);

-- --- 9.4 Catálogo de cursos (8 filas: los publicados en el frontend) -----
-- parametros: `programa_id`, nombre, slug, código, descripción, creditos,
--             precio, `precio_antes`, modalidad, dificultad,
--             `nivel_descripcion`, `duracion_semanas`, horas, `imagen_url`,
--             destacado, estado
--
-- Tabla de referencia de los valores que debe enlazar el backend.
-- NO es una sentencia: es documentación en comentarios. La columna `slug`
-- corresponde a `detalle.html?curso=<slug>` en el frontend:
--
--  slug      | código  | nombre                  | precio | antes | modalidad       | dificultad  | duración | h/sem | área
--  ----------+---------+-------------------------+--------+-------+----------------+-------------+----------+-------+------------
--  web       | EDU-WEB | Programacion Web        |  320.0 | 520.0 | online_en_vivo | intermedio  |       8 |     6 | Tecnología
--  bd        | EDU-BD  | Bases de Datos          |  280.0 | 450.0 | híbrida        | intermedio  |       6 |     5 | Datos
--  ux        | EDU-UX  | Diseño UI/UX            |  260.0 | 410.0 | online         | principiante|       5 |     4 | Diseño
--  cyber     | EDU-SEC | Ciberseguridad          |  390.0 | 620.0 | presencial     | intermedio  |       6 |     8 | Seguridad
--  ia        | EDU-IA  | Inteligencia Artificial |  450.0 | 700.0 | online_en_vivo | intermedio  |      10 |     7 | Tecnología
--  marketing | EDU-MKT | Marketing Digital       |  220.0 | 360.0 | híbrida        | principiante|       4 |     4 | Negocios
--  inglés    | EDU-ENG | Inglés Técnico          |  180.0 | 300.0 | online         | intermedio  |      12 |     3 | Idiomas
--  movil     | EDU-MOV | Desarrollo Movil        |  340.0 | 540.0 | presencial     | intermedio  |       8 |     6 | Tecnología
--
-- Acentuación: los textos se almacenan con acentuación completa
-- ("Programacion Web", "Diseño UI/UX", "Inglés Técnico", "Desarrollo Movil"
-- se guardan con sus tildes en la base de datos). `slug` y `codigo` son ASCII
-- por diseño, porque son claves técnicas usadas en URL y códigos.
INSERT INTO cursos (programa_id, nombre, slug, codigo, descripcion, creditos,
                    precio, precio_antes, modalidad, dificultad, nivel_descripcion,
                    duracion_semanas, horas, imagen_url, destacado, estado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
-- Se esperan 8 sentencias con la misma lista de columnas.

-- --- 9.5 Módulos del plan de estudios ---------------------------------
-- Como mínimo un módulo por curso; el orden arranca en 1.
-- parametros: `curso_id`, nombre, descripción, orden, `duracion_minutos`
INSERT INTO modulos (curso_id, nombre, descripcion, orden, duracion_minutos)
VALUES (?, ?, ?, ?, ?);

-- --- 9.6 Usuarios de prueba --------------------------------------------
-- El orden importa: primero el rol y después el usuario que lo referencia.
-- parametros: correo, `contrasena_hash`, `rol_id`, nombre, apellidos,
--             `documento_id`, teléfono, `fecha_nacimiento`, `programa_id`
--
-- SENSIBLE: `contrasena_hash` se genera en el backend con argon2id o bcrypt.
-- El seed NUNCA recibe la contraseña en claro: recibe el hash ya calculado.
INSERT INTO usuarios (correo, contrasena_hash, rol_id, nombre, apellidos,
                      documento_id, telefono, fecha_nacimiento, programa_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- --- 9.7 Docentes (perfil 1:1 con un usuario) -------------------------
-- parametros: `usuario_id`, especialidad, `titulo_academico`, `experiencia_anios`
INSERT INTO docentes (usuario_id, especialidad, titulo_academico, experiencia_anios)
VALUES (?, ?, ?, ?);

-- --- 9.8 Grupos (una edición por curso) --------------------------------
-- parametros: `curso_id`, `docente_id`, código, cupo, aula, horario,
--             `fecha_inicio`, `fecha_fin`, estado
INSERT INTO grupos (curso_id, docente_id, codigo, cupo, aula, horario,
                    fecha_inicio, fecha_fin, estado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- --- 9.9 Matrículas ----------------------------------------------------
-- parametros: `estudiante_id`, `grupo_id`, estado, `fecha_matricula`, progreso
INSERT INTO matriculas (estudiante_id, grupo_id, estado, fecha_matricula, progreso)
VALUES (?, ?, ?, ?, ?);

-- --- 9.10 Asistencias ---------------------------------------------------
-- parametros: `matricula_id`, fecha, estado, justificacion, `registrado_por`
INSERT INTO asistencias (matricula_id, fecha, estado, justificacion, registrado_por)
VALUES (?, ?, ?, ?, ?);

-- --- 9.11 Evaluaciones y calificaciones --------------------------------
-- parametros: `grupo_id`, título, tipo, fecha, ponderación
INSERT INTO evaluaciones (grupo_id, titulo, tipo, fecha, ponderacion)
VALUES (?, ?, ?, ?, ?);
-- parametros: `evaluacion_id`, `matricula_id`, nota, observaciones, publicado,
--             `docente_id`
INSERT INTO calificaciones (evaluacion_id, matricula_id, nota, observaciones, publicado, docente_id)
VALUES (?, ?, ?, ?, ?, ?);

-- --- 9.12 Certificados --------------------------------------------------
-- parametros: `usuario_id`, `matricula_id`, `codigo_verificacion`,
--             `horas_acreditadas`, `nota_final`, estado
INSERT INTO certificados (usuario_id, matricula_id, codigo_verificacion,
                         horas_acreditadas, nota_final, estado)
VALUES (?, ?, ?, ?, ?, ?);

-- --- 9.13 Vacantes de la bolsa de trabajo --------------------------------
-- parametros: título, empresa, ubicación, modalidad, descripción,
--             `salario_min`, `salario_max`, estado
INSERT INTO vacantes (titulo, empresa, ubicacion, modalidad, descripcion,
                      salario_min, salario_max, estado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- --- 9.14 Postulaciones -------------------------------------------------
-- parametros: `usuario_id`, `grupo_id`, `vacante_id`, estado, motivo
-- Postulación a un curso del catálogo: `grupo_id` con valor, `vacante_id` NULL.
INSERT INTO solicitudes (usuario_id, grupo_id, vacante_id, estado, motivo)
VALUES (?, ?, ?, ?, ?);
-- Postulación a una vacante: `vacante_id` con valor, `grupo_id` NULL.
INSERT INTO solicitudes (usuario_id, grupo_id, vacante_id, estado, motivo)
VALUES (?, ?, ?, ?, ?);

-- @fin-seed

-- No se siembran `sesiones`, `intentos_sesion`, `tokens_recuperacion` ni
-- `auditoria`: son tablas de trazabilidad que se llenan solas en ejecución.


-- =====================================================================
-- SECCIÓN 10. CREDENCIALES DE PRUEBA
-- =====================================================================
-- >>> SOLO DESARROLLO - PROHIBIDO USAR EN PRODUCCION <<<
--
-- Credenciales SIMULADAS para probar el backend en local. La institución,
-- los cursos y las personas son ficticios: es un reto académico.
--
--   Rol            Correo                 Contraseña
--   -------------  ---------------------  --------------------------
--   administrador  admin@educa.com        EducaAdmin2026!
--   docente        docente@educa.com      EducaDocente2026!
--   estudiante     estudiante@educa.com   EducaEstudiante2026!
--
-- La columna `contrasena_hash` debe contener el hash argon2id o bcrypt de esas
-- contraseñas, generado en el backend. NUNCA se guarda la contraseña en claro.
-- Para usarlas en local basta con arrancar el backend con NODE_ENV=development.
-- =====================================================================