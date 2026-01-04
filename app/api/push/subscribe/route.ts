/**
 * API Route: /api/push/subscribe
 * 
 * Salva a subscription de push notification do usuário no Supabase
 * 
 * Método: POST
 * Body: { endpoint: string, p256dh: string, auth: string }
 * Headers: Authorization: Bearer <token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // 1. Obtém o token de acesso do header Authorization
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return NextResponse.json(
        { message: 'Token de acesso não fornecido' },
        { status: 401 }
      );
    }

    // 2. Verifica autenticação
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 3. Valida o body
    const body = await request.json();
    const { endpoint, p256dh, auth } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { message: 'Campos obrigatórios: endpoint, p256dh, auth' },
        { status: 400 }
      );
    }

    // 4. Cria cliente Supabase autenticado com o token (necessário para RLS)
    const { createAuthenticatedSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    // 5. Verifica se já existe uma subscription com o mesmo endpoint para este usuário
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .single();

    // 6. Insere ou atualiza a subscription
    const subscriptionData = {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      // Atualiza subscription existente
      const { data, error } = await supabase
        .from('push_subscriptions')
        .update(subscriptionData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insere nova subscription
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(
      {
        success: true,
        subscription: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao salvar subscription:', error);
    return NextResponse.json(
      {
        message: error.message || 'Erro ao salvar subscription',
      },
      { status: 500 }
    );
  }
}

