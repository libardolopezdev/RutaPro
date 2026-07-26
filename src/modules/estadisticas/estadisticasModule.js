/**
 * src/modules/estadisticas/estadisticasModule.js
 */
import { store } from '../../state/store.js';
import { storageService } from '../../services/storageService.js';
import { firestoreService } from '../../services/firestoreService.js';
import { formatCurrency, getPlatformName, normalizePlatform, renderAvatarPlataforma, getColorOficial, getColorPlataforma, normalizarNombre, escapeHTML } from '../../utils/format.js';

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================
const COLORS = {
    EXCELENTE: 'var(--emerald)',
    ATENCION: 'var(--gold)',
    ALTO: 'var(--ruby)',
    TRANSPARENTE: 'transparent',
    EFECTIVO: '#10B981',
    DIGITAL: '#3B82F6',
    FALLBACK: '#6B7280'
};

const THRESHOLDS = {
    GASTOS_ATENCION: 20,
    GASTOS_ALTO: 35
};

const EMOJIS_GASTOS = { combustible: '⛽', comida: '🍔', peaje: '🛣️', lavado: '🧽', comision: '💸', otro: '📋' };

let gananciasChartInstance = null;

// ============================================================================
// HELPERS PRIVADOS
// ============================================================================
function getColorBarra(norm, settingsPlatforms = []) {
    const oficial = getColorOficial(norm.name);
    if (oficial) return oficial;

    const activa = settingsPlatforms.find(p =>
        p.id === norm.id ||
        normalizarNombre(p.name) === normalizarNombre(norm.name)
    );
    if (activa?.color && activa.color !== '#00E676' && activa.color !== COLORS.FALLBACK) {
        return activa.color;
    }

    if (norm.color && norm.color !== COLORS.FALLBACK) return norm.color;
    return COLORS.FALLBACK;
}

