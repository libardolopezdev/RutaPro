/**
 * src/modules/carreras/carrerasModule.js
 */
import { store } from '../../state/store.js';
import { showToast } from '../../utils/ui-utils.js';
import { formatCurrency, getPlatformName, normalizePlatform, renderAvatarPlataforma } from '../../utils/format.js';
import { firestoreService } from '../../services/firestoreService.js';
import { storageService } from '../../services/storageService.js';
import { renderer } from '../../ui/renderer.js';

// Persiste jornada activa (carreras + gastos) en Firestore para sincronización entre dispositivos.
export async function syncJornadaToFirestore() {
    const state = store.getState();
    if (!state.user || !state.jornadaIniciada) return;
    const syncPayload = {
        jornadaInicio: state.jornadaInicio,
        jornadaIniciada: true,
        carreras: state.carreras,
        gastos: state.gastos
    };
    try {
        await firestoreService.saveJornada(state.user.uid, syncPayload);
    } catch (e) {
        // console.warn('Sync a Firestore falló (modo offline):', e.message);
    }
}

let jornadaTimerInterval = null;

function startJornadaTimer() {
    stopJornadaTimer();
    jornadaTimerInterval = setInterval(() => {
        const state = store.getState();
        if (!state.jornadaIniciada || !state.jornadaInicio) return;
        const start = new Date(state.jornadaInicio);
        const diffMs = Date.now() - start.getTime();
        const totalMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        const el = document.getElementById('jornadaInfo');
        if (el) el.textContent = hours > 0 ? `${hours}h ${mins}m activa` : `${mins}m activa`;
    }, 30000); // actualiza cada 30 segundos
}

function stopJornadaTimer() {
    if (jornadaTimerInterval) {
        clearInterval(jornadaTimerInterval);
        jornadaTimerInterval = null;
    }
}


let localPlatform = null;
let localPayment = null;

