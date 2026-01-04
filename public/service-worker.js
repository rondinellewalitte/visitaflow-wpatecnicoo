// Service Worker básico para PWA
// Funcionalidades: install, activate e fetch (pass-through)
// Sem cache agressivo - apenas o necessário para PWA

const CACHE_NAME = 'visitaflow-tecnico-v1';
const OFFLINE_PAGE = '/offline'; // Página offline opcional (não implementada ainda)

// Evento de instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  
  // Força a ativação imediata do novo service worker
  self.skipWaiting();
  
  // Pre-cache pode ser adicionado aqui no futuro se necessário
  // Por enquanto, apenas instala sem cache inicial
  event.waitUntil(
    Promise.resolve().then(() => {
      console.log('[Service Worker] Instalado com sucesso');
    })
  );
});

// Evento de ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando...');
  
  // Remove caches antigos se existirem
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // Assume controle de todas as páginas imediatamente
      return self.clients.claim();
    })
  );
  
  console.log('[Service Worker] Ativado com sucesso');
});

// Evento de fetch - pass-through simples (sem cache agressivo)
self.addEventListener('fetch', (event) => {
  // Apenas para requisições GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Estratégia: Network First (busca na rede primeiro, fallback para cache se offline)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a requisição foi bem-sucedida, retorna a resposta
        // Não faz cache automático - apenas passa adiante
        return response;
      })
      .catch((error) => {
        // Se estiver offline e a requisição falhar, tenta buscar no cache
        console.log('[Service Worker] Offline, tentando buscar no cache:', event.request.url);
        
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se não há cache e está offline, retorna erro ou página offline
          // Por enquanto, apenas propaga o erro
          throw error;
        });
      })
  );
});

// Mensagens do cliente (pode ser usado para comunicação futura)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================
// WEB PUSH NOTIFICATIONS
// ============================================

/**
 * Handler para receber notificações push
 * Dispara quando o servidor envia uma notificação push
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push recebido:', event);

  // Extrai os dados da notificação
  let notificationData = {
    title: 'VisitaFlow Técnico',
    body: 'Você tem uma nova notificação',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'visitaflow-notification',
    data: {},
  };

  // Se o evento contém dados JSON, usa eles
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: payload.data || notificationData.data,
        // Opções adicionais para melhor UX
        requireInteraction: payload.requireInteraction || false,
        vibrate: payload.vibrate || [200, 100, 200],
        timestamp: Date.now(),
      };
    } catch (e) {
      // Se não for JSON, tenta como texto
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Exibe a notificação
  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      timestamp: notificationData.timestamp,
      // Ações da notificação (opcional)
      actions: notificationData.actions || [],
    }
  );

  event.waitUntil(promiseChain);
});

/**
 * Handler para quando o usuário clica na notificação
 * Abre o app e navega para a página relevante se houver
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificação clicada:', event);

  // Fecha a notificação
  event.notification.close();

  // Dados da notificação (pode conter URL para navegar)
  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/dashboard';

  // Abre ou foca a janela do app
  const promiseChain = clients
    .matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      // Procura se já existe uma janela aberta
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Se não encontrou, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(promiseChain);
});

/**
 * Handler para quando o usuário fecha a notificação sem clicar
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notificação fechada:', event);
  // Aqui você pode fazer tracking ou outras ações se necessário
});

console.log('[Service Worker] Script carregado com suporte a Push Notifications');

