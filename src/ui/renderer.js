import { formatCurrency, normalizePlatform } from '../utils/format.js';
import { updateGreeting } from '../utils/greeting.js';
const elements = {
    currentDate: document.getElementById('currentDate'),
    metaDisplay: document.getElementById('metaDisplay'),
    porcentajeDisplay: document.getElementById('porcentajeDisplay'),
    remainingDisplay: document.getElementById('remainingDisplay'),
    progressCircleMeta: document.getElementById('progressCircleMeta'),
    gananciaEfectivo: document.getElementById('gananciaEfectivo'),
    gananciaDigital: document.getElementById('gananciaDigital'),
    jmGananciaEfectivo: document.getElementById('jmGananciaEfectivo'),
    jmGananciaDigital: document.getElementById('jmGananciaDigital'),
    consolidadoNeto: document.getElementById('consolidadoNeto'),
    // New UI elements
    statRides: null,
    statTime: null,
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
        updateGreeting(state);
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
        const plataformas = state.settings.plataformas || [];
        plataformas.forEach((plat, index) => {
            const btn = document.createElement('div');
            btn.className = `p-chip ${state.selectedPlatform === plat.id ? 'active' : ''}`;
            btn.dataset.platform = plat.id;
            btn.innerHTML = `<span>${plat.name}</span>`;

            // Si es el ltimo item y el total es impar, ocupa 2 columnas
            if (index === plataformas.length - 1 && plataformas.length % 2 !== 0) {
                btn.style.gridColumn = 'span 2';
            }

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
                btn.style.background = 'var(--surface-glass)';
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

        // New layout: "/ $Xk meta"
        if (elements.heroMetaLabel) {
            elements.heroMetaLabel.textContent = `/ $${(meta / 1000).toFixed(0)}k meta`;
        }

        if (elements.consolidadoNeto) {
            elements.consolidadoNeto.textContent = formatCurrency(totalNeto);
        }

        if (elements.porcentajeDisplay) {
            elements.porcentajeDisplay.textContent = `${porcentaje}%`;
        }

        // Motivational row (Premium Overhaul)
        if (elements.remainingDisplay) {
            const metaStatRides = document.getElementById('metaStatRides');
            const metaStatTime = document.getElementById('metaStatTime');
            const pillTiempoStatus = document.getElementById('pillTiempoStatus');
            const motivIconSvg = document.getElementById('heroMotivIconSvg');
            const motivIconContainer = document.getElementById('heroMotivIconContainer');

            // 1. Update Badge Values
            if (metaStatRides) metaStatRides.textContent = state.carreras.length;
            if (metaStatTime) {
                if (state.jornadaInicio) {
                    const mins = Math.floor((Date.now() - new Date(state.jornadaInicio).getTime()) / 60000);
                    const h = Math.floor(mins / 60), m = mins % 60;
                    metaStatTime.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
                } else {
                    metaStatTime.textContent = '0h';
                }
            }

            // 2. Status Dot Logic
            const pillTiempoDefault = document.getElementById('pillTiempoDefault');
            if (pillTiempoStatus && pillTiempoDefault) {
                if (state.jornadaIniciada) {
                    pillTiempoStatus.style.display = 'flex';
                    pillTiempoDefault.style.display = 'none';
                } else {
                    pillTiempoStatus.style.display = 'none';
                    pillTiempoDefault.style.display = 'block';
                }
            }

            // 3. Motivational Message Logic
            if (porcentaje >= 100) {
                elements.remainingDisplay.textContent = '¡Meta lograda!';
                elements.remainingDisplay.style.color = 'var(--gold)';
                elements.remainingDisplay.style.fontSize = '12px';
                elements.remainingDisplay.style.fontWeight = '700';
                if (motivIconContainer) {
                    motivIconContainer.className = 'icon-box small gold';
                    motivIconContainer.style.color = 'var(--gold)';
                }
                if (motivIconSvg) motivIconSvg.innerHTML = '<path d="m20 8-8 5-8-5V6l8 5 8-5v2Z"/><path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z"/><path d="M12 10v10"/><path d="m16 14-4 4-4-4"/>'; // Confetti/Party icon
            } else {
                if (motivIconContainer) {
                    motivIconContainer.className = 'icon-box small';
                    motivIconContainer.style.color = 'var(--emerald)';
                }
                if (motivIconSvg) motivIconSvg.innerHTML = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'; // Reloj icon
                
                elements.remainingDisplay.style.fontSize = '10px';
                elements.remainingDisplay.style.fontWeight = '600';
                elements.remainingDisplay.style.letterSpacing = '0.3px';
                elements.remainingDisplay.style.color = 'var(--text-secondary)';

                const diffMs = state.jornadaInicio ? Date.now() - new Date(state.jornadaInicio).getTime() : 0;
                const hours = diffMs / 3600000;
                if (hours > 0.05 && totalNeto > 0) {
                    const perHour = totalNeto / hours;
                    elements.remainingDisplay.textContent = `$${(perHour / 1000).toFixed(1)}k/h · ~${Math.max(0, remaining/1000).toFixed(0)}k resta`;
                } else {
                    elements.remainingDisplay.textContent = `Calculando... · ~${Math.max(0, remaining/1000).toFixed(0)}k resta`;
                }
            }
        }

        // Dynamic badge update (Top used platform)
        const badgeIcon = document.getElementById('heroProgressBadgeIcon');
        const badgeLabel = document.getElementById('heroProgressBadgeLabel');
        const badge = document.getElementById('heroProgressBadge');
        if (badge && badgeIcon && badgeLabel) {
            const stats = {};
            state.carreras.forEach(c => {
                if (!stats[c.platform]) stats[c.platform] = 0;
                stats[c.platform]++;
            });
            const topPlat = Object.entries(stats).sort((a,b) => b[1] - a[1])[0];

            if (porcentaje >= 100) {
                badgeIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
                badgeLabel.textContent = '¡META!';
                badge.style.background = 'var(--gold-glow)';
                badge.style.borderColor = 'var(--gold-glow)';
                badgeLabel.style.color = 'var(--gold)';
            } else if (state.carreras.length === 0) {
                badgeIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
                badgeLabel.textContent = 'INICIO';
                badge.style.background = 'var(--indigo-glow)';
                badge.style.borderColor = 'var(--indigo-glow)';
                badgeLabel.style.color = '#818cf8';
            } else if (topPlat) {
                const norm = normalizePlatform(topPlat[0], state.settings.plataformas);
                badgeIcon.innerHTML = `<div style="width:6px; height:6px; border-radius:50%; background:${norm.color}; box-shadow:0 0 8px ${norm.color};"></div>`;
                badgeLabel.textContent = `${norm.name.toUpperCase()} Lidera`;
                badge.style.background = `rgba(255,255,255,0.05)`;
                badge.style.borderColor = `${norm.color}40`;
                badgeLabel.style.color = 'var(--text-primary)';
            }
        }

        if (elements.progressCircleMeta) {
            const arcLength = 461.81;
            const cappedPercent = Math.min(100, Math.max(0, porcentaje));
            elements.progressCircleMeta.style.strokeDashoffset = arcLength - (cappedPercent / 100) * arcLength;

            if (porcentaje >= 100) {
                elements.progressCircleMeta.style.filter = 'drop-shadow(0 0 14px var(--gold-glow))';
                elements.progressCircleMeta.style.stroke = 'var(--gold)';
            } else if (porcentaje < 40) {
                elements.progressCircleMeta.style.filter = 'drop-shadow(0 0 10px var(--ruby-glow))';
                elements.progressCircleMeta.style.stroke = 'var(--ruby)';
            } else if (porcentaje < 75) {
                elements.progressCircleMeta.style.filter = 'drop-shadow(0 0 10px var(--gold-glow))';
                elements.progressCircleMeta.style.stroke = 'var(--gold)';
            } else {
                elements.progressCircleMeta.style.filter = 'drop-shadow(0 0 10px var(--emerald-glow))';
                elements.progressCircleMeta.style.stroke = 'var(--emerald)';
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

        const formatCompact = (val) => {
            if (val === 0) return '$0';
            const k = val / 1000;
            return `$${k.toFixed(1)}k`;
        };

        if (elements.gananciaEfectivo) elements.gananciaEfectivo.textContent = formatCompact(efectivoReal);
        if (elements.gananciaDigital) elements.gananciaDigital.textContent = formatCompact(digitalNeto);
        if (elements.jmGananciaEfectivo) elements.jmGananciaEfectivo.textContent = formatCompact(efectivoReal);
        if (elements.jmGananciaDigital) elements.jmGananciaDigital.textContent = formatCompact(digitalNeto);
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

        const amountValue = elements.amountInput ? parseFloat(elements.amountInput.value.replace(/\D/g, '')) : 0;
        let canAdd = false;
        let label = 'REGISTRAR';

        if (!amountValue || amountValue <= 0) {
            label = 'INDIQUE VALOR';
        } else if (!state.selectedPlatform) {
            label = 'ELIJA PLATAFORMA';
        } else if (!state.selectedPayment) {
            label = 'ELIJA PAGO';
        } else {
            canAdd = true;
        }

        elements.addCarrera.disabled = !canAdd;
        elements.addCarrera.textContent = label;
    }
};