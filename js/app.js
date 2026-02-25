/**
 * app.js — Inicialización y registro de eventos
 * RutaApp 2027
 *
 * El arranque real ocurre en auth.js → onAuthStateChanged → initApp()
 * Este archivo expone initApp() y setupEventListeners().
 *
 * Orden de carga de scripts en el HTML:
 *   firebase SDKs → firebase-config.js → utils.js → state.js →
 *   storage.js → ui.js → carreras.js → gastos.js → historico.js →
 *   settings.js → firestore.js → auth.js → app.js
 */

/**
 * Inicializa la app después de confirmar usuario autenticado.
 * Llamada desde auth.js → showApp().
 */
async function initApp() {
    await loadSettings();  // local primero, luego Firestore
    loadState();
    updateDate();
    updateUI();
    setupEventListeners();

    if (appState.gastos && appState.gastos.length > 0) {
        updateGastos();
    }

    // Iniciar listener de tiempo real para jornada activa
    if (typeof syncJornadaActiva === 'function') {
        syncJornadaActiva();
    }

    // Mostrar indicador de estado de conexión
    if (typeof watchConnectionStatus === 'function') {
        watchConnectionStatus();
    }

    // Focus automático si hay jornada activa
    if (appState.jornadaIniciada) {
        setTimeout(() => {
            elements.amountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            elements.amountInput.focus();
        }, 500);
    }
}

/** Registra todos los event listeners de la aplicación. */
function setupEventListeners() {
    // --- Jornada ---
    elements.jornadaBtn.addEventListener('click', toggleJornada);

    // --- Plataformas ---
    elements.platformButtons.forEach(btn => {
        btn.addEventListener('click', () => selectPlatform(btn.dataset.platform));
    });

    // --- Métodos de pago ---
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', () => selectPayment(btn.dataset.payment));
    });

    // --- Formulario de carrera ---
    elements.amountInput.addEventListener('input', validateForm);
    elements.addCarrera.addEventListener('click', addCarrera);

    // --- Formulario de gasto ---
    elements.gastoMonto.addEventListener('input', validateGastoForm);
    elements.gastoTipo.addEventListener('change', validateGastoForm);
    elements.agregarGasto.addEventListener('click', agregarGasto);

    // --- Controles finales ---
    elements.exportBtn.addEventListener('click', showResumenFinal);
    elements.clearBtn.addEventListener('click', clearAll);

    // --- Header ---
    document.getElementById('historicoBtn').addEventListener('click', openHistorico);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // --- Modal de configuración ---
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('cancelSettings').addEventListener('click', closeSettings);
    elements.settingsModal.addEventListener('click', e => {
        if (e.target === elements.settingsModal) closeSettings();
    });

    // --- Modal de resumen final ---
    document.getElementById('cerrarResumen').addEventListener('click', closeResumen);
    document.getElementById('compartirResumen').addEventListener('click', compartirResumen);
    elements.resumenModal.addEventListener('click', e => {
        if (e.target === elements.resumenModal) closeResumen();
    });

    // --- Enter en campos de login ---
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
        loginPassword.addEventListener('keydown', e => {
            if (e.key === 'Enter') handleLogin();
        });
    }
}

// Exponer funciones globales referenciadas desde atributos onclick del HTML
window.deleteCarrera = deleteCarrera;
window.eliminarGasto = eliminarGasto;
window.closeResumenModal = closeResumenModal;
window.openHistorico = openHistorico;
window.closeHistorico = closeHistorico;
window.filterHistorico = filterHistorico;
window.aplicarRangoFechas = aplicarRangoFechas;
window.compartirHistorico = compartirHistorico;
window.compartirResumen = compartirResumen;
