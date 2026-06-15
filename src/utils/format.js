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

export function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
        'uber': { name: 'UBER', color: '#FFFFFF' },
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



// ─────────────────────────────────────────────────────────────────────────────
// SISTEMA DE LOGOS DE PLATAFORMAS
// ─────────────────────────────────────────────────────────────────────────────

/** Mapeo de variantes de nombre → ID canónico */
const ALIASES = {
    // Uber
    'uber': 'uber', 'uberx': 'uber', 'uber x': 'uber',

    // Didi
    'didi': 'didi', 'di di': 'didi',

    // Cabify
    'cabify': 'cabify',

    // InDriver
    'indriver': 'indriver', 'in driver': 'indriver',
    'indrive': 'indriver', 'in drive': 'indriver',

    // Beat
    'beat': 'beat',

    // Rappi
    'rappi': 'rappi', 'rapitaxi': 'rappi',

    // Picap
    'picap': 'picap', 'pi cap': 'picap',

    // Coopebombas
    'coopebombas': 'coopebombas',
    'coope bombas': 'coopebombas',
    'cooperativa bombas': 'coopebombas',
    'tax coopebombas': 'coopebombas',

    // Taxis Libres
    'taxislibres': 'taxislibres',
    'taxis libres': 'taxislibres',
    'taxilibres': 'taxislibres',

    // Sin logo — plataformas físicas/locales
    'mano': 'SIN_LOGO',
    'a mano': 'SIN_LOGO',
    'amano': 'SIN_LOGO',
    'calle': 'SIN_LOGO',
    'en calle': 'SIN_LOGO',
    'parada': 'SIN_LOGO',
    'tradicional': 'SIN_LOGO',
    'taxi tradicional': 'SIN_LOGO',
    'taxitradicionl': 'SIN_LOGO',
    'taxi': 'SIN_LOGO',
    'taxista': 'SIN_LOGO',
    'servicio': 'SIN_LOGO',
    'particular': 'SIN_LOGO',
    'taxindividual': 'SIN_LOGO',
    'tax individual': 'SIN_LOGO',
    'taxsuper': 'SIN_LOGO',
    'tax super': 'SIN_LOGO',
    'taxpoblado': 'SIN_LOGO',
    'tax poblado': 'SIN_LOGO',
    'flotabernal': 'SIN_LOGO',
    'flota bernal': 'SIN_LOGO',
    'taxestadio': 'SIN_LOGO',
    'tax estadio': 'SIN_LOGO',
};

/** Dominios oficiales verificados para favicon */
const DOMINIOS_OFICIALES = {
    'uber': 'uber.com',
    'didi': 'didiglobal.com',
    'cabify': 'cabify.com',
    'indriver': 'indriver.com',
    'beat': 'thebeat.co',
    'rappi': 'rappi.com',
    'picap': 'picap.co',
    'coopebombas': 'coopebombas.com',
    'taxislibres': 'taxislibres.com.co',
};

export function getColorPlataforma(nombrePlataforma, fallback = '#6B7280') {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  
  const COLORES = {
    'uber': isDark ? '#E5E7EB' : '#1A1A1A',
    'didi': '#FF5C00',
    'cabify': '#7C3AED',
    'indriver': '#C0F11C',
    'beat': '#00D4AA',
    'rappi': '#FF441F',
    'picap': '#00B0FF',
    'coopebombas': '#00778C',
    'taxislibres': '#FFD600',
    'taxindividual': '#F59E0B',
    'taxsuper': '#3B82F6',
    'taxpoblado': '#10B981',
    'flotabernal': '#EF4444',
    'taxestadio': '#8B5CF6',
  };

  const nombreLimpio = normalizarNombre(nombrePlataforma);
  return COLORES[nombreLimpio] || fallback;
}

// ─── Normalización ────────────────────────────────────────────────────────────

/**
 * Normaliza un nombre de plataforma: minúsculas, sin tildes, sin emojis,
 * sin caracteres especiales, espacios colapsados.
 * @param {string} nombre
 * @returns {string}
 */
