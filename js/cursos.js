const CURSOS = {
    web: {
        titulo: 'Programacion Web',
        icono: '💻',
        categoria: 'Tecnologia',
        color: '#1d4ed8',
        imagen: 'https://placehold.co/900x400/1e3a8a/ffffff?text=Programaci%C3%B3n+Web',
        descripcion: 'Construye sitios y aplicaciones web completas con HTML, CSS y JavaScript, desde cero hasta tu primer proyecto desplegado en la nube.',
        duracion: '8 semanas',
        carga: '6 horas por semana',
        modalidad: 'Online en vivo',
        nivel: 'Principiante a intermedio',
        precio: '320',
        precioAntes: '520',
        rating: '4.9',
        opiniones: '1,240',
        postulantes: '1,200',
        instructor: { nombre: 'Carlos Mendez', rol: 'Ingeniero de software con 12 anos de experiencia', bio: 'Ex-arquitecto en una fintech de 500 empleados. Ha formado a mas de 8,000 desarrolladores en HTML, CSS y JavaScript.', iniciales: 'CM' },
        temario: [
            'Semanas 1-2: HTML semantico, formularios y accesibilidad',
            'Semanas 3-4: CSS moderno con Flexbox, Grid y animaciones',
            'Semanas 5-6: JavaScript: DOM, eventos, fetch y asincronia',
            'Semana 7: Consumo de APIs, Git y GitHub',
            'Semana 8: Deploy en Vercel y construccion del portafolio'
        ],
        incluye: [
            '49 lecciones en video y 12 proyectos practicos',
            'Mentoria en vivo cada dos semanas',
            'Revision de portafolio por un disenador senior',
            'Certificado verificable con codigo QR',
            'Acceso de por vida al material y sus actualizaciones'
        ],
        requisitos: ['Nivel basico de computacion', 'Disponibilidad de 6 horas semanales', 'No necesitas experiencia previa'],
        salidas: ['Desarrollador web frontend', 'Disenador de interfaces', 'Freelance web'],
        impacto: 'La programacion web cambia por completo tu forma de analizar problemas: aprendes a descomponer cualquier idea en pasos logicos y a materializarla en internet. Ademas abre la puerta a trabajar como freelance desde el primer mes y a generar ingresos sin depender de un empleo.',
        mercado: 'Es la carrera tecnologica con mayor volumen de vacantes: mas de 60,000 empleos abiertos solo en Latinoamerica y cerca del 70% son remotos. Es el camino mas accesible para entrar al sector tecnologico.',
        ingresos: 'Desarrollador junior: $800 a $1,500 al mes. Con dos anos de experiencia: $2,000 a $3,500. Como freelance: $25 a $60 por hora. En empresas top: hasta $6,000.'
    },
    bd: {
        titulo: 'Bases de Datos',
        icono: '🗄️',
        categoria: 'Datos',
        color: '#15803d',
        imagen: 'https://placehold.co/900x400/14532d/ffffff?text=Bases+de+Datos',
        descripcion: 'Domina SQL, el modelado relacional y el diseno de esquemas capaces de sostener sistemas de produccion reales.',
        duracion: '6 semanas',
        carga: '5 horas por semana',
        modalidad: 'Hibrida',
        nivel: 'Intermedio',
        precio: '280',
        precioAntes: '450',
        rating: '4.7',
        opiniones: '860',
        postulantes: '860',
        instructor: { nombre: 'Laura Fernandez', rol: 'Administradora de bases de datos con 10 anos de experiencia', bio: 'DBA certificada en banca y retail. Migro mas de 40 sistemas a arquitecturas de datos en la nube.', iniciales: 'LF' },
        temario: [
            'Semana 1: Modelo relacional, tablas, claves y restricciones',
            'Semana 2: SQL basico: SELECT, JOIN, GROUP BY y subconsultas',
            'Semana 3: SQL avanzado, vistas, funciones y procedimientos',
            'Semana 4: Normalizacion y arquitectura de esquemas',
            'Semanas 5-6: PostgreSQL, indices y optimizacion de consultas'
        ],
        incluye: [
            '30 lecciones y 20 ejercicios guiados con solucion',
            'Laboratorio con una base de datos real para practicar',
            'Casos de estudio de banca y comercio electronico',
            'Certificado verificable con codigo QR',
            'Comunidad para dudas y revision de ejercicios'
        ],
        requisitos: ['Conceptos basicos de programacion', 'Computadora con 4 GB de RAM', 'Ganas de practicar'],
        salidas: ['Administrador de bases de datos', 'Analista de datos', 'Desarrollador backend'],
        impacto: 'Saber como se almacenan los datos te da un superpoder silencioso: practicamente toda empresa moderna depende de su base de datos. Entenderas por que se pierde informacion, como evitarla y como tomar decisiones con datos confiables.',
        mercado: 'Demanda estable y creciente: cada banco, hospital, supermercado y aplicacion necesita a alguien que administre sus datos. Es una de las rutas mas seguras para lograr estabilidad laboral de por vida.',
        ingresos: 'Administrador junior: $700 a $1,200 al mes. Senior o ingeniero de datos: $2,000 a $3,500. Consultoria independiente: $60 a $120 por hora.'
    },
    ux: {
        titulo: 'Diseno UI/UX',
        icono: '🎨',
        categoria: 'Diseno',
        color: '#0f172a',
        imagen: 'https://placehold.co/900x400/0f172a/ffffff?text=Dise%C3%B1o+UI%2FUX',
        descripcion: 'Disena productos digitales que la gente ama usar: investigacion de usuarios, prototipado y sistemas de diseno profesionales.',
        duracion: '5 semanas',
        carga: '4 horas por semana',
        modalidad: 'Online',
        nivel: 'Principiante',
        precio: '260',
        precioAntes: '410',
        rating: '4.9',
        opiniones: '970',
        postulantes: '970',
        instructor: { nombre: 'Valentina Cruz', rol: 'Lead Product Designer con 9 anos de experiencia', bio: 'Ha disenado productos utilizados por mas de 5 millones de usuarios en fintech y salud digital.', iniciales: 'VC' },
        temario: [
            'Semana 1: Principios de diseno, jerarquia visual y color',
            'Semana 2: Investigacion con usuarios y mapas de empatia',
            'Semana 3: Wireframes y prototipado en Figma',
            'Semana 4: Sistemas de diseno, componentes y tokens',
            'Semana 5: Pruebas de usabilidad y entrega a desarrollo'
        ],
        incluye: [
            '25 lecciones y 8 retos de diseno',
            'Licencia de Figma incluida por 12 meses',
            'Portafolio guiado con tres casos de estudio',
            'Mentoria grupal con disenadora senior',
            'Certificado verificable'
        ],
        requisitos: ['No se requiere conocimiento previo', 'Ganas de crear y experimentar', 'Figma se instala gratis'],
        salidas: ['Product designer', 'Investigador de experiencia de usuario', 'Disenador de interfaces'],
        impacto: 'El diseno es una carrera donde tu trabajo se ve literalmente en la pantalla que tocan millones de personas. Desarrollas empatia, creatividad y capacidad de tomar decisiones justificadas: habilidades que sirven mucho mas alla del diseno.',
        mercado: 'Las startups y las empresas tecnologicas coinciden en que el diseno es la habilidad que mas rapido hace crecer a un equipo. Con la convergencia entre UI, UX y producto, el perfil mas buscado es el de product designer completo.',
        ingresos: 'Disenador junior: $900 a $1,400 al mes. Mid-level: $1,800 a $2,800. Lead designer o freelance: $3,000 a $5,000.'
    },
    cyber: {
        titulo: 'Ciberseguridad',
        icono: '🔐',
        categoria: 'Seguridad',
        color: '#047857',
        imagen: 'https://placehold.co/900x400/064e3b/ffffff?text=Ciberseguridad',
        descripcion: 'Aprende hacking etico, analisis de vulnerabilidades y respuesta a incidentes en un laboratorio controlado.',
        duracion: '6 semanas',
        carga: '8 horas por semana',
        modalidad: 'Presencial',
        nivel: 'Intermedio',
        precio: '390',
        precioAntes: '620',
        rating: '5.0',
        opiniones: '610',
        postulantes: '610',
        instructor: { nombre: 'Rafael Ortiz', rol: 'CISSP y penetration tester', bio: 'Ha participado en mas de 200 auditorias de seguridad y forma parte de un equipo de respuesta a incidentes.', iniciales: 'RO' },
        temario: [
            'Semana 1: Fundamentos, amenazas y buenas practicas',
            'Semana 2: Redes, Kali Linux y reconocimiento',
            'Semana 3: Escaneo de vulnerabilidades y analisis de redes',
            'Semana 4: Explotacion web, OWASP Top 10 y pruebas de penetracion',
            'Semanas 5-6: Respuesta a incidentes, forense digital y reportes'
        ],
        incluye: [
            'Laboratorio con entorno aislado y casos reales',
            'Kit completo de herramientas de seguridad',
            'Simulacros de ciberataques durante el curso',
            'Certificado alineado con CISSP y verificado',
            'Acompanamiento para tu primera certificacion'
        ],
        requisitos: ['Conocimientos de redes (hay modulo de refuerzo)', 'Asistencia presencial obligatoria', 'Compromiso con la confidencialidad'],
        salidas: ['Analista de ciberseguridad', 'Pentester', 'Consultor de seguridad'],
        impacto: 'Te conviertes en la persona que protege a las empresas de los ataques: un rol con responsabilidad, reconocimiento y un impacto directo en la vida de miles de personas. Ademas es de las carreras con mayor resistencia a la automatizacion por IA.',
        mercado: 'Existe una brecha mundial de cuatro millones de profesionales de ciberseguridad sin cubrir. Los ataques de ransomware multiplicaron la demanda y casi ninguna empresa quiere quedarse sin proteccion.',
        ingresos: 'Analista junior: $1,200 a $1,800 al mes. Senior o pentester: $2,500 a $4,000. Manager de seguridad: hasta $6,000.'
    },
    ia: {
        titulo: 'Inteligencia Artificial',
        icono: '🤖',
        categoria: 'Tecnologia',
        color: '#1e40af',
        imagen: 'https://placehold.co/900x400/1e40af/ffffff?text=Inteligencia+Artificial',
        descripcion: 'Machine learning aplicado, redes neuronales y vision por computadora con Python, usando datasets reales.',
        duracion: '10 semanas',
        carga: '7 horas por semana',
        modalidad: 'Online en vivo',
        nivel: 'Intermedio',
        precio: '450',
        precioAntes: '700',
        rating: '4.9',
        opiniones: '1,510',
        postulantes: '1,500',
        instructor: { nombre: 'Dra. Sofia Reyes', rol: 'PhD en Inteligencia Artificial e investigadora', bio: 'Ha publicado 20 articulos de machine learning y dirige el laboratorio de IA de la universidad.', iniciales: 'SR' },
        temario: [
            'Semanas 1-2: Python para datos con NumPy y Pandas',
            'Semanas 3-4: Regresion, clasificacion y metricas de evaluacion',
            'Semanas 5-6: Redes neuronales, CNN y frameworks como TensorFlow',
            'Semanas 7-8: NLP, transformers y modelos generativos',
            'Semanas 9-10: Proyecto final desplegado a produccion'
        ],
        incluye: [
            '60 lecciones y 25 cuadernos con codigo real',
            'GPU en la nube incluido durante el curso',
            'Mentoria con una investigadora PhD',
            'Proyecto final para tu portafolio',
            'Certificado verificable con codigo QR'
        ],
        requisitos: ['Conceptos de programacion (idealmente Python)', 'Algebra basica', 'Ganas de experimentar con modelos'],
        salidas: ['Ingeniero de machine learning', 'Cientifico de datos', 'ML engineer'],
        impacto: 'La IA transformara todas las industrias en los proximos cinco anos. Aprenderla ahora significa que tu construyes las herramientas que automatizan el trabajo, en lugar de recibirlas. Es la habilidad con mayor proyeccion de los proximos anos.',
        mercado: 'Es la carrera del momento: las empresas mas grandes del mundo estan aumentando su presupuesto en IA de forma notable. Faltan especialistas calificados y los sueldos iniciales estan entre los mas altos de la tecnologia.',
        ingresos: 'Cientifico de datos junior: $1,500 a $2,500 al mes. ML engineer: $2,500 a $4,500. investigador o lider de IA: hasta $8,000.'
    },
    marketing: {
        titulo: 'Marketing Digital',
        icono: '📈',
        categoria: 'Negocios',
        color: '#7c2d12',
        imagen: 'https://placehold.co/900x400/7c2d12/ffffff?text=Marketing+Digital',
        descripcion: 'SEO, redes sociales y campanas pagadas para hacer crecer negocios reales desde cero.',
        duracion: '4 semanas',
        carga: '4 horas por semana',
        modalidad: 'Hibrida',
        nivel: 'Principiante',
        precio: '220',
        precioAntes: '360',
        rating: '4.7',
        opiniones: '700',
        postulantes: '700',
        instructor: { nombre: 'Camila Duarte', rol: 'CMO y consultora de marca', bio: 'Ha lanzado campanas que facturaron mas de dos millones de dolares para marcas latinoamericanas.', iniciales: 'CD' },
        temario: [
            'Semana 1: Investigacion de mercado y definicion de audiencia',
            'Semana 2: SEO tecnico, contenido y posicionamiento',
            'Semana 3: Redes sociales, calendario y community management',
            'Semana 4: Publicidad pagada, metricas y retorno de inversion'
        ],
        incluye: [
            '20 lecciones y 5 campanas reales de practica',
            'Presupuesto de publicidad de prueba incluido',
            'Plantillas de calendario y textos publicitarios',
            'Certificado verificable',
            'Comunidad de profesionales y agencias'
        ],
        requisitos: ['No se requiere experiencia previa', 'Navegador y una cuenta de redes sociales', 'Ganas de vender'],
        salidas: ['Especialista en marketing digital', 'Community manager', 'Freelance de publicidad'],
        impacto: 'Aprender marketing te da la habilidad mas transferible del negocio: saber comunicar, medir y vender. Puedes usarlo para dejar cualquier trabajo, lanzar tu propio negocio o hacer crecer el de otros.',
        mercado: 'Todas las empresas necesitan presencia digital y una parte importante de su presupuesto va a marketing. Ademas es una de las pocas carreras donde puedes freelance desde el primer dia.',
        ingresos: 'Marketing junior: $600 a $1,000 al mes. Independiente: $800 a $2,000 mas comisiones. Gerente de marketing: hasta $3,500.'
    },
    ingles: {
        titulo: 'Ingles Tecnico',
        icono: '🌍',
        categoria: 'Idiomas',
        color: '#134e4a',
        imagen: 'https://placehold.co/900x400/134e4a/ffffff?text=Ingl%C3%A9s+T%C3%A9cnico',
        descripcion: 'Ingles para tecnologia: entrevistas, documentacion, reuniones agiles y comunicacion con clientes internacionales.',
        duracion: '12 semanas',
        carga: '3 horas por semana',
        modalidad: 'Online',
        nivel: 'Intermedio',
        precio: '180',
        precioAntes: '300',
        rating: '4.9',
        opiniones: '1,120',
        postulantes: '1,120',
        instructor: { nombre: 'Emily Carter', rol: 'CELTA e instructora certificada', bio: 'Doce anos ensenando ingles a profesionales de tecnologia y preparando candidatos para entrevistas en empresas destacadas.', iniciales: 'EC' },
        temario: [
            'Semanas 1-3: Gramatica esencial para contextos tecnologicos',
            'Semanas 4-6: Vocabulario de programacion y documentacion',
            'Semanas 7-9: Entrevistas tecnicas y preguntas tipicas',
            'Semanas 10-12: Presentaciones, reuniones agiles y negociacion'
        ],
        incluye: [
            '36 lecciones y 60 horas de conversacion',
            'Simulacros de entrevistas grabados',
            'Vocabulario tecnico de 500 terminos',
            'Correccion personalizada de ensayos',
            'Certificado de nivel'
        ],
        requisitos: ['Ingles basico (nivel A2 recomendado)', 'Microfono para las sesiones en vivo', 'Asistencia semanal'],
        salidas: ['Desarrollador internacional', 'Customer success', 'Trabajo remoto global'],
        impacto: 'El ingles es el multiplicador de todas tus demas habilidades: abre ofertas remotas globales, te permite leer documentacion sin traducciones y aumenta tu sueldo hasta un 40% solo por comunicarte bien.',
        mercado: 'El 90% de las empresas de tecnologia buscan talento capaz de comunicarse en ingles. Es la diferencia entre un trabajo local de $800 y una oportunidad global de $3,000.',
        ingresos: 'El ingles por si solo no genera ingresos, pero multiplica los tuyos: un profesional con ingles tecnico puede ganar hasta un 40% mas que uno sin el.'
    },
    movil: {
        titulo: 'Desarrollo Movil',
        icono: '📱',
        categoria: 'Tecnologia',
        color: '#831843',
        imagen: 'https://placehold.co/900x400/831843/ffffff?text=Desarrollo+M%C3%B3vil',
        descripcion: 'Crea aplicaciones para Android e iOS con React Native y Flutter, y publicalas en las tiendas.',
        duracion: '8 semanas',
        carga: '6 horas por semana',
        modalidad: 'Presencial',
        nivel: 'Intermedio',
        precio: '340',
        precioAntes: '540',
        rating: '4.8',
        opiniones: '850',
        postulantes: '850',
        instructor: { nombre: 'Diego Santos', rol: 'Mobile Lead en una startup de alto crecimiento', bio: 'Sus aplicaciones suman mas de 8 millones de descargas en Google Play y App Store.', iniciales: 'DS' },
        temario: [
            'Semanas 1-2: Conceptos moviles, diseno responsivo y UX',
            'Semanas 3-4: Flutter con Dart o React Native con JavaScript',
            'Semana 5: Consumo de APIs, autenticacion y almacenamiento',
            'Semana 6: Notificaciones push, analitica y monetizacion',
            'Semanas 7-8: Pruebas, publicacion en tiendas y estrategia de lanzamiento'
        ],
        incluye: [
            '35 lecciones y 4 aplicaciones completas publicadas',
            'Dispositivos de prueba disponibles en laboratorio',
            'Cuenta de publicacion en las tiendas incluida',
            'Mentoria con el Mobile Lead',
            'Certificado verificable'
        ],
        requisitos: ['Conceptos de programacion', 'Asistencia presencial', 'Deseo de publicar aplicaciones reales'],
        salidas: ['Desarrollador movil', 'Emprendedor de aplicaciones', 'Product engineer'],
        impacto: 'Crear aplicaciones te permite convertir ideas en productos que estan literalmente en el bolsillo de millones de personas. Ademas, los ingresos pasivos de una app bien hecha pueden crecer mientras duermes.',
        mercado: 'Con mas de seis mil millones de usuarios moviles en el mundo, las empresas priorizan productos moviles. El talento que domina Flutter o React Native es de los mas buscados y mejor pagados del sector.',
        ingresos: 'Desarrollador movil junior: $1,000 a $1,700 al mes. Senior: $2,500 a $4,000. Con aplicaciones propias: de $500 a mas de $10,000 al mes.'
    }
};

