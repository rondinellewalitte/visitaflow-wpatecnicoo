/**
 * Funções server-side para enviar push notifications
 * 
 * Use estas funções em:
 * - API Routes
 * - Server Components
 * - Server Actions
 * 
 * NÃO use no cliente - use a API route /api/push/send via fetch
 */

import webpush from 'web-push';
import { createAdminSupabaseClient } from './supabase-server';

// Valida variáveis de ambiente VAPID
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@visitaflow.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Interface para o payload da notificação
 */
export interface PushNotificationPayload {
  userId?: string; // ID do usuário (opcional, se não fornecido envia para todos)
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  url?: string; // URL para abrir quando clicar na notificação
}

/**
 * Envia uma notificação push (server-side only)
 * 
 * @param payload - Dados da notificação
 * @returns Promise com o resultado
 */
export async function sendPushNotificationServer(
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  try {
    // Valida variáveis VAPID
    if (!vapidPublicKey || !vapidPrivateKey) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        error: 'VAPID keys não configuradas no servidor',
      };
    }

    // Valida payload
    const { userId, title, body: notificationBody, icon, badge, tag, data, url } = payload;

    if (!title || !notificationBody) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        error: 'Campos obrigatórios: title, body',
      };
    }

    // Busca subscriptions no Supabase (usa admin client para buscar todas)
    const supabase = createAdminSupabaseClient();
    let query = supabase.from('push_subscriptions').select('*');

    // Se userId foi fornecido, filtra por ele
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return {
        success: true,
        sent: 0,
        failed: 0,
      };
    }

    // Prepara o payload da notificação
    const notificationPayload = JSON.stringify({
      title,
      body: notificationBody,
      icon: icon || '/icon.svg',
      badge: badge || '/icon.svg',
      tag: tag || 'visitaflow-notification',
      data: {
        ...data,
        url: url || '/dashboard',
      },
    });

    // Envia notificações para todas as subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        return { success: true, subscriptionId: subscription.id };
      } catch (error: any) {
        console.error(
          `Erro ao enviar notificação para subscription ${subscription.id}:`,
          error
        );

        // Se a subscription é inválida (410 Gone), remove do banco
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }

        return {
          success: false,
          subscriptionId: subscription.id,
          error: error.message,
        };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - successful;

    return {
      success: true,
      sent: successful,
      failed,
    };
  } catch (error: any) {
    console.error('Erro ao enviar push notification:', error);
    return {
      success: false,
      sent: 0,
      failed: 0,
      error: error.message || 'Erro desconhecido',
    };
  }
}

/**
 * Envia notificação para um técnico específico (server-side)
 */
export async function sendPushToTechnicianServer(
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  return sendPushNotificationServer({
    userId,
    title,
    body,
    url: url || '/dashboard',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'visitaflow-notification',
  });
}

/**
 * Envia notificação para todos os técnicos (server-side)
 */
export async function sendPushToAllTechniciansServer(
  title: string,
  body: string,
  url?: string
) {
  return sendPushNotificationServer({
    title,
    body,
    url: url || '/dashboard',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'visitaflow-notification',
  });
}

/**
 * Notifica sobre nova visita (server-side)
 */
export async function notifyNewVisitServer(
  userId: string,
  visitTitle: string,
  visitId: string
) {
  return sendPushNotificationServer({
    userId,
    title: 'Nova Visita Atribuída',
    body: `Você tem uma nova visita: ${visitTitle}`,
    url: `/visit/${visitId}`,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `visit-${visitId}`,
    data: {
      visitId,
      type: 'new_visit',
    },
  });
}

/**
 * Notifica sobre visita hoje (server-side)
 */
export async function notifyVisitTodayServer(
  userId: string,
  visitTitle: string,
  visitId: string
) {
  return sendPushNotificationServer({
    userId,
    title: 'Visita Hoje',
    body: `Você tem uma visita agendada para hoje: ${visitTitle}`,
    url: `/visit/${visitId}`,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `visit-today-${visitId}`,
    data: {
      visitId,
      type: 'visit_today',
    },
  });
}

