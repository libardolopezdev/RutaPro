/**
 * src/modules/settings/settingsModule.js
 */
import { store } from '../../state/store.js';
import { firestoreService } from '../../services/firestoreService.js';
import { showToast } from '../../utils/ui-utils.js';

export const settingsModule = {
    open() {
        const state = store.getState();
        const input = document.getElementById('metaInput');
        if (input) {
            const meta = state.settings.meta || 270000;
            input.value = new Intl.NumberFormat('es-CO').format(meta);
        }
        document.getElementById('settingsModal').style.display = 'block';
        this.renderPlatformManager(state.settings.plataformas);
    },

    close() {
        document.getElementById('settingsModal').style.display = 'none';
    },

    async save(metaValue) {
        const metaRaw = String(metaValue).replace(/\D/g, '');
        const meta = parseFloat(metaRaw) || 270000;
        const state = store.getState();

        const newSettings = {
            ...state.settings,
            meta
        };

        store.setState({ settings: newSettings });

        if (state.user) {
            try {
                await firestoreService.saveSettings(state.user.uid, newSettings);
            } catch (error) {
                console.warn("Failed to sync settings to Firestore:", error);
            }
        }

        this.close();
        showToast('Configuración guardada', 'success');
    },

    renderPlatformManager(plataformas) {
        const container = document.getElementById('platformManagerList');
        if (!container) return;

        container.innerHTML = plataformas.map(plat => `
            <div class="glass-card" style="display: flex; align-items: center; gap: 8px; padding: 12px; margin-bottom: 10px; border-radius: 16px; background: rgba(255,255,255,0.02);">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${plat.color}; box-shadow: 0 0 10px ${plat.color}66;"></div>
                <span style="flex: 1; font-size: 13px; font-weight: 700;">${plat.name}</span>
                <button class="edit-platform-btn" data-id="${plat.id}" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:5px;">✎</button>
                <button class="remove-platform-btn" data-id="${plat.id}" style="background:none; border:none; color:var(--ruby); cursor:pointer; padding:5px; font-size:18px;">×</button>
            </div>
        `).join('') || '<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px;">Sin plataformas.</p>';
    },

    async addPlatform(name, color) {
        if (!name) return;
        const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
        const state = store.getState();

        const currentPlataformas = state.settings.plataformas || [];
        const newPlataformas = [...currentPlataformas, { id, name: name.toUpperCase(), color }];
        const newSettings = { ...state.settings, plataformas: newPlataformas };

        store.setState({ settings: newSettings });

        if (state.user) {
            try {
                await firestoreService.saveSettings(state.user.uid, newSettings);
            } catch (error) {
                console.warn("Failed to sync settings to Firestore:", error);
            }
        }

        this.renderPlatformManager(newPlataformas);
        showToast(`Plataforma ${name} agregada`, 'success');
    },

    async removePlatform(id) {
        if (!confirm('¿Eliminar esta plataforma?')) return;
        const state = store.getState();
        const newPlataformas = (state.settings.plataformas || []).filter(p => p.id !== id);
        const newSettings = { ...state.settings, plataformas: newPlataformas };

        store.setState({ settings: newSettings });

        if (state.user) {
            try {
                await firestoreService.saveSettings(state.user.uid, newSettings);
            } catch (error) {
                console.warn("Failed to sync settings to Firestore:", error);
            }
        }

        this.renderPlatformManager(newPlataformas);
        showToast('Plataforma eliminada', 'success');
    },

    async editPlatform(id) {
        const state = store.getState();
        const plat = state.settings.plataformas.find(p => p.id === id);
        if (!plat) return;

        const newName = prompt('Nuevo nombre:', plat.name);
        if (newName === null) return;

        const newColor = prompt('Nuevo color (hex):', plat.color);
        if (newColor === null) return;

        const newPlataformas = state.settings.plataformas.map(p =>
            p.id === id ? { ...p, name: newName.toUpperCase(), color: newColor } : p
        );

        const newSettings = { ...state.settings, plataformas: newPlataformas };
        store.setState({ settings: newSettings });

        if (state.user) {
            try {
                await firestoreService.saveSettings(state.user.uid, newSettings);
            } catch (error) {
                console.warn("Failed to sync settings to Firestore:", error);
            }
        }

        this.renderPlatformManager(newPlataformas);
        showToast('Plataforma actualizada', 'success');
    }
};
