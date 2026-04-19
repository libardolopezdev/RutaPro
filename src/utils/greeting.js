// ===== MENSAJES DINÁMICOS POR PROGRESO =====
const motivationalMessages = {
    noJornada: [
        "¿Listo para sacarla del estadio hoy? 🚀",
        "Tu meta te está esperando, ¡arranca! 💪",
        "Hoy es un buen día para ganar buena plata 🎯"
    ],
    low: [ // 1–29%
        "¡Arrancaste, no pares ahora! ⚡",
        "Cada carrera suma, sigue echándole 🔥",
        "Apenas calentando motores 🚗"
    ],
    mid: [ // 30–79%
        "Ya vas a la mitad, ¡no afloje! 💨",
        "La meta está al alcance, tú puedes 🎯",
        "Más de la mitad del camino, ¡vamos con todo! 💪",
        "Buen ritmo, siga facturando 💸"
    ],
    high: [ // 80–99%
        "¡Casi la llevas, un último empujón! 🏁",
        "¡A nada de la meta, no pare! ⚡",
        "Estás en modo bestia 🔥🔥",
        "Un par de carreras más y la sacó 🎯"
    ],
    goal: [ // +100%
        "Meta cumplida... ¿y si una más? 😏",
        "Ya la hizo, pero la ambición manda 💸",
        "Esto ya es delito de tan bueno 👑",
        "Modo imparable activado 🦅",
        "¿Quién habló de techo? 🚀"
    ]
};

function getRandomMessage(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

let currentPhase = null;
let currentMessage = '';

export function updateGreeting(state) {
    const el = document.getElementById('greetingText');
    const elModal = document.getElementById('jornadaModalGreeting');
    if (!el) return;

    const meta = state.settings?.metaDiaria || state.settings?.meta || 270000;
    const totalCarrerasNeto = (state.carreras || []).reduce((sum, c) => sum + (c.neto || c.amount), 0);
    const totalGastos = (state.gastos || []).reduce((sum, g) => sum + g.monto, 0);
    const neto = totalCarrerasNeto - totalGastos;
    const pct = meta > 0 ? (neto / meta) * 100 : 0;

    let phase = '';
    if (!state.jornadaIniciada) {
        phase = 'noJornada';
    } else if (pct < 30) {
        phase = 'low';
    } else if (pct < 80) {
        phase = 'mid';
    } else if (pct < 100) {
        phase = 'high';
    } else {
        phase = 'goal';
    }

    if (phase !== currentPhase) {
        currentPhase = phase;
        currentMessage = getRandomMessage(motivationalMessages[phase]);
        
        // Remove animation to re-trigger it
        el.classList.remove('greeting-anim');
        void el.offsetWidth; // Force reflow
        el.classList.add('greeting-anim');
        
        // Colorize emojis or specific words if needed, but simple reveal is very pro
        el.innerHTML = currentMessage;
        if (elModal) elModal.textContent = currentMessage;
    }
}