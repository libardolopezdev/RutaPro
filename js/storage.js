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
 * Carga el estado guardado desde localStorage y lo aplica a appState.
 * (Bug del loadState duplicado corregido — versión única y definitiva)
 */
function loadState() {
    const saved = localStorage.getItem('taxiapp-state');
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);

        appState.carreras = parsed.carreras || [];
        appState.gastos = parsed.gastos || [];
        appState.settings = parsed.settings || appState.settings;
        appState.jornadaIniciada = typeof parsed.jornadaIniciada !== 'undefined'
            ? parsed.jornadaIniciada : appState.jornadaIniciada;
        appState.jornadaInicio = parsed.jornadaInicio
            ? new Date(parsed.jornadaInicio) : appState.jornadaInicio;
        appState.baseEfectivo = typeof parsed.baseEfectivo !== 'undefined'
            ? parsed.baseEfectivo : 0;

        const baseInput = document.getElementById('baseEfectivo');
        if (baseInput) baseInput.value = appState.baseEfectivo || '';

    } catch (e) {
        console.warn('No se pudo cargar estado desde localStorage:', e);
    }
}

/**
 * Carga la configuración inicial y restaura el estado visual de la jornada.
 * Si hay usuario autenticado, también carga desde Firestore.
 */
async function loadSettings() {
    const saved = localStorage.getItem('taxiapp-state');
    if (saved) {
        try {
            const data = JSON.parse(saved);

            if (data.carreras && Array.isArray(data.carreras)) {
                data.carreras = data.carreras.map(carrera => ({
                    ...carrera,
                    timestamp: carrera.timestamp ? new Date(carrera.timestamp) : new Date()
                }));
            }

            // Mezclar settings con cuidado para no perder plataformas por defecto
            const mergedSettings = {
                ...appState.settings,
                ...(data.settings || {})
            };

            // Si las plataformas guardadas están vacías o no existen, restaurar las DEFAULT_PLATFORMS
            if (!mergedSettings.plataformas || mergedSettings.plataformas.length === 0) {
                mergedSettings.plataformas = JSON.parse(JSON.stringify(DEFAULT_PLATFORMS));
            }

            appState = {
                ...appState,
                ...data,
                settings: mergedSettings,
                jornadaInicio: data.jornadaInicio ? new Date(data.jornadaInicio) : null
            };

            if (elements.metaDisplay) {
                elements.metaDisplay.textContent = formatCurrency(appState.settings.meta);
            }

            if (appState.jornadaIniciada && appState.jornadaInicio) {
                elements.jornadaBtn.textContent = 'CERRAR JORNADA';
                elements.jornadaBtn.classList.add('cierre');
                elements.jornadaInfo.textContent = `Iniciado a las ${appState.jornadaInicio.toLocaleTimeString('es-ES', {
                    hour: '2-digit', minute: '2-digit'
                })}`;
                elements.appContent.classList.remove('app-disabled');
            }
        } catch (e) {
            console.warn('No se pudo cargar configuración desde localStorage:', e);
        }
    }

    // Cargar desde Firestore (sobreescribe local si hay datos más recientes)
    if (typeof currentUser !== 'undefined' && currentUser) {
        await loadSettingsFromFirestore();
        await loadHistoricoFromFirestore();
    }
}

