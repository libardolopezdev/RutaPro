/**
 * src/modules/settings/settingsModule.js
 */
import { store } from '../../state/store.js';
import { firestoreService } from '../../services/firestoreService.js';
import { showToast } from '../../utils/ui-utils.js';
import {
    renderAvatarPlataforma,
    escapeHTML,
    normalizarNombre,
    resolverIdCanonico,
    getLogoUrlCached,
    getColorOficial,
    getCatalogoPlatformas,
} from '../../utils/format.js';


// Estado local de edición (no persiste, vive solo en memoria durante la sesión)
let _currentEditingId = null;

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
        this.cancelEditPlatform(); // Limpiar modo edición al cerrar el modal
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
                // console.warn("Failed to sync settings to Firestore:", error);
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
                <span style="flex: 1; font-size: 13px; font-weight: 700;">${escapeHTML(plat.name)}</span>
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
                // console.warn("Failed to sync settings to Firestore:", error);
            }
        }

        this.renderPlatformManager(newPlataformas);
        showToast(`Plataforma ${name.toUpperCase()} agregada`, 'success');
    },

    async removePlatform(id) {
        if (!confirm('¿Eliminar esta plataforma?')) return;
        const state = store.getState();
        
        if (state.settings.plataformas && state.settings.plataformas.length <= 1) {
            showToast('Debes tener al menos una plataforma activa', 'warning');
            return;
        }

        const newPlataformas = (state.settings.plataformas || []).filter(p => p.id !== id);
        const newSettings = { ...state.settings, plataformas: newPlataformas };

        store.setState({ settings: newSettings });

        if (state.user) {
            try {
                await firestoreService.saveSettings(state.user.uid, newSettings);
            } catch (error) {
                // console.warn("Failed to sync settings to Firestore:", error);
            }
        }

        this.renderPlatformManager(newPlataformas);
        showToast('Plataforma eliminada', 'success');
    },

    /**
     * Getter para que main.js pueda consultar si hay una edición activa
     * sin acceder directamente a la variable de módulo privada.
     */
    _getCurrentEditingId() {
        return _currentEditingId;
    },

    /**
     * Activa el modo edición para la plataforma con el ID dado.
     * Carga nombre y color en el formulario inferior y cambia el botón a "Actualizar".
     */
    startEditPlatform(id) {
        const state = store.getState();
        const plat = (state.settings.plataformas || []).find(p => p.id === id);
        if (!plat) return;

        _currentEditingId = id;

        // Rellenar formulario con datos actuales
        const nameEl = document.getElementById('newPlatformName');
        const colorEl = document.getElementById('newPlatformColor');
        if (nameEl) nameEl.value = plat.name;
        if (colorEl) colorEl.value = plat.color || '#10B981';

        // Cambiar UI al modo edición
        const saveBtn = document.getElementById('addPlatformBtn');
        const cancelBtn = document.getElementById('cancelEditPlatformBtn');
        const modeBar = document.getElementById('platformEditModeBar');
        if (saveBtn) saveBtn.textContent = 'Actualizar';
        if (cancelBtn) cancelBtn.style.display = 'block';
        if (modeBar) modeBar.style.display = 'block';

        // Hacer scroll al formulario para que sea visible
        if (nameEl) nameEl.focus();
    },

    /**
     * Cancela el modo edición y restaura el formulario al estado de creación.
     * Seguro de llamar aunque no haya edición activa.
     */
    cancelEditPlatform() {
        _currentEditingId = null;

        const nameEl = document.getElementById('newPlatformName');
        const colorEl = document.getElementById('newPlatformColor');
        const saveBtn = document.getElementById('addPlatformBtn');
        const cancelBtn = document.getElementById('cancelEditPlatformBtn');
        const modeBar = document.getElementById('platformEditModeBar');

        if (nameEl) nameEl.value = '';
        if (colorEl) colorEl.value = '#10B981';
        if (saveBtn) saveBtn.textContent = 'Guardar';
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (modeBar) modeBar.style.display = 'none';

        // RP-004: Limpiar autocomplete y vista previa al cancelar
        _hideDropdown();
        _updateBadge('');
        const previewContainer = document.getElementById('platformPreviewContainer');
        if (previewContainer) previewContainer.style.display = 'none';
    },

    /**
     * Persiste los cambios de nombre y color sobre la plataforma en edición.
     * El ID original se conserva intacto — no se regenera.
     */
    async updatePlatform(name, color) {
        if (!_currentEditingId || !name) return;
        const state = store.getState();

        const newPlataformas = (state.settings.plataformas || []).map(p =>
            p.id === _currentEditingId
                ? { ...p, name: name.toUpperCase(), color }
                : p
        );

        const newSettings = { ...state.settings, plataformas: newPlataformas };
        store.setState({ settings: newSettings });

        if (state.user) {
            try {
                await firestoreService.saveSettings(state.user.uid, newSettings);
            } catch (error) {
                // console.warn('Failed to sync settings to Firestore:', error);
            }
        }

        await this.renderPlatformManager(newPlataformas);
        showToast('Plataforma actualizada', 'success');
        this.cancelEditPlatform(); // Volver al modo creación
    },

    /**
     * @deprecated — Reemplazado por startEditPlatform() en RP-002.
     * Mantenido temporalmente para no romper referencias externas no detectadas.
     */
    editPlatform(id) {
        this.startEditPlatform(id);
    },

    /**
     * RP-004: Inicializa el motor de autocomplete para el campo de nombre de plataforma.
     * Debe llamarse una sola vez desde main.js en setupEventListeners().
     * Reutiliza: getCatalogoPlatformas, getLogoUrlCached, getColorOficial, resolverIdCanonico.
     */
    async initAutocomplete() {
        const nameEl = document.getElementById('newPlatformName');
        const colorEl = document.getElementById('newPlatformColor');
        const dropdown = document.getElementById('platformAutocompleteDropdown');
        
        if (!nameEl || !dropdown || !colorEl) return;

        // ── 1. Construir catálogo y pre-cargar logos ──────────────────────────
        const catalogoCompleto = getCatalogoPlatformas(); // { plataformas, directos }

        // Pre-carga asíncrona en background (no bloquea la UI)
        catalogoCompleto.plataformas.forEach(p => getLogoUrlCached(p.nombreOficial));

        // ── 2. Estado interno del autocomplete ────────────────────────────────
        let _highlightedIndex = -1;
        let _blurTimeout = null;
        let _currentItems = [];

        // ── 3. Renderizar dropdown ────────────────────────────────────────────
        async function _renderDropdown(query) {
            const q = normalizarNombre(query);
            
            // Filtrar por startsWith sobre nombre normalizado
            const filteredPlataformas = catalogoCompleto.plataformas.filter(p =>
                !q || normalizarNombre(p.nombreOficial).startsWith(q)
            );
            
            const filteredDirectos = catalogoCompleto.directos.filter(p =>
                !q || normalizarNombre(p.nombreOficial).startsWith(q)
            );

            _currentItems = [...filteredPlataformas, ...filteredDirectos];

            if (_currentItems.length === 0) {
                _hideDropdown();
                return;
            }

            let itemsHtml = '';
            let globalIndex = 0;

            if (filteredPlataformas.length > 0) {
                itemsHtml += `<div class="autocomplete-group-header">Plataformas</div>`;
                const platHtmls = await Promise.all(filteredPlataformas.map(async (p) => {
                    const color = p.colorOficial || '#6B7280';
                    const avatarHtml = await renderAvatarPlataforma({ name: p.nombreOficial, color });
                    const html = `<div class="autocomplete-item" data-index="${globalIndex}" role="option" aria-selected="false">
                        ${avatarHtml}
                        <span class="autocomplete-item-name">${escapeHTML(p.nombreOficial)}</span>
                    </div>`;
                    globalIndex++;
                    return html;
                }));
                itemsHtml += platHtmls.join('');
            }

            if (filteredDirectos.length > 0) {
                itemsHtml += `<div class="autocomplete-group-header">Servicios Directos</div>`;
                const dirHtmls = await Promise.all(filteredDirectos.map(async (p) => {
                    const color = p.colorOficial || '#6B7280';
                    const avatarHtml = await renderAvatarPlataforma({ name: p.nombreOficial, color });
                    const html = `<div class="autocomplete-item" data-index="${globalIndex}" role="option" aria-selected="false">
                        ${avatarHtml}
                        <span class="autocomplete-item-name">${escapeHTML(p.nombreOficial)}</span>
                    </div>`;
                    globalIndex++;
                    return html;
                }));
                itemsHtml += dirHtmls.join('');
            }

            dropdown.innerHTML = itemsHtml;
            _highlightedIndex = -1;
            dropdown.classList.add('visible');

            // Bind clicks en ítems (delegación)
            dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
                el.addEventListener('mousedown', (e) => {
                    // mousedown ocurre antes del blur — cancelar el blurTimeout
                    if (_blurTimeout) clearTimeout(_blurTimeout);
                    e.preventDefault();
                    const idx = parseInt(el.dataset.index, 10);
                    _selectItem(idx);
                });
            });
        }

        // ── 4. Seleccionar ítem ───────────────────────────────────────────────
        function _selectItem(index) {
            const plat = _currentItems[index];
            if (!plat) return;

            // Rellenar nombre
            nameEl.value = plat.nombreOficial;

            // Rellenar color oficial
            const colorOficial = getColorOficial(plat.nombreOficial) || plat.colorOficial;
            if (colorOficial) colorEl.value = colorOficial;

            _hideDropdown();
            _updateBadge(plat.nombreOficial);
            _updatePreview();
            
            // Poner el cursor al final
            nameEl.focus();
            const len = nameEl.value.length;
            nameEl.setSelectionRange(len, len);
        }

        // ── 5. Highlight con teclado ──────────────────────────────────────────
        function _setHighlight(index) {
            const items = dropdown.querySelectorAll('.autocomplete-item');
            items.forEach((el, i) => {
                const isSelected = i === index;
                el.classList.toggle('highlighted', isSelected);
                el.setAttribute('aria-selected', isSelected.toString());
                if (isSelected) {
                    el.scrollIntoView({ block: 'nearest' });
                }
            });
            _highlightedIndex = index;
        }

        // ── 6. Eventos ────────────────────────────────────────────────────────
        nameEl.addEventListener('input', async () => {
            await _renderDropdown(nameEl.value);
            _updateBadge(nameEl.value);
            _updatePreview();
        });

        colorEl.addEventListener('input', () => {
            _updatePreview();
        });

        nameEl.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.autocomplete-item');
            const total = items.length;
            if (!dropdown.classList.contains('visible') || total === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                _setHighlight(Math.min(_highlightedIndex + 1, total - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                _setHighlight(Math.max(_highlightedIndex - 1, 0));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (_highlightedIndex >= 0) {
                    e.preventDefault();
                    _selectItem(_highlightedIndex);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                _hideDropdown();
            }
        });

        nameEl.addEventListener('blur', () => {
            // Delay para que el click en un ítem pueda ejecutarse primero
            _blurTimeout = setTimeout(() => _hideDropdown(), 200);
        });

        nameEl.addEventListener('focus', async () => {
            await _renderDropdown(nameEl.value);
            _updateBadge(nameEl.value);
            _updatePreview();
        });

        // Botón Restaurar Oficial
        const btnRestore = document.getElementById('restoreOfficialColorBtn');
        if (btnRestore) {
            btnRestore.addEventListener('click', (e) => {
                e.preventDefault();
                const nombre = nameEl.value;
                const oficial = getColorOficial(nombre);
                if (oficial) {
                    colorEl.value = oficial;
                    _updatePreview();
                }
            });
        }
    },
};

