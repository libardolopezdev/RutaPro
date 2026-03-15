/**
 * src/modules/historico/historicoModule.js
 */
import { store } from '../../state/store.js';
import { firestoreService } from '../../services/firestoreService.js';
import { storageService } from '../../services/storageService.js';

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

        content.innerHTML = data.map(item => `
            <div class="historico-item">
                <div class="historico-fecha">${new Date(item.fecha).toLocaleDateString('es-ES')}</div>
                <div class="historico-stats">
                    <div><strong>${item.totalCarreras}</strong><br>Carreras</div>
                    <div><strong>${item.totalBruto}</strong><br>Bruto</div>
                    <div><strong>${item.ganancia}</strong><br>Ganancia</div>
                </div>
            </div>
        `).join('');
    }
};
