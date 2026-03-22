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

const platformCache = new Map();

/**
 * Centraliza la lógica de plataformas: limpieza de IDs, nombres, colores y estado activo.
 * @param {string} platformId - ID o nombre crudo de la plataforma
 * @param {Array} settingsPlatforms - Lista de plataformas configuradas en settings
 */
export function normalizePlatform(platformId, settingsPlatforms = []) {
    const rawId = (platformId || '').trim();
    if (!rawId) return { id: 'unknown', name: 'Desconocida', color: '#6b7280', isActiva: false };

    // Cache key incluye las plataformas activas (simplificado por IDs) para invalidación básica
    const activeIdsStr = settingsPlatforms.map(p => p.id).join(',');
    const cacheKey = `${rawId.toLowerCase()}_${activeIdsStr}`;
    if (platformCache.has(cacheKey)) return platformCache.get(cacheKey);

    let id = rawId.toLowerCase();
    let name = rawId.toUpperCase();
    let color = '#6b7280'; // Gris neutro por defecto
    let isActiva = false;

    // 1. Limpieza de IDs con timestamp (ej: mano_177...)
    if (id.includes('_')) {
        const parts = id.split('_');
        if (!isNaN(parts[1]) && parts[1].length > 10) {
            id = parts[0];
            name = id.toUpperCase();
        }
    }

    // 2. Mapeos Legacy
    const legacyMap = {
        'mano': { name: 'MANO', color: '#7C3AED' },
        'cabify': { name: 'MANO', color: '#7C3AED' },
        'coop': { name: 'COOPEBOMBAS', color: '#1976D2' },
        'uber': { name: 'UBER', color: '#000000' },
        'didi': { name: 'DIDI', color: '#FF4700' },
        'idriver': { name: 'INDRIVER', color: '#C0F11C' },
    };
    if (legacyMap[id]) {
        name = legacyMap[id].name;
        color = legacyMap[id].color;
    }

    // 3. Buscar en configuración activa (case-insensitive)
    const activePlat = settingsPlatforms.find(p =>
        p.id.toLowerCase() === id ||
        p.name.toLowerCase() === id ||
        p.id.toLowerCase() === rawId.toLowerCase()
    );

    if (activePlat) {
        id = activePlat.id;
        name = activePlat.name;
        color = activePlat.color;
        isActiva = true;
    }

    const result = { id, name, color, isActiva, originalId: rawId };
    platformCache.set(cacheKey, result);
    return result;
}

export function getPlatformColor(platform, plataformas = []) {
    return normalizePlatform(platform, plataformas).color;
}

export function getPlatformName(platformId, plataformas = []) {
    const norm = normalizePlatform(platformId, plataformas);
    return norm.isActiva ? norm.name : `${norm.name} • No activa`;
}
