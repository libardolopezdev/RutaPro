const CACHE_NAME = 'rutapro-v11';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './src/main.js',
    './src/services/firebase-init.js',
    './src/state/store.js',
    './src/services/storageService.js',
    './src/services/firestoreService.js',
    './src/ui/renderer.js',
    './src/modules/auth/authModule.js',
    './src/modules/carreras/carrerasModule.js',
    './src/modules/gastos/gastosModule.js',
    './src/modules/historico/historicoModule.js',
    './src/modules/settings/settingsModule.js',
    './src/utils/format.js',
    './src/utils/ui-utils.js',
    './manifest.json',
    './icons/logo.jpg',
    './icons/favicon.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
