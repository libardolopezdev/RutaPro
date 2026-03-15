/**
 * src/state/store.js
 * Gestión de estado centralizado y reactivo.
 */

const DEFAULT_PLATFORMS = [
    { id: 'uber', name: 'UBER', color: '#059669' },
    { id: 'didi', name: 'DIDI', color: '#FF4700' },
    { id: 'cabify', name: 'CABIFY', color: '#7350FF' },
    { id: 'indriver', name: 'INDRIVER', color: '#27B1FF' }
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
    }

    getState() {
        return JSON.parse(JSON.stringify(this._state));
    }

    setState(newStateChunk) {
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
}

export const store = new Store(initialState);
