/**
 * src/state/store.js
 * Gestión de estado centralizado y reactivo.
 */
import { storageService } from '../services/storageService.js';

const DEFAULT_PLATFORMS = [
    { id: 'uber', name: 'UBER', color: '#059669' },
    { id: 'didi', name: 'DIDI', color: '#FF4700' },
    { id: 'coopebombas', name: 'COOPEBOMBAS', color: '#00778c' },
    { id: 'indriver', name: 'INDRIVER', color: '#C0F11C' }
];

const initialState = {
    jornadaIniciada: false,
    jornadaInicio: null,
    carreras: [],
    gastos: [],
    selectedPlatform: null,
    selectedPayment: null,
    baseEfectivo: 0,
    settings: {
        meta: 270000,
        storageType: 'local',
        plataformas: [...DEFAULT_PLATFORMS]
    },
    user: null,
    isOnline: navigator.onLine
};

class Store {
    constructor(initialState) {
        this._state = initialState;
        this._listeners = [];

        // MIGRATION: Force Coopebombas if Cabify exists or if defaults are missing
        if (this._state.settings && this._state.settings.plataformas) {
            let plats = [...this._state.settings.plataformas];

            // Reemplazar Cabify por Coopebombas si existe
            const cabifyIndex = plats.findIndex(p => p.id === 'cabify');
            if (cabifyIndex !== -1) {
                plats[cabifyIndex] = { id: 'coopebombas', name: 'COOPEBOMBAS', color: '#00778c' };
            } else {
                // Asegurarse de que COOPEBOMBAS exista
                const hasCoope = plats.some(p => p.id === 'coopebombas');
                if (!hasCoope) {
                    plats.push({ id: 'coopebombas', name: 'COOPEBOMBAS', color: '#00778c' });
                }
            }
            this._state.settings.plataformas = plats;
        }

        // Migrar carreras activas
        if (this._state.carreras) {
            this._state.carreras = this._state.carreras.map(carrera => {
                if (carrera.platform === 'cabify') {
                    return { ...carrera, platform: 'coopebombas' };
                }
                return carrera;
            });
        }

        // Migrar historial
        if (this._state.historico) {
            this._state.historico = this._state.historico.map(jornada => {
                if (jornada.carrerasDesglose) {
                    jornada.carrerasDesglose = jornada.carrerasDesglose.map(carrera => {
                        if (carrera.platform === 'cabify') {
                            return { ...carrera, platform: 'coopebombas' };
                        }
                        return carrera;
                    });
                }
                return jornada;
            });
        }
    }

    getState() {
        return JSON.parse(JSON.stringify(this._state));
    }

    setState(newStateChunk) {
        // MIGRATION: Migrar carreras activas de Cabify a Coopebombas
        if (newStateChunk.carreras) {
            newStateChunk.carreras = newStateChunk.carreras.map(carrera => {
                if (carrera.platform === 'cabify') {
                    return { ...carrera, platform: 'coopebombas' };
                }
                return carrera;
            });
        }

        // MIGRATION: Migrar historial
        if (newStateChunk.historico) {
            newStateChunk.historico = newStateChunk.historico.map(jornada => {
                if (jornada.carrerasDesglose) {
                    jornada.carrerasDesglose = jornada.carrerasDesglose.map(carrera => {
                        if (carrera.platform === 'cabify') {
                            return { ...carrera, platform: 'coopebombas' };
                        }
                        return carrera;
                    });
                }
                return jornada;
            });
        }

        const nextSettings = {
            ...this._state.settings,
            ...(newStateChunk.settings || {})
        };

        // Ensure plataformas is not lost if only meta is updated, and vice versa
        if (newStateChunk.settings && newStateChunk.settings.plataformas) {
            nextSettings.plataformas = [...newStateChunk.settings.plataformas];
        }

        this._state = {
            ...this._state,
            ...newStateChunk,
            settings: nextSettings
        };
        this._notify();
    }

    subscribe(callback) {
        this._listeners.push(callback);
        callback(this.getState());
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    }

    _notify() {
        const currentState = this.getState();
        this._listeners.forEach(callback => callback(currentState));
    }

    clear() {
        storageService.clear();
        this._state = {
            jornadaIniciada: false,
            jornadaInicio: null,
            carreras: [],
            gastos: [],
            selectedPlatform: null,
            selectedPayment: null,
            baseEfectivo: 0,
            settings: {
                meta: 270000,
                storageType: 'local',
                plataformas: [...DEFAULT_PLATFORMS]
            },
            user: null,
            isOnline: navigator.onLine
        };
        this._notify();
    }
}

export const store = new Store(initialState);
