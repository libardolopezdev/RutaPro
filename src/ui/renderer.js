import { formatCurrency, normalizePlatform, renderAvatarPlataforma, getColorOficial, normalizarNombre, getColorPlataforma, escapeHTML } from '../utils/format.js';
import { updateGreeting } from '../utils/greeting.js';

/**
 * Prioridad de color para barras y porcentajes:
 * 1. Color personalizado del usuario (si la plataforma está activa y tiene un color no genérico)
 * 2. Color oficial del catálogo (fallback para plataformas sin color personalizado)
 * 3. Fallback gris neutro
 */
function getColorBarra(norm, settingsPlatforms = []) {
    // 1. Color del usuario — tiene prioridad máxima si existe y no es el genérico
    const activa = settingsPlatforms.find(p =>
        p.id === norm.id ||
        normalizarNombre(p.name) === normalizarNombre(norm.name)
    );
    if (activa?.color && activa.color !== '#00E676' && activa.color !== '#6B7280' && activa.color !== '#6b7280') {
        return activa.color;
    }

    // 2. Color oficial del catálogo
    const oficial = getColorOficial(norm.name);
    if (oficial) return oficial;

    // 3. Fallback
    if (norm.color && norm.color !== '#6B7280' && norm.color !== '#6b7280') return norm.color;
    return '#6B7280';
}
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
    goalProgressBar: document.getElementById('goalProgressBar'),
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
    plataformasStats: document.getElementById('homePlataformasStats'),
    carrerasList: document.getElementById('carrerasList'),
    listaGastos: document.getElementById('listaGastos'),
    totalGastos: document.getElementById('totalGastos')
};

