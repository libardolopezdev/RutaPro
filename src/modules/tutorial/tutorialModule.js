import { store } from '../../state/store.js';
import { firestoreService } from '../../services/firestoreService.js';
import { auth } from '../../services/firebase-init.js';

export const tutorialModule = {
    steps: [
        {
            targetId: 'btnNuevaCarrera',
            title: 'Registra tus ganancias',
            text: 'Aquí sumarás el dinero de cada viaje que hagas. Trata de registrarlo en cuanto el pasajero baje.',
            placement: 'bottom'
        },
        {
            targetId: 'btnNuevoGasto',
            title: 'Controla tus gastos',
            text: 'Registra la gasolina, lavadas o almuerzos. Así sabrás cuál es tu ganancia REAL (Bolsillo limpio).',
            placement: 'bottom'
        },
        {
            targetId: 'heroGananciasCard',
            title: 'Tu Meta Diaria',
            text: 'Este círculo se llenará a medida que te acerques a tu meta. ¡Mantén el enfoque!',
            placement: 'bottom'
        },
        {
            targetId: 'btnCerrarJornada',
            title: 'Cierra tu día',
            text: '¡Muy importante! Toca aquí cuando vayas a casa para guardar el resumen de tu día en el historial.',
            placement: 'top'
        }
    ],
    currentStepIndex: 0,
    isActive: false,

    start(force = false) {
        const state = store.getState();
        if (state.settings?.tutorialCompleted && !force) return;

        this.currentStepIndex = 0;
        this.isActive = true;
        
        document.getElementById('tutorialOverlay').classList.add('active');
        this.showStep();
    },

    showStep() {
        if (this.currentStepIndex >= this.steps.length) {
            this.finish();
            return;
        }

        // Clean previous
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
            // Remove inline relative if added
            if (el.dataset.tutorialPosBackup) {
                el.style.position = el.dataset.tutorialPosBackup;
            }
        });

        const step = this.steps[this.currentStepIndex];
        const targetEl = document.getElementById(step.targetId);

        if (!targetEl) {
            // Si no encuentra el elemento (por ej. si está oculto), salta el paso
            this.currentStepIndex++;
            this.showStep();
            return;
        }

        // Backup position
        targetEl.dataset.tutorialPosBackup = targetEl.style.position;
        targetEl.classList.add('tutorial-highlight');

        // Update Tooltip
        const tooltip = document.getElementById('tutorialTooltip');
        document.getElementById('tutorialStepIndicator').textContent = `PASO ${this.currentStepIndex + 1} DE ${this.steps.length}`;
        document.getElementById('tutorialTitle').textContent = step.title;
        document.getElementById('tutorialText').textContent = step.text;
        
        const btnNext = document.getElementById('btnTutorialNext');
        if (this.currentStepIndex === this.steps.length - 1) {
            btnNext.textContent = '¡EMPEZAR!';
        } else {
            btnNext.textContent = 'SIGUIENTE';
        }

        // Position tooltip
        tooltip.classList.add('active');
        const rect = targetEl.getBoundingClientRect();
        
        // Basic positioning (always center horizontally relative to element, below or above)
        let top = 0;
        let left = rect.left + (rect.width / 2) - 140; // 280px width / 2
        
        // Ensure it doesn't go off screen
        if (left < 10) left = 10;
        if (left + 280 > window.innerWidth - 10) left = window.innerWidth - 290;

        if (step.placement === 'top') {
            top = rect.top - tooltip.offsetHeight - 20;
        } else {
            top = rect.bottom + 20;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;

        // Bind buttons
        btnNext.onclick = () => {
            this.currentStepIndex++;
            this.showStep();
        };

        document.getElementById('btnTutorialSkip').onclick = () => {
            this.finish();
        };
    },

    async finish() {
        this.isActive = false;
        document.getElementById('tutorialOverlay').classList.remove('active');
        document.getElementById('tutorialTooltip').classList.remove('active');
        
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
            if (el.dataset.tutorialPosBackup) {
                el.style.position = el.dataset.tutorialPosBackup;
            }
        });

        // Save state to Firebase
        const user = auth.currentUser;
        if (user) {
            try {
                await firestoreService.updateSettings(user.uid, { tutorialCompleted: true });
                store.setState({ 
                    settings: { ...store.getState().settings, tutorialCompleted: true } 
                });
            } catch(e) {
                // error silent
            }
        }
    }
};
