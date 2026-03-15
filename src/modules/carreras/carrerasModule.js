/**
 * src/modules/carreras/carrerasModule.js
 */
import { store } from '../../state/store.js';
import { showToast } from '../../utils/ui-utils.js';

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
            // This would normally trigger the final summary modal
            // For now we just expose the logic
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
