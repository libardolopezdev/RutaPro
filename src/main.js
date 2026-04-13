/**
 * src/main.js
 * Orquestador principal de RutaPro 2027 (Ultra-Premium Edition).
 */

import './services/firebase-init.js';
import { store } from './state/store.js';
import { storageService } from './services/storageService.js';
import { renderer } from './ui/renderer.js';
import { authModule } from './modules/auth/authModule.js';
import { carrerasModule } from './modules/carreras/carrerasModule.js';
import { gastosModule } from './modules/gastos/gastosModule.js';
import { historicoModule } from './modules/historico/historicoModule.js';
import { settingsModule } from './modules/settings/settingsModule.js';
import { notificationsModule } from './modules/notifications/notificationsModule.js';
import { haptics, springPress, animateCounter, shakeElement, launchConfetti } from './utils/haptics.js';

async function initApp() {
    console.log('RutaPro V3: Powering Up...');

    const localState = storageService.loadState();
    if (localState) store.setState(localState);

    // Último porcentaje conocido para detectar cuando llega a 100%
    let _lastPct = 0;

    store.subscribe((state) => {
        renderer.render(state);
        storageService.saveState(state);
        syncJornadaActivaModal(state);

        // ── Detectar meta completada ──────────────────────────────
        const totalNeto = state.carreras.reduce((s, c) => s + (c.neto || c.amount), 0)
            - state.gastos.reduce((s, g) => s + g.monto, 0);
        const meta = state.settings.meta || 270000;
        const pct = meta > 0 ? Math.round((totalNeto / meta) * 100) : 0;
        if (pct >= 100 && _lastPct < 100) {
            haptics.heavyImpact();
            // Partículas sobre el medidor principal
            const gaugeContainer = document.querySelector('#progressCircleMeta')?.closest('.glass-card');
            if (gaugeContainer) launchConfetti(gaugeContainer);
            // Glow pulsante en el arco
            const arc = document.getElementById('progressCircleMeta');
            if (arc) arc.closest('svg')?.classList.add('goal-complete-glow');
        }
        _lastPct = pct;
    });

    authModule.init();
    notificationsModule.init();
    setupEventListeners();
}

