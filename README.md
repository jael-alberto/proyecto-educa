# Sistema Educa

Plataforma educativa con catálogo público de cursos, alta de cuentas, inicio de
sesión y una base de datos de 19 tablas. El proyecto tiene tres partes
independientes que se despliegan por separado: la base de datos, la API y el
frontend.

> Proyecto **simulado** con fines académicos. No contiene datos reales de
> personas ni de instituciones: las personas, los cursos y las vacantes son
> ficticios.

## Índice

- [Qué hace el proyecto](#qué-hace-el-proyecto)
- [Estructura](#estructura)
- [Cómo se ejecuta](#cómo-se-ejecuta)
- [Cuentas de prueba](#cuentas-de-prueba)
- [API](#api)
- [Cómo está protegida la aplicación](#cómo-está-protegida-la-aplicación)
- [Pruebas](#pruebas)
- [Ramas y estrategia de trabajo](#ramas-y-estrategia-de-trabajo)
- [Reflexión](#reflexión)
- [Limitaciones conocidas](#limitaciones-conocidas)

---

## Qué hace el proyecto

**Backend**

- Sirve el catálogo público: cursos, detalle de cada curso con su temario y sus
  grupos, y las estadísticas de la plataforma.
- Crea cuentas nuevas. El rol y el estado los decide el servidor, nunca el
  navegador.
- Inicia y cierra sesión, con cookie `HttpOnly`, token anti-CSRF y bloqueo por
  intentos fallidos.
- Deja rastro en la tabla de auditoría: quién entró, desde qué IP y con qué
  resultado.

**Base de datos**

- 19 tablas con claves foráneas, restricciones `CHECK`, índices, dos vistas y un
  trigger que actualiza la fecha de modificación.
- 80 registros de demostración para poder trabajar sin tener que inventar datos.

**Frontend**

- Catálogo y detalle servidos desde la API, con filtros que quedan en la URL.
- Formularios de acceso y de alta con validación en el navegador **y** en el
  servidor.
- Diseño responsive, navegable con teclado y que respeta la preferencia del
  sistema por reducir el movimiento.

---

## Estructura

```
proyecto-educa/
├── base-datos/
│   ├── esquema.sql            19 tablas, 2 vistas, 1 trigger, índices y seed
│   ├── diccionario-datos.md   Campo por campo, diagrama y reglas de seguridad
│   └── README.md              Guía de conexión y aplicación del esquema
│
├── backend/
│   ├── .env.example           Plantilla de configuración (sin secretos)
│   ├── package.json
│   ├── src/
│   │   ├── servidor.js        Arranque y apagado ordenado
│   │   ├── app.js             Middleware y montaje de rutas
│   │   ├── config.js          Lectura y validación del entorno
│   │   ├── db.js              Único punto de contacto con SQLite
│   │   ├── migrar.js          Comando de migración
│   │   ├── semilla.js         80 registros de prueba
│   │   ├── seguridad.js       Helmet y CORS
│   │   ├── throttle.js        Rate limiting
│   │   ├── sesiones.js        Cookies, sesiones y validación CSRF
│   │   ├── autorizacion.js    Carga la sesión en cada petición
│   │   ├── contrasenas.js     scrypt, tokens y política de contraseñas
│   │   ├── validacion.js      Validación y normalización de entradas
│   │   ├── errores.js         Errores con código y formato único
│   │   └── rutas/             auth.js, registro.js, catalogo.js
│   └── tests/
│       ├── api.test.js        48 pruebas de seguridad y comportamiento
│       └── limites.test.js    4 pruebas de rate limiting
│
└── frontend/
    ├── index.html             Portada
    ├── cursos.html            Catálogo con filtros
    ├── detalle.html           Ficha de un curso
    ├── login.html             Inicio de sesión
    ├── registro.html          Alta de cuenta
    ├── css/estilos.css        Hoja única, ordenada por bloques
    └── js/
        ├── api.js             Cliente HTTP (único punto de contacto)
        ├── main.js            Sesión, navegación, avisos y animaciones
        ├── inicio.js          Portada
        ├── cursos.js          Catálogo
        ├── detalle.js         Ficha de curso
        ├── login.js           Formulario de acceso
        └── registro.js        Formulario de alta
```

---

## Cómo se ejecuta

Requisitos: **Node.js 22.5 o superior** (usa el módulo nativo `node:sqlite`).
Probado con Node 24.

### 1. Configurar el backend

```powershell
cd backend
Copy-Item .env.example .env
```

Edite `backend/.env` y ponga una cadena aleatoria en `SECRETO_SESION`:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

El archivo `.env` está en `.gitignore`: nunca entra al repositorio. Solo se
versiona `.env.example`, que no contiene secretos.

### 2. Instalar dependencias

```powershell
cd backend
npm install
```

### 3. Crear la base de datos y poblarla

El esquema se aplica solo al arrancar. Para poblarla con datos de prueba:

```powershell
npm run db:migrar          # aplica el esquema (idempotente)
npm run db:semilla         # inserta los 80 registros de demostración
npm run db:semilla -- --reiniciar   # borra y vuelve a poblarla
```

### 4. Levantar la API

```powershell
npm start        # http://localhost:3000
npm run dev      # con recarga automática al guardar
```

Compruebe que responde: `GET http://localhost:3000/api/salud` devuelve
`{"estado":"activo"}`.

### 5. Servir el frontend

El frontend usa módulos ES, así que **no se abre con doble clic**
(`file://`): el navegador bloquearía las peticiones por CORS. Necesita un
servidor HTTP.

```powershell
cd frontend
npx --yes http-server . -p 5500 -c-1
```

Abra `http://localhost:5500`.

El puerto 5500 ya está en `ORIGENES_PERMITIDOS` dentro de
`backend/.env.example`. Si usa otro puerto, añádalo ahí y reinicie la API, o el
navegador bloqueará las peticiones.

---

## Cuentas de prueba

Solo para desarrollo local. **Nunca en producción.**

| Rol | Correo | Contraseña |
| --- | --- | --- |
| administrador | `admin@educa.com` | `EducaAdmin2026!` |
| docente | `docente@educa.com` | `EducaDocente2026!` |
| estudiante | `estudiante@educa.com` | `EducaEstudiante2026!` |
| docente | `docente2@educa.com` | `EducaDocente2026!` |
| docente | `docente3@educa.com` | `EducaDocente2026!` |
| docente | `docente4@educa.com` | `EducaDocente2026!` |

---

## API

Todas las rutas responden con el mismo formato: los datos van en `datos` y los
errores en `error` y `mensaje`.

| Método | Ruta | Sesión | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/salud` | no | Estado del servicio |
| `GET` | `/api/catalogo/cursos` | no | Lista de cursos. Filtros: `dificultad`, `modalidad`, `limite`, `cursor` |
| `GET` | `/api/catalogo/cursos/:slug` | no | Detalle, con temario y grupos abiertos |
| `GET` | `/api/catalogo/estadisticas` | no | Cifras de la portada |
| `GET` | `/api/auth/programas` | no | Programas de estudio, para el alta |
| `POST` | `/api/auth/registro` | no | Alta de cuenta. Devuelve `201` |
| `POST` | `/api/auth/login` | no | Inicio de sesión |
| `POST` | `/api/auth/logout` | sí | Cierre de sesión |
| `GET` | `/api/auth/yo` | opcional | Sesión actual. Emite token CSRF si no se presenta uno |
| `GET` | `/api/auth/sesion-activa` | opcional | Comprobación sin efectos secundarios |
| `POST` | `/api/auth/verificar-csrf` | sí | Renueva el token CSRF |

### El catálogo es público

Se puede listar y ver el detalle de un curso sin iniciar sesión. Es una decisión,
no un descuido: el catálogo es material público de venta. Lo que exige sesión es
**actuar**: la postulación se comprobará cuando exista ese endpoint.

### Flujo del token anti-CSRF

El token vive en el servidor, pero el navegador lo necesita en cada pestaña, así
que no puede quedarse solo en memoria. El reparto es:

1. `POST /api/auth/login` devuelve un token CSRF y la cookie de sesión.
2. Cada página pide la sesión con `GET /api/auth/yo` **presentando** el token
   guardado. Si coincide, el servidor lo conserva.
3. Si no lo presenta, `/api/auth/yo` emite uno nuevo.

Que lo conserve cuando es válido importa: si lo rotara siempre, abrir una
segunda pestaña dejaría sin token a la primera, y su siguiente formulario
fallaría con un 403.

---

## Cómo está protegida la aplicación

### Contraseñas

`scrypt` del módulo `node:crypto`, con sal de 16 bytes por usuario y el coste
recomendado por OWASP (`2^15`). El formato guardado es
`scrypt$N$r$p$salt$hash`, así que el coste se puede subir más adelante sin
invalidar las contraseñas antiguas: al validar se leen los parámetros del
hash.

### Sesiones

- Token opaco de 32 bytes, generado con `crypto.randomBytes`.
- En la base de datos solo se guarda el **SHA-256** del token. Si alguien lee la
  tabla `sesiones`, no puede suplantar a nadie.
- Cookie `HttpOnly` (el JavaScript no puede leerla), `SameSite=Lax` y `Secure`
  en producción.
- 8 horas por sesión; 30 días si la casilla "mantener la sesión" está marcada.

### CSRF

Token de 32 bytes, también guardado solo como hash. Se exige en **todos** los
métodos que modifican datos. `/api/auth/verificar-csrf` exige a su vez el token
actual: sin eso, un atacante con una sesión robada podría pedir un token nuevo y
seguir mandando peticiones.

### Escalada de privilegios

El alta de cuentas **no lee** `rol` ni `estado` del cuerpo de la petición. Ambos
se fijan en el servidor, y el rol se resuelve por nombre contra la tabla `roles`
en vez de escribirse en la INSERT. Un cliente que mande `{"rol":"administrador"}`
obtiene una estudiante.

### Inyección SQL

Todas las consultas usan parámetros (`?`). Nunca se concatena entrada del
usuario dentro del texto SQL, ni siquiera en los filtros del catálogo.

### XSS

- El frontend escapa todo texto antes de insertarlo con `innerHTML`, en un solo
  módulo (`escaparHtml` en `js/api.js`).
- Las URLs de imagen se validan: solo se admiten `http:` y `https:`, lo que
  bloquea `javascript:` y `data:`.
- Helmet fija la CSP con `object-src 'none'` y `frame-ancestors 'none'`.

### Abuso y fugas

- Rate limiting por IP: inicio de sesión (5 / 15 min), alta de cuentas (20 / h),
  peticiones generales (120 / min).
- Bloqueo **persistente** por intentos fallidos: el contador está en la base de
  datos, no en memoria, para que reiniciar el proceso no lo borre.
- En producción se registran los fallos de autenticación, nunca las contraseñas.
- Ninguna respuesta incluye `contrasena_hash`, `token_hash` ni `csrf_token_hash`.
- El login responde siempre el mismo mensaje exista o no el correo, para no
  permitir averiguar qué correos están registrados.

### Accesibilidad

- Foco visible en todo lo interactivo, sin `outline: none` sin sustituto.
- Enlace de salto al contenido, el primero al tabular.
- Avisos con `role="status"` y `aria-live`, que un lector de pantalla anuncia.
- Menú de perfil con `<details>`: funciona sin JavaScript y se opera con teclado.
- `prefers-reduced-motion` respetado: sin animaciones si el sistema lo pide.
- La tabla de grupos se convierte en fichas apiladas en pantalla estrecha, y cada
  campo conserva su etiqueta.

---

## Pruebas

```powershell
cd backend
npm test
```

**52 pruebas, 52 correctas.** Cubren:

- Cabeceras de seguridad de Helmet y ausencia de `X-Powered-By`.
- Consultas preparadas frente a la inyección SQL.
- Contraseñas: formato del hash, sal distinta por usuario, coste, y que la
  comparación sea de tiempo constante.
- Sesiones: el hash en la base, nunca el token en claro; el rol real de cada
  cuenta.
- CSRF: rechazo sin token, con token inventado, aceptación con el correcto, y
  que renovar exija el token vigente.
- Alta de cuentas: escalada de privilegios, duplicados, correo inválido,
  contraseña débil, fechas imposibles y programa inexistente.
- Auditoría: los intentos fallidos quedan registrados.
- Rate limiting: login, alta y límite general.
- Reparto del token CSRF entre páginas, incluido que el anterior deja de servir.

Las pruebas de límites se ejecutan en un proceso y una base de datos separados,
porque modifican la configuración y la base que usan las demás.

---

## Ramas y estrategia de trabajo

El trabajo se hizo por módulos, cada uno en su rama, fusionado a `main` al
terminar:

```
main
├── base-datos    esquema, diccionario y semilla
├── login         API base, seguridad, autenticación y primeras pruebas
└── registro      alta de cuentas con control de privilegios
```

Rama actual: `frontend`. Los commits llevan prefijo por área
(`base-datos:`, `backend:`, `frontend:`, `chore:`, `fusion:`) y explican **por
qué** se cambió algo, no solo qué cambió.

---

## Reflexión

### 1. ¿Qué problema resuelve el proyecto y para quién?

Sirve para gestionar la formación de una institución educativa: el catálogo de
cursos, las cuentas de quienes estudian y enseñan, las matrículas con su cupo y
los certificados verificables.

Hay dos tipos de usuario con necesidades distintas. Quien **estudia** quiere
encontrar un curso, ver las fechas y el cupo, y saber si le queda tiempo para
terminarlo antes de matricularse.
Quien **administra** necesita que los datos sean fiables y que nadie pueda
tocarlos sin permiso. El diseño parte de esa diferencia: el catálogo es público
y se lee sin entrar, mientras que cualquier acción que cambie datos exige
sesión.

### 2. ¿Qué decisiones técnicas se tomaron y por qué?

**SQLite con `node:sqlite`.** No hace falta instalar ni administrar un servidor
de base de datos, y un solo archivo se versiona bien. Es suficiente para el
alcance académico. A cambio: no sirve para varias instancias del backend a la
vez escribiendo, porque el bloqueo de escrituras es de archivo entero.

**Sesiones en el servidor, no tokens JWT.** Un JWT no se puede revocar: si se
roba, sirve hasta que expire. Con la sesión en la base de datos, el logout la
borra y queda sin efecto de inmediato. Para un sistema con datos personales,
poder cortar el acceso pesa más que no tener que consultar la base en cada
petición.

**Rol fijado en el servidor.** El punto donde más fácil sería colarse una
escalada de privilegios es el alta de cuentas. Por eso el cuerpo de la petición
no menciona `rol`: el servidor lo decide y lo resuelve por nombre.

**El frontend no decide nada sobre la sesión.** Antes el proyecto guardaba el
usuario en `localStorage`, y con eso ya se daba por hecho haber entrado. Ahora la
pregunta se hace al servidor en cada página, y el navegador solo refleja la
respuesta.

### 3. ¿Qué medidas de seguridad se implementaron y por qué?

- **Contraseñas con scrypt y sal por usuario.** Una sal por usuario impide que
  dos cuentas con la misma contraseña tengan el mismo hash, de modo que un
  ataque de tabla precalculada no sirve para nada.
- **Hash de los tokens en la base.** Una copia de la tabla `sesiones` no permite
  suplantar a nadie.
- **CSRF en todo lo que modifica datos**, y renovación que exige el token
  vigente.
- **Consultas parametrizadas** en todo el backend, sin excepciones.
- **Escapado de HTML** en el único punto del frontend donde se construye HTML.
- **Rate limiting por IP**, con contador persistente para que reiniciar el
  proceso no sirva para saltarse el bloqueo.
- **Cabeceras de Helmet** y CORS con lista de orígenes, nunca comodín.

### 4. ¿Qué se aprendió durante el desarrollo?

Lo que más costó fue entender que la seguridad es una cadena, no una suma de
partes. Sirve de nada un token CSRF perfecto si el token de sesión está en
`localStorage`. Sirve de nada un formulario validado en el navegador si el
servidor acepta lo que le manden. Cada capa solo sirve si la anterior aguanta.

El segundo aprendizaje fue sobre el orden. Conectar el frontend contra la
API destapó un fallo de diseño del backend: `GET /auth/yo` no devolvía el token
CSRF, así que ninguna página podía enviar datos después de entrar. Las pruebas
unitarias de la API pasaban todas. Hacía falta usar el sistema como lo usaría
una persona.

El tercero, más incómodo: el catálogo estaba escrito a mano **dos veces**, una
constante en el JavaScript y las tarjetas en el HTML, con datos que no
coincidían con la base de datos. La portada prometía "12.000 estudiantes" y "34
cursos" sobre una base con 8. Duplicar datos garantiza que se queden viejos.

### 5. ¿Qué se mejoraría si hubiera más tiempo?

- **Endpoint de postulación.** Ahora el botón comprueba la sesión y avisa de que
  la API no lo expone todavía. Es lo que más falta: el flujo se queda a un paso.
- **Recuperación de contraseña** con correo de un solo uso y caducidad corta.
  Ahora mismo, quien pierde su contraseña no tiene salida.
- **Verificación del correo** en el alta, antes de dar la cuenta por buena.
- **Paginación con cursor real** en el catálogo: hoy el desplazamiento es por
  desplazamiento fijo (`OFFSET`), que se degrada en tablas grandes.
- **Pruebas de extremo a extremo en un navegador real.** Ahora las pruebas de
  seguridad cubren la API, y el flujo del navegador se comprobó a mano.
- **Rotación del secreto de sesión**, para poder cambiarlo sin invalidar todas
  las sesiones de golpe.
- **Auditoría como solo lectura**: hoy se escribe, pero no hay forma de
  consultarla desde la interfaz.

---

## Limitaciones conocidas

- **La API no expone la postulación.** El botón avisa en lugar de fingir un
  registro. Es deliberado: un mensaje de éxito falso es peor que un aviso.
- **El correo no se verifica.** El alta es inmediata.
- **No hay recuperación de contraseña.**
- **SQLite no admite varias instancias** del backend escribiendo a la vez.
- **`SECRETO_SESION` del `.env.example` es un valor de ejemplo.** Si alguien lo
  deja sin cambiar, la configuración se rechaza al arrancar en producción.
- **Los datos de la semilla son ficticios** y las contraseñas están en la
  documentación a propósito, porque es un entorno de demostración.
