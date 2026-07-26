/**
 * src/services/firestoreService.js
 * Capa de datos para Firebase Firestore (Modo Compat).
 */

import { db } from './firebase-init.js';

export const firestoreService = {
    async createInitialProfile(uid, data) {
        const batch = db.batch();
        const userRef = db.collection('users').doc(uid);
        
        batch.set(userRef, { 
            profile: data.profile,
            analytics: data.analytics
        });
        
        const settingsRef = userRef.collection('settings').doc('config');
        batch.set(settingsRef, data.settings);
        
        return batch.commit();
    },

    async checkUserProfile(uid) {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    },

    async saveJornada(uid, data) {
        return db.collection('users').doc(uid)
            .collection('jornada_activa').doc('data')
            .set({
                ...data,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
    },

    /**
     * Obtiene una página del histórico de jornadas de Firestore.
     * 
     * IMPORTANTE:
     * - Es una consulta paginada (devuelve máximo `limitCount` documentos).
     * - Está destinada al módulo de Historial (para renderizado visual y scroll infinito).
     * - NO DEBE utilizarse para cálculos estadísticos, ya que ignora el resto de jornadas del usuario.
     * 
     * @param {string} uid - ID del usuario autenticado.
     * @param {boolean} includeDeleted - Si es true, incluye jornadas enviadas a la papelera.
     * @param {number} limitCount - Número máximo de documentos a devolver (por defecto 20).
     * @param {object} lastDoc - Documento a partir del cual iniciar la página (para paginación).
     * @returns {Promise<{ data: Array, lastVisible: object }>}
     */
    async getHistorico(uid, includeDeleted = false, limitCount = 20, lastDoc = null) {
        let query = db.collection('users').doc(uid)
            .collection('historico')
            .orderBy('createdAt', 'desc')
            .limit(limitCount);
        if (lastDoc) query = query.startAfter(lastDoc);
        const snapshot = await query.get();
        
        const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const nowMs = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        
        const filteredData = allDocs.filter(d => {
            if (d.deletedAt) {
                const delTime = d.deletedAt.toMillis ? d.deletedAt.toMillis() : (d.deletedAt.seconds ? d.deletedAt.seconds * 1000 : Date.now());
                 if (nowMs - delTime > thirtyDaysMs) {
                     // Hard delete auto
                     db.collection('users').doc(uid).collection('historico').doc(d.id).delete();
                     return false;
                 }
                 return includeDeleted;
            }
            return true; // We always want non-deleted history items
        });

        return {
            data: filteredData,
            lastVisible: snapshot.docs[snapshot.docs.length - 1]
        };
    },

    /**
     * RP-007: Obtiene el histórico completo de jornadas de Firestore.
     * 
     * IMPORTANTE:
     * - Recupera la totalidad del histórico activo (sin límite de documentos).
     * - Está destinada EXCLUSIVAMENTE al módulo de Estadísticas.
     * - Utiliza paginación interna transparente para evitar timeouts en Firestore,
     *   pero devuelve un único array con todos los resultados.
     * - NO DEBE utilizarse para el historial visual, ya que podría afectar el rendimiento.
     *
     * @param {string} uid - ID del usuario autenticado.
     * @returns {Promise<{ data: Array }>}
     */
    async getHistoricoParaEstadisticas(uid) {
        // Número de documentos por página. Valor de 100 es el punto óptimo entre
        // número de round-trips y tamaño de payload por request en Firestore.
        const STATS_PAGE_SIZE = 100;

        const nowMs = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const historicoRef = db.collection('users').doc(uid).collection('historico');

        let acumulado = [];
        let lastVisible = null;
        let hayMasPaginas = true;

        while (hayMasPaginas) {
            let query = historicoRef
                .orderBy('createdAt', 'desc')
                .limit(STATS_PAGE_SIZE);

            if (lastVisible) {
                query = query.startAfter(lastVisible);
            }

            const snapshot = await query.get();

            if (snapshot.empty) {
                hayMasPaginas = false;
                break;
            }

            snapshot.docs.forEach(doc => {
                const d = { id: doc.id, ...doc.data() };

                // Excluir jornadas en papelera (misma lógica que getHistorico)
                if (d.deletedAt) {
                    const delTime = d.deletedAt.toMillis
                        ? d.deletedAt.toMillis()
                        : (d.deletedAt.seconds ? d.deletedAt.seconds * 1000 : nowMs);

                    // Auto-purge de documentos en papelera con más de 30 días
                    if (nowMs - delTime > thirtyDaysMs) {
                        historicoRef.doc(d.id).delete();
                    }
                    // No incluir en estadísticas, independientemente de si fue purgado
                    return;
                }

                acumulado.push(d);
            });

            // Si la página vino completa, puede haber más. Si no, terminamos.
            if (snapshot.docs.length < STATS_PAGE_SIZE) {
                hayMasPaginas = false;
            } else {
                lastVisible = snapshot.docs[snapshot.docs.length - 1];
            }
        }

        return { data: acumulado };
    },

    async moveToTrash(uid, docId) {
        return db.collection('users').doc(uid).collection('historico').doc(docId).update({
            deletedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async restoreFromTrash(uid, docId) {
         return db.collection('users').doc(uid).collection('historico').doc(docId).update({
            deletedAt: window.firebase.firestore.FieldValue.delete()
        });
    },

    async hardDeleteHistorico(uid, docId) {
        return db.collection('users').doc(uid).collection('historico').doc(docId).delete();
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

    async cerrarJornadaTransaccional(uid, jornadaData) {
        const batch = db.batch();
        
        const historicoRef = db.collection('users').doc(uid)
            .collection('historico').doc();
        batch.set(historicoRef, {
            ...jornadaData,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const jornadaRef = db.collection('users').doc(uid)
            .collection('jornada_activa').doc('data');
            
        // RP-026: Guardamos el status cerrado y los totales para tener garantía offline y sincronizar el estado limpio
        batch.set(jornadaRef, {
            status: 'closed',
            closedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            jornadaIniciada: false,
            carreras: [],
            gastos: [],
            jornadaInicio: null,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            lastTotales: {
                totalCarreras: jornadaData.totalCarreras || 0,
                totalBruto: jornadaData.totalBruto || 0,
                ganancia: jornadaData.ganancia || 0
            }
        });
        
        return batch.commit();
    },

    async saveSettings(uid, settings) {
        return db.collection('users').doc(uid)
            .collection('settings').doc('config')
            .set({
                ...settings,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
    },

    async getSettings(uid) {
        const doc = await db.collection('users').doc(uid)
            .collection('settings').doc('config').get();
        return doc.exists ? doc.data() : null;
    },

    /**
     * RP-001 v2: Suscripción a settings con metadata completa.
     * - includeMetadataChanges:true garantiza que el callback dispare cuando
     *   fromCache pasa de true a false, incluso si los datos no cambiaron.
     * - doc.metadata se pasa como segundo argumento opcional para que el
     *   consumidor decida qué hacer. Los consumidores existentes que solo
     *   reciben el primer argumento continúan funcionando sin modificación.
     * @param {string} uid
     * @param {function(data: object, metadata: SnapshotMetadata)} callback
     * @returns {function} Función de cancelación
     */
    subscribeToSettings(uid, callback) {
        return db.collection('users').doc(uid)
            .collection('settings').doc('config')
            .onSnapshot({ includeMetadataChanges: true }, doc => {
                if (doc.exists) {
                    callback(doc.data(), doc.metadata);
                }
            }, error => {
                // console.error('Error subscribing to settings:', error);
            });
    },

    // Listener original (metadatos de jornada)
    subscribeToJornada(uid, callback) {
        return db.collection('users').doc(uid)
            .collection('jornada_activa').doc('data')
            .onSnapshot(doc => {
                if (doc.exists) callback(doc.data());
            });
    },

    /**
     * RP-001 v2: Suscripción a jornada activa con metadata completa.
     * - includeMetadataChanges:true garantiza el disparo del servidor incluso
     *   cuando los datos no cambiaron (solo cambia fromCache true→false).
     * - doc.metadata se pasa como segundo argumento opcional. Los consumidores
     *   existentes que no lo declaren continúan funcionando sin modificación.
     * @param {string} uid
     * @param {function(data: object, metadata: SnapshotMetadata)} callback
     * @returns {function} Función de cancelación
     */
    subscribeToActiveJornada(uid, callback) {
        return db.collection('users').doc(uid)
            .collection('jornada_activa').doc('data')
            .onSnapshot({ includeMetadataChanges: true }, doc => {
                if (!doc.exists) {
                    callback({ jornadaIniciada: false, carreras: [], gastos: [], updatedAt: null }, doc.metadata);
                    return;
                }
                const data = doc.data();
                callback({
                    jornadaIniciada: data.jornadaIniciada ?? false,
                    jornadaInicio: data.jornadaInicio ?? null,
                    carreras: Array.isArray(data.carreras) ? data.carreras : [],
                    gastos: Array.isArray(data.gastos) ? data.gastos : [],
                    updatedAt: data.updatedAt // Objeto Timestamp de Firestore
                }, doc.metadata);
            });
    },

    async migrateHistoricoCabifyToCoopebombas(uid) {
        try {
            const snapshot = await db.collection('users').doc(uid).collection('historico').get();
            const batch = db.batch();
            let count = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                let hasChanges = false;
                
                if (data.carrerasDesglose && Array.isArray(data.carrerasDesglose)) {
                    const newDesglose = data.carrerasDesglose.map(c => {
                        if (c.platform === 'cabify') {
                            hasChanges = true;
                            return { ...c, platform: 'coopebombas' };
                        }
                        return c;
                    });
                    
                    if (hasChanges) {
                        const docRef = db.collection('users').doc(uid).collection('historico').doc(doc.id);
                        batch.update(docRef, { carrerasDesglose: newDesglose });
                        count++;
                    }
                }
            });

            if (count > 0) {
                await batch.commit();
            }
        } catch (error) {
            // console.error('Error durante la migración del historial en Firestore:', error);
        }
    }
}
