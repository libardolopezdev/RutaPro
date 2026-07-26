/**
 * src/modules/gastos/gastosModule.js
 */
import { store } from '../../state/store.js';
import { showToast } from '../../utils/ui-utils.js';
import { syncJornadaToFirestore } from '../carreras/carrerasModule.js';

let localExpenseCategory = null;

export const gastosModule = {
    init() {
        const catContainer = document.getElementById('gastoCategorias');
        if (catContainer) {
            catContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.p-chip');
                if (!btn) return;
                this.selectCategory(btn.dataset.id);
            });
        }
    },
    
    selectCategory(id) {
        localExpenseCategory = id;
        
        const btns = document.querySelectorAll('#gastoCategorias .p-chip');
        btns.forEach(b => {
            if (b.dataset.id === id) {
                b.classList.add('active');
                b.style.borderColor = 'var(--gold)';
                b.style.boxShadow = '0 0 10px rgba(255,191,0,0.2)';
            } else {
                b.classList.remove('active');
                b.style.borderColor = 'var(--border-glass)';
                b.style.boxShadow = 'none';
            }
        });
        
        this.updateAddButtonLocal();
    },

    updateAddButtonLocal() {
        const montoInput = document.getElementById('gastoMonto');
        const btn = document.getElementById('agregarGasto');
        if (!btn || !montoInput) return;
        
        const monto = parseFloat(montoInput.value.replace(/\D/g, ''));
        if (monto > 0 && localExpenseCategory) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    },

    addGasto(monto) {
        if (!monto || !localExpenseCategory) return;
        const state = store.getState();
        const nuevoGasto = {
            id: Date.now().toString(),
            monto: parseFloat(monto),
            tipo: localExpenseCategory
        };
        store.setState({
            gastos: [...state.gastos, nuevoGasto]
        });
        syncJornadaToFirestore();
        showToast('Gasto agregado', 'success');
        
        // Limpiar estado local
        localExpenseCategory = null;
        const btns = document.querySelectorAll('#gastoCategorias .p-chip');
        btns.forEach(b => {
            b.classList.remove('active');
            b.style.borderColor = 'var(--border-glass)';
            b.style.boxShadow = 'none';
        });
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
