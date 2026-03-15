/**
 * src/services/firebase-init.js
 * Inicialización de Firebase y configuración de persistencia.
 */

const firebaseConfig = {
    apiKey: "AIzaSyC_mmlZXgr8Taj_FVj9bcTHvt8e3em92KM",
    authDomain: "rutaprodrive.firebaseapp.com",
    projectId: "rutaprodrive",
    storageBucket: "rutaprodrive.firebasestorage.app",
    messagingSenderId: "852084501706",
    appId: "1:852084501706:web:329d6d0d4a170711305833"
};

// Inicializar Firebase (Disponible vía CDN en index.html)
let app;
try {
    if (!window.firebase.apps || !window.firebase.apps.length) {
        app = window.firebase.initializeApp(firebaseConfig);
        // Habilitar persistencia offline
        window.firebase.firestore().enablePersistence({ synchronizeTabs: true })
            .catch(err => console.warn('Persistencia offline:', err.code));
    } else {
        app = window.firebase.app();
    }
} catch (e) {
    console.error('Firebase initialization error:', e);
}

export const auth = window.firebase.auth();
export const db = window.firebase.firestore();
