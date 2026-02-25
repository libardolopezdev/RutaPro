/**
 * firebase-config.js — Inicialización del SDK de Firebase
 * RutaApp 2027 · Proyecto: rutaprodrive
 *
 * ⚠️  Este archivo contiene credenciales públicas de cliente.
 *     La seguridad real proviene de las Firestore Security Rules.
 */

const firebaseConfig = {
    apiKey: "AIzaSyC_mmlZXgr8Taj_FVj9bcTHvt8e3em92KM",
    authDomain: "rutaprodrive.firebaseapp.com",
    projectId: "rutaprodrive",
    storageBucket: "rutaprodrive.firebasestorage.app",
    messagingSenderId: "852084501706",
    appId: "1:852084501706:web:329d6d0d4a170711305833"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Instancias globales reutilizadas en toda la app
const db = firebase.firestore();
const auth = firebase.auth();

// Habilitar persistencia offline de Firestore
db.enablePersistence({ synchronizeTabs: true })
    .catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn('Persistencia offline no disponible: múltiples pestañas abiertas.');
        } else if (err.code === 'unimplemented') {
            console.warn('Persistencia offline no soportada por este navegador.');
        }
    });
