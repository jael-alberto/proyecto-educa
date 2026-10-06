# Base de datos - Sistema Educa

Esta carpeta contiene el modelo de datos completo del proyecto **Sistema Educa**: el
esquema SQL, el diccionario de datos y las reglas de seguridad de la información.

> Base de datos **simulada** con fines academicos (reto "Misión Git"). No contiene
> datos reales de personas ni de instituciones. Las personas, los cursos y las
> vacantes son ficticios.

## Contenido

| Archivo | Descripción |
| --- | --- |
| `esquema.sql` | Script DDL: 19 tablas, 2 vistas, 1 trigger, 73 índices, más la sección de población inicial (seed). |
| `diccionario-datos.md` | Documentacion campo por campo de las 19 tablas, diagrama de relaciones y reglas de seguridad. |

## Motor de base de datos

SQLite 3.35 o superior, accedido desde el backend mediante el módulo nativo
`node:sqlite` (disponible en Node.js 22.5 en adelante, estable en Node 24).

Motivos de la eleccion:

- No requiere instalar ni administrar un servidor de base de datos.
- Un único archivo, facil de versionar e incluir en el repositorio.
- Compatible con el alcance del reto y suficiente para la carga académica.

## Como se aplica el esquema

El archivo `esquema.sql` tiene dos secciones separadas por marcadores:

| Marcador | sección |
| --- | --- |
| `-- @fin-ddl` | secciones 1 a 8: DDL (tablas, índices, trigger y vistas). Se ejecuta con `db.exec()`. |
| `-- @inicio-seed` ... `-- @fin-seed` | sección 9: población inicial. Usa marcadores de parámetro `?`. |

Los `INSERT` del seed **no** se ejecutan con `exec()`, porque contienen marcadores de
parámetro. Se aplican con sentencias preparadas:

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('backend/datos/educa.db');
db.exec(esquemaDdl);                                  // secciones 1 a 8
const stmt = db.prepare(textoDelSeed);               // seccion 9
stmt.run('admin', 'Administrador del sistema');      // valores por parametro
```

Ejemplo mínimo completo (Windows PowerShell):

```powershell
node --input-type=module -e "import{DatabaseSync}from'node:sqlite';import{readFileSync}from'node:fs';const sql=readFileSync('base-datos/esquema.sql','utf8').split('-- @fin-ddl')[0];const db=new DatabaseSync(':memory:');db.exec(sql);console.log('tablas:',db.prepare(\"SELECT count(*)c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'\").get().c);"
```

Salida esperada: `tablas: 19`.

## Como se conecta el backend

El módulo `backend/src/db.js` es el único punto de contacto con SQLite. Aplica el
esquema en el arranque y expone la conexion. Todas las consultas del backend usan
**consultas parametrizadas** (`?`): nunca se concatena la entrada del usuario dentro
del texto SQL, lo que elimina la inyeccion SQL.

Reglas que sigue el backend:

- Activa `PRAGMA foreign_keys = ON` en cada conexion (SQLite lo desactiva por defecto).
- Aplica `journal_mode = WAL` y `busy_timeout = 5000` para el desarrollo local.
- Nunca devuelve `contrasena_hash`, `token_hash` ni `csrf_token_hash` en una
  respuesta de la API ni en un log. Ver `diccionario-datos.md`, sección
  "Reglas de seguridad de los datos".
- Envuelve las operaciones que deben ser atomicas (por ejemplo, el control de cupo al
  matricular) en una transacción.

## Credenciales de prueba

Alcance: solo desarrollo local. Nunca en produccion.

| Rol | Correo | Contraseña |
| --- | --- | --- |
| administrador | admin@educa.com | EducaAdmin2026! |
| docente | docente@educa.com | EducaDocente2026! |
| estudiante | estudiante@educa.com | EducaEstudiante2026! |

La columna `contrasena_hash` guarda un hash (scrypt en el backend), nunca la contraseña
en claro.
