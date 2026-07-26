import { store } from '../../state/store.js';
import { firestoreService } from '../../services/firestoreService.js';
import { auth } from '../../services/firebase-init.js';

export const tutorialModule = {
    steps: [
        {
            targetId: 'mainFab',
            title: 'El Botón Principal',
            text: 'Aquí registrarás cada carrera que hagas, anotarás tus gastos y podrás cerrar tu jornada.',
            placement: 'top'
        },
        {
            targetId: 'heroGananciasCard',
            title: 'Tu Progreso',
            text: 'Aquí verás cuánto has ganado hoy y qué tan cerca estás de tu meta.',
            placement: 'bottom'
        },
        {
            targetId: 'navHistorico',
            title: 'Reportes y Estadísticas',
            text: 'Consulta aquí tus días pasados y descubre qué días ganas más dinero.',
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

        const step = this.steps[this.currentStepIndex];
        const targetEl = document.getElementById(step.targetId);

        if (!targetEl) {
            this.currentStepIndex++;
            this.showStep();
            return;
        }

        // Setup the hole
        const hole = document.getElementById('tutorialHole');
        const rect = targetEl.getBoundingClientRect();
        
        hole.style.top = `${rect.top - 8}px`;
        hole.style.left = `${rect.left - 8}px`;
        hole.style.width = `${rect.width + 16}px`;
        hole.style.height = `${rect.height + 16}px`;
        hole.style.borderRadius = getComputedStyle(targetEl).borderRadius || '16px';

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
        
        let top = 0;
        let left = rect.left + (rect.width / 2) - 140; 
        
        if (left < 10) left = 10;
        if (left + 280 > window.innerWidth - 10) left = window.innerWidth - 290;

        if (step.placement === 'top') {
            top = rect.top - tooltip.offsetHeight - 30;
        } else {
            top = rect.bottom + 30;
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
