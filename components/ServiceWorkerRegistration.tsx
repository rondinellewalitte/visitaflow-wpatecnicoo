'use client';

import { useEffect } from 'react';

/**
 * Componente para registrar o Service Worker do PWA
 * Roda apenas no browser (client-side)
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Verifica se estamos no browser e se Service Workers são suportados
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      // Registra o service worker
      navigator.serviceWorker
        .register('/service-worker.js', {
          scope: '/',
        })
        .then((registration) => {
          console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);

          // Verifica se há atualizações do service worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Novo service worker instalado, mas ainda não ativo
                  // Você pode mostrar uma notificação aqui no futuro para o usuário atualizar
                  console.log('[PWA] Novo Service Worker disponível. Recarregue a página para atualizar.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Erro ao registrar Service Worker:', error);
        });

      // Listener para quando o service worker está pronto
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[PWA] Service Worker pronto:', registration.scope);
      });

      // Listener para controle do service worker
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service Worker controller mudou');
        // Opcional: recarregar a página quando um novo service worker assume controle
        // window.location.reload();
      });
    }
  }, []);

  // Componente não renderiza nada visível
  return null;
}

