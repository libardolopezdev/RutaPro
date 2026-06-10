/**
 * src/modules/auth/authModule.js
 */
import { store } from '../../state/store.js';
import { auth } from '../../services/firebase-init.js';
import { firestoreService } from '../../services/firestoreService.js';
import { showToast } from '../../utils/ui-utils.js';

let activeJornadaUnsub = null;

export const authModule = {
    init() {
        auth.onAuthStateChanged(async user => {
            const splash = document.getElementById('splashScreen');
            if (splash) splash.style.display = 'none';

            if (user) {
                store.setState({ user });
                
                // MIGRATION / SYNC: Force Firestore settings to win over localStorage
                try {
                    const settingsData = await firestoreService.getSettings(user.uid);
                    if (settingsData) {
                        // Limpiar y reescribir con datos frescos (Firestore gana)
                        store.setState({ settings: settingsData });
                    }
                } catch (err) {
                    console.warn("No se pudo cargar config de Firestore (modo offline probable)", err);
                }

                // Suscripción en tiempo real a settings
                if (!this.settingsUnsub) {
                    this.settingsUnsub = firestoreService.subscribeToSettings(
                        user.uid,
                        (remoteSettings) => {
                            if (remoteSettings) {
                                store.setState({ settings: remoteSettings });
                            }
                        }
                    );
                }

                // Trigger background migration for historico
                firestoreService.migrateHistoricoCabifyToCoopebombas(user.uid);
                this.showApp();
            } else {
                if (this.settingsUnsub) {
                    this.settingsUnsub();
                    this.settingsUnsub = null;
                }
                store.setState({ user: null });
                this.showLogin();
            }
        });
    },

    async login(email, password) {
        try {
            this.setLoading(true);
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err) {
            this.showError(err.message);
        } finally {
            this.setLoading(false);
        }
    },

    async loginWithGoogle() {
        const provider = new window.firebase.auth.GoogleAuthProvider();
        try {
            this.setLoading(true);
            await auth.signInWithPopup(provider);
        } catch (err) {
            this.showError(err.message);
        } finally {
            this.setLoading(false);
        }
    },

    async logout() {
        if (confirm('¿Cerrar sesión?')) {
            // Cancelar listener de sync antes de salir
            if (activeJornadaUnsub) {
                activeJornadaUnsub();
                activeJornadaUnsub = null;
            }
            if (this.settingsUnsub) {
                this.settingsUnsub();
                this.settingsUnsub = null;
            }
            await auth.signOut();
            store.setState({
                carreras: [],
                gastos: [],
                jornadaIniciada: false,
                jornadaInicio: null
            });
        }
    },

    showApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        const state = store.getState();
        if (state.user && !activeJornadaUnsub) {
            let lastProcessedMillis = 0;

            activeJornadaUnsub = firestoreService.subscribeToActiveJornada(
                state.user.uid,
                (remoteJornada) => {
                    const remoteMillis = remoteJornada.updatedAt?.toMillis() || 0;
                    
                    // Sincronizar solo si el timestamp remoto es diferente (toMillis para precisión)
                    // Esto evita loops infinitos y asegura que el snapshot sea la fuente de verdad.
                    if (remoteMillis !== lastProcessedMillis) {
                        lastProcessedMillis = remoteMillis;
                        
                        store.setState({
                            jornadaIniciada: remoteJornada.jornadaIniciada,
                            jornadaInicio: remoteJornada.jornadaInicio,
                            carreras: remoteJornada.carreras,
                            gastos: remoteJornada.gastos
                        });
                    }
                }
            );
        }
    },

    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    },

    setLoading(loading) {
        const btns = document.querySelectorAll('.login-btn');
        btns.forEach(b => b.disabled = loading);
    },

    showError(msg) {
        const err = document.getElementById('authError');
        if (err) {
            err.textContent = msg;
            err.style.display = 'block';
        }
    }
};
