import { Router } from 'express';
import { consultarUno, consultarTodos, ejecutar, enTransaccion } from '../db.js';
import { ErrorApi, controlador } from '../errores.js';
import { limiteRegistro } from '../seguridad.js';
import { hashContrasena, cumplePoliticaContrasena } from '../contrasenas.js';
import { auditar } from '../throttle.js';
import {
  booleano,
  contrasena as validarContrasena,
  correo as validarCorreo,
  documento as validarDocumento,
  entero,
  fecha,
  nombrePersona,
  telefono as validarTelefono,
} from '../validacion.js';

export const rutasRegistro = Router();

const EDAD_MINIMA = 15;
const EDAD_MAXIMA = 100;

/** Programa existente y activo, o null si no se indico. */
function resolverPrograma(valor) {
  if (valor === undefined || valor === null || valor === '') return { id: null };

  const id = entero(valor, { campo: 'programa_id', min: 1, max: 1_000_000 });
  const programa = consultarUno(
    'SELECT id, nombre FROM programas WHERE id = ? AND estado = ?',
    id,
    'activo'
  );
  if (!programa) {
    throw ErrorApi.validar('programa_invalido', 'El programa seleccionado no existe o no esta disponible.');
  }
  return { id: programa.id, nombre: programa.nombre };
}

/**
 * GET /api/auth/programas
 * Lista publica de programas, para que el formulario de registro ofrezca las
 * opciones reales en vez de una lista escrita a mano en el HTML.
 */
rutasRegistro.get(
  '/programas',
  controlador((req, res) => {
    const programas = consultarTodos(
      `SELECT p.id, p.nombre, p.codigo, p.titulo_grado, f.nombre AS facultad
         FROM programas p
         JOIN facultades f ON f.id = p.facultad_id
        WHERE p.estado = 'activo'
        ORDER BY f.nombre, p.nombre`
    );
    res.json({ datos: programas });
  })
);

/**
 * POST /api/auth/registro
 * Alta de una cuenta de estudiante.
 *
 * El router se monta en /api/auth, asi que la ruta se declara como
 * '/registro' y no como '/': declarada como '/' solo responderia a
 * POST /api/auth, que no existe.
 *
 * Dos campos NUNCA se toman del cuerpo de la peticion:
 *
 *   - el rol, que siempre es `estudiante` y se resuelve por nombre en la tabla
 *     de roles. Si el cliente manda `rol: "administrador"`, el campo se ignora.
 *     Es la regla que impide presentarse como administrador cambiando un campo
 *     del formulario;
 *   - el estado de la cuenta, que siempre nace `activo`. Un alta que quedara
 *     pendiente de verificar la decide el administrador, no el interesado.
 */
