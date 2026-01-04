/**
 * Biblioteca para gerenciar Web Push Notifications no cliente
 * 
 * Funcionalidades:
 * - Solicitar permissão de notificação
 * - Criar subscription usando VAPID
 * - Salvar subscription no Supabase
 * - Verificar se já existe subscription
 */

/**
 * Converte a chave VAPID pública (base64url) para Uint8Array
 * Necessário para criar a subscription de push
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  // Uint8Array é um ArrayBufferView, que é um tipo de BufferSource
  return outputArray;
}

/**
 * Interface para a subscription salva no banco
 */
export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Verifica se o navegador suporta Push Notifications
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Verifica se já existe permissão de notificação
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Solicita permissão de notificação ao usuário
 * @returns Promise com o resultado da permissão
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications não são suportadas neste navegador');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Permissão de notificação foi negada. Por favor, habilite nas configurações do navegador.');
  }

  // Solicita permissão
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Cria uma subscription de push usando VAPID
 * @param vapidPublicKey - Chave pública VAPID (deve vir do servidor)
 * @returns Promise com os dados da subscription
 */
export async function createPushSubscription(
  vapidPublicKey: string
): Promise<PushSubscriptionData> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications não são suportadas neste navegador');
  }

  // Verifica se o service worker está registrado
  const registration = await navigator.serviceWorker.ready;

  // Cria a subscription usando VAPID
  // Converte a chave pública VAPID para Uint8Array
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true, // Requerido para mostrar notificações
    applicationServerKey: applicationServerKey,
  });

  // Extrai os dados da subscription
  const subscriptionData: PushSubscriptionData = {
    endpoint: subscription.endpoint,
    p256dh: btoa(
      String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))
    ),
    auth: btoa(
      String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))
    ),
  };

  return subscriptionData;
}

/**
 * Salva a subscription no Supabase via API
 * @param subscriptionData - Dados da subscription
 * @returns Promise com o resultado
 */
export async function saveSubscriptionToServer(
  subscriptionData: PushSubscriptionData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtém o token de acesso do Supabase para enviar no header
    const { supabase } = await import('./supabase');
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Adiciona o token de acesso no header se disponível
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      credentials: 'include', // Inclui cookies para autenticação
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao salvar subscription');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao salvar subscription:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido',
    };
  }
}

/**
 * Função completa para ativar push notifications
 * 1. Solicita permissão
 * 2. Cria subscription
 * 3. Salva no servidor
 * 
 * @param vapidPublicKey - Chave pública VAPID
 * @returns Promise com o resultado
 */
export async function enablePushNotifications(
  vapidPublicKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Solicita permissão
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Permissão de notificação negada',
      };
    }

    // 2. Cria subscription
    const subscriptionData = await createPushSubscription(vapidPublicKey);

    // 3. Salva no servidor
    const result = await saveSubscriptionToServer(subscriptionData);
    return result;
  } catch (error: any) {
    console.error('Erro ao ativar push notifications:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido',
    };
  }
}

/**
 * Verifica se já existe uma subscription ativa
 */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Erro ao verificar subscription:', error);
    return false;
  }
}

/**
 * Remove a subscription atual (desativa push notifications)
 */
export async function disablePushNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications não suportadas' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      
      // Opcional: notificar o servidor para remover a subscription do banco
      // await fetch('/api/push/unsubscribe', { method: 'POST' });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao desativar push notifications:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido',
    };
  }
}

