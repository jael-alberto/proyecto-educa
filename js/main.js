// ==========================================
// AUTENTICACIÓN LOCAL + UI - SISTEMA EDUCA
// ==========================================
const usuario = JSON.parse(localStorage.getItem('usuarioEduca'));

function cerrarSesion() {
    localStorage.removeItem('usuarioEduca');
    window.location.href = 'index.html';
}

function toggleMenu() {
    document.getElementById('menuPerfil').classList.toggle('abierto');
}

// ===== BURBUJA DE PERFIL =====
function crearBurbujaPerfil() {
    if (!usuario) return;
    const nav = document.querySelector('nav');
    const inicial = usuario.nombre.trim().charAt(0).toUpperCase();
    const burbuja = document.createElement('div');
    burbuja.className = 'perfil';
    burbuja.innerHTML = `
        <div class="avatar" onclick="toggleMenu()" title="Mi perfil">${inicial}</div>
        <div class="menu-perfil" id="menuPerfil">
            <p class="nombre-perfil">👤 ${usuario.nombre}</p>
            <p class="correo-perfil">${usuario.correo}</p>
            <button class="btn btn-primario" onclick="cerrarSesion()">🚪 Cerrar sesión</button>
        </div>`;
    nav.appendChild(burbuja);
}

// ===== FOOTER AUTOMÁTICO =====
function crearFooter() {
    if (document.querySelector('footer')) return;
    const f = document.createElement('footer');
    f.innerHTML = `
        <div class="container">
            <div class="footer-grid">
                <div>
                    <h4>🎓 Sistema Educa</h4>
                    <p>La plataforma educativa que transforma tu carrera profesional con cursos中专 y dévoile oportunidades reales en el mercado.</p>
                    <div class="social">
                        <a href="#">𝕏</a>
                        <a href="#">in</a>
                        <a href="#">▶</a>
                        <a href="#">f</a>
                    </div>
                </div>
                <div>
                    <h4>Plataforma</h4>
                    <ul>
                        <li><a href="index.html">Inicio</a></li>
                        <li><a href="cursos.html">Cursos</a></li>
                        <li><a href="login.html">Iniciar sesión</a></li>
                        <li><a href="registro.html">Crear cuenta</a></li>
                    </ul>
                </div>
                <div>
                    <h4>Cursos</h4>
                    <ul>
                        <li><a href="detalle.html?curso=web">Programación Web</a></li>
                        <li><a href="detalle.html?curso=ia">Inteligencia Artificial</a></li>
                        <li><a href="detalle.html?curso=cyber">Ciberseguridad</a></li>
                        <li><a href="detalle.html?curso=movil">Desarrollo Móvil</a></li>
                    </ul>
                </div>
                <div>
                    <h4>Contacto</h4>
                    <ul>
                        <li>📧 hola@educa.com</li>
                        <li>📞 +1 (809) 555-0134</li>
                        <li>📍 Santo Domingo, DN</li>
                        <li>🕐 Lun–Vie 8:00–18:00</li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">© 2026 Sistema Educa — Todos los derechos reservados | Diseñado para emprendedores</div>
        </div>`;
    document.body.appendChild(f);
}

// ===== ANIMACIONES AL HACER SCROLL =====
function observarScroll() {
    const elementos = document.querySelectorAll('.revelar, .card, .testimonio');
    const obs = new IntersectionObserver((entradas) => {
        entradas.forEach((e, i) => {
            if (e.isIntersecting) {
                e.target.style.animationDelay = `${i * 0.08}s`;
                e.target.classList.add('visible');
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.15 });
    elementos.forEach(el => { el.classList.add('revelar'); obs.observe(el); });
}

// ===== PROTECCIÓN DE PÁGINAS =====
const paginasProtegidas = ['cursos.html'];
const paginaActual = window.location.pathname.split('/').pop();
if (!usuario && paginasProtegidas.includes(paginaActual)) {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    crearBurbujaPerfil();
    crearFooter();
    observarScroll();
});

