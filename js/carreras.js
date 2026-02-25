/**
 * carreras.js — Lógica de carreras y control de jornada
 * RutaApp 2027
 * @author Libardo Lopez
 */

/** Activa/desactiva la jornada laboral. */
function toggleJornada() {
    if (!appState.jornadaIniciada) {
        appState.carreras = [];
        appState.gastos = [];
        updateGastos();
        updateUI();

        appState.jornadaIniciada = true;
        appState.jornadaInicio = new Date();

        elements.jornadaBtn.textContent = 'CERRAR JORNADA';
        elements.jornadaBtn.classList.add('cierre');
        elements.jornadaInfo.textContent = `Iniciado a las ${appState.jornadaInicio.toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit'
        })}`;
        elements.appContent.classList.remove('app-disabled');

        showToast('Jornada iniciada correctamente', 'success');
        saveState();

        setTimeout(() => {
            elements.amountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            elements.amountInput.focus();
        }, 400);

    } else {
        showResumenFinal();
    }
}

/**
 * Selecciona una plataforma y activa los botones de pago.
 * @param {string} platform
 */
function selectPlatform(platform) {
    appState.selectedPlatform = platform;

    document.querySelectorAll('.platform-btn').forEach(btn => btn.classList.remove('selected'));
    const btn = document.querySelector(`[data-platform="${platform}"]`);
    if (btn) btn.classList.add('selected');
    elements.paymentButtons.classList.add('active');

    validateForm();
}

/**
 * Selecciona un método de pago.
 * @param {string} payment
 */
function selectPayment(payment) {
    appState.selectedPayment = payment;

    document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`[data-payment="${payment}"]`).classList.add('selected');

    validateForm();
}

/**
 * Parsea el valor del input formateado (con puntos de miles) a número puro.
 * @returns {number}
 */
function getAmountValue() {
    const raw = elements.amountInput.value.replace(/\./g, '').replace(/,/g, '');
    return parseFloat(raw) || 0;
}

/** Habilita o deshabilita el botón "AGREGAR CARRERA" según el formulario. */
function validateForm() {
    const amount = getAmountValue();
    const isValid = amount > 0 && appState.selectedPlatform && appState.selectedPayment;
    elements.addCarrera.disabled = !isValid;
}

/** Agrega una nueva carrera al estado y actualiza la UI. */
function addCarrera() {
    const amount = getAmountValue();
    const carrera = {
        id: Date.now(),
        timestamp: new Date(),
        platform: appState.selectedPlatform,
        payment: appState.selectedPayment,
        amount: amount,
        peaje: 0,
        neto: amount
    };

    appState.carreras.push(carrera);
    resetForm();
    updateUI();
    showToast('Carrera agregada correctamente', 'success');
    saveState();
}

/**
 * Elimina una carrera por ID (confirmación incluida).
 * @param {number} id
 */
function deleteCarrera(id) {
    if (confirm('¿Estás seguro de eliminar esta carrera?')) {
        appState.carreras = appState.carreras.filter(c => c.id !== id);
        updateUI();
        saveState();
        showToast('Carrera eliminada', 'success');
    }
}

/** Resetea el formulario de nueva carrera a su estado inicial. */
function resetForm() {
    elements.amountInput.value = '';
    appState.selectedPlatform = null;
    appState.selectedPayment = null;

    document.querySelectorAll('.platform-btn, .payment-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    elements.paymentButtons.classList.remove('active');
    elements.addCarrera.disabled = true;
}

/** Limpia todos los datos y reinicia la app completamente. */
function clearAll() {
    if (confirm('¿Estás seguro de limpiar todos los datos del día?')) {
        appState.carreras = [];
        appState.jornadaIniciada = false;
        appState.jornadaInicio = null;
        appState.gastos = [];

        elements.jornadaBtn.textContent = 'INICIAR JORNADA';
        elements.jornadaBtn.classList.remove('cierre');
        elements.jornadaInfo.textContent = 'Presiona para comenzar tu día de trabajo';
        elements.appContent.classList.add('app-disabled');

        resetForm();
        updateUI();
        saveState();

        showToast('Todos los datos han sido eliminados', 'success');
    }
}

/**
 * Formatea el valor del input de monto con separador de miles (punto).
 * Se llama en el evento 'input' del campo amountInput.
 */
function formatAmountInput() {
    const input = elements.amountInput;
    // Eliminar todo excepto dígitos
    const digits = input.value.replace(/\D/g, '');
    if (!digits) { input.value = ''; validateForm(); return; }

    // Formatear con punto como separador de miles
    const formatted = parseInt(digits, 10).toLocaleString('es-CO');
    input.value = formatted;
    validateForm();
}
