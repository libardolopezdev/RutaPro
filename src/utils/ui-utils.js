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

