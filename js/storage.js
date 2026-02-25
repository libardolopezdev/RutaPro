/**
 * storage.js — Persistencia dual: localStorage + Firestore
 * RutaApp 2027
 * @author Libardo Lopez
 */

/**
 * Guarda el estado en localStorage Y en Firestore si hay usuario autenticado.
 * Se llama en cada cambio de carrera o gasto.
 */
function saveState() {
    // Siempre guardamos localmente (funciona offline)
    const data = {
        ...appState,
        jornadaInicio: appState.jornadaInicio ? appState.jornadaInicio.toISOString() : null
    };
    localStorage.setItem('taxiapp-state', JSON.stringify(data));

    // Si hay usuario autenticado, también sincronizamos con Firestore
    if (typeof currentUser !== 'undefined' && currentUser) {
        saveJornadaToFirestore();
    }
}

/**
 * Carga principal de datos de la aplicación (LocalStorage + Firestore).
 * Unifica la antigua lógica de loadState y loadSettings para evitar conflictos.
 */
async function loadAppData() {
    const saved = localStorage.getItem('taxiapp-state');
    let localData = null;

    if (saved) {
        try {
            localData = JSON.parse(saved);

            // Rehidratar fechas y tipos
            if (localData.carreras && Array.isArray(localData.carreras)) {
                localData.carreras = localData.carreras.map(c => ({
                    ...c,
                    timestamp: c.timestamp ? new Date(c.timestamp) : new Date()
                }));
            }
            if (localData.jornadaInicio) localData.jornadaInicio = new Date(localData.jornadaInicio);

            // Aplicar datos básicos al appState
            appState.carreras = localData.carreras || [];
            appState.gastos = localData.gastos || [];
            appState.jornadaIniciada = !!localData.jornadaIniciada;
            appState.jornadaInicio = localData.jornadaInicio || null;
            appState.baseEfectivo = localData.baseEfectivo || 0;

            // Fusionar settings (especialmente plataformas y meta)
            appState.settings = {
                ...appState.settings,
                ...(localData.settings || {})
            };

            // Sincronizar campo de base en UI si existe
            const baseInput = document.getElementById('baseEfectivo');
            if (baseInput) baseInput.value = appState.baseEfectivo || '';

        } catch (e) {
            console.warn('Error procesando localStorage:', e);
        }
    }

    // CARGA DESDE FIRESTORE (Sobre escribe local si existe)
    if (typeof currentUser !== 'undefined' && currentUser) {
        try {
            await loadSettingsFromFirestore();
            await loadHistoricoFromFirestore();
        } catch (e) {
            console.warn('Fallo carga remota:', e);
        }
    }

    // GARANTÍA: Si después de cargar local y remoto no hay plataformas, restaurar defaults
    if (!appState.settings.plataformas || appState.settings.plataformas.length === 0) {
        console.info('Restaurando plataformas por defecto...');
        appState.settings.plataformas = JSON.parse(JSON.stringify(DEFAULT_PLATFORMS));
    }

    // Restaurar estado visual de la jornada iniciada
    if (appState.jornadaIniciada && appState.jornadaInicio) {
        elements.jornadaBtn.textContent = 'CERRAR JORNADA';
        elements.jornadaBtn.classList.add('cierre');
        elements.jornadaInfo.textContent = `Iniciado a las ${appState.jornadaInicio.toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit'
        })}`;
        elements.appContent.classList.remove('app-disabled');
    }

    updateUI();
}
