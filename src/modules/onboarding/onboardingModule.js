import { auth } from '../../services/firebase-init.js';
import { firestoreService } from '../../services/firestoreService.js';
import { store } from '../../state/store.js';

export const onboardingModule = {
    selectedPlatforms: new Set(),
    selectedMeta: 200000,
    selectedPayment: 'mixed',

    init() {
        this.bindEvents();
        this.showStep(1);
    },

    bindEvents() {
        // Pantalla 1: Plataformas
        const platformOptions = document.querySelectorAll('#onbPlatformList .onb-option');
        const otrasWrap = document.getElementById('onbOtrasInputWrap');
        
        platformOptions.forEach(opt => {
            opt.onclick = () => {
                const val = opt.getAttribute('data-val');
                if (this.selectedPlatforms.has(val)) {
                    this.selectedPlatforms.delete(val);
                    opt.classList.remove('active');
                    if (val === 'otras' && otrasWrap) otrasWrap.style.display = 'none';
                } else {
                    this.selectedPlatforms.add(val);
                    opt.classList.add('active');
                    if (val === 'otras' && otrasWrap) {
                        otrasWrap.style.display = 'block';
                        document.getElementById('onbOtrasInput').focus();
                    }
                }
            };
        });

        document.getElementById('onbBtn1').onclick = () => {
            if (this.selectedPlatforms.size === 0) {
                alert('Selecciona al menos una aplicación.');
                return;
            }
            if (this.selectedPlatforms.has('otras')) {
                const otrasVal = document.getElementById('onbOtrasInput').value.trim();
                if (!otrasVal) {
                    alert('Por favor, especifica cuál es la otra plataforma que utilizas.');
                    return;
                }
                this.customOtrasName = otrasVal;
            }
            this.showStep(2);
        };

        // Pantalla 2: Meta
        const metaOptions = document.querySelectorAll('#onbMetaList .onb-option');
        const customWrap = document.getElementById('onbCustomMetaWrap');
        metaOptions.forEach(opt => {
            opt.onclick = () => {
                metaOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                const val = opt.getAttribute('data-val');
                if (val === 'custom') {
                    customWrap.style.display = 'block';
                } else {
                    customWrap.style.display = 'none';
                    this.selectedMeta = parseInt(val, 10);
                }
            };
        });

        document.getElementById('onbBtn2').onclick = () => {
            const activeOpt = document.querySelector('#onbMetaList .onb-option.active');
            if (activeOpt && activeOpt.getAttribute('data-val') === 'custom') {
                const customVal = parseInt(document.getElementById('onbCustomMeta').value, 10);
                if (!customVal || customVal < 1000) {
                    alert('Ingresa una meta válida.');
                    return;
                }
                this.selectedMeta = customVal;
            }
            this.showStep(3);
        };

        // Pantalla 3: Pagos
        const payOptions = document.querySelectorAll('#onbPayList .onb-option');
        payOptions.forEach(opt => {
            opt.onclick = () => {
                payOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.selectedPayment = opt.getAttribute('data-val');
            };
        });

        document.getElementById('onbBtn3').onclick = () => {
            this.finishOnboarding();
        };

        // Pantalla Éxito: Start Turno
        document.getElementById('onbBtnStart').onclick = () => {
            document.getElementById('onboardingScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            
            // Start jornada directly bypassing the confirmation modal
            if (window.carrerasModule) {
                window.carrerasModule.toggleJornada();
            }
        };
    },

    showStep(step) {
        document.getElementById('onbStep1').style.display = step === 1 ? 'flex' : 'none';
        document.getElementById('onbStep2').style.display = step === 2 ? 'flex' : 'none';
        document.getElementById('onbStep3').style.display = step === 3 ? 'flex' : 'none';
        document.getElementById('onbSuccess').style.display = step === 4 ? 'flex' : 'none';
    },

    getPlatformColor(val) {
        const colors = {
            'uber': '#121212',
            'didi': '#FF7A00',
            'indrive': '#00E676',
            'cabify': '#7B1FA2',
            'taxi': '#FFD600',
            'otras': '#42A5F5'
        };
        return colors[val] || '#10B981';
    },

    getPlatformName(val) {
        const names = {
            'uber': 'Uber',
            'didi': 'DiDi',
            'indrive': 'InDrive',
            'cabify': 'Cabify',
            'taxi': 'Taxi',
            'otras': 'Otras'
        };
        return names[val] || 'Otra';
    },

    async finishOnboarding() {
        const user = auth.currentUser;
        if (!user) return;

        const platformsArray = Array.from(this.selectedPlatforms).map(val => ({
            id: val,
            name: val === 'otras' && this.customOtrasName ? this.customOtrasName : this.getPlatformName(val),
            color: this.getPlatformColor(val),
            active: true
        }));

        const profileData = {
            profile: {
                displayName: user.displayName || 'Conductor',
                email: user.email,
                photoURL: user.photoURL || '',
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            },
            settings: {
                onboardingCompleted: true,
                meta: this.selectedMeta,
                paymentPreference: this.selectedPayment,
                theme: 'dark',
                plataformas: platformsArray
            },
            analytics: {
                totalJornadas: 0,
                totalCarreras: 0,
                totalIngresos: 0,
                lastLogin: window.firebase.firestore.FieldValue.serverTimestamp()
            }
        };

        try {
            await firestoreService.createInitialProfile(user.uid, profileData);
            
            // Re-hydrate store with new settings immediately
            store.setState({ 
                settings: profileData.settings
            });

            this.showStep(4);
        } catch (error) {
            // console.error('Error guardando perfil:', error);
            alert('Hubo un error guardando tu perfil. Intenta de nuevo.');
        }
    }
};