const clave = new URLSearchParams(window.location.search).get('curso');
const curso = CURSOS[clave];

if (curso) {
    document.getElementById('detalle').innerHTML = `
        <section class="hero" style="background:linear-gradient(135deg, ${curso.color}, #0f172a)">
            <span class="badge">${curso.categoria} | ${curso.nivel}</span>
            <h1>${curso.icono} ${curso.titulo}</h1>
            <p>${curso.descripcion}</p>
            <div class="hero-acciones">
                <button class="btn btn-verde" onclick="postular('${curso.titulo}')">Postular ahora</button>
                <a href="cursos.html" class="btn btn-outline">Volver a cursos</a>
            </div>
        </section>

        <main class="container">
            <div class="stats" style="margin-bottom:60px">
                <div class="stat"><h2>${curso.rating}</h2><p>${curso.opiniones} opiniones</p></div>
                <div class="stat"><h2>${curso.duracion.split(' ')[0]}</h2><p>Semanas de duracion</p></div>
                <div class="stat"><h2>${curso.carga.split(' ')[0]}</h2><p>Horas por semana</p></div>
                <div class="stat"><h2>${curso.postulantes}</h2><p>Postulantes</p></div>
            </div>

            <div class="grid">
                <div class="card"><div class="card-cuerpo">
                    <div class="etiquetas"><span class="etiqueta azul">Sobre el curso</span></div>
                    <h3>Informacion general</h3>
                    <p><strong>Modalidad:</strong> ${curso.modalidad}</p>
                    <p><strong>Nivel:</strong> ${curso.nivel}</p>
                    <p><strong>Carga horaria:</strong> ${curso.carga}</p>
                    <p><strong>Idioma:</strong> Espanol con recursos en ingles</p>
                    <p><strong>Certificacion:</strong> Verificable con codigo QR</p>
                </div></div>

                <div class="card"><div class="card-cuerpo">
                    <div class="etiquetas"><span class="etiqueta verde">Postulantes</span></div>
                    <h3>Quienes se han inscrito</h3>
                    <p><strong>${curso.postulantes}</strong> estudiantes han postulado a este programa. Un 68% son profesionales que quieren cambiar de carrera y el 32% estudiantes que complementan su formacion.</p>
                    <p>Alta competencia: te recomendamos inscribirte pronto para asegurar tu cupo.</p>
                </div></div>

                <div class="card"><div class="card-cuerpo">
                    <div class="etiquetas"><span class="etiqueta negra">Impacto</span></div>
                    <h3>Como influye en tu vida</h3>
                    <p>${curso.impacto}</p>
                </div></div>

                <div class="card"><div class="card-cuerpo">
                    <div class="etiquetas"><span class="etiqueta azul">Mercado</span></div>
                    <h3>Que tan pedido esta</h3>
                    <p>${curso.mercado}</p>
                </div></div>

                <div class="card"><div class="card-cuerpo">
                    <div class="etiquetas"><span class="etiqueta verde">Ingresos</span></div>
                    <h3>Que podrias ganar</h3>
                    <p>${curso.ingresos}</p>
                </div></div>

                <div class="card"><div class="card-cuerpo">
                    <div class="etiquetas"><span class="etiqueta negra">Inversion</span></div>
                    <h3>Precio del programa</h3>
                    <p class="precio">$${curso.precio} <small>antes $${curso.precioAntes}</small></p>
                    <p>Hasta 6 cuotas sin interes</p>
                    <p>Garantia de satisfaccion de 30 dias</p>
                    <button class="btn btn-verde" onclick="postular('${curso.titulo}')">Postular ahora</button>
                </div></div>
            </div>

            <div class="card" style="margin-top:28px"><div class="card-cuerpo">
                <div class="etiquetas"><span class="etiqueta azul">Instructor</span></div>
                <div class="autor" style="gap:20px">
                    <div class="avatar-mini" style="width:70px;height:70px;font-size:1.6rem">${curso.instructor.iniciales}</div>
                    <div>
                        <h3 style="margin-bottom:4px">${curso.instructor.nombre}</h3>
                        <p><strong>${curso.instructor.rol}</strong></p>
                        <p style="margin-top:8px">${curso.instructor.bio}</p>
                    </div>
                </div>
            </div></div>

            <div class="grid" style="margin-top:28px">
                <div class="card"><div class="card-cuerpo">
                    <h3>Temario del curso</h3>
                    ${curso.temario.map(t => '<p>OK ' + t + '</p>').join('')}
                </div></div>
                <div class="card"><div class="card-cuerpo">
                    <h3>Que incluye</h3>
                    ${curso.incluye.map(i => '<p>OK ' + i + '</p>').join('')}
                    <h3 style="margin-top:20px">Requisitos</h3>
                    ${curso.requisitos.map(r => '<p>- ' + r + '</p>').join('')}
                    <h3 style="margin-top:20px">Salidas laborales</h3>
                    ${curso.salidas.map(s => '<p>- ' + s + '</p>').join('')}
                </div></div>
            </div>
        </main>`;
} else {
    document.getElementById('detalle').innerHTML = `
        <main class="container">
            <div class="seccion-titulo">
                <h2>Curso no encontrado</h2>
                <p><a href="cursos.html">Volver al catalogo de cursos</a></p>
            </div>
        </main>`;
}

function postular(nombre) {
    if (!usuario) {
        alert('Debes iniciar sesion o registrarte para postular. Te redirigimos...');
        window.location.href = 'registro.html';
        return;
    }
    const lista = JSON.parse(localStorage.getItem('postulaciones') || '[]');
    if (lista.indexOf(nombre) === -1) lista.push(nombre);
    localStorage.setItem('postulaciones', JSON.stringify(lista));
    const nombreCorto = usuario.nombre.split(' ')[0];
    alert('Felicidades ' + nombreCorto + '! Tu postulacion a ' + nombre + ' fue enviada. Recibiras la confirmacion por correo en menos de 24 horas.');
}