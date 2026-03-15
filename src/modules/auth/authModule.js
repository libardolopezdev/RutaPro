/**
 * src/modules/auth/authModule.js
 */
import { store } from '../../state/store.js';
import { auth } from '../../services/firebase-init.js';
import { firestoreService } from '../../services/firestoreService.js';
import { showToast } from '../../utils/ui-utils.js';

export const authModule = {
    init() {
        auth.onAuthStateChanged(user => {
            const splash = document.getElementById('splashScreen');
            if (splash) splash.style.display = 'none';

            if (user) {
                store.setState({ user });
                this.showApp();
            } else {
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
