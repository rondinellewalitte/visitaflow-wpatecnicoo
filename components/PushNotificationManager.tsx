'use client';

/**
 * Componente para gerenciar Push Notifications
 * 
 * Funcionalidades:
 * - Solicita permissão e ativa push notifications
 * - Mostra status atual das notificações
 * - Permite desativar push notifications
 */

import { useEffect, useState } from 'react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  enablePushNotifications,
  hasActiveSubscription,
  disablePushNotifications,
} from '@/lib/push-notifications';

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Carrega o estado inicial
  useEffect(() => {
    async function loadState() {
      // Verifica suporte
      const supported = isPushNotificationSupported();
      setIsSupported(supported);

      if (!supported) {
        return;
      }

      // Verifica permissão
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      // Verifica se já está inscrito
      const subscribed = await hasActiveSubscription();
      setIsSubscribed(subscribed);

      // Busca a chave pública VAPID
      try {
        const response = await fetch('/api/push/vapid-key');
        if (response.ok) {
          const data = await response.json();
          setVapidPublicKey(data.publicKey);
        }
      } catch (err) {
        console.error('Erro ao buscar VAPID key:', err);
      }
    }

    loadState();
  }, []);

  // Função para ativar push notifications
  async function handleEnable() {
    if (!vapidPublicKey) {
      setError('Chave VAPID não disponível. Configure as variáveis de ambiente.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await enablePushNotifications(vapidPublicKey);

      if (result.success) {
        setMessage('Push notifications ativadas com sucesso!');
        setIsSubscribed(true);
        setPermission('granted');
      } else {
        setError(result.error || 'Erro ao ativar push notifications');
      }
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }

  // Função para desativar push notifications
  async function handleDisable() {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await disablePushNotifications();

      if (result.success) {
        setMessage('Push notifications desativadas');
        setIsSubscribed(false);
      } else {
        setError(result.error || 'Erro ao desativar push notifications');
      }
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }

  // Se não é suportado, não mostra nada
  if (!isSupported) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        Push notifications não são suportadas neste navegador.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Receba notificações mesmo quando o app estiver fechado
        </p>

          {/* Status */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Status:
              </span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  isSubscribed && permission === 'granted'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : permission === 'denied'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                }`}
              >
                {isSubscribed && permission === 'granted'
                  ? 'Ativo'
                  : permission === 'denied'
                  ? 'Negado'
                  : 'Inativo'}
              </span>
            </div>
          </div>

          {/* Mensagens */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-600 dark:text-green-400">
              {message}
            </div>
          )}

        {/* Botões */}
        <div className="flex flex-col gap-2">
          {!isSubscribed && permission !== 'denied' ? (
            <button
              onClick={handleEnable}
              disabled={isLoading || !vapidPublicKey}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Ativando...' : 'Ativar Notificações'}
            </button>
          ) : isSubscribed ? (
            <button
              onClick={handleDisable}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Desativando...' : 'Desativar Notificações'}
            </button>
          ) : null}

          {permission === 'denied' && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Permissão negada. Habilite nas configurações do navegador.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