function setupEventListeners() {
    const bind = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };
    const openModal = (id) => {
        const m = document.getElementById(id);
        if (m) m.style.display = 'flex';
    };
    const closeModal = (id) => {
        const m = document.getElementById(id);
        if (m) m.style.display = 'none';
    };

    // ── Jornada ──
    bind('jornadaBtn', 'click', () => {
        carrerasModule.toggleJornada();
        // Abrir el modal de jornada activa al iniciar
        setTimeout(() => {
            const state = store.getState();
            if (state.jornadaIniciada) openJornadaActivaModal();
        }, 200);
    });

    bind('btnFinalizarJornada', 'click', () => {
        const state = store.getState();
        const bruto = state.carreras.reduce((s, c) => s + c.amount, 0);
        const gastos = state.gastos.reduce((s, g) => s + g.monto, 0);
        const neto = bruto - gastos;
        document.getElementById('finalBruto').textContent = `$${bruto.toLocaleString('es-CO')}`;
        document.getElementById('finalGastos').textContent = `-$${gastos.toLocaleString('es-CO')}`;
        document.getElementById('finalNeto').textContent = `$${neto.toLocaleString('es-CO')}`;
        openModal('summaryModal');
    });

    bind('confirmCloseJornada', 'click', () => {
        carrerasModule.closeJornada();
        closeModal('summaryModal');
    });

    bind('btnCompartirActiva', 'click', () => carrerasModule.exportReport());

    // ── Modales ──
    bind('btnNuevaCarreraFAB', 'click', () => openModal('carriageModal'));
    bind('btnRegistrarGastoFAB', 'click', () => openModal('gastoModal'));

    bind('fabNewRace', 'click', () => {
        const state = store.getState();
        if (state.jornadaIniciada) openModal('carriageModal');
        else carrerasModule.toggleJornada();
    });

    // ── Carrera (con haptics + spring) ──
    bind('addCarrera', 'click', () => {
        const input = document.getElementById('amountInput');
        const amount = parseFloat(input.value.replace(/\D/g, ''));
        if (amount) {
            const prevCount = store.getState().carreras.length;
            carrerasModule.addCarrera(amount);
            input.value = '';
            closeModal('carriageModal');
            // Haptics + spring en botón del modal de jornada
            haptics.mediumImpact();
            const jmBtn = document.getElementById('jmBtnNuevaCarrera');
            springPress(jmBtn);
            const jmBtn2 = document.getElementById('btnNuevaCarreraFAB');
            springPress(jmBtn2);
            // Animación del counter en tarjeta de métricas
            const statEl = document.getElementById('jmStatRides');
            if (statEl) animateCounter(statEl, prevCount, prevCount + 1);
        }
    });

    // ── Gasto (con haptics + shake) ──
    bind('agregarGasto', 'click', () => {
        const monto = parseFloat(document.getElementById('gastoMonto').value.replace(/\D/g, ''));
        const tipo = document.getElementById('gastoTipo').value;
        if (monto && tipo) {
            gastosModule.addGasto(monto, tipo);
            document.getElementById('gastoMonto').value = '';
            document.getElementById('gastoTipo').value = '';
            haptics.lightImpact();
            shakeElement(document.getElementById('btnRegistrarGastoFAB'));
            shakeElement(document.getElementById('jmBtnGasto'));
        }
    });

    // ── Formato miles ──
    const formatInput = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value) e.target.value = new Intl.NumberFormat('es-CO').format(value);
    };
    bind('amountInput', 'input', formatInput);
    bind('gastoMonto', 'input', formatInput);
    bind('metaInput', 'input', formatInput);

    // ── Delegación clicks dinámicos ──
    document.addEventListener('click', (e) => {
        const pChip = e.target.closest('.p-chip');
        if (pChip) carrerasModule.selectPlatform(pChip.dataset.platform);

        const payBtn = e.target.closest('[data-payment]');
        if (payBtn) carrerasModule.selectPayment(payBtn.dataset.payment);

        const delRide = e.target.closest('.delete-btn');
        if (delRide) {
            const deleted = carrerasModule.deleteCarrera(Number(delRide.dataset.id));
            if (deleted) openCarrerasDetail();
        }

        const delGasto = e.target.closest('.delete-gasto-btn');
        if (delGasto) gastosModule.deleteGasto(delGasto.dataset.id);

        const delPlat = e.target.closest('.remove-platform-btn');
        if (delPlat) settingsModule.removePlatform(delPlat.dataset.id);

        const editPlat = e.target.closest('.edit-platform-btn');
        if (editPlat) settingsModule.editPlatform(editPlat.dataset.id);
    });

    // ── Cierre de modales ──
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-close]');
        if (!closeBtn) return;
        const target = closeBtn.dataset.close;
        if (target === 'settings') settingsModule.close();
        if (target === 'historico') historicoModule.close();
        if (target === 'summary') closeModal('summaryModal');
        if (target === 'carriage') closeModal('carriageModal');
        if (target === 'gasto') {
            closeModal('gastoModal');
            // Reset nav to Hoy
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            const navHoy = document.getElementById('navHoy');
            if (navHoy) navHoy.classList.add('active');
        }
    });

    // ── Navegación ──
    bind('navHoy', 'click', () => {
        historicoModule.close();
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('navHoy').classList.add('active');
    });
    bind('navHistorico', 'click', () => {
        historicoModule.open();
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('navHistorico').classList.add('active');
    });
    bind('navGastos', 'click', () => {
        openModal('gastoModal');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('navGastos').classList.add('active');
    });
    bind('navSettings', 'click', () => {
        settingsModule.open();
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('navSettings').classList.add('active');
    });
    bind('headerSettingsBtn', 'click', () => settingsModule.open());

    // ── Modal Jornada Activa ──
    // Los botones dentro del modal espejo al principal
    bind('jmBtnNuevaCarrera', 'click', () => {
        const state = store.getState();
        if (state.jornadaIniciada) openModal('carriageModal');
    });
    bind('jmBtnGasto', 'click', () => {
        openModal('gastoModal');
    });
    bind('jornadaModalCloseBtn', 'click', () => closeJornadaActivaModal());
    bind('jornadaModalSettingsBtn', 'click', () => { closeJornadaActivaModal(); settingsModule.open(); });
    bind('jmNavReportes', 'click', () => { closeJornadaActivaModal(); historicoModule.open(); });
    bind('jmNavAjustes', 'click', () => { closeJornadaActivaModal(); settingsModule.open(); });
    bind('jmNavGastos', 'click', () => { closeJornadaActivaModal(); openModal('gastoModal'); });

    // Abrir modal jornada activa al tocar en hero card si hay jornada
    const heroCard = document.querySelector('.glass-card');
    if (heroCard) {
        heroCard.style.cursor = 'pointer';
        heroCard.addEventListener('click', () => {
            if (store.getState().jornadaIniciada) openJornadaActivaModal();
        });
    }

    // ── Stat cards interactivos ──
    bind('statCardRides', 'click', () => openCarrerasDetail());
    bind('statCardTime', 'click', () => openTiempoDetail());
    bind('streakBar', 'click', () => openRachaDetail());

    // ── Cerrar modales de detalle ──
    bind('closeCarrerasDetail', 'click', () => closeModal('carrerasDetailModal'));
    bind('closeTiempoDetail', 'click', () => closeModal('tiempoDetailModal'));
    bind('closeRachaDetail', 'click', () => closeModal('rachaDetailModal'));

    // Cerrar al hacer clic en el overlay
    ['carrerasDetailModal', 'tiempoDetailModal', 'rachaDetailModal', 'historicoSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', (e) => {
            if (e.target === el) {
                if (id === 'historicoSection') {
                    historicoModule.close();
                } else {
                    closeModal(id);
                }
            }
        });
    });

    // ── Settings ──
    bind('saveSettings', 'click', () => {
        const metaStr = document.getElementById('metaInput').value.replace(/\D/g, '');
        settingsModule.save(metaStr);
    });
    bind('addPlatformBtn', 'click', () => {
        const nameEl = document.getElementById('newPlatformName');
        const colorEl = document.getElementById('newPlatformColor');
        if (nameEl && nameEl.value.trim()) {
            settingsModule.addPlatform(nameEl.value.trim(), colorEl.value);
            nameEl.value = '';
        }
    });

    // ── Theme Toggle (ahora dentro de Ajustes) ──
    bind('themeToggleBtn', 'click', () => {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        const icon = document.getElementById('themeIcon');
        const label = document.getElementById('themeLabel');
        if (icon) icon.textContent = isDark ? '☀️' : '🌙';
        if (label) label.textContent = isDark ? 'Modo Claro activo' : 'Modo Oscuro activo';
    });

    // ── Logout ──
    bind('logoutBtn', 'click', () => authModule.logout());

    // ── Export ──
    bind('exportReportBtn', 'click', () => carrerasModule.exportReport());

    // ── Auth bridges ──
    window.handleLogin = () => {
        const e = document.getElementById('loginEmail').value;
        const p = document.getElementById('loginPassword').value;
        authModule.login(e, p);
    };
    window.handleRegister = () => {
        const e = document.getElementById('loginEmail').value;
        const p = document.getElementById('loginPassword').value;
        authModule.register(e, p);
    };
    window.handleGoogleLogin = () => authModule.loginWithGoogle();
    window.toggleAuthMode = () => {
        const lb = document.getElementById('btnLogin');
        const rb = document.getElementById('btnRegister');
        const sub = document.getElementById('authSubtitle');
        const link = document.getElementById('toggleAuthMode');
        const isLogin = lb.style.display !== 'none';
        lb.style.display = isLogin ? 'none' : 'block';
        rb.style.display = isLogin ? 'block' : 'none';
        sub.textContent = isLogin ? 'Crea tu nueva cuenta' : 'Identifícate para continuar';
        link.textContent = isLogin ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Regístrate';
    };
}

