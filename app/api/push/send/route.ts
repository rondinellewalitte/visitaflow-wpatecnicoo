/**
 * API Route: /api/push/send
 * 
 * Envia uma notificação push para um ou mais usuários
 * 
 * Método: POST
 * Body: {
 *   userId?: string,  // ID do usuário (opcional, se não fornecido envia para todos)
 *   title: string,
 *   body: string,
 *   icon?: string,
 *   badge?: string,
 *   tag?: string,
 *   data?: object,
 *   url?: string,     // URL para abrir quando clicar na notificação
 * }
 * Headers: 
 *   Authorization: Bearer <token> (opcional, para autenticação)
 *   x-internal-secret: <secret> (obrigatório para segurança)
 */

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

// Valida variáveis de ambiente VAPID
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@visitaflow.com';
const internalSecret = process.env.INTERNAL_SECRET || process.env.VAPID_SUBJECT || 'change-me-in-production';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn(
    '⚠️  VAPID keys não configuradas. Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no .env.local'
  );
}

// Configura web-push com as chaves VAPID
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verifica o secret interno (proteção da rota)
    const internalSecretHeader = request.headers.get('x-internal-secret');
    if (internalSecretHeader !== internalSecret) {
      return NextResponse.json(
        { message: 'Acesso não autorizado. Secret inválido.' },
        { status: 401 }
      );
    }

    // 2. Valida variáveis VAPID
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { message: 'VAPID keys não configuradas no servidor' },
        { status: 500 }
      );
    }

    // 3. Valida o body
    const body = await request.json();
    const { userId, title, body: notificationBody, icon, badge, tag, data, url } = body;

    if (!title || !notificationBody) {
      return NextResponse.json(
        { message: 'Campos obrigatórios: title, body' },
        { status: 400 }
      );
    }

    // 4. Busca subscriptions no Supabase (usa admin client para buscar todas)
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
      return NextResponse.json(
        {
          message: 'Nenhuma subscription encontrada',
          sent: 0,
        },
        { status: 200 }
      );
    }

    // 5. Prepara o payload da notificação
    const payload = JSON.stringify({
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

    // 6. Envia notificações para todas as subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
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

        return { success: false, subscriptionId: subscription.id, error: error.message };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return NextResponse.json(
      {
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao enviar push notification:', error);
    return NextResponse.json(
      {
        message: error.message || 'Erro ao enviar notificação',
      },
      { status: 500 }
    );
  }
}

