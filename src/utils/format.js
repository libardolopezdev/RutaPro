/**
 * src/utils/format.js
 */

export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

export function getPlatformColor(platform, plataformas = []) {
    const isUber = (platform || '').toLowerCase() === 'uber';
    if (isUber) return 'var(--uber-color)';
    const plat = plataformas.find(p => p.id === platform || p.name === platform);
    return plat ? plat.color : '#666';
}

export function getPlatformName(platformId, plataformas = []) {
    const plat = plataformas.find(p => p.id === platformId || p.name === platformId);
    return plat ? plat.name : platformId;
}
