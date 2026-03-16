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

async function initApp() {
    console.log('RutaPro V3: Powering Up...');

    const localState = storageService.loadState();
    if (localState) {
        store.setState(localState);
    }

    store.subscribe((state) => {
        renderer.render(state);
        storageService.saveState(state);
    });

    authModule.init();
    setupEventListeners();
}

function setupEventListeners() {
    // Eventos de botones fijos
    const bind = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    bind('jornadaBtn', 'click', () => carrerasModule.toggleJornada());

    bind('addCarrera', 'click', () => {
        const input = document.getElementById('amountInput');
        const amountStr = input.value.replace(/\D/g, ''); // Solo números
        const amount = parseFloat(amountStr);
        if (amount) {
            carrerasModule.addCarrera(amount);
            input.value = '';
        }
    });

    bind('agregarGasto', 'click', () => {
        const montoStr = document.getElementById('gastoMonto').value.replace(/\D/g, '');
        const monto = parseFloat(montoStr);
        const tipo = document.getElementById('gastoTipo').value;
        if (monto && tipo) {
            gastosModule.addGasto(monto, tipo);
            document.getElementById('gastoMonto').value = '';
            document.getElementById('gastoTipo').value = '';
        }
    });

    // Separadores de miles automáticos
    const formatInput = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value) {
            value = new Intl.NumberFormat('es-CO').format(value);
            e.target.value = value;
        }
    };

    bind('amountInput', 'input', formatInput);
    bind('gastoMonto', 'input', formatInput);
    bind('metaInput', 'input', formatInput);

    // Delegación para elementos dinámicos
    document.addEventListener('click', (e) => {
        // Plataformas (p-chip)
        const pChip = e.target.closest('.p-chip');
        if (pChip) {
            carrerasModule.selectPlatform(pChip.dataset.platform);
        }

        // Métodos de pago
        const payBtn = e.target.closest('[data-payment]');
        if (payBtn) {
            carrerasModule.selectPayment(payBtn.dataset.payment);
        }

        // Eliminar
        const delRide = e.target.closest('.delete-btn');
        if (delRide) carrerasModule.deleteCarrera(Number(delRide.dataset.id));

        const delGasto = e.target.closest('.delete-gasto-btn');
        if (delGasto) gastosModule.deleteGasto(delGasto.dataset.id);

        // Remover plataforma en settings
        const delPlat = e.target.closest('.remove-platform-btn');
        if (delPlat) settingsModule.removePlatform(delPlat.dataset.id);

        const editPlat = e.target.closest('.edit-platform-btn');
        if (editPlat) settingsModule.editPlatform(editPlat.dataset.id);
    });

    // Navegación
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

    bind('navSettings', 'click', () => settingsModule.open());

    bind('saveSettings', 'click', () => {
        const metaStr = document.getElementById('metaInput').value.replace(/\D/g, '');
        settingsModule.save(metaStr);
    });

    // Manejo de cierre de modales y secciones
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-close]');
        if (closeBtn) {
            const target = closeBtn.dataset.close;
            if (target === 'settings') settingsModule.close();
            if (target === 'historico') historicoModule.close();
            if (target === 'summary') document.getElementById('summaryModal').style.display = 'none';
        }
    });

    bind('logoutBtn', 'click', () => authModule.logout());
    bind('confirmCloseJornada', 'click', () => carrerasModule.closeJornada());

    // Botón de nueva plataforma (uso delegación para mayor robustez)
    document.addEventListener('click', (e) => {
        if (e.target.id === 'addPlatformBtn') {
            const nameEl = document.getElementById('newPlatformName');
            const colorEl = document.getElementById('newPlatformColor');
            if (nameEl && nameEl.value.trim()) {
                settingsModule.addPlatform(nameEl.value.trim(), colorEl.value);
                nameEl.value = '';
            }
        }
    });

    // Exportar (vía historico o dashboard si existe botón)
    bind('exportBtn', 'click', () => carrerasModule.exportReport());
    bind('exportReportBtn', 'click', () => carrerasModule.exportReport());

    // Firebase UI Bridges
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

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
