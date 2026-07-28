/**
 * src/modules/auth/authModule.js
 */
import { store } from '../../state/store.js';
import { auth } from '../../services/firebase-init.js';
import { firestoreService } from '../../services/firestoreService.js';
import { tutorialModule } from '../tutorial/tutorialModule.js';
import { showToast } from '../../utils/ui-utils.js';

let activeJornadaUnsub = null;

export const authModule = {
    init() {
        auth.onAuthStateChanged(async user => {
            const splash = document.getElementById('splashScreen');
            if (splash) splash.style.display = 'none';

            if (user) {
                store.setState({ user });
                
                try {
                    // DETECT FIRST LOGIN OR PENDING ONBOARDING
                    const userProfile = await firestoreService.checkUserProfile(user.uid);
                    const localCompleted = localStorage.getItem('onboardingCompleted') === 'true';
                    
                    if (!userProfile && !localCompleted) {
                        this.showOnboarding();
                        return; // Stop here, wait for onboarding to complete
                    }
                    
                    if (userProfile && userProfile.settings && userProfile.settings.onboardingCompleted === false && !localCompleted) {
                        this.showOnboarding();
                        return; // Stop here, wait for onboarding to complete
                    }
                    
                    // MIGRATION / SYNC: Force Firestore settings to win over localStorage
                    const settingsData = await firestoreService.getSettings(user.uid);
                    
                    // Si el usuario es nuevo, las settings están en el doc raíz (userProfile)
                    // Si es un usuario de antes, podrían estar en la subcolección (settingsData)
                    let activeSettings = settingsData || (userProfile && userProfile.settings) || {};
                    
                    // Auto-migrar la key vieja metaDiariaGlobal a meta
                    if (activeSettings.metaDiariaGlobal !== undefined) {
                        activeSettings.meta = activeSettings.metaDiariaGlobal;
                        delete activeSettings.metaDiariaGlobal;
                        
                        // Si existe settingsData (subcolección), la actualizamos
                        if (settingsData) {
                            await firestoreService.saveSettings(user.uid, activeSettings);
                        }
                    }

                    if (Object.keys(activeSettings).length > 0) {
                        store.setState({ settings: activeSettings });
                    }
                } catch (err) {
                    // console.warn("No se pudo verificar estado de onboarding o config", err);
                }

                // Suscripción en tiempo real a settings
                if (!this.settingsUnsub) {
                    this.settingsUnsub = firestoreService.subscribeToSettings(
                        user.uid,
                        (remoteSettings, metadata) => {
                            // RP-001 v2: Evitar sobreescribir settings con caché viejo al arrancar online
                            if (metadata && metadata.fromCache && navigator.onLine) return;

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
                store.clear();
                this.showLanding();
            }
        });
    },

    async login(email, password) {
        try {
            this.setLoading(true, 'login');
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err) {
            this.showError(this.getHumanReadableError(err));
        } finally {
            this.setLoading(false, 'login');
        }
    },

    async register(name, email, password) {
        try {
            this.setLoading(true);
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Set displayName in Firebase Auth
            await userCredential.user.updateProfile({
                displayName: name
            });
            
            // Force reload to ensure the profile update is recognized
            await userCredential.user.reload();
            
            // Force state update to immediately propagate displayName to the header
            store.setState({ user: auth.currentUser });
            
            // Realtime listener in init() will catch this and route to onboarding
        } catch (err) {
            this.showError(this.getHumanReadableError(err));
        } finally {
            this.setLoading(false, 'register');
        }
    },

    async sendPasswordReset(email) {
        try {
            this.setLoading(true, 'login'); // Use login button for loading state visually
            await auth.sendPasswordResetEmail(email);
            alert('Te hemos enviado un correo con las instrucciones para restablecer tu contraseña. Revisa también tu carpeta de spam.');
            this.showError(''); // Clear errors on success
        } catch (err) {
            this.showError(this.getHumanReadableError(err));
        } finally {
            this.setLoading(false, 'login');
        }
    },

    async loginWithGoogle() {
        const provider = new window.firebase.auth.GoogleAuthProvider();
        try {
            this.setLoading(true);
            await auth.signInWithPopup(provider);
        } catch (err) {
            // Si el usuario cerró el popup voluntariamente, ignorar silenciosamente
            if (err.code === 'auth/popup-closed-by-user' || 
                err.code === 'auth/cancelled-popup-request') {
                return; // No mostrar nada — el usuario decidió no continuar
            }
            
            this.showError(this.getHumanReadableError(err));
        } finally {
            this.setLoading(false);
        }
    },

    async logout() {
        if (confirm('¿Cerrar sesión?')) {
            // Cierre explícito de la Configuración y otros modales anclados
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) settingsModal.style.display = 'none';
            
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
            localStorage.removeItem('onboardingCompleted');
        }
    },

    showApp() {
        const landing = document.getElementById('landingScreen');
        if (landing) landing.style.display = 'none';
        const emailAuth = document.getElementById('emailAuthScreen');
        if (emailAuth) emailAuth.style.display = 'none';
        const onboarding = document.getElementById('onboardingScreen');
        if (onboarding) onboarding.style.display = 'none';
        
        document.getElementById('appContainer').style.display = 'block';
        
        const state = store.getState();
        if (state.user && !activeJornadaUnsub) {
            let lastProcessedMillis = 0;

            activeJornadaUnsub = firestoreService.subscribeToActiveJornada(
                state.user.uid,
                (remoteJornada, metadata) => {
                    const syncState = {
                        fromCache: metadata?.fromCache ?? false,
                        hasPendingWrites: metadata?.hasPendingWrites ?? false,
                        synchronized: metadata ? !metadata.fromCache : true
                    };

                    const remoteMillis = remoteJornada.updatedAt?.toMillis() || 0;
                    
                    // RP-001 v2: Evitar flash de datos viejos en la carga inicial online.
                    // Solo actualizamos el estado sync para que la app sepa que está cargando,
                    // pero no sobreescribimos los datos (carreras/gastos) con caché obsoleto.
                    if (metadata && metadata.fromCache && navigator.onLine) {
                        store.setState({ sync: syncState });
                        return;
                    }

                    // Sincronizar inteligentemente (RP-025)
                    if (remoteMillis !== lastProcessedMillis) {
                        lastProcessedMillis = remoteMillis;
                        
                        const currentState = store.getState();
                        const isSameJornada = currentState.jornadaIniciada === remoteJornada.jornadaIniciada;
                        
                        // Validar si los arreglos de carreras y gastos tienen los mismos montos y cantidad
                        const getHash = (arr) => arr.length + '-' + arr.reduce((s, x) => s + (x.neto || x.amount || x.monto || 0), 0);
                        const isSameData = getHash(currentState.carreras) === getHash(remoteJornada.carreras || []) &&
                                           getHash(currentState.gastos) === getHash(remoteJornada.gastos || []);

                        if (isSameJornada && isSameData) {
                            // Igual! Solo quitamos isSyncing
                            store.setState({ sync: syncState, isSyncing: false });
                        } else {
                            // Diferente! Hacemos render final
                            store.setState({
                                jornadaIniciada: remoteJornada.jornadaIniciada,
                                jornadaInicio: remoteJornada.jornadaInicio,
                                carreras: remoteJornada.carreras,
                                gastos: remoteJornada.gastos,
                                sync: syncState,
                                isSyncing: false
                            });
                        }
                    } else {
                        // RP-001 v2 + RP-025
                        store.setState({ sync: syncState, isSyncing: false });
                    }
                }
            );
        }

        setTimeout(() => {
            if (tutorialModule) {
                tutorialModule.start();
            }
        }, 600);
    },

    showLanding() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.style.display = 'none');

        const landing = document.getElementById('landingScreen');
        if (landing) landing.style.display = 'flex';
        const emailAuth = document.getElementById('emailAuthScreen');
        if (emailAuth) emailAuth.style.display = 'none';
        document.getElementById('appContainer').style.display = 'none';
        const onboarding = document.getElementById('onboardingScreen');
        if (onboarding) onboarding.style.display = 'none';
    },

    showOnboarding() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.style.display = 'none');

        const landing = document.getElementById('landingScreen');
        if (landing) landing.style.display = 'none';
        const emailAuth = document.getElementById('emailAuthScreen');
        if (emailAuth) emailAuth.style.display = 'none';
        document.getElementById('appContainer').style.display = 'none';
        const onboarding = document.getElementById('onboardingScreen');
        if (onboarding) onboarding.style.display = 'flex';
        
        // Ensure step 1 is active
        if (window.onboardingModule && window.onboardingModule.init) {
            window.onboardingModule.init();
        }
    },

    setLoading(loading, type = 'all') {
        const btnReg = document.getElementById('btnRegister');
        const btnLog = document.getElementById('btnLogin');
        const regText = document.getElementById('btnRegisterText');
        const logText = document.getElementById('btnLoginText');
        const regLoad = document.getElementById('btnRegisterLoading');
        const logLoad = document.getElementById('btnLoginLoading');

        if (type === 'all' || type === 'register') {
            if (btnReg) btnReg.disabled = loading;
            if (regText) regText.style.opacity = loading ? '0' : '1';
            if (regLoad) regLoad.style.display = loading ? 'block' : 'none';
        }
        
        if (type === 'all' || type === 'login') {
            if (btnLog) btnLog.disabled = loading;
            if (logText) logText.style.opacity = loading ? '0' : '1';
            if (logLoad) logLoad.style.display = loading ? 'block' : 'none';
        }
    },

    getHumanReadableError(err) {
        const code = err.code || '';
        switch(code) {
            case 'auth/popup-closed-by-user':
            case 'auth/cancelled-popup-request':
                return null;
            case 'auth/popup-blocked':
                return 'El navegador bloqueó la ventana de Google. Permite los popups e intenta de nuevo.';
            case 'auth/email-already-in-use':
                return 'Este correo ya tiene una cuenta registrada.';
            case 'auth/invalid-email':
                return 'El formato del correo es inválido.';
            case 'auth/weak-password':
                return 'La contraseña es muy débil (mínimo 6 caracteres).';
            case 'auth/user-not-found':
                return 'No encontramos una cuenta con este correo.';
            case 'auth/wrong-password':
                return 'La contraseña es incorrecta.';
            case 'auth/too-many-requests':
                return 'Demasiados intentos fallidos. Intenta más tarde o restablece tu contraseña.';
            case 'auth/network-request-failed':
                return 'Error de conexión. Revisa tu internet e intenta de nuevo.';
            default:
                return 'Ocurrió un error inesperado. Intenta de nuevo.';
        }
    },

    showError(msg) {
        const err = document.getElementById('authError');
        if (err) {
            err.textContent = msg;
            err.style.display = msg ? 'block' : 'none';
        }
    }
};
