const CURSOS = {
    "web": {
        titulo: "💻 Programación Web",
        color: "#2f855a",
        descripcion: "HTML, CSS y JavaScript desde cero hasta crear páginas interactivas.",
        duracion: "8 semanas",
        modalidad: "Online",
        postulantes: "🔥 ¡Muy alta demanda! Más de 1,200 estudiantes ya se han inscrito este año.",
        impacto: "🌟 Aprender programación web transforma tu forma de pensar: resolverás problemas de forma lógica y podrás crear cualquier idea que imagines en internet.",
        mercado: "📈 Es una de las carreras más pedidas del mercado tecnológico, con miles de vacantes abiertas en remoto y presencial.",
        ingresos: "💰 Un desarrollador web junior gana aprox. $800–$1,500/mes, y un senior puede superar los $3,000/mes."
    },
    "bd": {
        titulo: "🗄️ Bases de Datos",
        color: "#2b6cb0",
        descripcion: "Modelado de datos, consultas SQL y diseño de esquemas.",
        duracion: "6 semanas",
        modalidad: "Híbrida",
        postulantes: "📊 800 estudiantes inscritos; demanda constante en empresas de datos.",
        impacto: "🧠 Dominarás la organización de la información: serás capaz de manejar grandes volúmenes de datos de forma eficiente.",
        mercado: "📈 Los administradores de bases de datos son imprescindibles en bancos, hospitales y e-commerce.",
        ingresos: "💰 Sueldos desde $700/mes hasta más de $2,500/mes con experiencia."
    },
    "ux": {
        titulo: "🎨 Diseño UI/UX",
        color: "#1a202c",
        descripcion: "Diseño moderno, prototipos y experiencia de usuario.",
        duracion: "5 semanas",
        modalidad: "Online",
        postulantes: "🎨 950 estudiantes; campo creativo en pleno crecimiento.",
        impacto: "✨ Podrás hacer que las personas disfruten usando apps y sitios: tu trabajo impacta directamente en millones de usuarios.",
        mercado: "📈 Alta demanda en startups y empresas digitales que buscan destacar.",
        ingresos: "💰 Diseñadores UI/UX ganan entre $900 y $2,800/mes."
    },
    "cyber": {
        titulo: "🔐 Ciberseguridad",
        color: "#2f855a",
        descripcion: "Fundamentos de seguridad, contraseñas y protección de datos.",
        duracion: "6 semanas",
        modalidad: "Presencial",
        postulantes: "🔐 600 estudiantes; alerta global por ciberataques.",
        impacto: "🛡️ Protegerás empresas y personas de fraudes digitales: un rol con gran responsabilidad y prestigio.",
        mercado: "📈 Una de las áreas con más vacantes sin cubrir a nivel mundial.",
        ingresos: "💰 Expertos en ciberseguridad ganan de $1,200 a $4,000/mes."
    },
    "ia": {
        titulo: "🤖 Inteligencia Artificial",
        color: "#2b6cb0",
        descripcion: "Introducción a machine learning y redes neuronales básicas.",
        duracion: "10 semanas",
        modalidad: "Online",
        postulantes: "🤖 ¡El curso más de moda! 1,500 postulantes y contando.",
        impacto: "🚀 Estarás a la vanguardia del futuro: la IA cambiará todas las industrias en los próximos años.",
        mercado: "📈 Demanda altísima en salud, finanzas, educación y tecnología.",
        ingresos: "💰 Especialistas en IA pueden ganar de $1,500 a $5,000/mes."
    },
    "marketing": {
        titulo: "📈 Marketing Digital",
        color: "#1a202c",
        descripcion: "Redes sociales, SEO y estrategias de publicidad en línea.",
        duracion: "4 semanas",
        modalidad: "Híbrida",
        postulantes: "📈 700 inscritos; ideal para emprendedores.",
        impacto: "💡 Aprenderás a vender en internet y a hacer crecer cualquier negocio desde tu celular.",
        mercado: "📈 Todas las empresas necesitan presencia digital hoy.",
        ingresos: "💰 Marketineros digitales ganan de $600 a $2,000/mes, más comisiones."
    },
    "ingles": {
        titulo: "🌍 Inglés Técnico",
        color: "#2f855a",
        descripcion: "Vocabulario y comunicación profesional en tecnología.",
        duracion: "12 semanas",
        modalidad: "Online",
        postulantes: "🌍 1,100 estudiantes; el inglés abre puertas internacionales.",
        impacto: "🌎 Podrás trabajar con empresas de todo el mundo y acceder a mejores oportunidades.",
        mercado: "📈 El inglés es requisito en casi toda oferta tecnológica remota.",
        ingresos: "💰 Hablar inglés puede aumentar tu sueldo hasta un 40%."
    },
    "movil": {
        titulo: "📱 Desarrollo Móvil",
        color: "#2b6cb0",
        descripcion: "Crea apps para Android e iOS con tecnologías modernas.",
        duracion: "8 semanas",
        modalidad: "Presencial",
        postulantes: "📱 850 postulantes; todos usamos el celular a diario.",
        impacto: "🎯 Tus apps podrían estar en el bolsillo de miles de personas: impacto directo y medible.",
        mercado: "📈 Alta demanda de apps en educación, salud, delivery y finanzas.",
        ingresos: "💰 Desarrolladores móviles ganan de $1,000 a $3,500/mes."
    }
};

const params = new URLSearchParams(window.location.search);
const clave = params.get('curso');
const curso = CURSOS[clave];
const contenedor = document.getElementById('detalle');

if (curso) {
    contenedor.innerHTML = `
        <section class="hero" style="background:${curso.color}">
            <h1>${curso.titulo}</h1>
            <p>${curso.descripcion}</p>
        </section>
        <main>
            <div class="card">
                <h3>👥 Postulantes</h3>
                <p>${curso.postulantes}</p>
            </div>
            <div class="card">
                <h3>🌱 Impacto en tu vida</h3>
                <p>${curso.impacto}</p>
            </div>
            <div class="card">
                <h3>📊 Demanda en el mercado</h3>
                <p>${curso.mercado}</p>
            </div>
            <div class="card">
                <h3>💰 Ingresos potenciales</h3>
                <p>${curso.ingresos}</p>
            </div>
            <p style="margin-top:20px"><strong>Duración:</strong> ${curso.duracion} · <strong>Modalidad:</strong> ${curso.modalidad}</p>
            <button onclick="alert('¡Postulación enviada a ${curso.titulo}!')">¡Postular ahora!</button>
        </main>`;
} else {
    contenedor.innerHTML = '<main><h2>Curso no encontrado. <a href="cursos.html">Volver a cursos</a></h2></main>';
}
