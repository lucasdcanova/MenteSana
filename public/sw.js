// Service Worker para MenteSã - Otimizado para PWA conforme padrões Apple
const CACHE_VERSION = 4; // Incrementado para forçar atualização
const CACHE_STATIC = `mentesa-static-v${CACHE_VERSION}`;
const CACHE_DYNAMIC = `mentesa-dynamic-v${CACHE_VERSION}`;
const CACHE_IMMUTABLE = `mentesa-immutable-v${CACHE_VERSION}`;
const CACHE_OFFLINE = `mentesa-offline-v${CACHE_VERSION}`;

// Assets estáticos essenciais para o funcionamento offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Assets que raramente mudam
const IMMUTABLE_ASSETS = [
  '/icons/apple-icon-180.svg',
  '/icons/apple-icon-152.svg',
  '/icons/apple-icon-167.svg',
  '/splash/apple-splash-2048-2732.png',
  '/splash/apple-splash-1668-2388.png',
  '/splash/apple-splash-1536-2048.png',
  '/splash/apple-splash-1125-2436.png',
  '/splash/apple-splash-1242-2688.png',
  '/splash/apple-splash-750-1334.png',
  '/splash/apple-splash-640-1136.png'
];

// Recursos dinamicamente gerados que devem ser cacheados (exemplo: JS/CSS gerados por build)
const DYNAMIC_ASSET_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.png$/,
  /\.svg$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.webp$/
];

// Rotas que deveriam funcionar offline usando a estratégia App Shell
const APP_SHELL_ROUTES = [
  '/journal',
  '/profile',
  '/assistant',
  '/schedule',
  '/home',
  '/self-help',
  '/daily-tips'
];

// Instalação do service worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando Service Worker...');
  
  // Pre-cache de recursos estáticos
  const cacheStatic = caches.open(CACHE_STATIC)
    .then(cache => {
      console.log('[Service Worker] Pré-cacheando arquivos estáticos');
      return cache.addAll(STATIC_ASSETS);
    });
    
  // Pre-cache de recursos imutáveis
  const cacheImmutable = caches.open(CACHE_IMMUTABLE)
    .then(cache => {
      console.log('[Service Worker] Pré-cacheando arquivos imutáveis');
      return cache.addAll(IMMUTABLE_ASSETS);
    });
  
  // Força o service worker a se tornar ativo imediatamente
  self.skipWaiting();
  
  event.waitUntil(Promise.all([cacheStatic, cacheImmutable]));
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando novo Service Worker...');
  
  // Lista de caches atuais a serem mantidos
  const currentCaches = [
    CACHE_STATIC,
    CACHE_DYNAMIC,
    CACHE_IMMUTABLE,
    CACHE_OFFLINE
  ];
  
  // Limpeza de caches antigos
  const cleanup = caches.keys()
    .then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[Service Worker] Excluindo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    });
  
  // Assume o controle de todas as páginas abertas sem reload
  self.clients.claim();
  
  event.waitUntil(cleanup);
});

// Estratégia de cache
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Ignora requisições de analytics, third-party e navegação para outros domínios
  if (
    requestUrl.hostname !== self.location.hostname || 
    requestUrl.href.includes('chrome-extension') ||
    requestUrl.pathname.startsWith('/socket.io/') ||
    requestUrl.href.includes('livereload.js')
  ) {
    return;
  }
  
  // Diferentes estratégias de cache
  
  // 1. Estratégia para API: Stale-While-Revalidate (retorna cache e atualiza)
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidateStrategy(event.request));
    return;
  }
  
  // 2. Para rotas de App Shell: Cache First, com fallback para App Shell
  if (APP_SHELL_ROUTES.some(route => requestUrl.pathname === route)) {
    event.respondWith(appShellStrategy(event.request));
    return;
  }
  
  // 3. Para assets estáticos: Cache First com fallback para network
  if (isStaticAsset(requestUrl)) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // 4. Para recursos dinâmicos: Network First com fallback para cache
  if (isDynamicAsset(requestUrl)) {
    event.respondWith(networkFirstStrategy(event.request));
    return; 
  }
  
  // 5. Estratégia padrão para outros recursos: Network First com fallback para página offline
  event.respondWith(defaultStrategy(event.request));
});