function renderHtmlPrItem(st, pctFill, pctStr, isBest, avatarHtml, colorBarra, colorSeguro) {
    return `
        <div class="pr-item-premium">
            <div class="pr-header-premium">
                <div class="pr-brand">
                    ${avatarHtml}
                    <div class="pr-name-container">
                        <span class="pr-name" style="color:${colorSeguro}">${escapeHTML(st.name)}</span>
                        ${isBest ? '<span class="pr-badge-rentable">🥇 Más rentable</span>' : ''}
                    </div>
                </div>
                <span class="pr-amount-premium">${formatCurrency(st.total)}</span>
            </div>
            <div class="pr-bar-bg-premium">
                <div class="pr-bar-fill-premium" style="width: ${pctFill}%; background: ${colorBarra}"></div>
            </div>
            <div class="pr-footer-premium">
                <div class="pr-footer-stat">
                    <span class="pr-stat-val">${pctStr}%</span>
                    <span class="pr-stat-lbl">del total</span>
                </div>
                <div class="pr-footer-stat" style="align-items: center;">
                    <span class="pr-stat-val">${st.count}</span>
                    <span class="pr-stat-lbl">carreras</span>
                </div>
                <div class="pr-footer-stat" style="align-items: flex-end;">
                    <span class="pr-stat-val">${st.prom > 0 ? formatCurrency(st.prom) : '—'}</span>
                    <span class="pr-stat-lbl">promedio</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// MÓDULO PRINCIPAL
// ============================================================================
export const estadisticasModule = {
    // ESTADO
    _rawData: [],
    _currentPeriod: '7',
    _renderGeneration: 0,

    async open() {
        document.getElementById('statsModal').style.display = 'flex';
        this.bindEvents();
        await this.loadData();
    },

    bindEvents() {
        const tabs = document.querySelectorAll('.stats-tab');
        tabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            newTab.addEventListener('click', (e) => {
                document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this._currentPeriod = e.target.dataset.period;
                this.render();
            });
        });
    },

    async loadData() {
        const state = store.getState();
        if (state.user) {
            try {
                const { data } = await firestoreService.getHistoricoParaEstadisticas(state.user.uid);
                this._rawData = data || [];
                storageService.saveHistorico(this._rawData);
            } catch (e) {
                // console.warn('Cargando local por error de red en estadísticas', e);
                this._rawData = storageService.loadHistorico() || [];
            }
        } else {
            this._rawData = storageService.loadHistorico() || [];
        }
        this.render();
    },

    filterDataByPeriod() {
        if (!this._rawData || this._rawData.length === 0) return [];
        if (this._currentPeriod === 'all') return this._rawData;

        const days = parseInt(this._currentPeriod);
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        return this._rawData.filter(j => new Date(j.fecha).getTime() >= cutoffTime);
    },

    // ============================================================================
    // RENDER PRINCIPAL
    // ============================================================================
    render() {
        this._renderGeneration++;
        const currentGeneration = this._renderGeneration;
        const data = this.filterDataByPeriod();

        if (data.length === 0) {
            document.getElementById('statsContent').style.display = 'none';
            document.getElementById('statsEmptyState').style.display = 'block';
            return;
        }

        document.getElementById('statsContent').style.display = 'flex';
        document.getElementById('statsEmptyState').style.display = 'none';

        const aggregates = this._calculateAggregates(data);

        this._renderNivel1_Resumen(aggregates);
        this._renderNivel2_PlatformRanking(data, currentGeneration);
        this._renderNivel3_SaludFinanciera(data);
        this._renderNivel4_Contexto(data, aggregates, currentGeneration);
    },

    // ============================================================================
    // CÁLCULOS CENTRALIZADOS
    // ============================================================================
    _calculateAggregates(data) {
        let netoTotal = 0;
        let carrerasTotal = 0;
        let mejorDia = 0;
        let peorDia = Infinity;

        data.forEach(j => {
            const ganancia = j.ganancia || 0;
            netoTotal += ganancia;
            carrerasTotal += j.totalCarreras || 0;
            if (ganancia > mejorDia) mejorDia = ganancia;
            if (ganancia < peorDia) peorDia = ganancia;
        });

        if (peorDia === Infinity) peorDia = 0;

        const jornadasTrabajadas = data.length;
        const promJornada = jornadasTrabajadas > 0 ? netoTotal / jornadasTrabajadas : 0;
        const promCarrera = carrerasTotal > 0 ? netoTotal / carrerasTotal : 0;
        const carrerasJornada = jornadasTrabajadas > 0 ? carrerasTotal / jornadasTrabajadas : 0;

        return { netoTotal, carrerasTotal, mejorDia, peorDia, jornadasTrabajadas, promJornada, promCarrera, carrerasJornada };
    },

    // ============================================================================
    // NIVEL 1: RESUMEN FINANCIERO
    // ============================================================================
    _renderNivel1_Resumen(agg) {
        document.getElementById('stNetoTotal').textContent = formatCurrency(agg.netoTotal);
        document.getElementById('stPromedioJornada').textContent = formatCurrency(agg.promJornada);
        document.getElementById('stPromedioCarrera').textContent = formatCurrency(agg.promCarrera);
    },

    // ============================================================================
    // NIVEL 2: RANKING DE PLATAFORMAS
    // ============================================================================
    async _renderNivel2_PlatformRanking(data, currentGeneration) {
        const state = store.getState();
        const platStats = {};
        const uniquePlatforms = new Set();

        data.forEach(j => {
            if (!j.carrerasDesglose) return;
            j.carrerasDesglose.forEach(c => {
                uniquePlatforms.add(c.platform);
                
                const norm = normalizePlatform(c.platform, state.settings.plataformas);
                const platId = norm.id;

                if (!platStats[platId]) {
                    platStats[platId] = { 
                        total: 0, 
                        count: 0, 
                        color: norm.color, 
                        name: norm.isActiva ? norm.name : `${norm.name} (Inactiva)`
                    };
                }
                platStats[platId].total += (c.neto || c.amount);
                platStats[platId].count += 1;
            });
        });
        
        const sorted = Object.entries(platStats).sort((a, b) => b[1].total - a[1].total);
        if (sorted.length === 0) {
            document.getElementById('stPlatformRanking').innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px;">No hay datos suficientes</div>';
            return;
        }

        const totalIngresosPlataformas = sorted.reduce((sum, [, st]) => sum + st.total, 0);
        
        let bestPromedioId = sorted[0][0];
        let bestPromedioVal = -1;
        sorted.forEach(([id, st]) => {
            st.prom = st.count > 0 ? (st.total / st.count) : 0;
            if (st.prom > bestPromedioVal) {
                bestPromedioVal = st.prom;
                bestPromedioId = id;
            }
        });

        const htmlContent = (await Promise.all(sorted.map(async ([id, st]) => {
            const pctFill = totalIngresosPlataformas > 0 ? (st.total / totalIngresosPlataformas) * 100 : 0;
            const pctStr = totalIngresosPlataformas > 0 ? Math.round(pctFill) : 100;
            const isBest = id === bestPromedioId;
            const normMinimal = { name: st.name.replace(' (Inactiva)', ''), color: st.color };
            const avatarHtml = await renderAvatarPlataforma(normMinimal);
            const colorBarra = getColorBarra({ id, name: normMinimal.name, color: st.color }, state.settings.plataformas);
            const colorSeguro = getColorPlataforma(normMinimal.name, colorBarra);

            return renderHtmlPrItem(st, pctFill, pctStr, isBest, avatarHtml, colorBarra, colorSeguro);
        }))).join('');

        if (this._renderGeneration !== currentGeneration) return;

        document.getElementById('stPlatformRanking').innerHTML = htmlContent;
    },

    // ============================================================================
    // NIVEL 3: SALUD FINANCIERA
    // ============================================================================
    _renderNivel3_SaludFinanciera(data) {
        let brutoTotal = 0;
        let gastosTotal = 0;
        const tipoStats = {};

        data.forEach(j => {
            brutoTotal += (j.totalBruto || 0);
            if (j.gastosDesglose) {
                j.gastosDesglose.forEach(g => {
                    gastosTotal += g.monto;
                    if (!tipoStats[g.tipo]) tipoStats[g.tipo] = 0;
                    tipoStats[g.tipo] += g.monto;
                });
            }
        });

        const pct = brutoTotal > 0 ? Math.round((gastosTotal / brutoTotal) * 100) : 0;
        const pctStr = brutoTotal > 0 ? `${pct}%` : '—';
        const barraWidth = Math.min(pct, 100);

        const elIngresos = document.getElementById('stFhIngresos');
        if (elIngresos) elIngresos.textContent = formatCurrency(brutoTotal);
        
        document.getElementById('stFhGastos').textContent = formatCurrency(gastosTotal);
        document.getElementById('stFhImpactoPct').textContent = pctStr;
        
        const elBar = document.getElementById('stFhImpactoBar');
        elBar.style.width = `${barraWidth}%`;

        // Update hidden IDs for backward compatibility
        const elGastoPct = document.getElementById('stGastoPct');
        const elGastoTotal = document.getElementById('stGastoTotal');
        if (elGastoPct) elGastoPct.textContent = pctStr;
        if (elGastoTotal) elGastoTotal.textContent = formatCurrency(gastosTotal);

        const sortedGastos = Object.entries(tipoStats).sort((a, b) => b[1] - a[1]);
        const elMayorGasto = document.getElementById('stFhMayorGasto');
        
        if (sortedGastos.length === 0) {
            elMayorGasto.innerHTML = '<span class="fh-major-name" style="color:var(--text-muted); font-weight:normal;">No se registraron gastos.</span><span class="fh-major-val"></span>';
        } else {
            const [tipo, val] = sortedGastos[0];
            const icon = EMOJIS_GASTOS[tipo] || '📋';
            const name = tipo.charAt(0).toUpperCase() + tipo.slice(1);
            elMayorGasto.innerHTML = `
                <span class="fh-major-name">${icon} ${escapeHTML(name)}</span>
                <span class="fh-major-val">${formatCurrency(val)}</span>
            `;
        }

        const elStatusBox = document.getElementById('stFhStatusBox');
        const elStatusTitle = document.getElementById('stFhStatusTitle');
        const elStatusDesc = document.getElementById('stFhStatusDesc');

        if (brutoTotal === 0 && gastosTotal === 0) {
            elStatusBox.style.borderLeftColor = COLORS.TRANSPARENTE;
            elBar.style.backgroundColor = COLORS.TRANSPARENTE;
            elStatusTitle.textContent = 'Sin datos';
            elStatusDesc.textContent = 'No hay actividad financiera registrada en este período.';
        } else if (pct < THRESHOLDS.GASTOS_ATENCION) {
            elStatusBox.style.borderLeftColor = COLORS.EXCELENTE;
            elBar.style.backgroundColor = COLORS.EXCELENTE;
            elStatusTitle.textContent = '🟢 Excelente';
            elStatusDesc.textContent = `Conservaste el ${100 - pct}% de tus ingresos.`;
        } else if (pct <= THRESHOLDS.GASTOS_ALTO) {
            elStatusBox.style.borderLeftColor = COLORS.ATENCION;
            elBar.style.backgroundColor = COLORS.ATENCION;
            elStatusTitle.textContent = '🟡 Atención';
            elStatusDesc.textContent = `Los gastos ya representan el ${pct}% de tus ingresos.`;
        } else {
            elStatusBox.style.borderLeftColor = COLORS.ALTO;
            elBar.style.backgroundColor = COLORS.ALTO;
            elStatusTitle.textContent = '🔴 Alto';
            elStatusDesc.textContent = 'Tus costos están reduciendo significativamente tu rentabilidad.';
        }
    },

    // ============================================================================
    // NIVEL 4: CONTEXTO Y ACTIVIDAD
    // ============================================================================
    _renderNivel4_Contexto(data, agg, currentGeneration) {
        document.getElementById('stJornadasTotal').textContent = agg.jornadasTrabajadas;
        document.getElementById('stCarrerasTotal').textContent = agg.carrerasTotal;
        document.getElementById('stMejorDia').textContent = formatCurrency(agg.mejorDia);
        
        const elRango = document.getElementById('stRangoHabitual');
        if (elRango) elRango.textContent = `${formatCurrency(agg.peorDia)} - ${formatCurrency(agg.mejorDia)}`;

        const elPeorDia = document.getElementById('stPeorDia'); // Oculto / Legacy
        if (elPeorDia) elPeorDia.textContent = formatCurrency(agg.peorDia);
        
        const elVariacion = document.getElementById('stVariacionDia'); // Oculto / Legacy
        if (elVariacion) elVariacion.textContent = formatCurrency(agg.mejorDia - agg.peorDia);

        const elCarrerasJornada = document.getElementById('stCarrerasJornada'); // Oculto / Legacy
        if (elCarrerasJornada) elCarrerasJornada.textContent = agg.carrerasJornada.toFixed(1);

        this._renderPaymentMethods(data);

        setTimeout(() => {
            if (this._renderGeneration !== currentGeneration) return;
            this._renderEarningsChart(data);
        }, 50);
    },

    _renderPaymentMethods(data) {
        let efe = 0;
        let dig = 0;

        data.forEach(j => {
            if (j.carrerasDesglose) {
                j.carrerasDesglose.forEach(c => {
                    if (c.payment === 'efectivo') {
                        efe += (c.neto || c.amount);
                    } else {
                        dig += (c.neto || c.amount);
                    }
                });
            }
        });

        const total = efe + dig;
        const pEfe = total > 0 ? Math.round((efe/total)*100) : 0;
        const pDig = total > 0 ? Math.round((dig/total)*100) : 0;

        const legendContainer = document.getElementById('stPaymentSplitLegend');
        if (legendContainer) {
            legendContainer.innerHTML = `
                <div class="cb-pay-row">
                    <span class="cb-pay-lbl">💵 Efectivo <span class="cb-pay-pct">${pEfe}%</span></span>
                    <div class="cb-pay-bar"><div class="cb-pay-fill" style="width:${pEfe}%; background:${COLORS.EFECTIVO};"></div></div>
                </div>
                <div class="cb-pay-row">
                    <span class="cb-pay-lbl">💳 Digital <span class="cb-pay-pct">${pDig}%</span></span>
                    <div class="cb-pay-bar"><div class="cb-pay-fill" style="width:${pDig}%; background:${COLORS.DIGITAL};"></div></div>
                </div>
            `;
        }

        const ctx = document.getElementById('metodosPagoChart');
        if (ctx && ctx.parentElement) {
            ctx.parentElement.style.display = 'none';
        }
        
        if (typeof window.mediosPagoChartInstance !== 'undefined' && window.mediosPagoChartInstance) {
            window.mediosPagoChartInstance.destroy();
            window.mediosPagoChartInstance = null;
        }
    },

    _renderEarningsChart(data) {
        const ctx = document.getElementById('gananciasChart');
        if (!ctx) return;
        
        if (gananciasChartInstance) {
            gananciasChartInstance.destroy();
        }

        const sorted = [...data].sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
        const labels = sorted.map(d => {
            const dt = new Date(d.fecha);
            return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        });
        const values = sorted.map(d => d.ganancia || 0);

        const maxVal = Math.max(...values, 100);
        const chartColors = values.map(v => v === Math.max(...values) ? COLORS.EFECTIVO : 'rgba(16, 185, 129, 0.3)');

        if (window.Chart) {
            gananciasChartInstance = new window.Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Ingresos',
                        data: values,
                        backgroundColor: chartColors,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => formatCurrency(ctx.raw)
                            }
                        }
                    },
                    scales: {
                        y: { 
                            display: false,
                            suggestedMax: maxVal * 1.15
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }
                        }
                    }
                }
            });
        }
    }
};
