import { Router } from 'express';
import { consultarTodos, consultarUno } from '../db.js';
import { controlador, ErrorApi } from '../errores.js';

export const rutasCatalogo = Router();

/**
 * GET /api/catalogo/cursos
 * Lista publica de cursos. Lee de la vista vista_catalogo_cursos, que ya
 * filtra por estado publicado y no expone ninguna columna de usuarios.
 */
rutasCatalogo.get(
  '/cursos',
  controlador((req, res) => {
    const limite = Math.min(Number.parseInt(req.query.limite ?? '50', 10) || 50, 100);
    const cursor = Number.parseInt(req.query.cursor ?? '0', 10) || 0;
    const dificultad = typeof req.query.dificultad === 'string' ? req.query.dificultad : null;
    const modalidad = typeof req.query.modalidad === 'string' ? req.query.modalidad : null;
    const busqueda = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : null;
    const destacado = req.query.destacado !== undefined && req.query.destacado !== '' ? Number(req.query.destacado) : null;

    // Los filtros viajan como PARAMETROS, nunca concatenados en el SQL.
    const condiciones = [];
    const params = [];
    if (dificultad) {
      condiciones.push('dificultad = ?');
      params.push(dificultad);
    }
    if (modalidad) {
      condiciones.push('modalidad = ?');
      params.push(modalidad);
    }
    if (destacado !== null && !Number.isNaN(destacado)) {
      condiciones.push('destacado = ?');
      params.push(destacado);
    }
    if (busqueda) {
      condiciones.push('(nombre LIKE ? OR descripcion LIKE ?)');
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const cursos = consultarTodos(
      `SELECT curso_id AS id, slug, nombre, descripcion, precio, precio_antes, modalidad,
              dificultad, nivel_descripcion, duracion_semanas, horas, imagen_url, destacado,
              programa_codigo, programa_nombre, titulo_grado, facultad_sigla,
              postulaciones, matriculados
         FROM vista_catalogo_cursos
         ${where}
        ORDER BY destacado DESC, precio ASC
        LIMIT ? OFFSET ?`,
      ...params,
      limite,
      cursor
    );

    res.json({ datos: cursos, meta: { limite, cursor } });
  })
);

/**
 * GET /api/catalogo/cursos/:slug
 * Detalle publico de un curso, con su plan de modulos y sus grupos abiertos.
 */
rutasCatalogo.get(
  '/cursos/:slug',
  controlador((req, res) => {
    const { slug } = req.params;
    if (!/^[a-z0-9-]{2,60}$/.test(slug)) {
      throw ErrorApi.noEncontrado('El curso');
    }

    const curso = consultarUno(
      `SELECT curso_id AS id, slug, nombre, descripcion, precio, precio_antes, modalidad,
              dificultad, nivel_descripcion, duracion_semanas, horas, imagen_url, destacado,
              programa_codigo, programa_nombre, titulo_grado, facultad_sigla,
              postulaciones, matriculados
         FROM vista_catalogo_cursos
        WHERE slug = ?`,
      slug
    );
    if (!curso) throw ErrorApi.noEncontrado('El curso');

    const modulos = consultarTodos(
      'SELECT nombre, descripcion, orden, duracion_minutos FROM modulos WHERE curso_id = ? ORDER BY orden',
      curso.id
    );

    const grupos = consultarTodos(
      `SELECT g.codigo, g.cupo, g.aula, g.horario, g.fecha_inicio, g.fecha_fin, g.estado,
              (SELECT COUNT(*) FROM matriculas m WHERE m.grupo_id = g.id AND m.estado = 'activa') AS inscritos
         FROM grupos g
        WHERE g.curso_id = ? AND g.estado IN ('programado', 'en_curso')
        ORDER BY g.codigo`,
      curso.id
    );

    res.json({
      datos: {
        ...curso,
        modulos,
        grupos: grupos.map((g) => ({ ...g, disponibles: Math.max(g.cupo - g.inscritos, 0) })),
      },
    });
  })
);

/**
 * GET /api/catalogo/estadisticas
 * Numeros del inicio, que reemplazan los valores quemados en el HTML.
 */
rutasCatalogo.get(
  '/estadisticas',
  controlador((req, res) => {
    const cursos = consultarUno(
      "SELECT COUNT(*) AS total FROM cursos WHERE estado = 'publicado'"
    );
    const estudiantes = consultarUno(
      "SELECT COUNT(*) AS total FROM usuarios WHERE estado = 'activo'"
    );
    const certificados = consultarUno(
      "SELECT COUNT(*) AS total FROM certificados WHERE estado = 'emitido'"
    );
    const vacantes = consultarUno(
      "SELECT COUNT(*) AS total FROM vacantes WHERE estado = 'publicada'"
    );

    res.json({
      datos: {
        cursosPublicados: cursos.total,
        estudiantesActivos: estudiantes.total,
        certificadosEmitidos: certificados.total,
        vacantesPublicadas: vacantes.total,
      },
    });
  })
);
