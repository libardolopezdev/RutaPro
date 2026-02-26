/**
 * auth.js — Autenticación de usuarios con Firebase Auth
 * RutaApp 2027
 *
 * Flujo:
 *  1. onAuthStateChanged detecta si hay sesión activa.
 *  2. Si hay usuario → muestra la app e inicializa datos.
 *  3. Si no hay usuario → muestra la pantalla de login.
 */

/** Usuario actualmente autenticado (null si no hay sesión). */
let currentUser = null;

/**
 * Observador de estado de autenticación.
 * Es el punto de arranque real de la aplicación.
 */
auth.onAuthStateChanged(user => {
    // Ocultar splascreen de carga inicial
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';

    if (user) {
        currentUser = user;
        showApp(user);
    } else {
        currentUser = null;
        showLogin();
    }
});

/**
 * Inicia sesión con cuenta de Google (popup).
 */
async function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        setAuthLoading(true);
        await auth.signInWithPopup(provider);
        // onAuthStateChanged disparará showApp automáticamente
    } catch (err) {
        document.getElementById('authError').textContent = getAuthErrorMessage(err.code);
        setAuthLoading(false);
    }
}



/** Muestra la pantalla de login y oculta la app. */
function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('authError').textContent = '';
}

/**
 * Muestra la app y oculta la pantalla de login.
 * Inicializa los datos del usuario autenticado.
 * @param {firebase.User} user
 */
async function showApp(user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';

    // Si llegamos aquí desde login, ocultar splash por si acaso
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';

    // Mostrar email del usuario en el header
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = user.email;

    // Inicializar la app con datos del usuario
    await initApp();
}

/**
 * Registra un nuevo conductor con email y contraseña.
 */
async function handleRegister() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('authError');

    if (!email || !password) {
        errorEl.textContent = 'Ingresa email y contraseña.';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        return;
    }

    try {
        setAuthLoading(true);
        await auth.createUserWithEmailAndPassword(email, password);
        // onAuthStateChanged disparará showApp automáticamente
    } catch (err) {
        errorEl.textContent = getAuthErrorMessage(err.code);
        setAuthLoading(false);
    }
}

/**
 * Inicia sesión con email y contraseña.
 */
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('authError');

    if (!email || !password) {
        errorEl.textContent = 'Ingresa email y contraseña.';
        return;
    }

    try {
        setAuthLoading(true);
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged disparará showApp automáticamente
    } catch (err) {
        errorEl.textContent = getAuthErrorMessage(err.code);
        setAuthLoading(false);
    }
}

/**
 * Cierra la sesión del usuario actual.
 */
async function handleLogout() {
    if (confirm('¿Cerrar sesión?')) {
        // Detener listener de tiempo real antes de salir
        if (typeof unsubscribeJornada === 'function') unsubscribeJornada();
        await auth.signOut();
        // Limpiar estado local
        appState.carreras = [];
        appState.gastos = [];
        appState.jornadaIniciada = false;
        appState.jornadaInicio = null;
    }
}

/** Muestra/oculta formulario de registro vs login. */
function toggleAuthMode() {
    const loginBtn = document.getElementById('btnLogin');
    const registerBtn = document.getElementById('btnRegister');
    const toggleLink = document.getElementById('toggleAuthMode');
    const subtitle = document.getElementById('authSubtitle');

    const isLogin = loginBtn.style.display !== 'none';
    loginBtn.style.display = isLogin ? 'none' : 'block';
    registerBtn.style.display = isLogin ? 'block' : 'none';
    toggleLink.textContent = isLogin ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
    subtitle.textContent = isLogin ? 'Crea tu cuenta de conductor' : 'Inicia sesión en tu cuenta';
}

/**
 * Activa/desactiva el indicador de carga en los botones de auth.
 * @param {boolean} loading
 */
function setAuthLoading(loading) {
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');
    [btnLogin, btnRegister].forEach(btn => {
        if (btn) btn.disabled = loading;
    });
}

/**
 * Traduce códigos de error de Firebase Auth a mensajes amigables.
 * @param {string} code
 * @returns {string}
 */
function getAuthErrorMessage(code) {
    const messages = {
        'auth/user-not-found': 'No existe una cuenta con ese email.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/email-already-in-use': 'Ese email ya está registrado.',
        'auth/invalid-email': 'El formato del email no es válido.',
        'auth/weak-password': 'La contraseña es demasiado débil.',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
        'auth/network-request-failed': 'Sin conexión a internet.',
    };
    return messages[code] || `Error: ${code}`;
}

// Exponer funciones globales
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.toggleAuthMode = toggleAuthMode;
