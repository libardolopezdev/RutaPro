/**
 * historico.js — Vista y filtros del histórico de jornadas
 * RutaApp 2027
 */

/** Abre la vista del histórico y oculta el contenido principal. */
function openHistorico() {
    elements.appContent.style.display = 'none';
    document.getElementById('historicoSection').style.display = 'block';
    loadHistorico();
}

/** Cierra la vista del histórico y restaura el contenido principal. */
function closeHistorico() {
    elements.appContent.style.display = 'block';
    document.getElementById('historicoSection').style.display = 'none';
}

/**
 * Aplica un filtro de período al histórico.
 * @param {'dia'|'semana'|'mes'|'ano'|'rango'} filter
 */
function filterHistorico(filter) {
    historicoFilter = filter;

    document.querySelectorAll('.historico-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

    const rangoFechas = document.getElementById('rangoFechas');
    if (filter === 'rango') {
        rangoFechas.style.display = 'block';
        const hoy = new Date();
        const haceUnMes = new Date();
        haceUnMes.setMonth(hoy.getMonth() - 1);
        document.getElementById('fechaHasta').valueAsDate = hoy;
        document.getElementById('fechaDesde').valueAsDate = haceUnMes;
    } else {
        rangoFechas.style.display = 'none';
        loadHistorico();
    }
}

/** Filtra y renderiza los datos del histórico según el filtro activo. */
function loadHistorico() {
    const content = document.getElementById('historicoContent');
    const resumenDiv = document.getElementById('historicoResumen');
    const resumenStats = document.getElementById('historicoResumenStats');
    const now = new Date();
    let filteredData = [];

    switch (historicoFilter) {
        case 'dia':
            filteredData = historicoData.filter(item =>
                new Date(item.fecha).toDateString() === now.toDateString()
            );
            break;

        case 'semana':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            filteredData = historicoData.filter(item => {
                const d = new Date(item.fecha);
                return d >= weekStart && d <= now;
            });
            break;

        case 'mes':
            filteredData = historicoData.filter(item => {
                const d = new Date(item.fecha);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            break;

        case 'ano':
            filteredData = historicoData.filter(item =>
                new Date(item.fecha).getFullYear() === now.getFullYear()
            );
            break;

        case 'rango':
            const desde = new Date(document.getElementById('fechaDesde').value);
            const hasta = new Date(document.getElementById('fechaHasta').value);
            hasta.setHours(23, 59, 59);
            filteredData = historicoData.filter(item => {
                const d = new Date(item.fecha);
                return d >= desde && d <= hasta;
            });
            break;
    }

    // Calcular resumen del período
    const totalJornadas = filteredData.length;
    const totalCarreras = filteredData.reduce((sum, item) => sum + item.totalCarreras, 0);
    const totalBruto = filteredData.reduce((sum, item) => sum + item.totalBruto, 0);
    const totalGanancia = filteredData.reduce((sum, item) => sum + item.ganancia, 0);
    const promedioGanancia = totalJornadas > 0 ? totalGanancia / totalJornadas : 0;

    resumenStats.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <div><strong>Jornadas:</strong> ${totalJornadas}</div>
            <div><strong>Carreras:</strong> ${totalCarreras}</div>
            <div><strong>Total Bruto:</strong> ${formatCurrency(totalBruto)}</div>
            <div><strong>Total Ganancia:</strong> ${formatCurrency(totalGanancia)}</div>
            <div style="grid-column: 1 / -1;"><strong>Promedio/Día:</strong> ${formatCurrency(promedioGanancia)}</div>
        </div>
    `;
    resumenDiv.style.display = 'block';

    // Renderizar listado de jornadas
    let html = '';
    filteredData.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(item => {
        html += `
            <div class="historico-item">
                <div class="historico-fecha">${new Date(item.fecha).toLocaleDateString('es-ES')}</div>
                <div class="historico-stats">
                    <div><strong>${item.totalCarreras}</strong><br>Carreras</div>
                    <div><strong>${formatCurrency(item.totalBruto)}</strong><br>Bruto</div>
                    <div><strong>${formatCurrency(item.ganancia)}</strong><br>Ganancia</div>
                </div>
                <div style="margin-top: 8px; font-size: 11px;">
                    ${Object.entries(item.plataformas).map(([plat, data]) =>
            `<span style="background: ${getPlatformColor(plat)}; color: white; padding: 2px 6px; border-radius: 10px; margin-right: 4px;">
                            ${plat.toUpperCase()}: ${data.count}
                        </span>`
        ).join('')}
                </div>
            </div>
        `;
    });
    content.innerHTML = html;
}

/** Valida las fechas y aplica el filtro por rango. */
function aplicarRangoFechas() {
    const desde = new Date(document.getElementById('fechaDesde').value);
    const hasta = new Date(document.getElementById('fechaHasta').value);

    if (!desde || !hasta || isNaN(desde) || isNaN(hasta)) {
        showToast('Selecciona ambas fechas', 'error');
        return;
    }
    if (desde > hasta) {
        showToast('La fecha inicial no puede ser mayor a la final', 'error');
        return;
    }
    loadHistorico();
}

/** Comparte el resumen del histórico usando Web Share API o portapapeles. */
function compartirHistorico() {
    const stats = document.getElementById('historicoResumenStats').textContent;
    const periodo = getPeriodoTexto();
    const texto = `📊 RESUMEN HISTÓRICO - RutaApp\n${periodo}\n\n${stats}\n\n#RutaApp #Trabajo`;

    if (navigator.share) {
        navigator.share({ title: 'Resumen Histórico - RutaApp', text: texto })
            .catch(() => fallbackShare(texto));
    } else {
        fallbackShare(texto);
    }
}

/**
 * Devuelve una descripción textual del período activo.
 * @returns {string}
 */
function getPeriodoTexto() {
    const now = new Date();
    switch (historicoFilter) {
        case 'dia':
            return `📅 Período: Hoy (${now.toLocaleDateString('es-ES')})`;
        case 'semana':
            return '📅 Período: Última Semana';
        case 'mes':
            return `📅 Período: ${now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
        case 'ano':
            return `📅 Período: Año ${now.getFullYear()}`;
        case 'rango': {
            const desde = document.getElementById('fechaDesde').value;
            const hasta = document.getElementById('fechaHasta').value;
            return `📅 Período: ${new Date(desde).toLocaleDateString('es-ES')} - ${new Date(hasta).toLocaleDateString('es-ES')}`;
        }
        default:
            return '';
    }
}
