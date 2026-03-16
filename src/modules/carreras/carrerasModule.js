/**
 * src/modules/carreras/carrerasModule.js
 */
import { store } from '../../state/store.js';
import { showToast } from '../../utils/ui-utils.js';
import { formatCurrency, getPlatformName } from '../../utils/format.js';
import { firestoreService } from '../../services/firestoreService.js';

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
            await firestoreService.saveJornada(state.user.uid, jornadaData);
        }

        store.setState({
            carreras: [],
            gastos: [],
            jornadaIniciada: false,
            jornadaInicio: null,
            selectedPlatform: null,
            selectedPayment: null
        });

        document.getElementById('summaryModal').style.display = 'none';
        showToast('Jornada guardada correctamente', 'success');
    },

    exportReport() {
        const state = store.getState();
        const totalBruto = state.carreras.reduce((sum, c) => sum + c.amount, 0);
        const totalGastos = state.gastos.reduce((sum, g) => sum + g.monto, 0);
        const totalNeto = (state.carreras.reduce((sum, c) => sum + (c.neto || c.amount), 0)) - totalGastos;

        let report = `🚗 RUTAPRO - REPORTE DE JORNADA\n`;
        report += `📅 Fecha: ${new Date().toLocaleDateString('es-ES')}\n`;
        report += `--------------------------------\n`;
        report += `✅ Total Carreras: ${state.carreras.length}\n`;
        report += `💵 Total Bruto: ${formatCurrency(totalBruto)}\n`;
        report += `📉 Total Gastos: ${formatCurrency(totalGastos)}\n`;
        report += `💰 Ganancia Neta: ${formatCurrency(totalNeto)}\n\n`;

        // Desglose por plataforma
        report += `🎯 DESGLOSE POR PLATAFORMA:\n`;
        const stats = {};
        state.carreras.forEach(c => {
            if (!stats[c.platform]) stats[c.platform] = 0;
            stats[c.platform] += c.amount;
        });
        Object.entries(stats).forEach(([plat, amount]) => {
            const name = getPlatformName(plat, state.settings.plataformas);
            report += `  - ${name.toUpperCase()}: ${formatCurrency(amount)}\n`;
        });

        // Intentar compartir usando Web Share API si está en móvil
        if (navigator.share) {
            navigator.share({
                title: 'Reporte RutaPro',
                text: report
            }).catch(console.error);
        } else {
            // Copiar al portapapeles en desktop
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

        const input = document.getElementById('amountInput');
        if (input) input.value = '';

        showToast('Carrera agregada correctamente', 'success');
    },

    deleteCarrera(id) {
        if (confirm('¿Estás seguro de eliminar esta carrera?')) {
            const state = store.getState();
            store.setState({
                carreras: state.carreras.filter(c => c.id !== id)
            });
            showToast('Carrera eliminada', 'success');
        }
    },

    clearAll() {
        if (confirm('¿Estás seguro de limpiar todos los datos del día?')) {
            store.setState({
                carreras: [],
                gastos: [],
                jornadaIniciada: false,
                jornadaInicio: null,
                selectedPlatform: null,
                selectedPayment: null
            });
            showToast('Todos los datos han sido eliminados', 'success');
        }
    }
};
