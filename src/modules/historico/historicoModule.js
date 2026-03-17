/**
 * src/modules/historico/historicoModule.js
 */
import { store } from '../../state/store.js';
import { firestoreService } from '../../services/firestoreService.js';
import { storageService } from '../../services/storageService.js';
import { formatCurrency } from '../../utils/format.js';

export const historicoModule = {
    async open() {
        document.getElementById('appContent').style.display = 'none';
        document.getElementById('historicoSection').style.display = 'block';

        const state = store.getState();
        if (state.user) {
            const { data } = await firestoreService.getHistorico(state.user.uid);
            storageService.saveHistorico(data);
            this.render(data);
        } else {
            const local = storageService.loadHistorico();
            this.render(local);
        }
    },

    close() {
        document.getElementById('appContent').style.display = 'block';
        document.getElementById('historicoSection').style.display = 'none';
    },

    render(data) {
        const content = document.getElementById('historicoContent');
        if (!content) return;

        if (!data || data.length === 0) {
            content.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:32px 0;">Sin jornadas registradas aún</div>';
            return;
        }

        // Mejora 4: ordenar por ganancia descendente
        const sorted = [...data].sort((a, b) => (b.ganancia || 0) - (a.ganancia || 0));
        const topGanancia = sorted[0]?.ganancia || 0;

        content.innerHTML = sorted.map((item, idx) => {
            const promedio = item.totalCarreras > 0
                ? formatCurrency(item.ganancia / item.totalCarreras)
                : formatCurrency(0);
            const isTop = idx === 0 && item.ganancia === topGanancia && sorted.length > 0;

            return `
            <div class="historico-item${isTop ? ' historico-item--top' : ''}">
                ${isTop ? '<div class="historico-top-badge">🏆 Mayor ingreso</div>' : ''}
                <div class="historico-fecha">${new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                <div class="historico-stats">
                    <div><strong>${item.totalCarreras}</strong><br>Carreras</div>
                    <div><strong>${formatCurrency(item.ganancia)}</strong><br>Neto</div>
                    <div><strong>${promedio}</strong><br>Promedio</div>
                </div>
            </div>
        `;
        }).join('');
    }
};