// ============ Estratégias de Cache ============

// Cache First: Tenta o cache primeiro, cai para rede se necessário
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Se não está no cache, busca da rede e armazena no cache
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_STATIC);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Falha ao buscar recurso:', error);
    
    // Fallback para página offline se for navegação
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    return new Response('Recurso não disponível offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Network First: Tenta rede primeiro, cai para cache se falhar
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Só armazena no cache se a resposta for válida
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Falha na rede, buscando do cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback para página offline se for navegação
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    return new Response('Recurso não disponível offline', { status: 503 });
  }
}

// Stale While Revalidate: Usa cache enquanto atualiza em segundo plano
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  // Se a API não deve ser cacheada ou é POST/PUT/DELETE, não tente cache
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  // Inicia a atualização em segundo plano
  const fetchPromise = fetch(request).then(async networkResponse => {
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.error('[Service Worker] Erro ao atualizar dados da API:', error);
  });
  
  // Retorna o cache imediatamente se disponível
  return cachedResponse || fetchPromise;
}

// App Shell Strategy: Usa o padrão App Shell para SPA
async function appShellStrategy(request) {
  // Tenta buscar da rede primeiro
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Modo offline, servindo app shell');
    
    // Em caso de falha de rede, serve a página principal (app shell)
    return caches.match('/');
  }
}

// Estratégia padrão para outros recursos
async function defaultStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    return caches.match(request);
  }
}

// ============ Funções auxiliares ============

// Verifica se é um asset estático a ser cacheado
function isStaticAsset(url) {
  const path = url.pathname;
  return STATIC_ASSETS.includes(path) || IMMUTABLE_ASSETS.includes(path);
}

// Verifica se é um asset dinâmico a ser cacheado 
function isDynamicAsset(url) {
  const path = url.pathname;
  return DYNAMIC_ASSET_PATTERNS.some(pattern => pattern.test(path));
}

// Detecta se a resposta indica um JSON válido
function isValidJsonResponse(response) {
  return response.headers.get('content-type')?.includes('application/json');
}

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync', event);
  
  if (event.tag === 'sync-new-journal') {
    event.waitUntil(syncNewJournalEntries());
  } else if (event.tag === 'sync-form-data') {
    event.waitUntil(syncPendingFormData());
  }
});

// Eventos Push para notificações
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push recebido', event);
  
  let notification = {
    title: 'MenteSã',
    body: 'Você tem uma nova notificação',
    icon: '/icons/apple-icon-180.svg',
    badge: '/icons/badge-96x96.png',
    data: {},
    vibrate: [100, 50, 100]
  };
  
  try {
    if (event.data) {
      notification = { ...notification, ...JSON.parse(event.data.text()) };
    }
  } catch (e) {
    console.error('[Service Worker] Erro ao processar dados push:', e);
  }
  
  event.waitUntil(
    self.registration.showNotification(notification.title, notification)
  );
});

// Interação com notificações 
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificação clicada', event);
  
  event.notification.close();
  
  // Navegação baseada na notificação
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(windowClients => {
          // Reutiliza janela existente se possível
          for (let client of windowClients) {
            if (client.url === event.notification.data.url && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Abre nova janela se não existir
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data.url);
          }
        })
    );
  }
});

// Recebe mensagens da aplicação web
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Mensagem recebida', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_NEW_ROUTE') {
    const route = event.data.payload;
    if (route && !APP_SHELL_ROUTES.includes(route)) {
      APP_SHELL_ROUTES.push(route);
    }
  }
});