/**
 * state.js — Estado global de la aplicación
 * RutaApp 2027
 * @author Libardo Lopez
 */

/**
 * Plataformas por defecto con colores corporativos.
 * El usuario puede añadir/eliminar plataformas desde Configuración.
 */
const DEFAULT_PLATFORMS = [
    { id: 'uber', name: 'UBER', color: '#000000' },
    { id: 'didi', name: 'DIDI', color: '#FF6B35' },
    { id: 'coop', name: 'COOPEBOMBAS', color: '#1976D2' },
    { id: 'idriver', name: 'IDRIVER', color: '#00BF63' },
    { id: 'mano', name: 'MANO', color: '#7C3AED' },
];

/**
 * Estado principal de la aplicación.
 * Toda la lógica lee y escribe desde aquí.
 */
let appState = {
    jornadaIniciada: false,
    jornadaInicio: null,
    carreras: [],
    gastos: [],
    selectedPlatform: null,
    selectedPayment: null,
    baseEfectivo: 0,
    settings: {
        meta: 270000,
        storageType: 'local',
        plataformas: JSON.parse(JSON.stringify(DEFAULT_PLATFORMS))
    }
};

/**
 * Datos del histórico de jornadas.
 * Se inicializa leyendo desde localStorage.
 */
let historicoData = JSON.parse(localStorage.getItem('taxiapp-historico') || '[]');

/** Filtro activo en la vista de histórico ('dia', 'semana', 'mes', 'ano', 'rango') */
let historicoFilter = 'dia';

/**
 * Cache de referencias al DOM.
 * Se populan en app.js después del DOMContentLoaded.
 */
const elements = {
    currentDate: document.getElementById('currentDate'),
    metaDisplay: document.getElementById('metaDisplay'),
    alcanzadoDisplay: document.getElementById('alcanzadoDisplay'),
    porcentajeDisplay: document.getElementById('porcentajeDisplay'),
    progressFillMeta: document.getElementById('progressFillMeta'),
    excedenteDisplay: document.getElementById('excedenteDisplay'),

    excedenteValor: document.getElementById('excedenteValor'),
    gananciaEfectivo: document.getElementById('gananciaEfectivo'),
    gananciaDigital: document.getElementById('gananciaDigital'),
    gastoMonto: document.getElementById('gastoMonto'),
    gastoTipo: document.getElementById('gastoTipo'),
    agregarGasto: document.getElementById('agregarGasto'),
    listaGastos: document.getElementById('listaGastos'),
    totalGastos: document.getElementById('totalGastos'),
    jornadaBtn: document.getElementById('jornadaBtn'),
    jornadaInfo: document.getElementById('jornadaInfo'),
    appContent: document.getElementById('appContent'),
    amountInput: document.getElementById('amountInput'),
    platformButtonsContainer: document.getElementById('platformButtonsContainer'),
    paymentButtons: document.getElementById('paymentButtons'),
    addCarrera: document.getElementById('addCarrera'),
    consolidadoNeto: document.getElementById('consolidadoNeto'),
    carrerasCount: document.getElementById('carrerasCount'),
    totalBruto: document.getElementById('totalBruto'),
    progressFill: document.getElementById('progressFill'),

    plataformasStats: document.getElementById('plataformasStats'),
    carrerasList: document.getElementById('carrerasList'),
    finalBruto: document.getElementById('finalBruto'),
    finalMeta: document.getElementById('finalMeta'),
    finalAdicionales: document.getElementById('finalAdicionales'),
    exportBtn: document.getElementById('exportBtn'),
    clearBtn: document.getElementById('clearBtn'),
    settingsModal: document.getElementById('settingsModal'),
    resumenModal: document.getElementById('resumenModal'),
    toast: document.getElementById('toast')
};
