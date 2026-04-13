/**
 * src/modules/notifications/notificationsModule.js
 * Panel de notificaciones inteligente — lógica local, sin backend.
 */

import { store } from '../../state/store.js';

// ── Generadores de notificaciones ────────────────────────────────────────────

function buildNotifications(state) {
    const notes = [];
    const { carreras, gastos, settings, jornadaInicio } = state;

    // Calcular datos básicos
    const totalBruto = carreras.reduce((s, c) => s + (c.neto || c.amount), 0);
    const totalGastosSum = gastos.reduce((s, g) => s + g.monto, 0);
    const neto = totalBruto - totalGastosSum;
    const meta = settings.meta || 270000;
    const porcentaje = meta > 0 ? Math.round((neto / meta) * 100) : 0;
    const restante = Math.max(0, meta - neto);
    const restanteK = (restante / 1000).toFixed(0);
    const metaK = (meta / 1000).toFixed(0);

    // 1. Progreso de la meta
    if (porcentaje < 30) {
        notes.push({ emoji: '🚀', text: `Arranca fuerte, llevas ${porcentaje}% de tu meta` });
    } else if (porcentaje < 70) {
        notes.push({ emoji: '💰', text: `Vas en ${porcentaje}%, ¡sigue así!` });
    } else if (porcentaje < 100) {
        notes.push({ emoji: '🔥', text: `Casi llegas, te faltan $${restanteK}k para completar el día` });
    } else {
        notes.push({ emoji: '🏆', text: `¡Meta cumplida! Ganaste $${(neto / 1000).toFixed(0)}k hoy` });
    }

    // 2. Siempre mostrar distancia a la meta
    if (restante > 0) {
        notes.push({ emoji: '💰', text: `Estás a $${restanteK}k de tu meta diaria de $${metaK}k` });
    }

    // 3. Racha activa (guardada en localStorage)
    const streak = parseInt(localStorage.getItem('rutapro_streak') || '0', 10);
    if (streak >= 2) {
        notes.push({ emoji: '🔥', text: `Llevas ${streak} días seguidos trabajando — ¡no lo rompas!` });
    }

    // 4. Tiempo sin registrar carrera
    if (jornadaInicio && carreras.length > 0) {
        const lastCarrera = carreras[carreras.length - 1];
        const lastTs = new Date(lastCarrera.timestamp).getTime();
        const diffHours = (Date.now() - lastTs) / 3600000;
        if (diffHours >= 2) {
            notes.push({ emoji: '⏰', text: `Han pasado más de 2h sin registrar una carrera` });
        }
    }

    return notes;
}

// ── HTML del panel ────────────────────────────────────────────────────────────

function renderPanel(notes) {
    const panel = document.getElementById('notifPanel');
    const list = document.getElementById('notifList');
    if (!panel || !list) return;

    list.innerHTML = notes.map((n, i) => `
        <div class="notif-item" style="animation-delay:${i * 60}ms">
            <span class="notif-emoji">${n.emoji}</span>
            <span class="notif-text">${n.text}</span>
        </div>
    `).join('') || `<div class="notif-empty">Sin alertas por ahora. ¡Todo bien! ✅</div>`;
}

// ── Actualizar badge ──────────────────────────────────────────────────────────

function updateBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// ── API pública ───────────────────────────────────────────────────────────────

export const notificationsModule = {
    init() {
        // Escuchar cambios de estado para actualizar el badge
        store.subscribe((state) => {
            const notes = buildNotifications(state);
            updateBadge(notes.length);
            // También re-render el panel si está abierto
            const panel = document.getElementById('notifPanel');
            if (panel && panel.classList.contains('open')) {
                renderPanel(notes);
            }
        });

        // Botón campana — abrir/cerrar
        const bell = document.querySelector('[data-notif-trigger]');
        if (bell) {
            bell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }

        // Cerrar al tocar fuera
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notifPanel');
            if (!panel) return;
            if (!panel.contains(e.target) && !e.target.closest('[data-notif-trigger]')) {
                this.close();
            }
        });

        // Botón X de cierre
        const closeBtn = document.getElementById('notifCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    },

    toggle() {
        const panel = document.getElementById('notifPanel');
        if (!panel) return;
        if (panel.classList.contains('open')) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        const panel = document.getElementById('notifPanel');
        if (!panel) return;
        const state = store.getState();
        const notes = buildNotifications(state);
        renderPanel(notes);
        panel.classList.add('open');
    },

    close() {
        const panel = document.getElementById('notifPanel');
        if (panel) panel.classList.remove('open');
    }
};
