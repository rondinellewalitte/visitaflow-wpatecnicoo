/**
 * Exemplo de função para enviar push notifications
 * 
 * Esta função pode ser chamada de qualquer lugar do código (servidor ou cliente)
 * para enviar notificações push para técnicos.
 * 
 * IMPORTANTE: Esta função requer o header x-internal-secret para segurança.
 * Configure INTERNAL_SECRET no .env.local
 */

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
 * Envia uma notificação push
 * 
 * @param payload - Dados da notificação
 * @returns Promise com o resultado
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  try {
    // Busca o secret interno das variáveis de ambiente
    // No cliente, você precisará passar isso de forma segura
    // No servidor, pode usar process.env.INTERNAL_SECRET diretamente
    const internalSecret =
      typeof window === 'undefined'
        ? process.env.INTERNAL_SECRET || process.env.VAPID_SUBJECT || 'change-me-in-production'
        : 'change-me-in-production'; // No cliente, você precisaria de uma forma segura de passar isso

    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao enviar notificação');
    }

    const result = await response.json();
    return {
      success: true,
      sent: result.sent || 0,
      failed: result.failed || 0,
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
 * Exemplo de uso: Enviar notificação para um técnico específico
 */
export async function sendPushToTechnician(
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  return sendPushNotification({
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
 * Exemplo de uso: Enviar notificação para todos os técnicos
 */
export async function sendPushToAllTechnicians(
  title: string,
  body: string,
  url?: string
) {
  return sendPushNotification({
    title,
    body,
    url: url || '/dashboard',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'visitaflow-notification',
  });
}

/**
 * Exemplo de uso: Notificar sobre nova visita
 */
export async function notifyNewVisit(
  userId: string,
  visitTitle: string,
  visitId: string
) {
  return sendPushNotification({
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
 * Exemplo de uso: Notificar sobre visita hoje
 */
export async function notifyVisitToday(
  userId: string,
  visitTitle: string,
  visitId: string
) {
  return sendPushNotification({
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
    // requireInteraction: true, // Mantém a notificação visível até o usuário interagir
  });
}

