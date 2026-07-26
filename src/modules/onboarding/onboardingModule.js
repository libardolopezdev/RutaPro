import { auth } from '../../services/firebase-init.js';
import { firestoreService } from '../../services/firestoreService.js';
import { store } from '../../state/store.js';

export const onboardingModule = {
    selectedVehicleType: 'carro',
    selectedVehicleOwnership: 'propio',
    selectedCity: '',
    selectedPlatforms: new Set(),
    selectedMeta: 200000,
    selectedPayment: 'mixed',

    init() {
        this.bindEvents();
        this.showStep(1);
    },

    bindEvents() {
        // Pantalla 1: Vehículo
        const vTypeOptions = document.querySelectorAll('#onbVehicleType .onb-option');
        vTypeOptions.forEach(opt => {
            opt.onclick = () => {
                vTypeOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.selectedVehicleType = opt.getAttribute('data-val');
            };
        });

        const vOwnOptions = document.querySelectorAll('#onbVehicleOwnership .onb-option');
        vOwnOptions.forEach(opt => {
            opt.onclick = () => {
                vOwnOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.selectedVehicleOwnership = opt.getAttribute('data-val');
            };
        });

        document.getElementById('onbBtn1').onclick = () => {
            this.showStep(2);
        };

        // Pantalla 2: Ciudad
        const cityInput = document.getElementById('onbCityInput');
        const cityChipsContainer = document.getElementById('onbCityChips');
        
        const COLOMBIAN_CITIES = [
            'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta',
            'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Bello', 'Pasto',
            'Manizales', 'Neiva', 'Soledad', 'Villavicencio', 'Armenia', 'Soacha',
            'Valledupar', 'Itagüí', 'Montería', 'Sincelejo', 'Popayán', 'Floridablanca',
            'Palmira', 'Buenaventura', 'Tuluá', 'Dosquebradas', 'Envigado', 'Tunja',
            'Girón', 'Apartadó', 'Florencia', 'Uribia', 'Ipiales', 'Quibdó', 'Duitama',
            'Pitalito', 'Piedecuesta', 'Magangué', 'Chía', 'Jamundí', 'Yumbo', 'Sahagún',
            'Caucasia', 'Cereté', 'Aguachica', 'Girardot', 'Sogamoso', 'Rionegro'
        ];

        const renderCities = (query = '') => {
            if (!cityChipsContainer) return;
            const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            let filtered = [];
            if (!q) {
                filtered = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Cartagena'];
            } else {
                filtered = COLOMBIAN_CITIES.filter(c => 
                    c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
                ).slice(0, 6);
            }

            if (filtered.length === 0 && q) {
                // Allow custom city if typing doesn't match
                filtered = [cityInput.value.trim()];
            }

            cityChipsContainer.innerHTML = filtered.map(c => 
                `<div class="onb-option city-option" data-val="${c}" style="text-align:center; padding:16px; width: 100%; box-sizing: border-box;">${c}</div>`
            ).join('');

            cityChipsContainer.querySelectorAll('.city-option').forEach(chip => {
                chip.onclick = () => {
                    cityInput.value = chip.getAttribute('data-val');
                    this.selectedCity = cityInput.value;
                    cityChipsContainer.querySelectorAll('.city-option').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                };
            });
        };

        renderCities();

        if (cityInput) {
            cityInput.addEventListener('input', (e) => {
                renderCities(e.target.value);
            });
        }

        document.getElementById('onbBtn2').onclick = () => {
            this.selectedCity = cityInput.value.trim();
            if (!this.selectedCity) {
                alert('Por favor ingresa o selecciona tu ciudad de trabajo.');
                return;
            }
            this.showStep(3);
        };

        // Pantalla 3: Plataformas
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

        document.getElementById('onbBtn3').onclick = () => {
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
            this.showStep(4);
        };

        // Pantalla 4: Meta
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

        document.getElementById('onbBtn4').onclick = () => {
            const activeOpt = document.querySelector('#onbMetaList .onb-option.active');
            if (activeOpt && activeOpt.getAttribute('data-val') === 'custom') {
                const customVal = parseInt(document.getElementById('onbCustomMeta').value, 10);
                if (!customVal || customVal < 1000) {
                    alert('Ingresa una meta válida.');
                    return;
                }
                this.selectedMeta = customVal;
            }
            this.showStep(5);
        };

        // Pantalla 5: Pagos
        const payOptions = document.querySelectorAll('#onbPayList .onb-option');
        payOptions.forEach(opt => {
            opt.onclick = () => {
                payOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.selectedPayment = opt.getAttribute('data-val');
            };
        });

        document.getElementById('onbBtn5').onclick = () => {
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
        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById('onbStep' + i);
            if (el) el.style.display = step === i ? 'flex' : 'none';
        }
        document.getElementById('onbSuccess').style.display = step === 6 ? 'flex' : 'none';
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
                plataformas: platformsArray,
                // Nuevos campos
                vehiculoTipo: this.selectedVehicleType,
                vehiculoRelacion: this.selectedVehicleOwnership,
                ciudad: this.selectedCity
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

            this.showStep(6);
        } catch (error) {
            // console.error('Error guardando perfil:', error);
            alert('Hubo un error guardando tu perfil. Intenta de nuevo.');
        }
    }
};
