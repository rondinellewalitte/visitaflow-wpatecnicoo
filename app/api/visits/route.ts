import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUser, createAdminSupabaseClient } from '@/lib/supabase-server';
import { createVisitSchema, updateVisitSchema } from '@/schemas/visit.schema';

/**
 * POST /api/visits - Criar nova visita
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Obter dados do body
    const body = await request.json();
    
    // Validar schema
    const validatedData = createVisitSchema.parse(body);

    // Usar admin client para bypass de RLS
    const supabase = createAdminSupabaseClient();

    // Buscar o employee para obter company_id
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1);

    if (employeeError || !employees || employees.length === 0) {
      return NextResponse.json(
        { error: 'Employee não encontrado para o usuário' },
        { status: 400 }
      );
    }

    const companyId = employees[0].company_id;
    if (!companyId) {
      return NextResponse.json(
        { error: 'Employee não possui company_id' },
        { status: 400 }
      );
    }

    // Inserir visita no banco
    const { data: visits, error } = await supabase
      .from('visits')
      .insert({
        company_id: companyId,
        client_id: validatedData.client_id,
        title: validatedData.title,
        description: validatedData.description,
        scheduled_date: validatedData.scheduled_date,
        visit_type: validatedData.visit_type,
        status: validatedData.status,
        notes: validatedData.notes,
        assigned_to: validatedData.assigned_to,
        created_by: user.id,
      })
      .select();

    if (error) {
      console.error('Erro ao criar visita:', error);
      return NextResponse.json(
        { error: error.message || 'Erro ao criar visita' },
        { status: 500 }
      );
    }

    if (!visits || visits.length === 0) {
      return NextResponse.json(
        { error: 'Falha ao criar visita - nenhum registro retornado' },
        { status: 500 }
      );
    }

    return NextResponse.json(visits[0], { status: 201 });
  } catch (error: any) {
    console.error('Erro na API de criar visita:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/visits - Atualizar visita existente
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Obter dados do body
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da visita é obrigatório' },
        { status: 400 }
      );
    }

    // Validar schema (permitindo campos opcionais)
    const validatedData = updateVisitSchema.parse({ id, ...updateData });

    // Remover o id dos dados de atualização
    const { id: _, ...dataToUpdate } = validatedData;

    // Usar admin client para bypass de RLS
    const supabase = createAdminSupabaseClient();

    // Atualizar visita no banco
    const { data: visits, error } = await supabase
      .from('visits')
      .update({
        ...dataToUpdate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao atualizar visita:', error);
      // Se o erro for PGRST116, significa que não encontrou a visita
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        return NextResponse.json(
          { error: 'Visita não encontrada' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar visita' },
        { status: 500 }
      );
    }

    if (!visits || visits.length === 0) {
      return NextResponse.json(
        { error: 'Visita não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(visits[0]);
  } catch (error: any) {
    console.error('Erro na API de atualizar visita:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
