/**
 * carreras.js — Lógica de carreras y control de jornada
 * RutaApp 2027
 */

/** Activa/desactiva la jornada laboral. */
function toggleJornada() {
    if (!appState.jornadaIniciada) {
        // Limpiar datos de la jornada anterior
        appState.carreras = [];
        appState.gastos = [];
        updateGastos();
        updateUI();

        // Iniciar nueva jornada
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

        // Scroll y focus automático al campo de valor
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

    elements.platformButtons.forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`[data-platform="${platform}"]`).classList.add('selected');
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

/** Habilita o deshabilita el botón "AGREGAR CARRERA" según el formulario. */
function validateForm() {
    const amount = parseFloat(elements.amountInput.value);
    const isValid = amount > 0 && appState.selectedPlatform && appState.selectedPayment;
    elements.addCarrera.disabled = !isValid;
}

/** Agrega una nueva carrera al estado y actualiza la UI. */
function addCarrera() {
    const amount = parseFloat(elements.amountInput.value);
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

/** Muestra instrucciones de instalación como PWA según el dispositivo del usuario. */
function mostrarInstruccionesInstalacion() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let mensaje = '';
    if (isIOS) {
        mensaje = `📱 INSTALAR EN IPHONE/IPAD:\n\n1. Toca el botón "Compartir" 📤\n   (abajo en el centro)\n\n2. Selecciona "Añadir a pantalla de inicio" ➕\n\n3. Toca "Añadir"\n\n¡La app aparecerá en tu pantalla de inicio! 🎉`;
    } else if (isAndroid) {
        mensaje = `📱 INSTALAR EN ANDROID:\n\n1. Toca el menú (⋮) arriba a la derecha\n\n2. Selecciona "Añadir a pantalla de inicio"\n   o "Instalar app"\n\n3. Confirma\n\n¡La app aparecerá en tu pantalla de inicio! 🎉`;
    } else {
        mensaje = `💻 INSTALAR EN ESCRITORIO:\n\n1. Busca el ícono ➕ o ⬇️\n   en la barra de direcciones\n\n2. Haz clic en "Instalar"\n\n¡La app se abrirá como programa! 🎉`;
    }

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center;
        justify-content: center; z-index: 10000;
    `;
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 350px; margin: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <h3 style="margin-bottom: 20px; color: #134e5e; text-align: center;">📲 Instalar RutaApp</h3>
            <pre style="white-space: pre-wrap; font-family: var(--font-family); font-size: 14px; line-height: 1.6; color: #333;">${mensaje}</pre>
            <button onclick="this.parentElement.parentElement.remove()"
                style="width: 100%; padding: 12px; background: #71b280; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 15px;">
                Entendido
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}
