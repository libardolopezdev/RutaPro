/**
 * utils.js — Funciones utilitarias globales
 * RutaApp 2027
 * @author Libardo Lopez
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
 * Devuelve el color hexadecimal de cada plataforma buscando en appState.
 * @param {string} platform
 * @returns {string}
 */
function getPlatformColor(platform) {
    const plat = (appState.settings.plataformas || []).find(p => p.id === platform);
    return plat ? plat.color : '#666';
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
