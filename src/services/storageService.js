/**
 * src/services/storageService.js
 * Capa de persistencia local (localStorage).
 */

const STORAGE_KEY = 'rutapro-state';
const HISTORICO_KEY = 'rutapro-historico';

export const storageService = {
    saveState(state) {
        try {
            const { user, isOnline, ...persistableState } = state;
            const dataToSave = {
                ...persistableState,
                jornadaInicio: persistableState.jornadaInicio
                    ? new Date(persistableState.jornadaInicio).toISOString()
                    : null,
                carreras: persistableState.carreras.map(c => ({
                    ...c,
                    timestamp: new Date(c.timestamp).toISOString()
                }))
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return null;
            const data = JSON.parse(saved);
            if (data.jornadaInicio) data.jornadaInicio = new Date(data.jornadaInicio);
            if (data.carreras) {
                data.carreras = data.carreras.map(c => ({
                    ...c,
                    timestamp: new Date(c.timestamp)
                }));
            }
            return data;
        } catch (error) {
            console.warn('Error loading from localStorage:', error);
            return null;
        }
    },

    saveHistorico(data) {
        localStorage.setItem(HISTORICO_KEY, JSON.stringify(data));
    },

    loadHistorico() {
        const saved = localStorage.getItem(HISTORICO_KEY);
        return saved ? JSON.parse(saved) : [];
    }
};
