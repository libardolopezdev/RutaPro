import { formatCurrency, normalizePlatform } from '../utils/format.js';

const elements = {
    currentDate: document.getElementById('currentDate'),
    metaDisplay: document.getElementById('metaDisplay'),
    porcentajeDisplay: document.getElementById('porcentajeDisplay'),
    remainingDisplay: document.getElementById('remainingDisplay'),
    progressCircleMeta: document.getElementById('progressCircleMeta'),
    gananciaEfectivo: document.getElementById('gananciaEfectivo'),
    gananciaDigital: document.getElementById('gananciaDigital'),
    consolidadoNeto: document.getElementById('consolidadoNeto'),
    // New UI elements
    statRides: document.getElementById('statRides'),
    statTime: document.getElementById('statTime'),
    statPromedio: document.getElementById('statPromedio'),
    heroMetaLabel: document.getElementById('heroMetaLabel'),
    streakText: document.getElementById('streakText'),
    actNoJornada: document.getElementById('actNoJornada'),
    actJornada: document.getElementById('actJornada'),
    jornadaBtn: document.getElementById('jornadaBtn'),
    // Legacy refs (still used by some modules)
    appContent: document.getElementById('appContent'),
    platformButtonsContainer: document.getElementById('platformButtonsContainer'),
    paymentButtons: document.getElementById('paymentButtons'),
    amountInput: document.getElementById('amountInput'),
    addCarrera: document.getElementById('addCarrera'),
    plataformasStats: document.getElementById('plataformasStats'),
    carrerasList: document.getElementById('carrerasList'),
    listaGastos: document.getElementById('listaGastos'),
    totalGastos: document.getElementById('totalGastos')
};

