/**
 * src/modules/historico/historicoModule.js
 */
import { store } from '../../state/store.js';
import { firestoreService } from '../../services/firestoreService.js';
import { storageService } from '../../services/storageService.js';
import { formatCurrency, getPlatformName } from '../../utils/format.js';
import { showToast, showConfirm } from '../../utils/ui-utils.js';

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
        const confirmed = await showConfirm({
            title: 'Mover reporte a la papelera',
            message: '¿Deseas mover este reporte a la papelera?<br><br>Podrás restaurarlo posteriormente desde la pestaña "Papelera".',
            confirmText: 'Mover a papelera',
            cancelText: 'Cancelar',
            icon: '🗑',
            confirmStyle: 'var(--ruby)'
        });

        if (!confirmed) return;

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
        const confirmed = await showConfirm({
            title: 'Eliminar definitivamente',
            message: '¿Eliminar jornada para siempre?<br><br><b>Esto no se puede deshacer.</b>',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            icon: '⚠️',
            confirmStyle: 'var(--ruby)'
        });
        if (!confirmed) return;

        const state = store.getState();
        if (state.user) {
            await firestoreService.hardDeleteHistorico(state.user.uid, id);
            await this.loadData();
        }
    },

    async deleteAllDefinitive() {
        const confirmed = await showConfirm({
            title: 'Vaciar papelera',
            message: '¿Vaciar papelera?<br><br><b>SE ELIMINARÁN TODAS LAS JORNADAS DEFINITIVAMENTE.</b>',
            confirmText: 'Vaciar todo',
            cancelText: 'Cancelar',
            icon: '🚨',
            confirmStyle: 'var(--ruby)'
        });
        if (!confirmed) return;

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

        const topGanancia = data.length > 0 ? Math.max(...data.map(d => d.ganancia || 0)) : 0;
        const sorted = [...data].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        let html = '';
        if (isPapelera && data.length > 0) {
             html += `<div style="text-align:right; margin-bottom:12px;"><button onclick="window.historicoModule.deleteAllDefinitive()" style="background:transparent; color:var(--ruby); border:1px solid var(--ruby); padding:6px 12px; border-radius:8px; cursor:pointer; font-size:11px; font-weight:700;">Vaciar Papelera</button></div>`;
        }

        html += sorted.map((item, idx) => {
            const promedio = item.totalCarreras > 0
                ? formatCurrency(item.ganancia / item.totalCarreras)
                : formatCurrency(0);
            const isTop = !isPapelera && idx === sorted.findIndex(s => s.ganancia === topGanancia) && topGanancia > 0;
            
            const actionBtn = isPapelera 
                ? `<div style="display:flex; gap:8px; margin-top:12px; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px;">
                     <button onclick="window.historicoModule.restoreItem('${item.id}')" style="flex:1; background:var(--emerald); color:black; font-weight:800; border:none; padding:8px; border-radius:8px; cursor:pointer;">Restaurar</button>
                     <button onclick="window.historicoModule.deleteDefinitive('${item.id}')" style="background:rgba(239,68,68,0.1); color:var(--ruby); border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:700;">X</button>
                   </div>`
                : `<button onclick="window.historicoModule.trashItem('${item.id}')" class="icon-box glass small" style="position:absolute; right:16px; top:16px; color:var(--ruby); cursor:pointer;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>`;

            return `
            <div class="historico-item${isTop ? ' historico-item--top' : ''}" style="position:relative; cursor:pointer;" onclick="if(!event.target.closest('button')) window.historicoModule.openDetail('${item.id}')">
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
    },

    openDetail(id) {
        const item = this.allData.find(d => d.id === id);
        if (!item) return;

        const carreras = item.carrerasDesglose || [];
        const gastos = item.gastosDesglose || [];
        const totalCarreras = item.totalCarreras !== undefined ? item.totalCarreras : carreras.length;
        const totalBruto = item.totalBruto !== undefined ? item.totalBruto : carreras.reduce((sum, c) => sum + (c.amount || 0), 0);
        const totalNeto = item.ganancia !== undefined ? item.ganancia : (totalBruto - gastos.reduce((sum, g) => sum + (g.monto || 0), 0));
        const totalGastos = totalBruto - totalNeto;

        const formattedDate = new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        
        document.getElementById('hdFecha').textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        document.getElementById('hdCarreras').textContent = totalCarreras;
        document.getElementById('hdBruto').textContent = formatCurrency(totalBruto);
        document.getElementById('hdGastos').textContent = `-$${totalGastos.toLocaleString('es-CO')}`;
        document.getElementById('hdNeto').textContent = formatCurrency(totalNeto);

        const compartirBtn = document.getElementById('hdCompartirBtn');
        compartirBtn.onclick = () => this.exportHistoricoReport(item);

        document.getElementById('historicoDetailModal').style.display = 'flex';
    },

    exportHistoricoReport(item) {
        const state = store.getState();
        const carreras = item.carrerasDesglose || [];
        const gastos = item.gastosDesglose || [];
        
        const totalCarreras = item.totalCarreras !== undefined ? item.totalCarreras : carreras.length;
        const totalBruto = item.totalBruto !== undefined ? item.totalBruto : carreras.reduce((sum, c) => sum + (c.amount || 0), 0);
        const totalNeto = item.ganancia !== undefined ? item.ganancia : (totalBruto - gastos.reduce((sum, g) => sum + (g.monto || 0), 0));
        const totalGastos = totalBruto - totalNeto;

        const METODOS_EFECTIVO = ['efectivo', 'cash'];
        const porPlataforma = {};
        let totalEfectivo = 0;
        let totalDigital = 0;

        carreras.forEach(c => {
            const nombre = getPlatformName(c.platform || c.plataforma || '—', state.settings?.plataformas || []).toUpperCase();
            if (!porPlataforma[nombre]) {
                porPlataforma[nombre] = { total: 0, carreras: 0, efectivo: 0, digital: 0 };
            }
            const monto = c.neto || c.amount || 0;
            porPlataforma[nombre].total += monto;
            porPlataforma[nombre].carreras += 1;

            if (METODOS_EFECTIVO.includes((c.payment || c.metodoPago || '').toLowerCase())) {
                totalEfectivo += monto;
                porPlataforma[nombre].efectivo += monto;
            } else {
                totalDigital += monto;
                porPlataforma[nombre].digital += monto;
            }
        });

        let report = `🚗 RUTAPRO — REPORTE DE JORNADA\n\n`;
        
        let fechaStr = new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);
        report += `📅 ${fechaStr}\n\n`;
        
        report += `💳 MEDIOS DE PAGO\n\n`;
        report += `💵 Efectivo: ${formatCurrency(totalEfectivo)}\n`;
        report += `💳 Digital: ${formatCurrency(totalDigital)}\n\n`;
        
        report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        report += `📈 RESUMEN GENERAL\n\n`;
        report += `🚖 Carreras: ${totalCarreras}\n\n`;
        report += `💵 Ingreso bruto: ${formatCurrency(totalBruto)}\n\n`;

        if (totalGastos > 0) {
            let porcentajeText = '';
            if (totalBruto > 0) {
                const pct = Math.round((totalGastos / totalBruto) * 100);
                porcentajeText = ` (${pct}%)`;
            }
            report += `📉 Gastos: ${formatCurrency(totalGastos)}${porcentajeText}\n`;
            
            const gastosAgrupados = {};
            gastos.forEach(g => {
                const tipo = g.tipo || 'otro';
                gastosAgrupados[tipo] = (gastosAgrupados[tipo] || 0) + (g.monto || 0);
            });
            const GASTOS_LABELS = {
                combustible: '⛽ Gasolina',
                comida: '🍔 Alimentación',
                peaje: '🛣️ Peaje',
                lavado: '🧽 Lavado',
                comision: '📱 Comisión',
                parqueadero: '🅿️ Parqueadero',
                otro: '📝 Otro'
            };
            Object.entries(gastosAgrupados).forEach(([tipo, monto]) => {
                if (monto > 0) {
                    const label = GASTOS_LABELS[tipo] || ('📝 ' + tipo.charAt(0).toUpperCase() + tipo.slice(1));
                    report += `   ${label.padEnd(19, '.')}${formatCurrency(monto)}\n`;
                }
            });
            report += `\n`;
        } else {
            report += `📉 Gastos: $0\n\n`;
        }

        report += `💰 Ganancia neta: ${formatCurrency(totalNeto)}\n\n`;
        
        report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        const meta = state.settings?.meta || 0;
        report += `🎯 META DEL DÍA\n\n`;
        const diferencia = totalNeto - meta;
        if (diferencia > 0) {
            report += `🏆 Superaste la meta por ${formatCurrency(diferencia)}\n\n`;
        } else if (diferencia === 0) {
            report += `✅ Meta alcanzada\n\n`;
        } else {
            report += `📌 Faltaron ${formatCurrency(Math.abs(diferencia))}\n\n`;
        }

        report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        report += `📊 PLATAFORMAS\n\n`;
        const plataformasOrdenadas = Object.entries(porPlataforma)
            .sort((a, b) => b[1].total - a[1].total);

        plataformasOrdenadas.forEach(([nombre, datos], index) => {
            report += `${nombre}\n`;
            report += `  ${formatCurrency(datos.total)} • ${datos.carreras} carrera${datos.carreras !== 1 ? 's' : ''}\n`;
            
            let splitText = [];
            if (datos.efectivo > 0) splitText.push(`💵 Efectivo: ${formatCurrency(datos.efectivo)}`);
            if (datos.digital > 0) splitText.push(`💳 Digital: ${formatCurrency(datos.digital)}`);
            
            if (splitText.length > 0) {
                report += `  ${splitText.join(' | ')}\n`;
            }
            
            if (index < plataformasOrdenadas.length - 1) {
                report += `\n`;
            }
        });

        report += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        report += `Generado con RutaPro`;

        this.shareText(report);
    },

    shareText(text) {
        if (navigator.share) {
            navigator.share({
                title: 'Reporte RutaPro',
                text: text
            }).catch((e) => {
                // console.error('Error usando navigator.share:', e);
                if (e.name !== 'AbortError') {
                    this.shareViaWhatsApp(text);
                }
            });
        } else {
            this.shareViaWhatsApp(text);
        }
    },

    shareViaWhatsApp(text) {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    },

    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Reporte copiado al portapapeles', 'success');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(text);
            });
        } else {
            this.fallbackCopyTextToClipboard(text);
        }
    },

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Reporte copiado al portapapeles', 'success');
        } catch (err) {
            // console.error('Fallback copy failed', err);
            showToast('Error al copiar el reporte', 'error');
        }
        document.body.removeChild(textArea);
    }
};