// ── Helpers Modal Jornada Activa ──────────────────────────────────────────────

function openJornadaActivaModal() {
    const overlay = document.getElementById('jornadaActivaModal');
    if (!overlay) return;
    overlay.classList.add('open');
    haptics.selectionChanged();
}

function closeJornadaActivaModal() {
    const overlay = document.getElementById('jornadaActivaModal');
    if (overlay) overlay.classList.remove('open');
}

/**
 * Sincroniza los datos del estado en el modal de jornada activa.
 * Se llama en cada cambio de store.
 */
function syncJornadaActivaModal(state) {
    const arc = document.getElementById('jmProgressArc');
    if (!arc) return;

    // Cálculos
    const totalBruto = state.carreras.reduce((s, c) => s + (c.neto || c.amount), 0);
    const totalGastos = state.gastos.reduce((s, g) => s + g.monto, 0);
    const neto = totalBruto - totalGastos;
    const meta = state.settings.meta || 270000;
    const pct = Math.min(100, meta > 0 ? Math.round((neto / meta) * 100) : 0);
    const restante = Math.max(0, meta - neto);
    const metaK = (meta / 1000).toFixed(0);

    // Gauge arc (431 = longitud del arco al 100%)
    const arcLen = 431;
    arc.style.strokeDashoffset = arcLen - (pct / 100) * arcLen;

    // Textos
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('jmMetaLabel', `META · $${metaK}K`);
    setText('jmBalanceAmount', `$${neto.toLocaleString('es-CO')}`);
    setText('jmPctLabel', `${pct}%`);
    setText('jmRestLabel', restante > 0 ? `$${(restante / 1000).toFixed(0)}k restante` : 'Meta cumplida 🎉');
    setText('jmStatRides', state.carreras.length);
    setText('jmStatPct', `${pct}%`);

    // Tiempo de jornada
    if (state.jornadaInicio) {
        const diffMs = Date.now() - new Date(state.jornadaInicio).getTime();
        const totalMins = Math.floor(diffMs / 60000);
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        const timeEl = document.getElementById('jmStatTime');
        if (timeEl) timeEl.innerHTML = h > 0
            ? `${h}<span style="font-size:14px;color:#10B981;font-weight:700;">h</span> ${m}<span style="font-size:14px;color:#10B981;font-weight:700;">m</span>`
            : `${m}<span style="font-size:14px;color:#10B981;font-weight:700;">m</span>`;
    }

    // Fecha y usuario
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    setText('jornadaModalDate', dateStr.charAt(0).toUpperCase() + dateStr.slice(1));

    const userName = state.user?.displayName || state.user?.email?.split('@')[0] || 'Usuario';
    setText('jornadaModalUserName', userName);
    const letterEl = document.getElementById('jornadaAvatarLetter');
    if (letterEl) letterEl.textContent = userName[0].toUpperCase();

    // Racha
    const streak = parseInt(localStorage.getItem('rutapro_streak') || '0', 10);
    setText('jmStreakText', `Racha: ${streak} días`);

    // Badge de notificaciones sincronizado
    const badgeModal = document.getElementById('notifBadgeModal');
    const badgeMain = document.getElementById('notifBadge');
    if (badgeModal && badgeMain) badgeModal.textContent = badgeMain.textContent;
}