// ── Helpers privados del autocomplete (fuera del objeto para no contaminar el API) ──

function _hideDropdown() {
    const dropdown = document.getElementById('platformAutocompleteDropdown');
    if (dropdown) {
        dropdown.classList.remove('visible');
        dropdown.innerHTML = '';
    }
}

function _updateBadge(nombre) {
    const badge = document.getElementById('platformRecognitionBadge');
    if (!badge) return;

    if (!nombre || !nombre.trim()) {
        badge.classList.remove('visible', 'recognized', 'custom');
        badge.textContent = '';
        return;
    }

    const idCanonico = resolverIdCanonico(nombre);
    const esReconocida = idCanonico && idCanonico !== 'SIN_LOGO' && !idCanonico.startsWith('CUSTOM_');

    badge.classList.remove('recognized', 'custom');
    badge.classList.add('visible', esReconocida ? 'recognized' : 'custom');

    if (esReconocida) {
        badge.innerHTML = `
            <div style="display:flex; align-items:center; gap:4px; text-transform:uppercase;">
                <span>✓</span> Plataforma reconocida
            </div>
            <div style="font-size:8px; color:var(--text-muted); opacity:0.85; font-weight:600; letter-spacing:0.02em;">
                Se utilizarán el nombre, icono y color oficiales.
            </div>
        `;
    } else {
        badge.innerHTML = `
            <div style="display:flex; align-items:center; gap:4px; text-transform:uppercase;">
                <span>○</span> Plataforma personalizada
            </div>
            <div style="font-size:8px; color:var(--text-muted); opacity:0.85; font-weight:600; letter-spacing:0.02em;">
                Se utilizarán las iniciales como icono.
            </div>
        `;
    }
}

async function _updatePreview() {
    const nameEl = document.getElementById('newPlatformName');
    const colorEl = document.getElementById('newPlatformColor');
    const previewContainer = document.getElementById('platformPreviewContainer');
    const previewAvatar = document.getElementById('platformPreviewAvatar');
    const previewName = document.getElementById('platformPreviewName');
    const btnRestore = document.getElementById('restoreOfficialColorBtn');

    if (!previewContainer || !nameEl || !colorEl) return;

    const nombre = nameEl.value.trim();
    if (!nombre) {
        previewContainer.style.display = 'none';
        return;
    }

    const color = colorEl.value;
    const colorOficial = getColorOficial(nombre);

    // Mostrar el contenedor y el nombre
    previewContainer.style.display = 'flex';
    previewName.textContent = nombre;

    // Renderizar avatar dinámicamente
    if (previewAvatar) {
        previewAvatar.innerHTML = await renderAvatarPlataforma({ name: nombre, color });
    }

    // Botón de restaurar
    const isCustomColor = colorOficial && colorOficial.toUpperCase() !== color.toUpperCase();
    if (btnRestore) {
        btnRestore.style.display = isCustomColor ? 'block' : 'none';
    }
}
