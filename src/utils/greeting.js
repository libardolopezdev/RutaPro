import { formatCurrency } from './format.js';

function getRandomMessage(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

let lastNetoCache = -1;
let lastJornadaStateCache = null;
let currentMessage = '';

export function updateGreeting(state) {
    const el = document.getElementById('greetingText');
    const elModal = document.getElementById('jornadaModalGreeting');
    if (!el) return;

    // Métricas clave
    const meta = state.settings?.metaDiaria || state.settings?.meta || 270000;
    const carreras = state.carreras || [];
    const gastos = state.gastos || [];
    
    const totalCarrerasNeto = carreras.reduce((sum, c) => sum + (c.neto || c.amount), 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
    const neto = totalCarrerasNeto - totalGastos;
    const restante = Math.max(0, meta - neto);
    const pct = meta > 0 ? (neto / meta) * 100 : 0;
    const numCarreras = carreras.length;

    // Tiempos
    const now = new Date();
    const currentHour = now.getHours();
    let timeOfDay = 'mañana';
    if (currentHour >= 12 && currentHour < 18) timeOfDay = 'tarde';
    else if (currentHour >= 18) timeOfDay = 'noche';

    let hoursWorking = 0;
    if (state.jornadaInicio) {
        hoursWorking = (now.getTime() - new Date(state.jornadaInicio).getTime()) / 3600000;
    }
    
    const promHora = hoursWorking > 0.05 ? (neto / hoursWorking) : 0;
    // Si hace más de lo necesario por hora para cumplir la meta en 8h (ej. > 33k/h)
    const isVolando = promHora > (meta / 8) * 1.2; 

    // Solo actualizamos el mensaje si hay un cambio real en el progreso o en el estado
    if (neto !== lastNetoCache || state.jornadaIniciada !== lastJornadaStateCache) {
        lastNetoCache = neto;
        lastJornadaStateCache = state.jornadaIniciada;

        let pool = [];

        // MOTOR PSEUDO-IA: Construcción de frases según contexto cruzado
        if (!state.jornadaIniciada) {
            if (timeOfDay === 'mañana') {
                pool = [
                    "¿Listo para sacarla del estadio hoy? 🚀",
                    "Buenos días, hoy es un excelente día para facturar. 🌞",
                    "Prende motores que esa meta no se cumple sola. 🚗"
                ];
            } else if (timeOfDay === 'tarde') {
                pool = [
                    "Aprovecha el flujo de la tarde, ¡vamos! 🌆",
                    "Todavía hay mucho movimiento, ¡arranca! ⚡",
                    "Buena hora para empezar a sumar. 💸"
                ];
            } else {
                pool = [
                    "La noche es joven y las tarifas están buenas. 🌙",
                    "A facturar en el turno nocturno, maneja con cuidado. 🦉",
                    "¿Listo para cerrar el día con broche de oro? ✨"
                ];
            }
        } else if (pct < 30) {
            pool = [
                `Apenas calentando motores, llevas ${formatCurrency(neto)}. ¡Dale! 🔥`,
                `Ya cayeron las primeras ${numCarreras} carreras, que no pare. 📈`,
                "El inicio siempre es suave, mantén el ritmo. ⚡"
            ];
            if (hoursWorking < 1 && neto > 0) {
                pool.push(`¡Empezaste con toda! En menos de 1 hora ya llevas ${formatCurrency(neto)}. 🚀`);
            }
        } else if (pct < 75) {
            pool = [
                `Pasaste la barrera de los ${formatCurrency(neto)}. Sigue así. 💪`,
                `Ya casi a la mitad, faltan ${formatCurrency(restante)}. 🎯`,
                `Llevas ${numCarreras} viajes, buen volumen de trabajo. 🚗`
            ];
            if (isVolando) {
                pool.push(`¡Vas volando! Promedio de ${formatCurrency(promHora)} por hora. 🦅`);
            }
        } else if (pct < 100) {
            pool = [
                `¡A nada de la meta! Faltan solo ${formatCurrency(restante)}. 🏁`,
                `Ya tienes ${formatCurrency(neto)} asegurados. Un último esfuerzo. 💸`,
                `Estás en modo bestia hoy. ¡Remata el día! 🔥🔥`,
                `¿Hacemos ${formatCurrency(restante)} más y nos vamos a descansar? 😏`
            ];
        } else {
            pool = [
                `¡Meta de ${formatCurrency(meta)} superada! Felicidades. 🏆`,
                `Ya la hiciste, lo que hagas de ahora en adelante es ganancia pura. 🤑`,
                `Modo imparable activado. Llevas ${formatCurrency(neto)}, el cielo es el límite. 👑`,
                `Si quieres descansar, ya es justo. Si no, ¡a seguir facturando! 🚀`
            ];
        }

        let msg = getRandomMessage(pool);
        // Evitar que repita el mismo mensaje si es posible
        if (msg === currentMessage && pool.length > 1) {
            const filtered = pool.filter(m => m !== currentMessage);
            msg = getRandomMessage(filtered);
        }
        currentMessage = msg;

        // Animación de entrada
        el.classList.remove('greeting-anim');
        void el.offsetWidth; // Forzar reflow
        el.classList.add('greeting-anim');
        
        el.innerHTML = currentMessage;
        if (elModal) elModal.textContent = currentMessage;
    }
}