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

function extraerIdBase(id) {
    if (!id) return '';
    const parts = id.split('_');
    const ultimo = parts[parts.length - 1];
    // Solo quitar el segmento si tiene exactamente 13 dígitos (timestamp de Date.now())
    if (ultimo.length === 13 && !isNaN(ultimo)) {
        parts.pop();
    }
    return parts.join('_');
}

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

    const legacyMap = {
        'mano': { name: 'MANO', color: '#7C3AED' },
        'cabify': { name: 'CABIFY', color: '#7C3AED' },
        'coop': { name: 'COOPEBOMBAS', color: '#1976D2' },
        'uber': { name: 'UBER', color: '#1A1A1A' },
        'didi': { name: 'DIDI', color: '#FF4700' },
        'idriver': { name: 'INDRIVER', color: '#C0F11C' },
    };

    let result;

    // 1. Buscar primero en plataformas activas del usuario (match exacto)
    const activa = settingsPlatforms.find(p => p.id === rawId || p.name.toLowerCase() === rawId.toLowerCase());
    if (activa) {
        result = { ...activa, isActiva: true, originalId: rawId };
    } else {
        // 2. Intentar con ID base (sin timestamp)
        const idBase = extraerIdBase(rawId).toLowerCase();
        const activaBase = settingsPlatforms.find(p => 
            extraerIdBase(p.id).toLowerCase() === idBase ||
            p.name.toLowerCase() === idBase
        );
        
        if (activaBase) {
            result = { ...activaBase, isActiva: true, originalId: rawId };
        } else {
            // 3. Solo si no hay coincidencia, usar legacyMap
            if (legacyMap[idBase]) {
                result = { id: idBase, name: legacyMap[idBase].name, color: legacyMap[idBase].color, isActiva: false, originalId: rawId };
            } else if (legacyMap[rawId.toLowerCase()]) {
                result = { id: rawId.toLowerCase(), name: legacyMap[rawId.toLowerCase()].name, color: legacyMap[rawId.toLowerCase()].color, isActiva: false, originalId: rawId };
            } else {
                // 4. Fallback total
                result = { id: idBase, name: rawId.toUpperCase(), color: '#6b7280', isActiva: false, originalId: rawId };
            }
        }
    }

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

/**
 * Garantiza contraste mínimo para colores de plataforma según el tema activo.
 * @param {string} hexColor - Color hexadecimal ej. '#000000'
 * @param {boolean} isDark - true si el tema activo es oscuro
 */
export function getContrastSafeColor(hexColor, isDark) {
    if (!hexColor || hexColor.length < 7) return isDark ? '#9CA3AF' : '#374151';
    try {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        if (isDark && luminancia < 0.25) {
            return '#9CA3AF'; // Color muy oscuro en fondo oscuro -> gris claro
        }
        
        if (!isDark && luminancia > 0.35) {
            // Oscurecer proporcionalmente para mantener el tono en fondo claro
            const factor = 0.35 / luminancia;
            const nr = Math.floor(r * factor).toString(16).padStart(2, '0');
            const ng = Math.floor(g * factor).toString(16).padStart(2, '0');
            const nb = Math.floor(b * factor).toString(16).padStart(2, '0');
            return `#${nr}${ng}${nb}`;
        }
    } catch (_) {
        return isDark ? '#9CA3AF' : '#374151';
    }
    return hexColor;
}

const PLATAFORMAS_SIN_LOGO = [
  'mano', 'a mano', 'calle', 'tradicional',
  'taxi tradicional', 'parada'
];

export function getLogoUrl(nombrePlataforma) {
    if (!nombrePlataforma) return null;
    
    const nombreLimpio = nombrePlataforma
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    // Verificar primero si es plataforma sin logo
    if (PLATAFORMAS_SIN_LOGO.some(p => nombreLimpio.includes(p))) {
      return null; // No intentar cargar nada
    }

    const nombre = nombreLimpio.replace(/\s+/g, "");
    
    return `https://www.google.com/s2/favicons?domain=${nombre}.com&sz=64`;
}
  
export function renderAvatar(plataforma) {
    const logoUrl = getLogoUrl(plataforma.name);
    const iniciales = plataforma.name.substring(0, 2).toUpperCase();

    if (!logoUrl) {
        return `
          <div class="avatar-container" style="position: relative; width: 40px; height: 40px; flex-shrink: 0; border-radius: 10px; overflow: hidden; background: ${plataforma.color}20; border: 1px solid ${plataforma.color}40; display: flex; align-items: center; justify-content: center;">
            <div class="avatar-fallback" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: ${plataforma.color}20;">
              <span style="color: ${plataforma.color}; font-weight: 900; font-size: 11px;">${iniciales}</span>
            </div>
          </div>
        `;
    }

    return `
      <div class="avatar-container" style="position: relative; width: 40px; height: 40px; flex-shrink: 0; border-radius: 10px; overflow: hidden; background: ${plataforma.color}15; border: 1px solid ${plataforma.color}30; display: flex; align-items: center; justify-content: center;">
        <img 
          src="${logoUrl}" 
          alt="${plataforma.name}"
          class="logo-img"
          style="width: 100%; height: 100%; object-fit: contain; display: block; padding: 4px;"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
        />
        <div class="avatar-fallback" style="display:none; width: 100%; height: 100%; align-items: center; justify-content: center; background: ${plataforma.color}20;">
          <span style="color: ${plataforma.color}; font-weight: 900; font-size: 11px;">${iniciales}</span>
        </div>
      </div>
    `;
}
