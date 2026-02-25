/**
 * utils.js — Funciones utilitarias globales
 * RutaApp 2027
 */

/**
 * Formatea un número como moneda colombiana (COP).
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

/**
 * Devuelve el color hexadecimal de cada plataforma.
 * @param {string} platform
 * @returns {string}
 */
function getPlatformColor(platform) {
    const colors = {
        uber: '#000',
        didi: '#ff6b35',
        coop: '#2196F3',
        idriver: '#00BF63',
        mano: '#9C27B0'
    };
    return colors[platform] || '#666';
}

/**
 * Muestra una notificación emergente (toast).
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'success') {
    const toast = elements.toast;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
    }, 3000);
}
