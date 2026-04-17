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

export function updateGreeting(state) {
    const el = document.getElementById('greetingText');
    const elModal = document.getElementById('jornadaModalGreeting');
    if (!el) return;

    const meta = state.settings?.metaDiaria || state.settings?.meta || 270000;
    const totalCarrerasNeto = (state.carreras || []).reduce((sum, c) => sum + (c.neto || c.amount), 0);
    const totalGastos = (state.gastos || []).reduce((sum, g) => sum + g.monto, 0);
    const neto = totalCarrerasNeto - totalGastos;
    const pct = meta > 0 ? (neto / meta) * 100 : 0;

    let message = '';

    if (!state.jornadaIniciada) {
        message = getRandomMessage(motivationalMessages.noJornada);
    } else if (pct < 30) {
        message = getRandomMessage(motivationalMessages.low);
    } else if (pct < 80) {
        message = getRandomMessage(motivationalMessages.mid);
    } else if (pct < 100) {
        message = getRandomMessage(motivationalMessages.high);
    } else {
        message = getRandomMessage(motivationalMessages.goal);
    }

    el.textContent = message;
    if (elModal) elModal.textContent = message;
}