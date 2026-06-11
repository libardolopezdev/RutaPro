/**
 * src/modules/settings/settingsModule.js
 */
import { store } from '../../state/store.js';
import { firestoreService } from '../../services/firestoreService.js';
import { showToast } from '../../utils/ui-utils.js';
import { renderAvatarPlataforma } from '../../utils/format.js';

export const settingsModule = {
    open() {
        const state = store.getState();
        const input = document.getElementById('settingsMetaInput'); // Actualizado
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

    async renderPlatformManager(plataformas) {
        const container = document.getElementById('platformManagerList');
        if (!container) return;

        const items = await Promise.all(plataformas.map(async plat => {
            const avatarHtml = await renderAvatarPlataforma(plat);
            return `
            <div class="glass-card" style="display: flex; align-items: center; gap: 10px; padding: 12px; margin-bottom: 10px; border-radius: 16px; background: rgba(255,255,255,0.02);">
                ${avatarHtml}
                <span style="flex: 1; font-size: 13px; font-weight: 700;">${plat.name}</span>
                <button class="edit-platform-btn" data-id="${plat.id}" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:5px;">&#9999;</button>
                <button class="remove-platform-btn" data-id="${plat.id}" style="background:none; border:none; color:var(--ruby); cursor:pointer; padding:5px; font-size:18px;">×</button>
            </div>
            `;
        }));
        container.innerHTML = items.join('') || '<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px;">Sin plataformas.</p>';
    },

    async addPlatform(name, color) {
        if (!name) return;
        const state = store.getState();
        const currentPlataformas = state.settings.plataformas || [];

        // Generar ID estable basado en el nombre (sin timestamp)
        const nuevoId = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, '')   // quitar tildes
            .replace(/[^a-z0-9]/g, '_')         // reemplazar caracteres especiales
            .replace(/_+/g, '_')                 // colapsar guiones múltiples
            .replace(/^_|_$/g, '');              // quitar guiones al inicio/fin

        // Si ya existe ese ID exacto, no duplicar
        const existePorId = currentPlataformas.find(p => p.id === nuevoId);
        if (existePorId) {
            showToast(`"${existePorId.name}" ya existe con ese nombre`, 'warning');
            return;
        }

        // Si existe el mismo nombre (case-insensitive), no duplicar
        const existePorNombre = currentPlataformas.find(
            p => p.name.toLowerCase() === name.toLowerCase()
        );
        if (existePorNombre) {
            showToast('Ya tienes una plataforma con ese nombre', 'warning');
            return;
        }

        const newPlataformas = [
            ...currentPlataformas,
            { id: nuevoId, name: name.toUpperCase(), color }
        ];
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
        showToast(`Plataforma ${name.toUpperCase()} agregada`, 'success');
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