export function normalizarNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') return '';
    return nombre
        .toLowerCase()
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .replace(/[\u2600-\u27BF]/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Resuelve el ID canónico de una plataforma a partir de su nombre.
 * Devuelve 'SIN_LOGO', un ID oficial, o 'CUSTOM_<nombre>' para desconocidas.
 * @param {string} nombrePlataforma
 * @returns {string|null}
 */
export function resolverIdCanonico(nombrePlataforma) {
    const normalizado = normalizarNombre(nombrePlataforma);
    if (!normalizado) return null;

    // 1. Match exacto en aliases
    if (ALIASES[normalizado]) return ALIASES[normalizado];

    // 2. Match sin espacios (ej: "taxislibres" vs "taxis libres")
    const sinEspacios = normalizado.replace(/\s+/g, '');
    if (ALIASES[sinEspacios]) return ALIASES[sinEspacios];

    // 3. Match parcial
    for (const [alias, id] of Object.entries(ALIASES)) {
        if (normalizado.includes(alias) || alias.includes(normalizado)) {
            return id;
        }
    }

    // 4. Plataforma personalizada no reconocida
    return 'CUSTOM_' + sinEspacios;
}

// ─── Caché + carga asíncrona ──────────────────────────────────────────────────

const _logoCache = new Map();

/**
 * Devuelve la URL del favicon de la plataforma, o null si no existe / no aplica.
 * Resultado cacheado en memoria durante la sesión.
 * @param {string} nombrePlataforma
 * @returns {Promise<string|null>}
 */
export async function getLogoUrlCached(nombrePlataforma) {
    const key = normalizarNombre(nombrePlataforma);
    if (!key) return null;

    if (_logoCache.has(key)) return _logoCache.get(key);

    const idCanonico = resolverIdCanonico(nombrePlataforma);

    // Plataformas físicas sin logo digital
    if (idCanonico === 'SIN_LOGO') {
        _logoCache.set(key, null);
        return null;
    }

    let url;
    if (idCanonico && DOMINIOS_OFICIALES[idCanonico]) {
        url = `https://www.google.com/s2/favicons?domain=${DOMINIOS_OFICIALES[idCanonico]}&sz=64`;
    } else {
        const nombreLimpio = normalizarNombre(nombrePlataforma).replace(/\s+/g, '');
        if (!nombreLimpio) {
            _logoCache.set(key, null);
            return null;
        }
        url = `https://www.google.com/s2/favicons?domain=${nombreLimpio}.com&sz=64`;
    }

    // Verificar que la imagen cargue y no sea el favicon genérico 16×16 de Google
    const resultado = await new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => resolve(null), 3000);
        img.onload = () => {
            clearTimeout(timeout);
            if (img.naturalWidth <= 16 && img.naturalHeight <= 16) {
                resolve(null); // favicon genérico = sin logo real
            } else {
                resolve(url);
            }
        };
        img.onerror = () => {
            clearTimeout(timeout);
            resolve(null);
        };
        img.src = url;
    });

    _logoCache.set(key, resultado);
    return resultado;
}

/**
 * Devuelve el color oficial de la plataforma, o null si es desconocida / sin logo.
 * @param {string} nombrePlataforma
 * @returns {string|null}
 */
export function getColorOficial(nombrePlataforma) {
    const idCanonico = resolverIdCanonico(nombrePlataforma);
    if (!idCanonico || idCanonico === 'SIN_LOGO') return null;
    const id = idCanonico.replace('CUSTOM_', '');
    return getColorPlataforma(id, null);
}

/**
 * Renderiza el avatar de una plataforma: favicon si está disponible,
 * iniciales con color de marca como fallback.
 * Es la ÚNICA función que debe usarse para avatares en todo el proyecto.
 * @param {{ name: string, color?: string }} plataforma
 * @param {number} [size=40]
 * @returns {Promise<string>} HTML string
 */
export async function renderAvatarPlataforma(plataforma, size = 40) {
    const logoUrl = await getLogoUrlCached(plataforma.name);
    const iniciales = (normalizarNombre(plataforma.name).substring(0, 2).toUpperCase()) || '??';
    const color = plataforma.color || getColorOficial(plataforma.name) || '#6B7280';
    const radius = Math.round(size * 0.25);

    const estiloBase = `width:${size}px;height:${size}px;border-radius:${radius}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;border:1px solid ${color}30;background:${color}15;`;

    if (!logoUrl) {
        return `
            <div style="${estiloBase}">
                <span style="font-size:${Math.round(size * 0.35)}px;font-weight:700;color:${color};line-height:1;user-select:none;">${iniciales}</span>
            </div>`;
    }

    return `
        <div style="${estiloBase}position:relative;">
            <img src="${logoUrl}"
                alt="${plataforma.name}"
                style="width:${Math.round(size * 0.7)}px;height:${Math.round(size * 0.7)}px;object-fit:contain;"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
            />
            <div style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;">
                <span style="font-size:${Math.round(size * 0.35)}px;font-weight:700;color:${color};">${iniciales}</span>
            </div>
        </div>`;
}

/**
 * Limpia el caché de logos. Llamar al hacer logout.
 */
export function limpiarCacheLogo() {
    _logoCache.clear();
}