export const carrerasModule = {

    toggleJornada() {
        const state = store.getState();
        if (!state.jornadaIniciada) {
            store.setState({
                carreras: [],
                gastos: [],
                jornadaIniciada: true,
                jornadaInicio: new Date().toISOString()
            });
            startJornadaTimer();
            syncJornadaToFirestore();
            showToast('Jornada iniciada correctamente', 'success');
            setTimeout(() => {
                const input = document.getElementById('amountInput');
                if (input) {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    input.focus();
                }
            }, 400);
        } else {
            // Mostrar modal de resumen final
            const totalBruto = state.carreras.reduce((sum, c) => sum + c.amount, 0);
            const totalGastos = state.gastos.reduce((sum, g) => sum + g.monto, 0);
            const totalNeto = (state.carreras.reduce((sum, c) => sum + (c.neto || c.amount), 0)) - totalGastos;

            const brutoEl = document.getElementById('finalBruto');
            const gastosEl = document.getElementById('finalGastos');
            const netoEl = document.getElementById('finalNeto');

            if (brutoEl) brutoEl.textContent = formatCurrency(totalBruto);
            if (gastosEl) gastosEl.textContent = formatCurrency(totalGastos);
            if (netoEl) netoEl.textContent = formatCurrency(totalNeto);

            document.getElementById('summaryModal').style.display = 'flex';
        }
    },

    async closeJornada() {
        const state = store.getState();
        if (!state.jornadaIniciada) return;

        const totalCarreras = state.carreras.length;
        const totalBruto = state.carreras.reduce((sum, c) => sum + c.amount, 0);
        const totalGastos = state.gastos.reduce((sum, g) => sum + g.monto, 0);
        const ganancia = (state.carreras.reduce((sum, c) => sum + (c.neto || c.amount), 0)) - totalGastos;

        const jornadaData = {
            fecha: new Date().toISOString(),
            totalCarreras,
            totalBruto,
            ganancia,
            gastosDesglose: state.gastos,
            carrerasDesglose: state.carreras
        };

        if (state.user) {
            // No usamos await para evitar bloquear el hilo principal si está offline.
            // writeBatch encolará la petición y se sincronizará cuando recupere la conexión.
            firestoreService.cerrarJornadaTransaccional(state.user.uid, jornadaData)
                .catch(e => // console.warn('Cierre de jornada offline/background:', e));
        }

        // Limpieza local inmediata
        store.setState({
            carreras: [],
            gastos: [],
            jornadaIniciada: false,
            jornadaInicio: null
        });
        
        // RP-026: Sobrescribir localStorage con estado limpio para evitar que recargue la jornada
        storageService.saveState(store.getState());
        
        localPlatform = null;
        localPayment = null;
        stopJornadaTimer();

        document.getElementById('summaryModal').style.display = 'none';

        if (!navigator.onLine) {
            showToast('Jornada cerrada y guardada localmente. Se sincronizará en la nube al recuperar conexión.', 'warning');
        } else {
            showToast('Jornada guardada correctamente', 'success');
        }
        
        // Forzar renderizado a la pantalla principal
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const navHoy = document.getElementById('navHoy');
        if (navHoy) navHoy.classList.add('active');
        if (window.historicoModule) window.historicoModule.close();
        if (window.estadisticasModule) window.estadisticasModule.close();
    },

    exportReport() {
        const state = store.getState();
        const totalBruto = state.carreras.reduce((sum, c) => sum + c.amount, 0);
        const totalGastos = state.gastos.reduce((sum, g) => sum + g.monto, 0);
        const totalNeto = (state.carreras.reduce((sum, c) => sum + (c.neto || c.amount), 0)) - totalGastos;

        const METODOS_EFECTIVO = ['efectivo', 'cash'];
        const porPlataforma = {};
        let totalEfectivo = 0;
        let totalDigital = 0;

        state.carreras.forEach(c => {
            const nombre = getPlatformName(c.platform, state.settings.plataformas).toUpperCase();
            if (!porPlataforma[nombre]) {
                porPlataforma[nombre] = { total: 0, carreras: 0, efectivo: 0, digital: 0 };
            }
            const monto = c.neto || c.amount;
            porPlataforma[nombre].total += monto;
            porPlataforma[nombre].carreras += 1;

            if (METODOS_EFECTIVO.includes((c.payment || '').toLowerCase())) {
                totalEfectivo += monto;
                porPlataforma[nombre].efectivo += monto;
            } else {
                totalDigital += monto;
                porPlataforma[nombre].digital += monto;
            }
        });

        let report = `🚗 RUTAPRO — REPORTE DE JORNADA\n\n`;
        
        let fechaStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);
        report += `📅 ${fechaStr}\n\n`;
        
        report += `💳 MEDIOS DE PAGO\n\n`;
        report += `💵 Efectivo: ${formatCurrency(totalEfectivo)}\n`;
        report += `💳 Digital: ${formatCurrency(totalDigital)}\n\n`;
        
        report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        report += `📈 RESUMEN GENERAL\n\n`;
        report += `🚖 Carreras: ${state.carreras.length}\n\n`;
        report += `💵 Ingreso bruto: ${formatCurrency(totalBruto)}\n\n`;

        if (totalGastos > 0) {
            let porcentajeText = '';
            if (totalBruto > 0) {
                const pct = Math.round((totalGastos / totalBruto) * 100);
                porcentajeText = ` (${pct}%)`;
            }
            report += `📉 Gastos: ${formatCurrency(totalGastos)}${porcentajeText}\n`;
            
            const gastosAgrupados = {};
            state.gastos.forEach(g => {
                const tipo = g.tipo || 'otro';
                gastosAgrupados[tipo] = (gastosAgrupados[tipo] || 0) + g.monto;
            });
            const GASTOS_LABELS = {
                combustible: '⛽ Gasolina',
                comida: '🍔 Alimentación',
                peaje: '🛣️ Peaje',
                lavado: '🧽 Lavado',
                comision: '📱 Comisión',
                parqueadero: '🅿️ Parqueadero',
                otro: '📝 Otro'
            };
            Object.entries(gastosAgrupados).forEach(([tipo, monto]) => {
                if (monto > 0) {
                    const label = GASTOS_LABELS[tipo] || ('📝 ' + tipo.charAt(0).toUpperCase() + tipo.slice(1));
                    report += `   ${label.padEnd(19, '.')}${formatCurrency(monto)}\n`;
                }
            });
            report += `\n`;
        } else {
            report += `📉 Gastos: $0\n\n`;
        }

        report += `💰 Ganancia neta: ${formatCurrency(totalNeto)}\n\n`;
        
        report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        const meta = state.settings.meta || 0;
        report += `🎯 META DEL DÍA\n\n`;
        const diferencia = totalNeto - meta;
        if (diferencia > 0) {
            report += `🏆 Superaste la meta por ${formatCurrency(diferencia)}\n\n`;
        } else if (diferencia === 0) {
            report += `✅ Meta alcanzada\n\n`;
        } else {
            report += `📌 Faltaron ${formatCurrency(Math.abs(diferencia))}\n\n`;
        }

        report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        report += `📊 PLATAFORMAS\n\n`;
        const plataformasOrdenadas = Object.entries(porPlataforma)
            .sort((a, b) => b[1].total - a[1].total);

        plataformasOrdenadas.forEach(([nombre, datos], index) => {
            report += `${nombre}\n`;
            report += `  ${formatCurrency(datos.total)} • ${datos.carreras} carrera${datos.carreras !== 1 ? 's' : ''}\n`;
            
            let splitText = [];
            if (datos.efectivo > 0) splitText.push(`💵 Efectivo: ${formatCurrency(datos.efectivo)}`);
            if (datos.digital > 0) splitText.push(`💳 Digital: ${formatCurrency(datos.digital)}`);
            
            if (splitText.length > 0) {
                report += `  ${splitText.join(' | ')}\n`;
            }
            
            if (index < plataformasOrdenadas.length - 1) {
                report += `\n`;
            }
        });

        report += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        report += `Generado con RutaPro`;

        if (navigator.share) {
            navigator.share({
                title: 'Reporte RutaPro',
                text: report
            }).then(() => {
                // Share exitoso
            }).catch((e) => {
                // console.error('Error usando navigator.share:', e);
                // Solo hace fallback si el usuario no canceló la acción
                if (e.name !== 'AbortError') {
                    copyToClipboard(report);
                }
            });
        } else {
            // navigator.share no disponible, normalmente pasa si se accede por IP en vez de localhost/HTTPS
            if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
                showToast('Share nativo requiere HTTPS. Copiando texto...', 'error');
            }
            copyToClipboard(report);
        }

        function copyToClipboard(text) {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast('Reporte copiado al portapapeles', 'success');
                }).catch(() => {
                    fallbackCopyTextToClipboard(text);
                });
            } else {
                fallbackCopyTextToClipboard(text);
            }
        }

        function fallbackCopyTextToClipboard(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed'; // Evita scroll
            textArea.style.top = '0';
            textArea.style.left = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                showToast('Reporte copiado al portapapeles', 'success');
            } catch (err) {
                // console.error('Fallback: Oops, unable to copy', err);
                showToast('Error al copiar el reporte', 'error');
            }
            document.body.removeChild(textArea);
        }
    },

    selectPlatform(platform) {
        localPlatform = platform;
        const state = store.getState();
        const plataformas = state.settings.plataformas || [];
        
        const container = document.getElementById('platformButtonsContainer');
        if (container) {
            const btns = container.querySelectorAll('.p-chip');
            btns.forEach(btn => {
                const platId = btn.dataset.platform;
                const plat = plataformas.find(p => p.id === platId) || {id: platId};
                
                const isUber = plat.id === 'uber';
                const pColor = isUber ? 'var(--uber-color)' : plat.color || 'var(--emerald)';
                const pGlow = isUber ? 'var(--uber-glow)' : `${plat.color || '#10b981'}44`;
                const pBg = isUber ? 'var(--uber-bg)' : `${plat.color || '#10b981'}22`;

                if (platId === platform) {
                    btn.classList.add('active');
                    btn.style.borderColor = pColor;
                    btn.style.boxShadow = `0 0 15px ${pGlow}`;
                    btn.style.color = 'var(--text-primary)';
                    btn.style.background = pBg;
                } else {
                    btn.classList.remove('active');
                    btn.style.borderColor = 'var(--border-glass)';
                    btn.style.boxShadow = 'none';
                    btn.style.color = 'var(--text-secondary)';
                    btn.style.background = 'var(--surface-glass)';
                }
            });
        }
        this.updateAddButtonLocal();
    },

    selectPayment(payment) {
        localPayment = payment;
        
        const paymentColors = {
            efectivo: { color: 'var(--emerald)', glow: 'var(--emerald-glow)' },
            tarjeta: { color: 'var(--blue)', glow: 'var(--blue-glow)' },
            vale: { color: 'var(--gold)', glow: 'var(--gold-glow)' },
            transferencia: { color: 'var(--cyan)', glow: 'var(--cyan-glow)' }
        };

        const container = document.getElementById('paymentButtons');
        if (container) {
            const btns = container.querySelectorAll('[data-payment]');
            btns.forEach(btn => {
                const type = btn.dataset.payment;
                const theme = paymentColors[type] || { color: 'var(--emerald)', glow: 'var(--emerald-glow)' };

                if (type === payment) {
                    btn.classList.add('active');
                    btn.style.borderColor = theme.color;
                    btn.style.color = theme.color;
                    btn.style.background = theme.glow;
                } else {
                    btn.classList.remove('active');
                    btn.style.borderColor = 'var(--border-glass)';
                    btn.style.boxShadow = 'none';
                    btn.style.color = 'var(--text-secondary)';
                    btn.style.background = 'var(--surface-glass)';
                }
            });
        }
        this.updateAddButtonLocal();
    },

    updateAddButtonLocal() {
        const addBtn = document.getElementById('addCarrera');
        const amountInput = document.getElementById('amountInput');
        if (!addBtn) return;

        const amountValue = amountInput ? parseFloat(amountInput.value.replace(/\\D/g, '')) : 0;
        let canAdd = false;
        let label = addBtn.dataset.mode === 'edit' ? 'GUARDAR CAMBIOS' : 'REGISTRAR';

        if (!amountValue || amountValue <= 0) {
            label = 'INDIQUE VALOR';
        } else if (!localPlatform) {
            label = 'ELIJA PLATAFORMA';
        } else if (!localPayment) {
            label = 'ELIJA PAGO';
        } else {
            canAdd = true;
        }

        addBtn.disabled = !canAdd;
        addBtn.textContent = label;
    },

    addCarrera(amount) {
        const state = store.getState();
        if (!amount || !localPlatform || !localPayment) return;

        const addBtn = document.getElementById('addCarrera');
        const isEdit = addBtn && addBtn.dataset.mode === 'edit';

        if (isEdit) {
            const editId = state.editingRideId;
            const updatedCarreras = state.carreras.map(c => {
                if (c.id === editId) {
                    return {
                        ...c,
                        platform: localPlatform,
                        payment: localPayment,
                        amount: amount,
                        neto: amount
                    };
                }
                return c;
            });
            
            store.setState({
                carreras: updatedCarreras,
                editingRideId: null
            });
            localPlatform = null;
            localPayment = null;
            
            addBtn.textContent = 'LISTO';
            addBtn.dataset.mode = '';
            showToast('Carrera actualizada ✓', 'success');
        } else {
            const carrera = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                platform: localPlatform,
                payment: localPayment,
                amount: amount,
                neto: amount
            };

            store.setState({
                carreras: [...state.carreras, carrera]
            });
            localPlatform = null;
            localPayment = null;
            showToast('Carrera agregada ✓', 'success');
        }

        syncJornadaToFirestore();

        // Micro-animación en el balance
        const balanceEl = document.getElementById('consolidadoNeto');
        if (balanceEl) {
            balanceEl.classList.remove('balance-pop');
            void balanceEl.offsetWidth;
            balanceEl.classList.add('balance-pop');
        }

        const input = document.getElementById('amountInput');
        if (input) {
            input.value = '';
            // Mejora 6: re-enfocar el input para registrar la siguiente carrera
            requestAnimationFrame(() => input.focus());
        }
        
        // Reset styles for buttons
        document.querySelectorAll('.platform-btn, .payment-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        const paymentButtons = document.getElementById('paymentButtons');
        if (paymentButtons) paymentButtons.classList.remove('active');
        if (addBtn) addBtn.disabled = true;
    },

    deleteCarrera(id) {
        if (confirm('¿Estás seguro de eliminar esta carrera?')) {
            const state = store.getState();
            store.setState({
                carreras: state.carreras.filter(c => c.id !== id)
            });
            syncJornadaToFirestore();
            showToast('Carrera eliminada', 'success');
            return true;
        }
        return false;
    },

    async clearAll() {
        if (confirm('¿Estás seguro de limpiar todos los datos del día?')) {
            const state = store.getState();
            if (state.user) {
                await firestoreService.clearJornada(state.user.uid);
            }
            store.setState({
                carreras: [],
                gastos: [],
                jornadaIniciada: false,
                jornadaInicio: null
            });
            localPlatform = null;
            localPayment = null;
            showToast('Todos los datos han sido eliminados del servidor', 'success');
        }
    },

    async openRidesBottomSheet() {
        const state = store.getState();
        const sheet = document.getElementById('ridesBottomSheet');
        const overlay = document.getElementById('ridesBottomSheetOverlay');
        const listContainer = document.getElementById('ridesBottomSheetList');
        const countSpan = document.getElementById('ridesBottomSheetCount');
        
        if (!sheet || !overlay || !listContainer) return;

        countSpan.textContent = state.carreras.length;
        
        if (state.carreras.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 14px; padding: 32px 0;">Aún no hay carreras registradas hoy</div>';
        } else {
            // Generar HTML de las carreras
            // Las ordenamos de más reciente a más antigua
            const carrerasHTML = await Promise.all([...state.carreras].reverse().map(async c => {
                const plataforma = normalizePlatform(c.platform, state.settings.plataformas);
                const name = plataforma.name;
                const time = new Date(c.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const avatarHtml = await renderAvatarPlataforma(plataforma);

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); position: relative;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${avatarHtml}
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 14px; font-weight: 700; color: white;">${name}</span>
                                <span style="font-size: 11px; color: var(--text-muted);">${time}</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                                <span style="font-size: 15px; font-weight: 800; color: var(--emerald); font-family: 'JetBrains Mono', monospace;">${formatCurrency(c.amount)}</span>
                                <span style="font-size: 11px; color: var(--text-muted); text-transform: capitalize;">${c.payment}</span>
                            </div>
                            <button onclick="window.carrerasModule.toggleRideMenu(${c.id}, event)" style="background: none; border: none; color: var(--text-muted); font-size: 18px; padding: 4px; cursor: pointer;">⋮</button>
                            
                            <div class="ride-context-menu" id="ride-menu-${c.id}" style="display: none; position: absolute; right: 24px; top: 32px; background: #2A2A3E; border-radius: 12px; padding: 6px; border: 1px solid rgba(255,255,255,0.1); z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.4); min-width: 120px;">
                                <div onclick="window.carrerasModule.editRide(${c.id})" style="padding: 10px 12px; font-size: 13px; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">&#9999; Editar</div>
                                <div onclick="window.carrerasModule.deleteRideConfirm(${c.id})" style="padding: 10px 12px; font-size: 13px; color: #FF5252; cursor: pointer; display: flex; align-items: center; gap: 8px;">&#128465; Eliminar</div>
                            </div>
                        </div>
                    </div>
                `;
            }));
            
            listContainer.innerHTML = carrerasHTML.join('');
        }

        overlay.style.display = 'block';
        // Forzar reflujo para que la transición de CSS se aplique
        void sheet.offsetWidth; 
        sheet.classList.add('visible');

        // Setup touch swipe to close (solo si no se ha configurado antes)
        if (!sheet.dataset.swipeConfigured) {
            this._setupSwipeToClose(sheet);
            sheet.dataset.swipeConfigured = 'true';
            
            // Setup click outside for closing menus
            document.addEventListener('click', this._closeAllMenus);
        }
    },

    toggleRideMenu(id, event) {
        event.stopPropagation();
        this._closeAllMenus();
        const menu = document.getElementById(`ride-menu-${id}`);
        if (menu) menu.style.display = 'block';
    },

    _closeAllMenus() {
        document.querySelectorAll('.ride-context-menu').forEach(m => m.style.display = 'none');
    },

    deleteRideConfirm(id) {
        if (confirm('¿Eliminar esta carrera? Esta acción no se puede deshacer.')) {
            const state = store.getState();
            store.setState({
                carreras: state.carreras.filter(c => c.id !== id)
            });
            syncJornadaToFirestore();
            showToast('Carrera eliminada', 'success');
            // Re-render list
            this.openRidesBottomSheet();
        }
    },

    editRide(id) {
        const state = store.getState();
        const carrera = state.carreras.find(c => c.id === id);
        if (!carrera) return;

        // Populate modal (using variables from window.carrerasModule.editId if necessary, or just storing it in appState)
        store.setState({ editingRideId: id });
        
        // Manually update the visual selections
        this.selectPlatform(carrera.platform);
        this.selectPayment(carrera.payment);

        // Set amount
        const input = document.getElementById('amountInput');
        if (input) {
            input.value = parseInt(carrera.amount, 10).toLocaleString('es-CO');
        }
        
        // Change "LISTO" button to "GUARDAR CAMBIOS"
        const addBtn = document.getElementById('addCarrera');
        if (addBtn) {
            addBtn.textContent = 'GUARDAR CAMBIOS';
            addBtn.dataset.mode = 'edit';
            addBtn.disabled = false;
        }
        
        // Open the modal
        const bottomNav = document.getElementById('fabMenu');
        if (bottomNav) bottomNav.classList.remove('open');
        this.closeRidesBottomSheet();
        
        const carriageModal = document.getElementById('carriageModal');
        if (carriageModal) {
            carriageModal.style.display = 'flex';
            setTimeout(() => {
                if (input) {
                    input.focus();
                    input.scrollIntoView({ block: 'center' });
                }
            }, 150);
        }
        
        // Ensure payment buttons container is active
        const paymentButtons = document.getElementById('paymentButtons');
        if (paymentButtons) paymentButtons.classList.add('active');
    },

    closeRidesBottomSheet() {
        const sheet = document.getElementById('ridesBottomSheet');
        const overlay = document.getElementById('ridesBottomSheetOverlay');
        
        if (sheet) sheet.classList.remove('visible');
        if (overlay) {
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300); // Wait for CSS transition
        }
    },

    _setupSwipeToClose(sheet) {
        let startY = 0;
        let currentY = 0;
        let isSwiping = false;
        
        const handleTouchStart = (e) => {
            startY = e.touches[0].clientY;
            currentY = startY;
            isSwiping = false;
        };

        const handleTouchMove = (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            // Only consider it a swipe if it moved more than 5px
            if (diff > 5 && sheet.scrollTop <= 0) {
                if (!isSwiping) {
                    isSwiping = true;
                    sheet.style.transition = 'none';
                }
                sheet.style.transform = `translateY(${diff}px)`;
                e.preventDefault(); // prevenir overscroll solo si estamos haciendo swipe intencional
            }
        };

        const handleTouchEnd = (e) => {
            if (!isSwiping) {
                // Fue solo un tap, no alterar estilos para no abortar eventos click nativos
                return;
            }
            
            sheet.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            const diff = currentY - startY;
            
            if (diff > 100) { // Umbral para cerrar
                window.carrerasModule.closeRidesBottomSheet();
                setTimeout(() => {
                    sheet.style.transform = '';
                }, 300);
            } else {
                sheet.style.transform = 'translateY(0)';
            }
        };

        sheet.addEventListener('touchstart', handleTouchStart, { passive: false });
        sheet.addEventListener('touchmove', handleTouchMove, { passive: false });
        sheet.addEventListener('touchend', handleTouchEnd);
    }
};
