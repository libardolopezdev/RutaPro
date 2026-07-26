const CACHE_NAME = 'rutapro-v44';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  // JS — solo los que existen verificados
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
  './src/modules/onboarding/onboardingModule.js',
  './src/utils/format.js',
  './src/utils/ui-utils.js',
  './src/modules/estadisticas/estadisticasModule.js',
  './src/modules/notifications/notificationsModule.js',
  './src/utils/haptics.js',
  './src/utils/greeting.js',
  // Íconos — solo los que existen verificados
  './icons/favicon.png',
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png',
  './icons/icon-48.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/Logo.png',
  './icons/icon-144.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return Promise.allSettled(
                    ASSETS.map(url => cache.add(url).catch(e => console.warn('Cache error:', url, e)))
                );
            })
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
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
  // Solo interceptar requests del mismo origen
  if (!event.request.url.startsWith(self.location.origin)) {
    return; // dejar pasar requests externos (Firebase, Google, etc.)
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        
        // Si no está en caché, intentar red
        return fetch(event.request)
          .catch(() => {
            // Si la red falla, devolver respuesta vacía en lugar de error
            return new Response('', { 
              status: 404, 
              statusText: 'Not Found' 
            });
          });
      })
  );
});
