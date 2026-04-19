/**
 * src/modules/historico/historicoModule.js
 */
import { store } from '../../state/store.js';
import { firestoreService } from '../../services/firestoreService.js';
import { storageService } from '../../services/storageService.js';
import { formatCurrency } from '../../utils/format.js';

export const historicoModule = {
    currentTab: 'historial',
    allData: [],

    async open() {
        document.getElementById('historicoSection').style.display = 'flex';
        this.currentTab = 'historial';
        await this.loadData();
    },

    async loadData() {
        const state = store.getState();
        if (state.user) {
            const { data } = await firestoreService.getHistorico(state.user.uid, true);
            this.allData = data;
            storageService.saveHistorico(data.filter(d => !d.deletedAt));
        } else {
            const local = storageService.loadHistorico() || [];
            this.allData = local.map(d => ({...d, isLocal: true}));
        }
        this.render();
    },

    switchTab(tab) {
        this.currentTab = tab;
        const tabH = document.getElementById('tabHistoricoBtn');
        const tabP = document.getElementById('tabPapeleraBtn');
        if (tabH && tabP) {
            tabH.style.color = tab === 'historial' ? 'var(--emerald)' : 'var(--text-muted)';
            tabP.style.color = tab === 'papelera' ? 'var(--emerald)' : 'var(--text-muted)';
        }
        this.render();
    },

    close() {
        document.getElementById('historicoSection').style.display = 'none';
        const navBtns = document.querySelectorAll('.nav-btn');
        if (navBtns.length > 0) {
            navBtns.forEach(b => b.classList.remove('active'));
            const navHoy = document.getElementById('navHoy');
            if (navHoy) navHoy.classList.add('active');
        }
    },

    async trashItem(id) {
        const state = store.getState();
        if (state.user) {
            await firestoreService.moveToTrash(state.user.uid, id);
            await this.loadData();
        }
    },

    async restoreItem(id) {
        const state = store.getState();
        if (state.user) {
            await firestoreService.restoreFromTrash(state.user.uid, id);
            await this.loadData();
        }
    },

    async deleteDefinitive(id) {
        if (!confirm("¿Eliminar jornada para siempre? Esto no se puede deshacer.")) return;
        const state = store.getState();
        if (state.user) {
            await firestoreService.hardDeleteHistorico(state.user.uid, id);
            await this.loadData();
        }
    },

    async deleteAllDefinitive() {
        if (!confirm("¿Vaciar papelera? SE ELIMINARÁN TODAS LAS JORNADAS DEFINITIVAMENTE.")) return;
        const state = store.getState();
        if (state.user) {
             const papelera = this.allData.filter(d => d.deletedAt);
             for(let d of papelera) {
                 await firestoreService.hardDeleteHistorico(state.user.uid, d.id);
             }
             await this.loadData();
        }
    },

    render() {
        const content = document.getElementById('historicoContent');
        const countSpan = document.getElementById('papeleraCount');
        if (!content) return;

        const isPapelera = this.currentTab === 'papelera';
        const data = this.allData.filter(d => isPapelera ? !!d.deletedAt : !d.deletedAt);
        const trashCount = this.allData.filter(d => !!d.deletedAt).length;

        if (countSpan) countSpan.textContent = trashCount;

        if (!data || data.length === 0) {
            content.innerHTML = isPapelera ? '<div style="text-align:center; padding:32px 0; color:var(--text-muted); font-size:13px;">La papelera está vacía</div>' 
               : '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:32px 0;">Sin jornadas registradas aún</div>';
            return;
        }

        const sorted = [...data].sort((a, b) => (b.ganancia || 0) - (a.ganancia || 0));
        const topGanancia = sorted[0]?.ganancia || 0;

        let html = '';
        if (isPapelera && data.length > 0) {
             html += `<div style="text-align:right; margin-bottom:12px;"><button onclick="window.historicoModule.deleteAllDefinitive()" style="background:transparent; color:var(--ruby); border:1px solid var(--ruby); padding:6px 12px; border-radius:8px; cursor:pointer; font-size:11px; font-weight:700;">Vaciar Papelera</button></div>`;
        }

        html += sorted.map((item, idx) => {
            const promedio = item.totalCarreras > 0
                ? formatCurrency(item.ganancia / item.totalCarreras)
                : formatCurrency(0);
            const isTop = !isPapelera && idx === 0 && item.ganancia === topGanancia && sorted.length > 0;
            
            const actionBtn = isPapelera 
                ? `<div style="display:flex; gap:8px; margin-top:12px; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px;">
                     <button onclick="window.historicoModule.restoreItem('${item.id}')" style="flex:1; background:var(--emerald); color:black; font-weight:800; border:none; padding:8px; border-radius:8px; cursor:pointer;">Restaurar</button>
                     <button onclick="window.historicoModule.deleteDefinitive('${item.id}')" style="background:rgba(239,68,68,0.1); color:var(--ruby); border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:700;">X</button>
                   </div>`
                : `<button onclick="window.historicoModule.trashItem('${item.id}')" class="icon-box glass small" style="position:absolute; right:16px; top:16px; color:var(--ruby); cursor:pointer;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>`;

            return `
            <div class="historico-item${isTop ? ' historico-item--top' : ''}" style="position:relative;">
                ${isTop ? '<div class="historico-top-badge">🏆 Mayor ingreso</div>' : ''}
                <div class="historico-fecha" style="padding-right: 32px;">${new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                <div class="historico-stats">
                    <div><strong>${item.totalCarreras}</strong><br>Carreras</div>
                    <div><strong>${formatCurrency(item.ganancia)}</strong><br>Neto</div>
                    <div><strong>${promedio}</strong><br>Promedio</div>
                </div>
                ${actionBtn}
            </div>
            `;
        }).join('');
        
        content.innerHTML = html;
    }
};
