/**
 * src/modules/carreras/carrerasModule.js
 */
import { store } from '../../state/store.js';
import { showToast } from '../../utils/ui-utils.js';
import { formatCurrency, getPlatformName } from '../../utils/format.js';
import { firestoreService } from '../../services/firestoreService.js';

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
        console.warn('Sync a Firestore falló (modo offline):', e.message);
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
            // Guardar en histórico Y borrar la jornada activa de Firestore
            await firestoreService.addToHistorico(state.user.uid, jornadaData);
            await firestoreService.clearJornada(state.user.uid);
        }

        store.setState({
            carreras: [],
            gastos: [],
            jornadaIniciada: false,
            jornadaInicio: null,
            selectedPlatform: null,
            selectedPayment: null
        });
        stopJornadaTimer();

        document.getElementById('summaryModal').style.display = 'none';
        showToast('Jornada guardada correctamente', 'success');
    },

    exportReport() {
        const state = store.getState();
        const totalBruto = state.carreras.reduce((sum, c) => sum + c.amount, 0);
        const totalGastos = state.gastos.reduce((sum, g) => sum + g.monto, 0);
        const totalNeto = (state.carreras.reduce((sum, c) => sum + (c.neto || c.amount), 0)) - totalGastos;

        // Mejora 3: calcular efectivo y digital por separado
        let efectivo = 0;
        let digital = 0;
        state.carreras.forEach(c => {
            if (c.payment === 'efectivo') efectivo += (c.neto || c.amount);
            else digital += (c.neto || c.amount);
        });
        const efectivoReal = efectivo - totalGastos;

        let report = `🚗 *RUTAPRO — REPORTE DE JORNADA*\n`;
        report += `📅 ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `✅ Carreras: ${state.carreras.length}\n`;
        report += `💵 Total Bruto: ${formatCurrency(totalBruto)}\n`;
        report += `📉 Gastos: ${formatCurrency(totalGastos)}\n`;
        report += `💰 *Neto Total: ${formatCurrency(totalNeto)}*\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `💵 Efectivo (después gastos): ${formatCurrency(efectivoReal)}\n`;
        report += `💳 Digital: ${formatCurrency(digital)}\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

        // Desglose por plataforma y método de pago ordenado descendente
        report += `🎯 *DESGLOSE POR PLATAFORMA:*\n`;
        const stats = {};
        state.carreras.forEach(c => {
            const key = `${c.platform}_${c.payment}`;
            if (!stats[key]) {
                stats[key] = { platform: c.platform, payment: c.payment, total: 0, count: 0 };
            }
            stats[key].total += (c.neto || c.amount);
            stats[key].count++;
        });
        Object.values(stats)
            .sort((a, b) => b.total - a.total)
            .forEach(data => {
                const name = getPlatformName(data.platform, state.settings.plataformas);
                const paymentName = data.payment ? data.payment.charAt(0).toUpperCase() + data.payment.slice(1) : 'Desconocido';
                report += `  • ${name.toUpperCase()}: ${formatCurrency(data.total)} (${data.count} carrera${data.count === 1 ? '' : 's'}) | ${paymentName}\n`;
            });

        report += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `#RutaPro`;

        if (navigator.share) {
            navigator.share({
                title: 'Reporte RutaPro',
                text: report
            }).then(() => {
                // Share exitoso
            }).catch((e) => {
                console.error('Error usando navigator.share:', e);
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
                console.error('Fallback: Oops, unable to copy', err);
                showToast('Error al copiar el reporte', 'error');
            }
            document.body.removeChild(textArea);
        }
    },

    selectPlatform(platform) {
        store.setState({ selectedPlatform: platform });
    },

    selectPayment(payment) {
        store.setState({ selectedPayment: payment });
    },

    addCarrera(amount) {
        const state = store.getState();
        if (!amount || !state.selectedPlatform || !state.selectedPayment) return;

        const addBtn = document.getElementById('addCarrera');
        const isEdit = addBtn && addBtn.dataset.mode === 'edit';

        if (isEdit) {
            const editId = state.editingRideId;
            const updatedCarreras = state.carreras.map(c => {
                if (c.id === editId) {
                    return {
                        ...c,
                        platform: state.selectedPlatform,
                        payment: state.selectedPayment,
                        amount: amount,
                        neto: amount
                    };
                }
                return c;
            });
            
            store.setState({
                carreras: updatedCarreras,
                selectedPlatform: null,
                selectedPayment: null,
                editingRideId: null
            });
            
            addBtn.textContent = 'LISTO';
            addBtn.dataset.mode = '';
            showToast('Carrera actualizada ✓', 'success');
        } else {
            const carrera = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                platform: state.selectedPlatform,
                payment: state.selectedPayment,
                amount: amount,
                neto: amount
            };

            store.setState({
                carreras: [...state.carreras, carrera],
                selectedPlatform: null,
                selectedPayment: null
            });
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
                jornadaInicio: null,
                selectedPlatform: null,
                selectedPayment: null
            });
            showToast('Todos los datos han sido eliminados del servidor', 'success');
        }
    },

    openRidesBottomSheet() {
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
            const carrerasHTML = [...state.carreras].reverse().map(c => {
                const name = getPlatformName(c.platform, state.settings.plataformas);
                const initial = name.charAt(0).toUpperCase();
                const time = new Date(c.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                
                // Determinar color de la inicial basado en la plataforma
                let dotColor = '#00E676';
                if (c.platform === 'cabify') dotColor = '#7A52F4';
                else if (c.platform === 'indriver') dotColor = '#00E676';
                else if (c.platform === 'uber') dotColor = '#FFFFFF';
                else if (c.platform === 'didi') dotColor = '#FF7A00';
                else if (c.platform === 'picap') dotColor = '#FF00A5';

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); position: relative;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; color: ${dotColor};">
                                ${initial}
                            </div>
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
                                <div onclick="window.carrerasModule.editRide(${c.id})" style="padding: 10px 12px; font-size: 13px; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">✏️ Editar</div>
                                <div onclick="window.carrerasModule.deleteRideConfirm(${c.id})" style="padding: 10px 12px; font-size: 13px; color: #FF5252; cursor: pointer; display: flex; align-items: center; gap: 8px;">🗑️ Eliminar</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            listContainer.innerHTML = carrerasHTML;
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
        
        // Select platform and payment visually
        this.selectPlatform(carrera.platform);
        this.selectPayment(carrera.payment);
        
        // Manually update the visual selections since the renderer might not catch selectedPayment/Platform right away depending on how it's wired
        const platformBtns = document.querySelectorAll('.platform-btn');
        platformBtns.forEach(btn => {
            if (btn.dataset.platform === carrera.platform) btn.classList.add('selected');
            else btn.classList.remove('selected');
        });
        
        const paymentBtns = document.querySelectorAll('.payment-btn');
        paymentBtns.forEach(btn => {
            if (btn.dataset.payment === carrera.payment) btn.classList.add('selected');
            else btn.classList.remove('selected');
        });

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
            sheet.style.transition = 'none';
        };

        const handleTouchMove = (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            // Only consider it a swipe if it moved more than 5px
            if (diff > 5 && sheet.scrollTop <= 0) {
                isSwiping = true;
                sheet.style.transform = `translateY(${diff}px)`;
                e.preventDefault(); // prevenir overscroll solo si estamos haciendo swipe intencional
            }
        };

        const handleTouchEnd = (e) => {
            sheet.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            if (!isSwiping) {
                // Was just a tap, do nothing to transform and let the click event fire
                sheet.style.transform = 'translateY(0)';
                return;
            }
            
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