rutasRegistro.post(
  '/registro',
  limiteRegistro(),
  controlador(async (req, res) => {
    const cuerpo = req.body ?? {};

    /* ---------------- 1. Validacion de formato ---------------- */
    const correo = validarCorreo(cuerpo.correo);
    const contrasena = validarContrasena(cuerpo.contrasena);

    // La contrasena se valida tal cual, sin recortarla ni normalizar sus
    // espacios. Recortarla en silencio haria que la contrasena guardada no fuera
    // la que la persona escribio, y no podria volver a entrar nunca.
    const politica = cumplePoliticaContrasena(contrasena);
    if (!politica.valida) {
      throw ErrorApi.validar(
        'contrasena_debil',
        'La contrasena no cumple la politica de seguridad.',
        politica.fallos
      );
    }

    const nombre = nombrePersona(cuerpo.nombre, { campo: 'nombre', min: 2, max: 60 });
    const apellidos = nombrePersona(cuerpo.apellidos, { campo: 'apellidos', min: 2, max: 60 });
    const documentoId = validarDocumento(cuerpo.documento);
    const telefono = validarTelefono(cuerpo.telefono);
    const fechaNacimiento = fecha(cuerpo.fecha_nacimiento, { campo: 'fecha_nacimiento' });
    const programa = resolverPrograma(cuerpo.programa_id);

    if (!booleano(cuerpo.acepta_terminos)) {
      throw ErrorApi.validar(
        'terminos_obligatorios',
        'Debes aceptar los terminos y condiciones para registrarte.'
      );
    }

    // La validacion de formato ya garantiza que AAAA-MM-DD existe en el
    // calendario. Aqui se comprueba que ademas sea una edad posible.
    if (fechaNacimiento) {
      const anios = (Date.now() - Date.parse(`${fechaNacimiento}T00:00:00Z`)) / 31_557_600_000;
      if (anios < EDAD_MINIMA || anios > EDAD_MAXIMA) {
        throw ErrorApi.validar(
          'fecha_nacimiento_invalida',
          `La fecha de nacimiento debe corresponded a alguien de ${EDAD_MINIMA} a ${EDAD_MAXIMA} anos.`
        );
      }
    }

    /* ---------------- 2. Duplicados ---------------- */
    // El mensaje es identico tanto si el correo ya existe como si el documento
    // ya esta registrado. Decir "ese correo ya esta en uso" permitiria
    // averiguar que correos estan en el sistema probando uno tras otro, que es
    // justamente lo que el login evita.
    const duplicado = consultarUno(
      `SELECT 1 AS existe
         FROM usuarios
        WHERE correo = ?
           OR (documento_id IS NOT NULL AND documento_id = ?)
        LIMIT 1`,
      correo,
      documentoId ?? 'documento-inexistente'
    );
    if (duplicado) {
      throw ErrorApi.conflicto(
        'datos_no_disponibles',
        'No se pudo completar el registro con esos datos. Revisa el correo y el documento e intentalo de nuevo.'
      );
    }

    // El rol se resuelve en el servidor a partir de la tabla, nunca desde el
    // cuerpo de la peticion.
    const rol = consultarUno('SELECT id FROM roles WHERE nombre = ?', 'estudiante');
    if (!rol) {
      // Solo ocurre si la base de datos se creo sin la semilla de roles.
      throw new ErrorApi(500, 'configuracion_incompleta', 'El sistema no esta disponible en este momento.');
    }

    const ip = req.ip ?? null;
    const agenteUsuario = req.get('user-agent') ?? null;

    /* ---------------- 3. Alta ---------------- */
    // El hash se calcula FUERA de la transaccion. scrypt es deliberadamente
    // lento, y mantener abierta una transaccion de escritura mientras se deriva
    // la clave bloquearia a todos los demas durante decenas de milisegundos.
    const hash = await hashContrasena(contrasena);

    const idUsuario = enTransaccion(() => {
      // Sentencia preparada: los valores viajan como parametros y nunca se
      // concatenan dentro del texto SQL.
      const info = ejecutar(
        `INSERT INTO usuarios
           (correo, contrasena_hash, rol_id, nombre, apellidos, documento_id, telefono,
            fecha_nacimiento, programa_id, estado, acepta_terminos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', 1)`,
        correo,
        hash,
        rol.id,
        nombre,
        apellidos,
        documentoId,
        telefono,
        fechaNacimiento,
        programa.id
      );
      const nuevoId = Number(info.lastInsertRowid);

      // La auditoria va en la misma transaccion: o se guarda la cuenta y su
      // registro de auditoria, o no se guarda ninguno. En `datos.despues` no
      // entra la contrasena, ni siquiera hasheada.
      auditar({
        usuarioId: nuevoId,
        // 'crear' es el valor que admite el CHECK de auditoria.accion del
        // esquema; el par (accion, entidad) ya dice que se creo un usuario.
        accion: 'crear',
        entidad: 'usuarios',
        entidadId: nuevoId,
        datos: { despues: { correo, rol: 'estudiante', programa_id: programa.id } },
        ip,
        agente: agenteUsuario,
      });

      return nuevoId;
    });

    // 201 Created: el recurso se creo. No se abre sesion aqui; el cliente
    // inicia sesion igual que con cualquier otra cuenta, y asi queda una sola
    // ruta por la que se crea una cookie de sesion.
    res.status(201).json({
      datos: {
        id: idUsuario,
        correo,
        nombre,
        apellidos,
        rol: 'estudiante',
        programa: programa.nombre ?? null,
        mensaje: 'Cuenta creada correctamente. Ya puedes iniciar sesion.',
      },
    });
  })
);
