/**
 * src/modules/gastos/gastosModule.js
 */
import { store } from '../../state/store.js';
import { showToast } from '../../utils/ui-utils.js';
import { syncJornadaToFirestore } from '../carreras/carrerasModule.js';

export const gastosModule = {
    init() {
        // Escuchar cambios en el select para actualizar estado del botón
        const selectCat = document.getElementById('categoriaGasto');
        if (selectCat) {
            selectCat.addEventListener('change', () => this.updateAddButtonLocal());
        }
    },
    
    updateAddButtonLocal() {
        const montoInput = document.getElementById('gastoMonto');
        const btn = document.getElementById('agregarGasto');
        const selectCat = document.getElementById('categoriaGasto');
        if (!btn || !montoInput || !selectCat) return;
        
        const monto = parseFloat(montoInput.value.replace(/\D/g, ''));
        // El botón solo se habilita si hay un monto y una categoría seleccionada
        if (monto > 0 && selectCat.value !== "") {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    },

    addGasto(monto) {
        const selectCat = document.getElementById('categoriaGasto');
        if (!monto || !selectCat) return;
        
        const categoria = selectCat.value;
        if (!categoria) return;

        const state = store.getState();
        const nuevoGasto = {
            id: Date.now().toString(),
            monto: parseFloat(monto),
            tipo: categoria
        };
        store.setState({
            gastos: [...state.gastos, nuevoGasto]
        });
        syncJornadaToFirestore();
        showToast('Gasto agregado', 'success');
        
        // Limpiar estado local
        selectCat.value = "";
        this.updateAddButtonLocal();
    },

    deleteGasto(id) {
        if (confirm('¿Eliminar este gasto?')) {
            const state = store.getState();
            store.setState({
                gastos: state.gastos.filter(g => g.id !== id)
            });
            syncJornadaToFirestore();
            showToast('Gasto eliminado', 'success');
        }
    }
};
