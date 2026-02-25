/**
 * settings.js — Configuración, resumen final y compartir
 * RutaApp 2027
 */

/** Abre el modal de configuración con los valores actuales. */
function openSettings() {
    document.getElementById('metaInput').value = appState.settings.meta;
    elements.settingsModal.style.display = 'block';
}

/** Guarda la configuración (local + Firebase) y cierra el modal. */
async function saveSettings() {
    const meta = parseFloat(document.getElementById('metaInput').value) || 270000;
    appState.settings.meta = meta;
    elements.metaDisplay.textContent = formatCurrency(meta);

    updateUI();
    closeSettings();
    saveState();

    // También guardar en Firestore
    if (typeof saveSettingsToFirestore === 'function') {
        await saveSettingsToFirestore();
    }

    showToast('Configuración guardada', 'success');
}

/** Cierra el modal de configuración. */
function closeSettings() {
    elements.settingsModal.style.display = 'none';
}

/**
 * Muestra el modal de resumen final de jornada.
 * Guarda la jornada en localStorage Y en Firestore histórico.
 */
async function showResumenFinal() {
    if (appState.carreras.length === 0) {
        showToast('No hay carreras registradas', 'error');
        return;
    }

    const totalBruto = appState.carreras.reduce((sum, c) => sum + c.amount, 0);
    const totalNeto = appState.carreras.reduce((sum, c) => sum + c.neto, 0);
    const gananciaFinal = totalNeto;
    const ahora = new Date();
    const duracion = appState.jornadaInicio
        ? Math.round((ahora - appState.jornadaInicio) / (1000 * 60 * 60) * 100) / 100
        : 0;

    // Estadísticas por plataforma
    const stats = {};
    appState.carreras.forEach(carrera => {
        if (!stats[carrera.platform]) {
            stats[carrera.platform] = { count: 0, total: 0, efectivo: 0, tarjeta: 0, vale: 0, transferencia: 0 };
        }
        stats[carrera.platform].count++;
        stats[carrera.platform].total += carrera.amount;
        stats[carrera.platform][carrera.payment] = (stats[carrera.platform][carrera.payment] || 0) + carrera.amount;
    });

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setEl('resumenFecha', ahora.toLocaleDateString('es-ES'));
    setEl('resumenInicio', appState.jornadaInicio
        ? appState.jornadaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'N/A');
    setEl('resumenCierre', ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    setEl('resumenDuracion', `${duracion} horas`);
    setEl('resumenCarreras', appState.carreras.length);
    setEl('resumenTotalBruto', formatCurrency(totalBruto));
    setEl('resumenTotalNeto', formatCurrency(totalNeto));
    setEl('resumenGananciaFinal', formatCurrency(gananciaFinal));

    let plataformasHtml = '';
    Object.entries(stats).forEach(([platform, data]) => {
        plataformasHtml += `
            <div style="background: var(--light-color); padding: 10px; border-radius: 6px; margin-bottom: 8px;">
                <div class="resumen-detail" style="font-weight: bold; color: ${getPlatformColor(platform)};">
                    <span>${platform.toUpperCase()}:</span>
                    <span>${data.count} carreras — ${formatCurrency(data.total)}</span>
                </div>
                <div style="font-size: 12px; margin-top: 5px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px;">
                    ${data.efectivo > 0 ? `<div>Efectivo: ${formatCurrency(data.efectivo)}</div>` : ''}
                    ${data.tarjeta > 0 ? `<div>Tarjeta: ${formatCurrency(data.tarjeta)}</div>` : ''}
                    ${data.vale > 0 ? `<div>Vale: ${formatCurrency(data.vale)}</div>` : ''}
                    ${data.transferencia > 0 ? `<div>Transfer: ${formatCurrency(data.transferencia)}</div>` : ''}
                </div>
            </div>
        `;
    });
    const plataElm = document.getElementById('resumenPlataformas');
    if (plataElm) plataElm.innerHTML = plataformasHtml;

    // 1. Guardar en histórico local
    const historicoItem = {
        fecha: ahora.toISOString(),
        totalCarreras: appState.carreras.length,
        totalBruto,
        totalNeto,
        ganancia: gananciaFinal,
        duracion,
        plataformas: stats,
        carreras: appState.carreras
    };
    historicoData.push(historicoItem);
    localStorage.setItem('taxiapp-historico', JSON.stringify(historicoData));

    // 2. Guardar en Firestore histórico
    if (typeof saveHistoricoToFirestore === 'function') {
        await saveHistoricoToFirestore(historicoItem);
    }

    // 3. Limpiar jornada activa en Firestore
    if (typeof clearJornadaInFirestore === 'function') {
        await clearJornadaInFirestore();
    }

    // Mostrar el modal
    elements.resumenModal.style.display = 'block';
    window.history.pushState({ modal: 'resumen' }, '');
    window.onpopstate = function () {
        if (elements.resumenModal?.style.display === 'block') closeResumenModal();
    };
}

/** Cierra solo el modal sin finalizar la jornada. */
function closeResumenModal() {
    if (elements.resumenModal) elements.resumenModal.style.display = 'none';
    window.onpopstate = null;
    showToast('Puedes seguir trabajando en tu jornada', 'info');
}

/** Cierra el modal Y finaliza la jornada. */
function closeResumen() {
    elements.resumenModal.style.display = 'none';

    appState.carreras = [];
    appState.jornadaIniciada = false;
    appState.jornadaInicio = null;
    appState.selectedPlatform = null;
    appState.selectedPayment = null;

    elements.jornadaBtn.textContent = 'INICIAR JORNADA';
    elements.jornadaBtn.classList.remove('cierre');
    elements.jornadaInfo.textContent = 'Presiona para comenzar tu día de trabajo';
    elements.appContent.classList.add('app-disabled');

    resetForm();
    updateUI();
    saveState();
    showToast('Jornada finalizada correctamente', 'success');
}

/** Genera el texto de resumen para exportar/compartir. */
function generateResumenText() {
    const fecha = new Date().toLocaleDateString('es-ES');
    const totalCarreras = appState.carreras.length;
    const meta = appState.settings.meta;

    const efectivo = {}, tarjeta = {}, vale = {}, transferencia = {};
    appState.carreras.forEach(carrera => {
        const plat = carrera.platform.toUpperCase();
        if (carrera.payment === 'efectivo') efectivo[plat] = (efectivo[plat] || 0) + carrera.amount;
        else if (carrera.payment === 'tarjeta') tarjeta[plat] = (tarjeta[plat] || 0) + carrera.amount;
        else if (carrera.payment === 'vale') vale[plat] = (vale[plat] || 0) + carrera.amount;
        else if (carrera.payment === 'transferencia') transferencia[plat] = (transferencia[plat] || 0) + carrera.amount;
    });

    const totalEfectivoBruto = Object.values(efectivo).reduce((s, v) => s + v, 0);
    const totalTarjeta = Object.values(tarjeta).reduce((s, v) => s + v, 0);
    const totalVale = Object.values(vale).reduce((s, v) => s + v, 0);
    const totalTransferencia = Object.values(transferencia).reduce((s, v) => s + v, 0);
    const totalDigital = totalTarjeta + totalVale + totalTransferencia;
    const totalGastos = appState.gastos.reduce((s, g) => s + g.monto, 0);
    const totalEfectivoNeto = totalEfectivoBruto - totalGastos;
    const gananciaTotal = totalEfectivoNeto + totalDigital;
    const excedente = Math.max(0, gananciaTotal - meta);
    const metaCumplida = gananciaTotal >= meta;

    let resumen = `🚖 RESUMEN DE JORNADA - ${fecha}\n\n📊 CARRERAS: ${totalCarreras}`;

    if (totalEfectivoNeto !== 0) {
        resumen += `\n💵 EFECTIVO NETO: ${formatCurrency(totalEfectivoNeto)}`;
        Object.entries(efectivo).forEach(([plat, monto]) => { resumen += `\n   • ${plat}: ${formatCurrency(monto)}`; });
    }
    if (totalDigital > 0) {
        resumen += `\n💳 DIGITAL: ${formatCurrency(totalDigital)}`;
        if (totalTarjeta) resumen += `\n   • Tarjeta: ${formatCurrency(totalTarjeta)}`;
        if (totalVale) resumen += `\n   • Vale: ${formatCurrency(totalVale)}`;
        if (totalTransferencia) resumen += `\n   • Transferencia: ${formatCurrency(totalTransferencia)}`;
    }

    resumen += `\n\n📈 RESUMEN FINANCIERO`;
    if (metaCumplida) {
        resumen += `\n💰 META CUMPLIDA: ${formatCurrency(meta)} ✅`;
        if (excedente > 0) resumen += `\n⭐ EXCEDENTE: ${formatCurrency(excedente)}`;
        resumen += `\n🎯 GANANCIA TOTAL: ${formatCurrency(gananciaTotal)}`;
    } else {
        resumen += `\n💰 GANANCIA: ${formatCurrency(gananciaTotal)}\n🎯 META: ${formatCurrency(meta)}\n⚠️ FALTÓ: ${formatCurrency(meta - gananciaTotal)}`;
    }

    resumen += `\n\n#RutaApp #Trabajo`;
    return resumen;
}

/** Comparte el resumen con Web Share API o portapapeles. */
function compartirResumen() {
    const texto = generateResumenText();
    if (navigator.share) {
        navigator.share({ title: 'Resumen de Jornada - RutaApp', text: texto })
            .catch(() => fallbackShare(texto));
    } else {
        fallbackShare(texto);
    }
}

/**
 * Fallback: copia al portapapeles o muestra alert.
 * @param {string} texto
 */
function fallbackShare(texto) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(texto)
            .then(() => showToast('Resumen copiado al portapapeles', 'success'))
            .catch(() => alert('Copia este resumen:\n\n' + texto));
    } else {
        alert('Copia este resumen:\n\n' + texto);
    }
}
