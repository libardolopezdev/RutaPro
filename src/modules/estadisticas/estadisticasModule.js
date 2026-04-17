/**
 * src/modules/estadisticas/estadisticasModule.js
 */
import { store } from '../../state/store.js';
import { storageService } from '../../services/storageService.js';
import { firestoreService } from '../../services/firestoreService.js';
import { formatCurrency, getPlatformName, normalizePlatform } from '../../utils/format.js';

let gananciasChartInstance = null;
let mediosPagoChartInstance = null;

export const estadisticasModule = {
    _rawData: [],
    _currentPeriod: '7',

    async open() {
        document.getElementById('statsModal').style.display = 'flex';
        this.bindEvents();
        await this.loadData();
    },

    bindEvents() {
        // Tabs de periodo
        const tabs = document.querySelectorAll('.stats-tab');
        tabs.forEach(tab => {
            // Eliminar listeners previos para evitar duplicados al recargar
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
                const { data } = await firestoreService.getHistorico(state.user.uid);
                this._rawData = data || [];
                storageService.saveHistorico(this._rawData);
            } catch (e) {
                console.warn('Cargando local por error de red en estadísticas', e);
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

    render() {
        const data = this.filterDataByPeriod();

        if (data.length === 0) {
            document.getElementById('statsContent').style.display = 'none';
            document.getElementById('statsEmptyState').style.display = 'block';
            return;
        }

        document.getElementById('statsContent').style.display = 'flex';
        document.getElementById('statsEmptyState').style.display = 'none';

        this.renderResumen(data);
        this.renderHourlyPerf(data);
        this.renderPlatformRanking(data);
        this.renderExpensesControl(data);
        this.renderGoals(data);

        // Chart.js must be rendered small delay in modals to get proper sizing
        setTimeout(() => {
            this.renderEarningsChart(data);
            this.renderPaymentSplitChart(data);
        }, 50);
    },

    renderResumen(data) {
        let netoTotal = 0;
        let carrerasTotal = 0;
        let mejorDia = 0;

        data.forEach(j => {
            netoTotal += j.ganancia || 0;
            carrerasTotal += j.totalCarreras || 0;
            if (j.ganancia > mejorDia) mejorDia = j.ganancia;
        });

        document.getElementById('stNetoTotal').textContent = formatCurrency(netoTotal);
        document.getElementById('stJornadasTotal').textContent = data.length;
        document.getElementById('stCarrerasTotal').textContent = carrerasTotal;
        document.getElementById('stMejorDia').textContent = formatCurrency(mejorDia);
    },

    renderHourlyPerf(data) {
        let totalHoras = 0;
        let netoTotal = 0;

        data.forEach(j => {
            netoTotal += j.ganancia || 0;
            let durationMs = 0;
            // Infer duration: Use jornadaInicio if added in future, or infer from first carrera vs end (fecha)
            if (j.jornadaInicio) {
                durationMs = new Date(j.fecha).getTime() - new Date(j.jornadaInicio).getTime();
            } else if (j.carrerasDesglose && j.carrerasDesglose.length > 0) {
                const first = new Date(j.carrerasDesglose[0].timestamp).getTime();
                const last = new Date(j.fecha).getTime();
                durationMs = last - first;
            }
            
            // Si la duración parece irreal (menor a 1 min o mayor a 24 hrs asumimos 0 para no distorsionar en historiales dañados)
            if (durationMs > 0 && durationMs < (24 * 60 * 60 * 1000)) {
                totalHoras += (durationMs / (1000 * 60 * 60));
            }
        });

        if (totalHoras > 0) {
            const promHora = netoTotal / totalHoras;
            document.getElementById('stPromedioHora').textContent = formatCurrency(promHora);
            document.getElementById('stHorasTotales').textContent = totalHoras.toFixed(1);
        } else {
            document.getElementById('stPromedioHora').textContent = '$0';
            document.getElementById('stHorasTotales').textContent = '0';
        }
    },

    renderPlatformRanking(data) {
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
        
        console.log('Plataformas únicas registradas en el historial:', Array.from(uniquePlatforms));

        const sorted = Object.entries(platStats).sort((a, b) => b[1].total - a[1].total);
        if (sorted.length === 0) {
            document.getElementById('stPlatformRanking').innerHTML = '<div style="color:var(--text-muted);font-size:12px;">Sin datos de plataforma</div>';
            return;
        }

        const maxMonto = sorted[0][1].total;
        
        let bestPromedioId = sorted[0][0];
        let bestPromedioVal = 0;
        sorted.forEach(([id, st]) => {
            if (st.count > 0 && (st.total/st.count) > bestPromedioVal && st.count >= 3) {
                bestPromedioVal = st.total/st.count;
                bestPromedioId = id;
            }
        });

        document.getElementById('stPlatformRanking').innerHTML = sorted.map(([id, st]) => {
            const prom = st.count > 0 ? (st.total / st.count) : 0;
            const pctFill = (st.total / maxMonto) * 100;
            const isBest = id === bestPromedioId;

            return `
                <div class="pr-item">
                    <div class="pr-header">
                        <span class="pr-name" style="color:${st.color}">
                            ${st.name} 
                            ${isBest ? '<span class="pr-badge">⭐ Más rentable</span>' : ''}
                        </span>
                        <span class="pr-amount">${formatCurrency(st.total)}</span>
                    </div>
                    <div class="pr-sub">
                        <span>${st.count} carreras</span>
                        <span>Prom: ${formatCurrency(prom)}/viaje</span>
                    </div>
                    <div class="pr-bar-bg">
                        <div class="pr-bar-fill" style="width: ${pctFill}%; background: ${st.color}"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderExpensesControl(data) {
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

        const pct = brutoTotal > 0 ? ((gastosTotal / brutoTotal) * 100).toFixed(1) : 0;
        document.getElementById('stGastoPct').textContent = `${pct}%`;
        document.getElementById('stGastoTotal').textContent = formatCurrency(gastosTotal);

        const sortedGastos = Object.entries(tipoStats).sort((a, b) => b[1] - a[1]);
        const emojis = { combustible: '⛽', comida: '🍔', peaje: '🛣️', lavado: '🧽', comision: '💸', otro: '📋' };

        if (sortedGastos.length === 0) {
            document.getElementById('stGastosBreakdown').innerHTML = '<div style="color:var(--text-muted);font-size:12px;">Sin gastos registrados</div>';
            return;
        }

        const maxGasto = sortedGastos[0][1];
        
        document.getElementById('stGastosBreakdown').innerHTML = sortedGastos.map(([tipo, val]) => {
            const fillPct = (val / maxGasto) * 100;
            const icon = emojis[tipo] || '📋';
            const name = tipo.charAt(0).toUpperCase() + tipo.slice(1);
            return `
                <div class="eb-item">
                    <div class="eb-icon">${icon}</div>
                    <div class="eb-details">
                        <div class="eb-top">
                            <span>${name}</span>
                            <span style="font-family:'JetBrains Mono';">${formatCurrency(val)}</span>
                        </div>
                        <div class="eb-bar-bg">
                            <div class="eb-bar-fill" style="width: ${fillPct}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderGoals(data) {
        const state = store.getState();
        const metaActual = state.settings.meta || 270000;
        let superadas = 0;
        let totalGananciaMesProgreso = 0;
        
        data.forEach(j => {
            if ((j.ganancia || 0) >= metaActual) superadas++;
            totalGananciaMesProgreso += (j.ganancia || 0);
        });

        const pct = data.length > 0 ? Math.round((superadas / data.length) * 100) : 0;
        document.getElementById('stMetasLogradas').textContent = `${pct}%`;

        // Proyección simple lineal según period
        const daysInPeriod = this._currentPeriod === 'all' ? 30 : parseInt(this._currentPeriod);
        const promDiario = totalGananciaMesProgreso / (data.length || 1);
        const projection = promDiario * 30; // proyector de mes de 30 dias de trabajo
        
        document.getElementById('stProyeccionMes').textContent = formatCurrency(projection);

        const motivador = document.getElementById('stMotivador');
        if (pct >= 80) {
            motivador.textContent = '¡Rendimiento impecable! Estás destruyendo tus metas.';
            motivador.style.color = 'var(--emerald)';
            motivador.style.borderColor = 'rgba(16,185,129,0.3)';
            motivador.style.background = 'rgba(16,185,129,0.08)';
        } else if (pct >= 50) {
            motivador.textContent = 'Buen ritmo. Intenta optimizar tus rutas para superar la meta más seguido.';
            motivador.style.color = 'var(--gold)';
            motivador.style.borderColor = 'rgba(234,179,8,0.3)';
            motivador.style.background = 'rgba(234,179,8,0.08)';
        } else {
            motivador.textContent = 'Mes desafiante. Analiza qué plataformas te rinden más y replantea horarios.';
            motivador.style.color = '#f87171';
            motivador.style.borderColor = 'rgba(239,68,68,0.3)';
            motivador.style.background = 'rgba(239,68,68,0.08)';
        }
    },

    renderEarningsChart(data) {
        const ctx = document.getElementById('gananciasChart');
        if (!ctx) return;
        
        if (gananciasChartInstance) {
            gananciasChartInstance.destroy();
        }

        // Preparar data cronológica (de más antiguo a más reciente)
        const sorted = [...data].sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
        const labels = sorted.map(d => {
            const dt = new Date(d.fecha);
            return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        });
        const values = sorted.map(d => d.ganancia || 0);

        const sum = values.reduce((a,b) => a+b, 0);
        const avg = values.length > 0 ? (sum/values.length) : 0;
        const maxVal = Math.max(...values, 100);

        const chartColors = values.map(v => v === Math.max(...values) ? '#10B981' : 'rgba(16, 185, 129, 0.3)');

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
    },

    renderPaymentSplitChart(data) {
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

        // Render legends
        document.getElementById('stPaymentSplitLegend').innerHTML = `
            <div class="ps-legend-item">
                <div class="ps-title"><div class="ps-dot" style="background:#10B981;"></div> Efectivo</div>
                <div class="ps-amount">${formatCurrency(efe)}</div>
                <div class="ps-pct">${pEfe}%</div>
            </div>
            <div class="ps-legend-item">
                <div class="ps-title"><div class="ps-dot" style="background:#3B82F6;"></div> Digital</div>
                <div class="ps-amount">${formatCurrency(dig)}</div>
                <div class="ps-pct">${pDig}%</div>
            </div>
        `;

        const ctx = document.getElementById('metodosPagoChart');
        if (!ctx) return;
        
        if (mediosPagoChartInstance) {
            mediosPagoChartInstance.destroy();
        }

        if (window.Chart) {
            mediosPagoChartInstance = new window.Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Efectivo', 'Digital'],
                    datasets: [{
                        data: [efe, dig],
                        backgroundColor: ['#10B981', '#3B82F6'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: { label: (ctx) => formatCurrency(ctx.raw) }
                        }
                    }
                }
            });
        }
    }
};