export const renderer = {
    render(state) {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            if (state.isSyncing) {
                appContainer.classList.add('app-syncing');
            } else {
                appContainer.classList.remove('app-syncing');
            }
        }
        this.updateDate();
        this.updateUserHeader(state);
        this.updateMetaProgress(state);
        this.updateConsolidados(state);
        this.updateStatsRow(state);
        this.updateActionButtons(state);
        this.updateSummary(state);
        this.updateCarrerasList(state);
        this.updateGastosList(state);
        this.updateRenderPlatformButtons(state);
        updateGreeting(state);
    },

    updateDate() {
        const now = new Date();
        if (elements.currentDate) {
            const options = { weekday: 'long', day: 'numeric', month: 'long' };
            elements.currentDate.textContent = now.toLocaleDateString('es-ES', options);
        }
    },

    updateUserHeader(state) {
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatarLetter');
        if (!userNameEl || !userAvatarEl) return;

        let name = 'Usuario';
        if (state.user && state.user.displayName) {
            name = state.user.displayName.trim().split(' ')[0] || 'Usuario';
        } else if (state.user && state.user.email) {
            name = state.user.email.split('@')[0];
        }

        userNameEl.textContent = name;
        userAvatarEl.textContent = name.charAt(0).toUpperCase();
    },

    updateActionButtons(state) {
        const noJ = elements.actNoJornada;
        const yesJ = elements.actJornada;
        if (!noJ || !yesJ) return;

        if (state.jornadaIniciada) {
            noJ.style.display = 'none';
            yesJ.style.display = 'contents';
        } else {
            noJ.style.display = 'contents';
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

    updateRenderPlatformButtons(state) {
        const container = elements.platformButtonsContainer;
        if (!container) return;
        
        // Skip rebuilding if they already exist, to preserve inline styles from carrerasModule
        if (container.children.length > 0) return;
        
        container.innerHTML = '';
        const plataformas = state.settings.plataformas || [];
        
        plataformas.forEach((plat, index) => {
            const btn = document.createElement('div');
            btn.className = 'p-chip';
            btn.dataset.platform = plat.id;
            btn.innerHTML = `<span>${escapeHTML(plat.name)}</span>`;

            if (index === plataformas.length - 1 && plataformas.length % 2 !== 0) {
                btn.style.gridColumn = 'span 2';
            }

            btn.style.borderColor = 'var(--border-glass)';
            btn.style.color = 'var(--text-secondary)';
            btn.style.background = 'var(--surface-glass)';
            
            container.appendChild(btn);
        });
    },

    updatePaymentButtons(state) {
        // Obsoleto: La responsabilidad visual de los pagos ahora reside en carrerasModule.js
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

        const progressBar = document.getElementById('goalProgressBar');
        if (progressBar) {
            const cappedPercent = Math.min(100, Math.max(0, porcentaje));
            progressBar.style.width = `${cappedPercent}%`;

            // Clases para el modo claro premium
            progressBar.className = 'barra-progreso';
            if (porcentaje >= 80) progressBar.classList.add('alta');

            if (porcentaje > 100) {
                progressBar.style.background = 'var(--gold)';
                progressBar.style.boxShadow = '0 0 14px var(--gold-glow)';
            } else if (porcentaje === 100) {
                progressBar.style.background = 'var(--emerald)';
                progressBar.style.boxShadow = '0 0 16px var(--emerald-glow)';
            } else if (porcentaje >= 75) {
                progressBar.style.background = '#34d399'; // Verde claro acercándose
                progressBar.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.4)';
            } else if (porcentaje >= 40) {
                progressBar.style.background = 'var(--cyan)';
                progressBar.style.boxShadow = '0 0 10px var(--cyan-glow)';
            } else {
                progressBar.style.background = 'var(--ruby)';
                progressBar.style.boxShadow = '0 0 10px var(--ruby-glow)';
            }
        }

        if (elements.porcentajeDisplay) {
            elements.porcentajeDisplay.textContent = `${porcentaje}% de ${formatCurrency(meta)}`;
            elements.porcentajeDisplay.style.fontSize = '14px';
            elements.porcentajeDisplay.style.fontWeight = '800';
            elements.porcentajeDisplay.style.color = 'var(--text-primary)';
            elements.porcentajeDisplay.style.textTransform = 'none';
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
            const excedenteDom = document.getElementById('excedenteRow');

            if (porcentaje >= 100) {
                elements.remainingDisplay.textContent = '¡Meta superada! 🏆';
                elements.remainingDisplay.style.color = 'var(--gold)';
                elements.remainingDisplay.style.fontSize = '14px';
                elements.remainingDisplay.style.fontWeight = '800';
                elements.remainingDisplay.style.letterSpacing = 'normal';

                if (excedenteDom) {
                    const excedente = totalNeto - meta;
                    if (excedente > 0) {
                        excedenteDom.style.display = 'flex';
                        excedenteDom.innerHTML = `
                            <span class="label-excedente">EXCEDENTE</span>
                            <span class="valor-excedente">+ ${formatCurrency(excedente)}</span>
                        `;
                    } else {
                        excedenteDom.style.display = 'none';
                    }
                }
                
                if (motivIconContainer) {
                    motivIconContainer.className = 'icon-box small gold';
                    motivIconContainer.style.color = 'var(--gold)';
                }
                if (motivIconSvg) motivIconSvg.innerHTML = '<path d="m20 8-8 5-8-5V6l8 5 8-5v2Z"/><path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z"/><path d="M12 10v10"/><path d="m16 14-4 4-4-4"/>'; // Confetti/Party icon
            } else {
                if (excedenteDom) {
                    excedenteDom.style.display = 'none';
                }

                if (motivIconContainer) {
                    motivIconContainer.className = 'icon-box small';
                    motivIconContainer.style.color = 'var(--emerald)';
                }
                if (motivIconSvg) motivIconSvg.innerHTML = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'; // Reloj icon
                
                elements.remainingDisplay.style.fontSize = '14px';
                elements.remainingDisplay.style.fontWeight = '700';
                elements.remainingDisplay.style.letterSpacing = 'normal';
                elements.remainingDisplay.style.color = 'var(--text-primary)';
                elements.remainingDisplay.style.textTransform = 'none';
                elements.remainingDisplay.textContent = `Faltan ${formatCurrency(remaining)}`;
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

    async updateSummary(state) {
        if (!elements.plataformasStats) return;
        const stats = {};
        let totalGeneral = 0;
        state.carreras.forEach(c => {
            const norm = normalizePlatform(c.platform, state.settings.plataformas);
            const key = norm.name.toUpperCase();
            if (!stats[key]) stats[key] = { count: 0, total: 0, norm: norm };
            stats[key].count++;
            stats[key].total += c.amount;
            totalGeneral += c.amount;
        });

        // Ordenar por total descendente
        const sorted = Object.values(stats).sort((a, b) => b.total - a.total);

        // Detectar tema activo para decisiones de contraste
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const trackBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

        const rowsHtml = await Promise.all(sorted.map(async (data) => {
            const norm = data.norm;
            const statusLabel = norm.isActiva ? '' : '<span class="plat-not-active">• No activa</span>';
            const pct = totalGeneral > 0 ? Math.round((data.total / totalGeneral) * 100) : 0;
            const avatarHtml = await renderAvatarPlataforma(norm);
            const colorBarra = getColorBarra(norm, state.settings.plataformas);
            const colorSeguro = getColorPlataforma(norm.name, colorBarra);

            return `
                <div class="platform-stat-row">
                    ${avatarHtml}
                    <div class="platform-stat-content">
                        <div class="platform-stat-header">
                            <span class="platform-stat-name">${escapeHTML(norm.name)}${statusLabel}</span>
                            <span class="platform-stat-val">${formatCurrency(data.total)}</span>
                        </div>
                        <div class="platform-stat-track" style="background: ${trackBg};">
                            <div style="background: ${colorSeguro}; height: 100%; border-radius: 8px; width: ${pct}%; box-shadow: 0 0 8px ${colorSeguro}60; transition: width 1s var(--ease);"></div>
                        </div>
                    </div>
                    <div class="platform-stat-pct" style="color: ${colorSeguro};">
                        ${pct}%
                    </div>
                </div>
            `;
        }));
        elements.plataformasStats.innerHTML = rowsHtml.join('') || '<div style="text-align:center; color:var(--text-muted); font-size:12px;">Sin datos aún</div>';
    },

    async updateCarrerasList(state) {
        if (!elements.carrerasList) return;
        const ridesHtml = await Promise.all(state.carreras.slice(-5).reverse().map(async c => {
            const norm = normalizePlatform(c.platform, state.settings.plataformas);
            const avatarHtml = await renderAvatarPlataforma(norm);

            return `
                <div class="ride-item" style="display:flex; align-items:center; gap:12px;">
                    ${avatarHtml}
                    <div class="ride-meta" style="flex:1;">
                        <span class="ride-plat" style="color:${norm.color}">${escapeHTML(norm.name)}</span>
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
        }));
        elements.carrerasList.innerHTML = ridesHtml.join('') || '<div style="text-align:center; color:var(--text-muted); font-size:12px;">Añade tu primera carrera</div>';

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
                    <span style="text-transform:capitalize; font-weight:700;">${escapeHTML(g.tipo)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-family:'JetBrains Mono'; font-weight:600; color:var(--ruby);">${formatCurrency(g.monto)}</span>
                    <button class="delete-gasto-btn" data-id="${g.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">✕</button>
                </div>
            </div>
        `).join('');
    },

    updateAddButton(state) {
        // Obsoleto: La responsabilidad visual del botón Add reside ahora en carrerasModule.js
    }
};