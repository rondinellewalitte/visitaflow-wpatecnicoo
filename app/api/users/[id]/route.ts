import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }

    // Criar cliente admin para acessar auth.users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Primeiro, tentar buscar através de employees (se houver name/email lá)
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name, user_id, email')
      .eq('user_id', userId)
      .single();

    if (!employeeError && employeeData && (employeeData.name || employeeData.email)) {
      return NextResponse.json({
        id: userId,
        email: employeeData.email || employeeData.name || 'Usuário',
        name: employeeData.name || employeeData.email || 'Usuário',
      });
    }

    // Se não encontrar no employees, busca através de auth.users usando admin client
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (!userError && user) {
      return NextResponse.json({
        id: user.id,
        email: user.email || 'Usuário',
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Usuário',
      });
    }

    // Se não conseguir buscar, retorna apenas o ID
    return NextResponse.json({
      id: userId,
      email: 'Usuário desconhecido',
      name: 'Usuário desconhecido',
    });
  } catch (error: any) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuário', details: error.message },
      { status: 500 }
    );
  }
}

