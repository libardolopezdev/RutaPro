/**
 * src/modules/carreras/carrerasModule.js
 */
import { store } from '../../state/store.js';
import { showToast } from '../../utils/ui-utils.js';
import { formatCurrency, getPlatformName } from '../../utils/format.js';
import { firestoreService } from '../../services/firestoreService.js';

// Persiste jornada activa (carreras + gastos) en Firestore para sincronización entre dispositivos.
async function syncJornadaToFirestore() {
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

        // Desglose por plataforma ordenado descendente
        report += `🎯 *DESGLOSE POR PLATAFORMA:*\n`;
        const stats = {};
        state.carreras.forEach(c => {
            if (!stats[c.platform]) stats[c.platform] = { total: 0, count: 0 };
            stats[c.platform].total += (c.neto || c.amount);
            stats[c.platform].count++;
        });
        Object.entries(stats)
            .sort(([, a], [, b]) => b.total - a.total)
            .forEach(([plat, data]) => {
                const name = getPlatformName(plat, state.settings.plataformas);
                report += `  • ${name.toUpperCase()}: ${formatCurrency(data.total)} (${data.count} carreras)\n`;
            });

        report += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `#RutaPro`;

        if (navigator.share) {
            navigator.share({
                title: 'Reporte RutaPro',
                text: report
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(report).then(() => {
                showToast('Reporte copiado al portapapeles', 'success');
            }).catch(() => {
                showToast('Error al copiar el reporte', 'error');
            });
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

        showToast('Carrera agregada ✓', 'success');
    },

    deleteCarrera(id) {
        if (confirm('¿Estás seguro de eliminar esta carrera?')) {
            const state = store.getState();
            store.setState({
                carreras: state.carreras.filter(c => c.id !== id)
            });
            syncJornadaToFirestore();
            showToast('Carrera eliminada', 'success');
        }
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
    }
};
