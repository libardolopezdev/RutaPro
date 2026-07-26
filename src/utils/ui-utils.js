/**
 * src/utils/ui-utils.js
 */

let toastTimeoutId = null;

export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    if (!toast || !toastMessage || !toastIcon) return;

    // Clear any existing timeouts to prevent rapid popups from hiding prematurely
    if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
    }

    // Set message
    // If the message ends with a checkmark "✓", we remove it since we now have an icon
    toastMessage.textContent = message.replace(' ✓', '');

    // Set styling and icon
    toast.className = `toast-container toast-${type}`;
    if (type === 'error') {
        toastIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    } else {
        toastIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    }

    // Trigger animation
    // We use a small delay to ensure the browser registers the class reset if it was already showing
    toast.classList.remove('show');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    toastTimeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Muestra un modal de confirmación genérico.
 * @param {Object} options Opciones del modal
 * @param {string} options.title Título del modal
 * @param {string} options.message Mensaje del modal (soporta HTML)
 * @param {string} [options.confirmText="Confirmar"] Texto del botón confirmar
 * @param {string} [options.cancelText="Cancelar"] Texto del botón cancelar
 * @param {string} [options.icon=""] Icono opcional (emoji o HTML)
 * @param {string} [options.confirmStyle="var(--ruby)"] Color de fondo del botón confirmar
 * @returns {Promise<boolean>} Promesa que resuelve a true si el usuario confirma, o false si cancela/cierra.
 */
export function showConfirm(options) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmModalTitle');
        const msgEl = document.getElementById('confirmModalMessage');
        const cancelBtn = document.getElementById('confirmModalCancelBtn');
        const confirmBtn = document.getElementById('confirmModalConfirmBtn');
        const iconEl = document.getElementById('confirmModalIcon');

        if (!modal || !titleEl || !msgEl || !cancelBtn || !confirmBtn) {
            // console.error('No se encontró el modal de confirmación genérico.');
            resolve(false);
            return;
        }

        // Configurar contenido
        titleEl.textContent = options.title || 'Confirmar';
        msgEl.innerHTML = options.message || '';
        cancelBtn.textContent = options.cancelText || 'Cancelar';
        confirmBtn.textContent = options.confirmText || 'Confirmar';
        confirmBtn.style.background = options.confirmStyle || 'var(--ruby)';

        if (options.icon) {
            iconEl.innerHTML = options.icon;
            iconEl.style.display = 'block';
        } else {
            iconEl.style.display = 'none';
        }

        // Función para cerrar
        const close = (result) => {
            modal.style.display = 'none';
            // Remover listeners
            cancelBtn.onclick = null;
            confirmBtn.onclick = null;
            modal.onclick = null;
            document.removeEventListener('keydown', keydownHandler);
            resolve(result);
        };

        // Asignar listeners
        cancelBtn.onclick = () => close(false);
        confirmBtn.onclick = () => close(true);
        
        // Clic fuera del modal (overlay)
        modal.onclick = (e) => {
            if (e.target === modal) close(false);
        };

        // Tecla Escape
        const keydownHandler = (e) => {
            if (e.key === 'Escape') {
                close(false);
            }
        };
        document.addEventListener('keydown', keydownHandler);

        // Mostrar modal
        modal.style.display = 'flex';
    });
}

