const platformCache = new Map();

function normalizePlatform(platformId, settingsPlatforms = []) {
    const rawId = (platformId || '').trim();
    if (!rawId) return { id: 'unknown', name: 'Desconocida', color: '#6b7280', isActiva: false };

    let id = rawId.toLowerCase();
    let name = rawId.toUpperCase();
    let color = '#6b7280'; // Gris neutro por defecto
    let isActiva = false;

    if (id.includes('_')) {
        const parts = id.split('_');
        if (!isNaN(parts[1]) && parts[1].length > 10) {
            id = parts[0];
            name = id.toUpperCase();
        }
    }

    const legacyMap = {
        'mano': { name: 'MANO', color: '#7C3AED' },
        'cabify': { name: 'CABIFY', color: '#7C3AED' },
        'coop': { name: 'COOPEBOMBAS', color: '#1976D2' },
        'uber': { name: 'UBER', color: '#000000' },
        'didi': { name: 'DIDI', color: '#FF4700' },
        'idriver': { name: 'INDRIVER', color: '#C0F11C' },
    };
    if (legacyMap[id]) {
        name = legacyMap[id].name;
        color = legacyMap[id].color;
    }

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

    return { id, name, color, isActiva, originalId: rawId };
}

console.log("TEST 3: User renamed Cabify platform to Coopebombas");
// platform was created as 'cabify', so its id is 'cabify_1712345678901'
// then they used editPlatform to rename it to 'COOPEBOMBAS'
// so settings has: { id: 'cabify_1712345678901', name: 'COOPEBOMBAS', color: '#7C3AED' }
// Now they create a new race using this platform: c.platform = 'cabify_1712345678901'
console.log(normalizePlatform('cabify_1712345678901', [{id: 'cabify_1712345678901', name: 'COOPEBOMBAS', color: '#7C3AED'}]))
