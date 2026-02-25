/**
 * ui.js — Funciones de actualización de la interfaz
 * RutaApp 2027
 * @author Libardo Lopez
 */

/** Actualiza el texto de la fecha en el header. */
function updateDate() {
    const now = new Date();
    elements.currentDate.textContent = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/** Orquesta todas las actualizaciones de UI en cascada. */
function updateUI() {
    renderPlatformButtons();
    updateMetaProgress();
    updateConsolidados();
    updateGananciasEfectivoDigital();
    updateSummary();
    updateCarrerasList();
    updateFinalSummary();
}

/**
 * Genera los botones de plataforma de forma dinámica a partir de
 * appState.settings.plataformas, respetando el seleccionado actual.
 */
function renderPlatformButtons() {
    const container = elements.platformButtonsContainer;
    if (!container) return;

    container.innerHTML = '';
    const plataformas = appState.settings.plataformas || [];

    plataformas.forEach(plat => {
        const btn = document.createElement('button');
        btn.className = `platform-btn ${plat.id}`;
        btn.dataset.platform = plat.id;
        btn.textContent = plat.name || plat.id.toUpperCase();
        btn.style.backgroundColor = plat.color;
        btn.style.color = '#ffffff';

        // Glow de color según la plataforma
        btn.style.boxShadow = `0 3px 10px ${plat.color}66`;



        // Restaurar selected si aplica
        if (appState.selectedPlatform === plat.id) {
            btn.classList.add('selected');
            btn.style.boxShadow = `0 6px 20px ${plat.color}99, 0 0 0 3px ${plat.color}44`;
        }

        btn.addEventListener('click', () => selectPlatform(plat.id));
        container.appendChild(btn);
    });
}



/** Actualiza la barra de progreso y el estado de la meta en el header. */
function updateMetaProgress() {
    const totalCarrerasNeto = appState.carreras.reduce((sum, c) => sum + c.neto, 0);
    const totalGastos = appState.gastos.reduce((sum, g) => sum + g.monto, 0);
    const totalNeto = totalCarrerasNeto - totalGastos;

    const meta = appState.settings.meta;
    const porcentaje = Math.round((totalNeto / meta) * 100);
    const falta = Math.max(0, meta - totalNeto);
    const excedente = Math.max(0, totalNeto - meta);

    elements.alcanzadoDisplay.textContent = formatCurrency(totalNeto);
    elements.porcentajeDisplay.textContent = Math.min(100, porcentaje);
    elements.progressFillMeta.style.width = `${Math.min(100, porcentaje)}%`;

    // Resetear clase de color
    elements.progressFillMeta.className = 'progress-fill-meta';

    // Badge de "Faltan" destacado
    const faltaBadge = document.getElementById('faltaBadge');
    const faltaBadgeValor = document.getElementById('faltaBadgeValor');

    if (porcentaje >= 100) {
        elements.progressFillMeta.classList.add('exceeded');
        elements.excedenteDisplay.style.display = 'block';
        elements.excedenteValor.textContent = formatCurrency(excedente);
        // Ocultar badge "Faltan" cuando meta está cumplida
        if (faltaBadge) faltaBadge.style.display = 'none';
    } else {
        elements.excedenteDisplay.style.display = 'none';

        if (porcentaje >= 91) elements.progressFillMeta.classList.add('high');
        else if (porcentaje >= 61) elements.progressFillMeta.classList.add('medium');
        else if (porcentaje >= 31) elements.progressFillMeta.classList.add('medium-low');
        else elements.progressFillMeta.classList.add('low');


        // Actualizar badge prominente
        if (faltaBadge) faltaBadge.style.display = 'inline-block';
        if (faltaBadgeValor) faltaBadgeValor.textContent = formatCurrency(falta);
    }
}


/** Actualiza el consolidado Total Neto. */
function updateConsolidados() {
    const totalCarreras = appState.carreras.reduce((sum, c) => sum + c.neto, 0);
    const totalGastos = appState.gastos.reduce((sum, g) => sum + g.monto, 0);
    const totalNeto = totalCarreras - totalGastos;

    document.getElementById('consolidadoNeto').textContent = formatCurrency(totalNeto);
    document.getElementById('consolidadoNeto').style.color = totalNeto < 0 ? '#e74c3c' : '#2e7d32';
}

/** Actualiza Ganancia Efectivo y Ganancia Digital + bloque de saldo disponible. */
function updateGananciasEfectivoDigital() {
    let efectivoGanado = 0;
    let digitalNeto = 0;

    appState.carreras.forEach(carrera => {
        if (carrera.payment === 'efectivo') {
            efectivoGanado += carrera.neto;
        } else {
            digitalNeto += carrera.neto;
        }
    });

    const totalGastos = appState.gastos.reduce((sum, g) => sum + g.monto, 0);
    const efectivoReal = efectivoGanado - totalGastos;

    elements.gananciaEfectivo.textContent = formatCurrency(efectivoReal);
    elements.gananciaDigital.textContent = formatCurrency(digitalNeto);
    elements.gananciaEfectivo.style.color = efectivoReal < 0 ? '#e74c3c' : '#134e5e';

    // Bloque de saldo de efectivo disponible (lo crea si no existe)
    let saldoElement = document.getElementById('saldoEfectivoDisponible');
    if (!saldoElement) {
        saldoElement = document.createElement('div');
        saldoElement.id = 'saldoEfectivoDisponible';
        saldoElement.style.cssText = `
            margin-top: 8px;
            padding: 10px;
            background: #ffffff;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            border: 2px solid #134e5e;
        `;
        const consolidadoNeto = document.getElementById('consolidadoNeto').parentElement;
        consolidadoNeto.insertAdjacentElement('afterend', saldoElement);
    }

    saldoElement.innerHTML = `
        💰 Efectivo disponible después de gastos:
        <span style="color: ${efectivoReal < 0 ? '#e74c3c' : '#2e7d32'};">
            ${formatCurrency(efectivoReal)}
        </span>
    `;
}

/** Actualiza la sección de resumen del día (bruto, falta meta, barra, stats). */
function updateSummary() {
    const totalBruto = appState.carreras.reduce((sum, c) => sum + c.amount, 0);
    const totalNeto = appState.carreras.reduce((sum, c) => sum + c.neto, 0);
    const totalCarreras = appState.carreras.length;
    const faltaMeta = Math.max(0, appState.settings.meta - totalNeto);
    const progressPercent = Math.min(100, (totalNeto / appState.settings.meta) * 100);

    elements.carrerasCount.textContent = `${totalCarreras} carrera${totalCarreras !== 1 ? 's' : ''}`;
    elements.totalBruto.textContent = formatCurrency(totalBruto);
    elements.progressFill.style.width = `${progressPercent}%`;


    updatePlataformasStats();
}

/** Genera la tabla de estadísticas por plataforma. */
function updatePlataformasStats() {
    const stats = {};
    appState.carreras.forEach(carrera => {
        if (!stats[carrera.platform]) {
            stats[carrera.platform] = { count: 0, total: 0 };
        }
        stats[carrera.platform].count++;
        stats[carrera.platform].total += carrera.neto;
    });

    let html = '';
    Object.entries(stats).forEach(([platform, data]) => {
        const color = getPlatformColor(platform);
        html += `
            <div class="plataforma-stat">
                <div class="plataforma-info">
                    <span class="plataforma-badge" style="background: ${color}">${platform.toUpperCase()}</span>
                    <span>${data.count} carreras</span>
                </div>
                <span>${formatCurrency(data.total)}</span>
            </div>
        `;
    });

    elements.plataformasStats.innerHTML = html;
}

/** Renderiza la lista de carreras en orden inverso (más reciente primero). */
function updateCarrerasList() {
    let html = '';
    appState.carreras.slice().reverse().forEach(carrera => {
        const platformColor = getPlatformColor(carrera.platform);
        let timestamp = carrera.timestamp;
        if (typeof timestamp === 'string') timestamp = new Date(timestamp);

        const timeString = timestamp instanceof Date && !isNaN(timestamp)
            ? timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            : 'N/A';

        html += `
            <div class="carrera-item">
                <div class="carrera-info">
                    <span class="carrera-platform" style="background: ${platformColor}">${carrera.platform.toUpperCase()}</span>
                    <span class="carrera-payment">${carrera.payment.toUpperCase()}</span>
                    <span>${timeString}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: bold;">${formatCurrency(carrera.amount)}</span>
                    <button class="delete-btn" onclick="deleteCarrera(${carrera.id})">×</button>
                </div>
            </div>
        `;
    });
    elements.carrerasList.innerHTML = html;
}

/** Actualiza el panel de resumen financiero en la sección de controles finales. */
function updateFinalSummary() {
    const totalBruto = appState.carreras.reduce((sum, c) => sum + c.amount, 0);
    const totalNeto = appState.carreras.reduce((sum, c) => sum + c.neto, 0)
        - appState.gastos.reduce((sum, g) => sum + g.monto, 0);
    const adicionales = Math.max(0, totalNeto - appState.settings.meta);

    document.getElementById('finalBruto').textContent = formatCurrency(totalBruto);
    document.getElementById('finalMeta').textContent = formatCurrency(totalNeto);
    document.getElementById('finalAdicionales').textContent = formatCurrency(adicionales);
    document.getElementById('finalAdicionales').style.color = adicionales > 0 ? '#4CAF50' : '#666';
}
