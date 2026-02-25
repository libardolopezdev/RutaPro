/**
 * firestore.js — Sincronización con Cloud Firestore
 * RutaApp 2027
 *
 * Estructura de datos:
 *  users/{uid}/
 *    settings/config  → { meta, storageType }
 *    jornada_activa/data  → { jornadaInicio, carreras[], gastos[] }
 *    historico/{id}   → { fecha, totalCarreras, totalBruto, ... }
 */

/** Referencia al listener de tiempo real (para poder cancelarlo al hacer logout). */
let unsubscribeJornada = null;

// ─────────────────────────────────────────────
//  Helpers de ruta
// ─────────────────────────────────────────────

/** Devuelve la referencia del documento de jornada activa del usuario actual. */
function jornadaRef() {
    return db.collection('users').doc(currentUser.uid)
        .collection('jornada_activa').doc('data');
}

/** Devuelve la referencia del documento de configuración del usuario actual. */
function settingsRef() {
    return db.collection('users').doc(currentUser.uid)
        .collection('settings').doc('config');
}

/** Devuelve la colección de histórico del usuario actual. */
function historicoCol() {
    return db.collection('users').doc(currentUser.uid)
        .collection('historico');
}

// ─────────────────────────────────────────────
//  Jornada activa (sync en tiempo real)
// ─────────────────────────────────────────────

/**
 * Inicia el listener onSnapshot para la jornada activa.
 * Actualiza la UI automáticamente cuando Firestore cambia.
 */
function syncJornadaActiva() {
    // Cancelar listener anterior si existía
    if (unsubscribeJornada) unsubscribeJornada();

    unsubscribeJornada = jornadaRef().onSnapshot(doc => {
        if (!doc.exists) return;

        const data = doc.data();

        // Solo actualizar si el cambio vino de otro dispositivo
        // (evitar loops: comparamos longitudes)
        const remoteCarreras = data.carreras || [];
        const remoteGastos = data.gastos || [];

        const hasNewData =
            remoteCarreras.length !== appState.carreras.length ||
            remoteGastos.length !== appState.gastos.length;

        if (hasNewData) {
            appState.carreras = remoteCarreras.map(c => ({
                ...c,
                timestamp: c.timestamp ? new Date(c.timestamp) : new Date()
            }));
            appState.gastos = remoteGastos;

            if (data.jornadaInicio && !appState.jornadaInicio) {
                appState.jornadaInicio = new Date(data.jornadaInicio);
            }

            updateGastos();
            updateUI();
        }
    }, err => {
        console.warn('Error en onSnapshot jornada_activa:', err);
    });
}

/**
 * Guarda el estado actual de la jornada en Firestore.
 * Se llama en cada cambio (carrera/gasto añadido o eliminado).
 */
async function saveJornadaToFirestore() {
    if (!currentUser) return;
    try {
        await jornadaRef().set({
            jornadaIniciada: appState.jornadaIniciada,
            jornadaInicio: appState.jornadaInicio
                ? appState.jornadaInicio.toISOString() : null,
            carreras: appState.carreras.map(c => ({
                ...c,
                timestamp: c.timestamp instanceof Date
                    ? c.timestamp.toISOString() : c.timestamp
            })),
            gastos: appState.gastos,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Error guardando jornada en Firestore:', err);
    }
}

/**
 * Elimina el documento de jornada activa al finalizar la jornada.
 */
async function clearJornadaInFirestore() {
    if (!currentUser) return;
    try {
        await jornadaRef().delete();
    } catch (err) {
        console.error('Error eliminando jornada activa en Firestore:', err);
    }
}

// ─────────────────────────────────────────────
//  Histórico
// ─────────────────────────────────────────────

/**
 * Guarda el resumen de la jornada cerrada en la subcolección histórico.
 * @param {Object} item — objeto con los datos de la jornada finalizada
 */
async function saveHistoricoToFirestore(item) {
    if (!currentUser) return;
    try {
        await historicoCol().add({
            ...item,
            uid: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Error guardando histórico en Firestore:', err);
    }
}

/**
 * Carga el histórico desde Firestore y lo fusiona con el localStorage local.
 * Prioriza datos de Firestore.
 */
async function loadHistoricoFromFirestore() {
    if (!currentUser) return;
    try {
        const snapshot = await historicoCol()
            .orderBy('createdAt', 'desc')
            .limit(90) // Últimos 90 días máximo
            .get();

        const remoteData = snapshot.docs.map(doc => doc.data());

        if (remoteData.length > 0) {
            historicoData = remoteData;
            localStorage.setItem('taxiapp-historico', JSON.stringify(historicoData));
        }
    } catch (err) {
        console.warn('Error cargando histórico desde Firestore (usando local):', err);
    }
}

// ─────────────────────────────────────────────
//  Configuración
// ─────────────────────────────────────────────

/**
 * Guarda la configuración del usuario en Firestore.
 */
async function saveSettingsToFirestore() {
    if (!currentUser) return;
    try {
        await settingsRef().set({
            meta: appState.settings.meta,
            plataformas: appState.settings.plataformas || [],
            storageType: 'firebase',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Error guardando configuración en Firestore:', err);
    }
}


/**
 * Carga la configuración del usuario desde Firestore.
 * Si no existe, mantiene los valores locales por defecto.
 */
async function loadSettingsFromFirestore() {
    if (!currentUser) return;
    try {
        const doc = await settingsRef().get();
        if (doc.exists) {
            const data = doc.data();
            appState.settings.meta = data.meta || appState.settings.meta;

            if (data.plataformas && Array.isArray(data.plataformas) && data.plataformas.length > 0) {
                appState.settings.plataformas = data.plataformas;
            }

            elements.metaDisplay.textContent = formatCurrency(appState.settings.meta);
            updateUI(); // Forzar redibujado de botones
        }
    } catch (err) {
        console.warn('Error cargando configuración desde Firestore:', err);
    }
}


// ─────────────────────────────────────────────
//  Estado del indicador de conexión
// ─────────────────────────────────────────────

/**
 * Monitorea el estado de conexión con Firestore y actualiza el ícono del header.
 */
function watchConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;

    db.collection('.info').doc('connected')
        // Firestore no tiene un ".info/connected" nativo como RTDB,
        // usamos el evento de red del navegador como indicador visual.
        .onSnapshot(() => { });

    window.addEventListener('online', () => {
        statusEl.textContent = '☁️';
        statusEl.title = 'Sincronizado';
        statusEl.classList.replace('offline', 'online');
    });
    window.addEventListener('offline', () => {
        statusEl.textContent = '📵';
        statusEl.title = 'Sin conexión (modo offline)';
        statusEl.classList.replace('online', 'offline');
    });

    // Estado inicial
    if (navigator.onLine) {
        statusEl.textContent = '☁️';
        statusEl.title = 'Sincronizado';
    } else {
        statusEl.textContent = '📵';
        statusEl.title = 'Sin conexión';
    }
}