export const renderer = {
    render(state) {
        this.updateDate();
        this.updateMetaProgress(state);
        this.updateConsolidados(state);
        this.updateStatsRow(state);
        this.updateGoalCards(state);
        this.updateActionButtons(state);
        this.updateSummary(state);
        this.updateCarrerasList(state);
        this.updateGastosList(state);
        this.updateAddButton(state);
        this.updateRenderPlatformButtons(state);
        this.updatePaymentButtons(state);
    },

    updateDate() {
        const now = new Date();
        if (elements.currentDate) {
            const options = { weekday: 'long', day: 'numeric', month: 'long' };
            elements.currentDate.textContent = now.toLocaleDateString('es-ES', options);
        }
    },

    updateActionButtons(state) {
        const noJ = elements.actNoJornada;
        const yesJ = elements.actJornada;
        if (!noJ || !yesJ) return;

        if (state.jornadaIniciada) {
            noJ.style.display = 'none';
            yesJ.style.display = 'block';
        } else {
            noJ.style.display = 'block';
            yesJ.style.display = 'none';
        }
    },

    updateStatsRow(state) {
        // Carreras del día
        if (elements.statRides) {
            elements.statRides.textContent = state.carreras.length;
        }

        // Tiempo de jornada
        if (elements.statTime && state.jornadaInicio) {
            const diffMs = Date.now() - new Date(state.jornadaInicio).getTime();
            const totalMins = Math.floor(diffMs / 60000);
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            const hSpan = '<span style="color:var(--emerald); font-size: 0.8em; margin-left: 1px;">h</span>';
            const mSpan = '<span style="color:var(--emerald); font-size: 0.8em; margin-left: 1px;">m</span>';
            elements.statTime.innerHTML = h > 0 ? `${h}${hSpan} ${m}${mSpan}` : `${m}${mSpan}`;
        } else if (elements.statTime) {
            elements.statTime.innerHTML = `0<span style="color:var(--emerald); font-size: 0.8em; margin-left: 1px;">h</span> 0<span style="color:var(--emerald); font-size: 0.8em; margin-left: 1px;">m</span>`;
        }

        // Promedio por carrera (CAMBIO 6)
        const statPromedio = document.getElementById('statPromedio');
        if (statPromedio) {
            const totalNeto = state.carreras.reduce((sum, c) => sum + (c.neto || c.amount), 0);
            const avgPerRide = state.carreras.length > 0
                ? Math.round(totalNeto / state.carreras.length)
                : 0;
            statPromedio.textContent = `$${(avgPerRide / 1000).toFixed(1)}k`;
        }
    },

    updateGoalCards(state) {
        const meta = state.settings.meta || 0;
        const neto = state.consolidadoNeto || 0;
        const restante = Math.max(0, meta - neto);
        const pct = meta > 0 ? Math.min(100, (neto / meta) * 100) : 0;

        if (elements.statGoal) {
            elements.statGoal.textContent = formatCurrency(meta);
        }
        if (elements.statRemaining) {
            elements.statRemaining.textContent = formatCurrency(restante);
            elements.statRemaining.style.color = pct >= 100 ? 'var(--emerald)' : 'var(--gold)';
        }
        if (elements.goalProgressBar) {
            elements.goalProgressBar.style.width = `${pct}%`;
            elements.goalProgressBar.style.background = pct >= 100 ? 'var(--gold)' : 'var(--emerald)';
        }
        if (elements.goalProgressPct) {
            elements.goalProgressPct.textContent = `${Math.round(pct)}%`;
        }
    },

    updateRenderPlatformButtons(state) {
        const container = elements.platformButtonsContainer;
        if (!container) return;
        container.innerHTML = '';
        (state.settings.plataformas || []).forEach(plat => {
            const btn = document.createElement('div');
            btn.className = `p-chip ${state.selectedPlatform === plat.id ? 'active' : ''}`;
            btn.dataset.platform = plat.id;
            btn.innerHTML = `<span>${plat.name}</span>`;

            const isUber = plat.id === 'uber';
            const pColor = isUber ? 'var(--uber-color)' : plat.color;
            const pGlow = isUber ? 'var(--uber-glow)' : `${plat.color}44`;
            const pBg = isUber ? 'var(--uber-bg)' : `${plat.color}22`;

            if (state.selectedPlatform === plat.id) {
                btn.style.borderColor = pColor;
                btn.style.boxShadow = `0 0 15px ${pGlow}`;
                btn.style.color = 'var(--text-primary)';
                btn.style.background = pBg;
            } else {
                btn.style.borderColor = 'var(--border-glass)';
                btn.style.color = 'var(--text-secondary)';
            }
            container.appendChild(btn);
        });
    },

    updatePaymentButtons(state) {
        if (!elements.paymentButtons) return;

        const paymentColors = {
            efectivo: { color: 'var(--emerald)', glow: 'var(--emerald-glow)' },
            tarjeta: { color: 'var(--blue)', glow: 'var(--blue-glow)' },
            vale: { color: 'var(--gold)', glow: 'var(--gold-glow)' },
            transferencia: { color: 'var(--cyan)', glow: 'var(--cyan-glow)' }
        };

        const buttons = elements.paymentButtons.querySelectorAll('[data-payment]');
        buttons.forEach(btn => {
            const type = btn.dataset.payment;
            const theme = paymentColors[type] || { color: 'var(--emerald)', glow: 'var(--emerald-glow)' };

            if (state.selectedPayment === type) {
                btn.classList.add('active');
                btn.style.borderColor = theme.color;
                btn.style.color = theme.color;
                btn.style.background = theme.glow;
            } else {
                btn.classList.remove('active');
                btn.style.borderColor = 'var(--border-glass)';
                btn.style.color = 'var(--text-secondary)';
                btn.style.background = 'var(--surface-glass)';
            }
        });
    },

    updateMetaProgress(state) {
        const totalCarrerasNeto = state.carreras.reduce((sum, c) => sum + (c.neto || c.amount), 0);
        const totalGastos = state.gastos.reduce((sum, g) => sum + g.monto, 0);
        const totalNeto = totalCarrerasNeto - totalGastos;
        const meta = state.settings.meta || 270000;
        const porcentaje = meta > 0 ? Math.round((totalNeto / meta) * 100) : 0;
        const remaining = meta > totalNeto ? meta - totalNeto : 0;

        if (elements.heroMetaLabel) {
            elements.heroMetaLabel.textContent = `META · $${(meta / 1000).toFixed(0)}K`;
        }

        if (elements.consolidadoNeto) {
            elements.consolidadoNeto.textContent = formatCurrency(totalNeto);
        }

        if (elements.porcentajeDisplay) {
            elements.porcentajeDisplay.textContent = `${porcentaje}%`;
        }

        if (elements.remainingDisplay) {
            elements.remainingDisplay.textContent = remaining > 0 
                ? `$${(remaining / 1000).toFixed(0)}k restante` 
                : 'Meta lograda 🎉';
        }

        if (elements.progressCircleMeta) {
            // Arc = 5/6 of circle (300°), r=88: 2π×88×(5/6) = 461.81
            // dasharray="461.81 552.92", so offset 461.81=empty, 0=full
            const arcLength = 461.81;
            const cappedPercent = Math.min(100, Math.max(0, porcentaje));
            elements.progressCircleMeta.style.strokeDashoffset = arcLength - (cappedPercent / 100) * arcLength;

            if (porcentaje >= 100) {
                elements.progressCircleMeta.style.filter = 'drop-shadow(0 0 14px var(--gold-glow))';
                elements.progressCircleMeta.style.stroke = 'var(--gold)';
            } else {
                elements.progressCircleMeta.style.filter = 'drop-shadow(0 0 10px var(--emerald-glow))';
                elements.progressCircleMeta.style.stroke = 'url(#gaugeGradient)';
            }
        }
    },

    updateConsolidados(state) {
        let efectivoGanado = 0;
        let digitalNeto = 0;
        state.carreras.forEach(c => {
            if (c.payment === 'efectivo') efectivoGanado += (c.neto || c.amount);
            else digitalNeto += (c.neto || c.amount);
        });
        const totalGastos = state.gastos.reduce((sum, g) => sum + g.monto, 0);
        const efectivoReal = efectivoGanado - totalGastos;
        const totalNeto = efectivoReal + digitalNeto;

        if (elements.gananciaEfectivo) elements.gananciaEfectivo.textContent = formatCurrency(efectivoReal);
        if (elements.gananciaDigital) elements.gananciaDigital.textContent = formatCurrency(digitalNeto);
        if (elements.consolidadoNeto) {
            elements.consolidadoNeto.textContent = formatCurrency(totalNeto);
            elements.consolidadoNeto.style.opacity = '1';
        }
    },

    updateSummary(state) {
        if (!elements.plataformasStats) return;
        const stats = {};
        state.carreras.forEach(c => {
            if (!stats[c.platform]) stats[c.platform] = { count: 0, total: 0 };
            stats[c.platform].count++;
            stats[c.platform].total += c.amount;
        });

        // Ordenar por total descendente
        const sorted = Object.entries(stats).sort(([, a], [, b]) => b.total - a.total);

        elements.plataformasStats.innerHTML = sorted.map(([platformId, data]) => {
            const norm = normalizePlatform(platformId, state.settings.plataformas);
            const statusLabel = norm.isActiva ? '' : '<span class="plat-not-active">• No activa</span>';

            return `
                <div class="platform-stat-row">
                    <div>
                        <div class="platform-stat-name" style="color:${norm.color}">
                            ${norm.name}${statusLabel}
                        </div>
                        <div class="platform-stat-count">${data.count} ${data.count === 1 ? 'carrera' : 'carreras'}</div>
                    </div>
                    <div class="platform-stat-val">${formatCurrency(data.total)}</div>
                </div>
            `;
        }).join('') || '<div style="text-align:center; color:var(--text-muted); font-size:12px;">Sin datos aún</div>';
    },

    updateCarrerasList(state) {
        if (!elements.carrerasList) return;
        elements.carrerasList.innerHTML = state.carreras.slice(-5).reverse().map(c => {
            const norm = normalizePlatform(c.platform, state.settings.plataformas);
            return `
                <div class="ride-item">
                    <div class="ride-meta">
                        <span class="ride-plat" style="color:${norm.color}">${norm.name}</span>
                        <span class="ride-time">${new Date(c.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} • ${c.payment.toUpperCase()}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span class="ride-val">${formatCurrency(c.amount)}</span>
                        <button class="delete-btn" data-id="${c.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<div style="text-align:center; color:var(--text-muted); font-size:12px;">Añade tu primera carrera</div>';

        // ✅ CORRECCIÓN: pasar state como parámetro en lugar de usar require()
        this.initSmartFAB(state);
    },

    // ✅ CORRECCIÓN: recibe state como parámetro, eliminando el require() incompatible con ES modules
    initSmartFAB(state) {
        const fab = document.getElementById('fabNewRace');
        const target = document.querySelector('#registrarCarreraCard');

        if (!fab || !target) return;

        // Si NO hay jornada iniciada, el FAB es para INICIAR y debe ser siempre visible
        if (!state.jornadaIniciada) {
            fab.classList.add('visible');
            if (this.fabObserver) {
                this.fabObserver.disconnect();
                this.fabObserver = null;
            }
            return;
        }

        // Si HAY jornada, usar Observer para ocultarlo cuando el form es visible
        if (this.fabObserver) return;

        this.fabObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    fab.classList.remove('visible');
                } else {
                    fab.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        this.fabObserver.observe(target);
    },

    updateGastosList(state) {
        if (!elements.listaGastos) return;
        const total = state.gastos.reduce((sum, g) => sum + g.monto, 0);
        if (elements.totalGastos) elements.totalGastos.textContent = formatCurrency(total);

        elements.listaGastos.innerHTML = state.gastos.map(g => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                <div style="font-size:12px;">
                    <span style="text-transform:capitalize; font-weight:700;">${g.tipo}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-family:'JetBrains Mono'; font-weight:600; color:var(--ruby);">${formatCurrency(g.monto)}</span>
                    <button class="delete-gasto-btn" data-id="${g.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">✕</button>
                </div>
            </div>
        `).join('');
    },

    updateAddButton(state) {
        if (!elements.addCarrera) return;

        let canAdd = false;
        let label = 'REGISTRAR';

        if (!state.selectedPlatform && !state.selectedPayment) {
            label = 'ELIGE PLATAFORMA';
        } else if (state.selectedPlatform && !state.selectedPayment) {
            label = 'ELIGE PAGO';
        } else if (!state.selectedPlatform && state.selectedPayment) {
            label = 'ELIGE PLATAFORMA';
        } else {
            canAdd = true;
        }

        elements.addCarrera.disabled = !canAdd;
        elements.addCarrera.textContent = label;
    }
};