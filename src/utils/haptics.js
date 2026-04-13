/**
 * src/utils/haptics.js
 * Sistema de feedback háptico y visual para RutaPro.
 * Usa navigator.vibrate (Web Vibration API) para Android PWA/WebView.
 */

const supported = 'vibrate' in navigator;

export const haptics = {
    /** Vibración corta — nueva carrera registrada */
    mediumImpact() {
        if (supported) navigator.vibrate([40, 10, 40]);
    },

    /** Vibración leve — gasto registrado */
    lightImpact() {
        if (supported) navigator.vibrate(25);
    },

    /** Vibración muy leve — selección / apertura modal */
    selectionChanged() {
        if (supported) navigator.vibrate(15);
    },

    /** Vibración larga y fuerte — meta del día completa */
    heavyImpact() {
        if (supported) navigator.vibrate([80, 30, 80, 30, 120]);
    }
};

/**
 * Animación spring en un botón: scale down → release.
 * @param {HTMLElement} el
 */
export function springPress(el) {
    if (!el) return;
    el.style.transition = 'transform 0.1s ease-in';
    el.style.transform = 'scale(0.93)';
    setTimeout(() => {
        el.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        el.style.transform = 'scale(1)';
    }, 100);
}

/**
 * Animación de conteo rápido en un elemento numérico.
 * @param {HTMLElement} el
 * @param {number} from
 * @param {number} to
 * @param {number} duration ms
 */
export function animateCounter(el, from, to, duration = 400) {
    if (!el) return;
    const start = performance.now();
    const update = (now) => {
        const t = Math.min(1, (now - start) / duration);
        // Ease out
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (to - from) * eased);
        if (t < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

/**
 * Shake suave en un elemento (feedback de gasto).
 * @param {HTMLElement} el
 */
export function shakeElement(el) {
    if (!el) return;
    el.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' }
    ], { duration: 320, easing: 'ease-in-out' });
}

/**
 * Confetti de partículas sobre el arco de progreso al llegar a 100%.
 * @param {HTMLElement} container  El elemento padre donde lanzar partículas.
 */
export function launchConfetti(container) {
    if (!container) return;
    const colors = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#FCD34D', '#FBBF24'];
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.style.cssText = `
            position:absolute;
            width:${4 + Math.random() * 6}px;
            height:${4 + Math.random() * 6}px;
            background:${colors[Math.floor(Math.random() * colors.length)]};
            border-radius:50%;
            top:50%;left:50%;
            pointer-events:none;
            z-index:9999;
        `;
        container.style.position = 'relative';
        container.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 100;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        p.animate([
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 }
        ], {
            duration: 700 + Math.random() * 400,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards'
        }).onfinish = () => p.remove();
    }
}
