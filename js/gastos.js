/**
 * gastos.js — Gestión de gastos del día
 * RutaApp 2027
 */

/** Habilita/deshabilita el botón "AGREGAR GASTO". */
function validateGastoForm() {
    const monto = parseFloat(elements.gastoMonto.value);
    const tipo = elements.gastoTipo.value;
    elements.agregarGasto.disabled = !(monto > 0 && tipo);
}

/** Agrega un gasto al estado y actualiza la UI. */
function agregarGasto() {
    const monto = parseFloat(elements.gastoMonto.value);
    const tipo = elements.gastoTipo.value;

    if (isNaN(monto) || monto <= 0 || !tipo) {
        alert('Por favor ingresa un monto y un tipo de gasto.');
        return;
    }

    const gasto = {
        id: Date.now().toString(),
        monto,
        tipo
    };

    appState.gastos.push(gasto);
    saveState();

    // Limpiar el formulario
    elements.gastoMonto.value = '';
    elements.gastoTipo.value = '';
    elements.agregarGasto.disabled = true;

    // Actualizar toda la vista de gastos y totales
    updateGastos();
    updateGananciasEfectivoDigital();
    updateConsolidados();
    updateMetaProgress();
    updateFinalSummary();
}

/**
 * Elimina un gasto por ID (con confirmación).
 * @param {string} id
 */
function eliminarGasto(id) {
    if (confirm('¿Eliminar este gasto?')) {
        appState.gastos = appState.gastos.filter(g => g.id !== id);
        updateGastos();
        updateUI();
        saveState();
        showToast('Gasto eliminado', 'success');
    }
}

/**
 * Renderiza la lista de gastos en el DOM y actualiza el total.
 * Función unificada (reemplaza la antigua lógica duplicada de mostrarGasto).
 */
function updateGastos() {
    const iconos = {
        combustible: '⛽',
        peaje: '🚧',
        comida: '🍔',
        mantenimiento: '🔧',
        ajuste: '📝',
        otro: '📦'
    };

    const totalGastos = appState.gastos.reduce((sum, g) => sum + g.monto, 0);
    elements.totalGastos.textContent = formatCurrency(totalGastos);

    let html = '';
    appState.gastos.slice().reverse().forEach(gasto => {
        const icono = iconos[gasto.tipo] || '📦';
        html += `
            <div class="gasto-item">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>${icono}</span>
                    <span style="text-transform: capitalize;">${gasto.tipo}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: bold; color: #f39c12;">${formatCurrency(gasto.monto)}</span>
                    <button onclick="eliminarGasto('${gasto.id}')"
                        style="background: #e74c3c; color: white; border: none; border-radius: 50%;
                               width: 24px; height: 24px; cursor: pointer; font-size: 12px;">×</button>
                </div>
            </div>
        `;
    });

    elements.listaGastos.innerHTML = html;
}
