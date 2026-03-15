/**
 * src/services/firestoreService.js
 * Capa de datos para Firebase Firestore (Modo Compat).
 */

import { db } from './firebase-init.js';

export const firestoreService = {
    async saveJornada(uid, data) {
        return db.collection('users').doc(uid)
            .collection('jornada_activa').doc('data')
            .set({
                ...data,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
    },

    async getHistorico(uid, limitCount = 20, lastDoc = null) {
        let query = db.collection('users').doc(uid)
            .collection('historico')
            .orderBy('createdAt', 'desc')
            .limit(limitCount);
        if (lastDoc) query = query.startAfter(lastDoc);
        const snapshot = await query.get();
        return {
            data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            lastVisible: snapshot.docs[snapshot.docs.length - 1]
        };
    },

    async addToHistorico(uid, jornadaData) {
        return db.collection('users').doc(uid)
            .collection('historico')
            .add({
                ...jornadaData,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
    },

    async clearJornada(uid) {
        return db.collection('users').doc(uid)
            .collection('jornada_activa').doc('data').delete();
    },

    async saveSettings(uid, settings) {
        return db.collection('users').doc(uid)
            .collection('settings').doc('config')
            .set({
                ...settings,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
    },

    subscribeToJornada(uid, callback) {
        return db.collection('users').doc(uid)
            .collection('jornada_activa').doc('data')
            .onSnapshot(doc => {
                if (doc.exists) callback(doc.data());
            });
    }
};