// ── Helpers Modales de Detalle ──────────────────────────────────────────────

function openCarrerasDetail() {
    const state = store.getState();
    const carreras = state.carreras;
    const total = carreras.reduce((s, c) => s + (c.neto || c.amount), 0);
    const promedio = carreras.length > 0 ? Math.round(total / carreras.length) : 0;

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('carrerasDetailSubtitle', `${carreras.length} registradas`);
    setText('cdTotalBruto', `$${total.toLocaleString('es-CO')}`);
    setText('cdTotalRides', carreras.length);
    setText('cdPromedio', `$${promedio.toLocaleString('es-CO')}`);

    const list = document.getElementById('carrerasDetailList');
    if (list) {
        list.innerHTML = carreras.length === 0
            ? `<div style="text-align:center; padding:32px; color:var(--text-muted); font-size:13px;">Sin carreras registradas hoy</div>`
            : carreras.slice().reverse().map((c, i) => {
                const idx = carreras.length - 1 - i;
                const platform = c.platform || c.plataforma || '—';
                const payment = c.payment || c.metodoPago || '—';
                const time = c.timestamp ? new Date(c.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:14px 16px;">
                        <div>
                            <div style="font-size:14px; font-weight:700; color:var(--text-primary);">$${(c.neto || c.amount).toLocaleString('es-CO')}</div>
                            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${platform.toUpperCase()} · ${payment.toUpperCase()} · ${time}</div>
                        </div>
                        <button class="delete-btn" data-id="${c.id}" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:var(--ruby); border-radius:10px; padding:6px 10px; font-size:11px; font-weight:700; cursor:pointer;">Borrar</button>
                    </div>
                `;
            }).join('');
    }

    const modal = document.getElementById('carrerasDetailModal');
    if (modal) modal.style.display = 'flex';
}

function openTiempoDetail() {
    const state = store.getState();
    const meta = state.settings.meta || 270000;
    const totalNeto = state.carreras.reduce((s, c) => s + (c.neto || c.amount), 0)
        - state.gastos.reduce((s, g) => s + g.monto, 0);

    let horas = 0, minutos = 0;
    if (state.jornadaInicio) {
        const diffMs = Date.now() - new Date(state.jornadaInicio).getTime();
        const totalMins = Math.floor(diffMs / 60000);
        horas = Math.floor(totalMins / 60);
        minutos = totalMins % 60;
    }

    const horasFull = horas + minutos / 60;
    const porHora = horasFull > 0 ? (state.carreras.length / horasFull).toFixed(1) : '0.0';
    const gananciaHora = horasFull > 0 ? Math.round(totalNeto / horasFull) : 0;
    const restanteK = Math.max(0, meta - totalNeto);
    const horasRestantes = gananciaHora > 0 ? (restanteK / gananciaHora).toFixed(1) : '--';

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('tdTimerBig', `${horas}h ${String(minutos).padStart(2, '0')}m`);
    setText('tdPorHora', porHora);
    setText('tdGananciaHora', `$${gananciaHora.toLocaleString('es-CO')}`);
    setText('tdRestante', horasRestantes !== '--' ? `~${horasRestantes}h` : '--');

    if (state.jornadaInicio) {
        const inicio = new Date(state.jornadaInicio);
        setText('tdInicio', inicio.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
    } else {
        setText('tdInicio', 'Sin jornada');
    }

    const modal = document.getElementById('tiempoDetailModal');
    if (modal) modal.style.display = 'flex';
}

function openRachaDetail() {
    const streak = parseInt(localStorage.getItem('rutapro_streak') || '0', 10);
    const bestStreak = parseInt(localStorage.getItem('rutapro_best_streak') || streak.toString(), 10);
    const state = store.getState();
    const tieneJornada = state.jornadaIniciada || state.carreras.length > 0;

    const motivaciones = [
        'Cada día cuenta. ¡Sigue construyendo tu racha!',
        '🚀 La constancia es la clave del éxito. ¡No pares!',
        '💪 Los mejores conductores trabajan con disciplina.',
        '🔥 Una racha de 7 días te pone entre los mejores.',
        '⚡ Tu racha activa es tu mayor activo. ¡Cuídala!'
    ];
    const motivacion = motivaciones[streak % motivaciones.length];

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('rdStreakCount', streak);
    setText('rdMejorRacha', `${bestStreak} días`);
    setText('rdHoyStatus', tieneJornada ? '✅ Jornada registrada' : '⏳ Pendiente de hoy');
    setText('rdMotivacion', motivacion);

    const statusEl = document.getElementById('rdHoyStatus');
    if (statusEl) statusEl.style.color = tieneJornada ? 'var(--emerald)' : 'var(--gold)';

    const modal = document.getElementById('rachaDetailModal');
    if (modal) modal.style.display = 'flex';
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
