// ===== AUTENTICACIÓN LOCAL =====
const usuario = JSON.parse(localStorage.getItem('usuarioEduca'));

function cerrarSesion() {
    localStorage.removeItem('usuarioEduca');
    window.location.href = 'index.html';
}

// ===== BURBUJA DE PERFIL EN EL NAV =====
function crearBurbujaPerfil() {
    if (!usuario) return;
    const nav = document.querySelector('nav');
    const burbuja = document.createElement('div');
    burbuja.className = 'perfil';
    burbuja.innerHTML = `
        <div class="avatar" onclick="toggleMenu()">${usuario.nombre.charAt(0).toUpperCase()}</div>
        <div class="menu-perfil" id="menuPerfil">
            <p class="nombre-perfil">👤 ${usuario.nombre}</p>
            <p class="correo-perfil">${usuario.correo}</p>
            <button onclick="cerrarSesion()">🚪 Cerrar sesión</button>
        </div>`;
    nav.appendChild(burbuja);
}

function toggleMenu() {
    document.getElementById('menuPerfil').classList.toggle('abierto');
}

// ===== PROTECCIÓN DE PÁGINAS =====
const paginasProtegidas = ['cursos.html'];
const paginaActual = window.location.pathname.split('/').pop();

if (!usuario && paginasProtegidas.includes(paginaActual)) {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', crearBurbujaPerfil);
