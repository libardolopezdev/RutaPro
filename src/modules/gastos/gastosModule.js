/**
 * src/modules/gastos/gastosModule.js
 */
import { store } from '../../state/store.js';
import { showToast } from '../../utils/ui-utils.js';

export const gastosModule = {
    addGasto(monto, tipo) {
        if (!monto || !tipo) return;
        const state = store.getState();
        const nuevoGasto = {
            id: Date.now().toString(),
            monto: parseFloat(monto),
            tipo
        };
        store.setState({
            gastos: [...state.gastos, nuevoGasto]
        });
        showToast('Gasto agregado', 'success');
    },

    deleteGasto(id) {
        if (confirm('¿Eliminar este gasto?')) {
            const state = store.getState();
            store.setState({
                gastos: state.gastos.filter(g => g.id !== id)
            });
            showToast('Gasto eliminado', 'success');
        }
    }
};
