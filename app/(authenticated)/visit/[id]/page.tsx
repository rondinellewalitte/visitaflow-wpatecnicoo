'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Tipo para a visita conforme o schema do banco
interface Visita {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: string;
  visit_type: string;
  scheduled_date: string;
  assigned_to: string;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

// Tipo para o cliente
interface Cliente {
  id: string;
  name: string;
}

// Tipo para o usuário criador
interface UsuarioCriador {
  id: string;
  email: string;
  name?: string;
}

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params.id as string;

  const [visita, setVisita] = useState<Visita | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [criador, setCriador] = useState<UsuarioCriador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Carregar visita (autenticação já verificada no layout)
  useEffect(() => {
    async function loadVisit() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          await loadVisitData(currentUser.id);
        }
      } catch (err) {
        console.error('Erro ao carregar visita:', err);
        setError('Erro ao carregar visita');
        setLoading(false);
      }
    }

    loadVisit();
  }, [visitId]);

  // Função para carregar visita do técnico
  async function loadVisitData(userId: string) {
    try {
      setLoading(true);
      setError(null);

      // Primeiro, buscar o employee pelo user_id
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (employeeError) {
        throw employeeError;
      }

      if (!employee) {
        setError('Técnico não encontrado');
        setLoading(false);
        return;
      }

      // Buscar visita pelo id e verificar que pertence ao técnico
      const { data: visitaData, error: visitaError } = await supabase
        .from('visits')
        .select('*')
        .eq('id', visitId)
        .eq('assigned_to', employee.id)
        .single();

      if (visitaError) {
        throw visitaError;
      }

      if (!visitaData) {
        setError('Visita não encontrada ou você não tem permissão para visualizá-la');
        setLoading(false);
        return;
      }

      setVisita(visitaData);

      // Buscar dados do cliente
      if (visitaData.client_id) {
        const { data: clienteData, error: clienteError } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', visitaData.client_id)
          .single();

        if (!clienteError && clienteData) {
          setCliente(clienteData);
        }
      }

      // Buscar dados do usuário criador
      if (visitaData.created_by) {
        try {
          const response = await fetch(`/api/users/${visitaData.created_by}`);
          if (response.ok) {
            const userData = await response.json();
            setCriador(userData);
          }
        } catch (err) {
          console.error('Erro ao buscar usuário criador:', err);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar visita:', err);
      setError(err.message || 'Erro ao carregar visita');
    } finally {
      setLoading(false);
    }
  }

  // Função para concluir visita
  async function handleCompleteVisit() {
    if (!visita) return;

    try {
      setCompleting(true);
      setError(null);
      setSuccessMessage(null);

      // Preparar dados para atualização
      const updateData: any = {
        status: 'completed',
        updated_at: new Date().toISOString(),
      };

      // Tentar atualizar completed_at se o campo existir
      try {
        updateData.completed_at = new Date().toISOString();
      } catch {
        // Ignorar se o campo não existir
      }

      // Atualizar visita no Supabase
      const { error: updateError } = await supabase
        .from('visits')
        .update(updateData)
        .eq('id', visita.id);

      if (updateError) {
        throw updateError;
      }

      // Sucesso - mostrar mensagem e redirecionar
      setSuccessMessage('Visita concluída com sucesso!');
      
      // Redirecionar para dashboard após 1 segundo
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao concluir visita:', err);
      setError(err.message || 'Erro ao concluir visita');
      setCompleting(false);
    }
  }

  // Formatar data para exibição
  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  // Formatar hora para exibição
  function formatTime(dateString: string) {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  // Verificar se a data é hoje
  function isToday(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  }

  // Traduzir status para português
  function translateStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'open': 'Aberto',
      'pending': 'Pendente',
      'em_aberto': 'Em Aberto',
      'pendente': 'Pendente',
      'agendada': 'Agendada',
      'completed': 'Concluída',
      'concluida': 'Concluída',
      'cancelled': 'Cancelada',
      'cancelada': 'Cancelada',
    };
    return statusMap[status.toLowerCase()] || status;
  }

  // Traduzir tipo de visita para português
  function translateVisitType(visitType: string): string {
    const typeMap: Record<string, string> = {
      'installation': 'Instalação',
      'instalacao': 'Instalação',
      'maintenance': 'Manutenção',
      'manutencao': 'Manutenção',
      'repair': 'Reparo',
      'reparo': 'Reparo',
      'inspection': 'Inspeção',
      'inspecao': 'Inspeção',
      'delivery': 'Entrega',
      'entrega': 'Entrega',
      'consultation': 'Consulta',
      'consulta': 'Consulta',
    };
    return typeMap[visitType.toLowerCase()] || visitType;
  }

  // Verificar se o status está aberto
  function isStatusOpen(status: string): boolean {
    const openStatuses = ['open', 'pending', 'em_aberto', 'pendente', 'agendada'];
    return openStatuses.includes(status.toLowerCase());
  }

  // Retornar classes do badge de status
  function getStatusBadgeClasses(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'open' || statusLower === 'em_aberto' || statusLower === 'aberto') {
      return 'bg-green-500 text-white';
    }
    if (statusLower === 'pending' || statusLower === 'pendente') {
      return 'bg-yellow-500 text-white';
    }
    if (statusLower === 'agendada') {
      return 'bg-blue-500 text-white';
    }
    if (statusLower === 'completed' || statusLower === 'concluida' || statusLower === 'concluída') {
      return 'bg-gray-500 text-white';
    }
    if (statusLower === 'cancelled' || statusLower === 'cancelada') {
      return 'bg-red-500 text-white';
    }
    return 'bg-green-500 text-white';
  }

  // Retornar classes de tema do card baseado no status
  function getCardThemeClasses(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'open' || statusLower === 'em_aberto' || statusLower === 'aberto') {
      return 'border-green-200 dark:border-green-900/30 bg-green-50/30 dark:bg-green-950/20';
    }
    if (statusLower === 'pending' || statusLower === 'pendente') {
      return 'border-yellow-200 dark:border-yellow-900/30 bg-yellow-50/30 dark:bg-yellow-950/20';
    }
    if (statusLower === 'agendada') {
      return 'border-blue-200 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/20';
    }
    if (statusLower === 'completed' || statusLower === 'concluida' || statusLower === 'concluída') {
      return 'border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/20';
    }
    if (statusLower === 'cancelled' || statusLower === 'cancelada') {
      return 'border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/20';
    }
    return '';
  }

  // Mostrar loading inicial
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não tem visita, não renderizar
  if (!visita) {
    return null;
  }

  return (
    <>
      {/* Conteúdo */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
        {/* Botão Voltar */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-3 sm:mb-4 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 flex items-center gap-2"
        >
          ← Voltar para o dashboard
        </button>

        <h2 className="text-xl sm:text-2xl font-semibold text-black dark:text-zinc-50 mb-3 sm:mb-4">
          Detalhes da Visita
        </h2>

        {/* Mensagens de erro e sucesso */}
        {error && (
          <div className="mb-3 sm:mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-3 sm:mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
            <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        {/* Card com detalhes da visita */}
        <div className={`bg-white dark:bg-zinc-900 rounded-xl border-2 shadow-sm p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 ${
          getCardThemeClasses(visita.status) || 'border-zinc-200 dark:border-zinc-800'
        }`}>
          {/* Badges e Título */}
          <div className="flex items-start justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex-1 min-w-0">
              {/* Badge HOJE se aplicável */}
              {visita.scheduled_date && isToday(visita.scheduled_date) && (
                <div className="mb-2 sm:mb-3">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-500 text-white uppercase tracking-wide">
                    Hoje
                  </span>
                </div>
              )}
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-900 dark:text-zinc-50 uppercase leading-tight">
                {visita.title || 'Sem título'}
              </h3>
            </div>
            <span
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-full text-white whitespace-nowrap flex-shrink-0 ${getStatusBadgeClasses(visita.status)}`}
            >
              {translateStatus(visita.status)}
            </span>
          </div>

          {/* Informações da visita */}
          <div className="space-y-4 sm:space-y-6">
            {/* Cliente com localização */}
            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5 sm:mb-2">
                Cliente
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {cliente?.name || 'Cliente não encontrado'}
                </span>
              </div>
              {/* Ícone de localização */}
              <div className="flex items-start gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Localização disponível na visita
                </span>
              </div>
            </div>

            {/* Tipo da visita */}
            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5 sm:mb-2">
                Tipo da Visita
              </span>
              <span className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-50">
                {visita.visit_type ? translateVisitType(visita.visit_type) : '-'}
              </span>
            </div>

            {/* Data e Horário agendado */}
            {visita.scheduled_date && (
              <div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5 sm:mb-2">
                  Data Agendada
                </span>
                <div className="space-y-2 sm:space-y-3">
                  <span className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-50 block">
                    {formatDate(visita.scheduled_date)}
                  </span>
                  {/* Horário destacado */}
                  <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg max-w-fit">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 dark:text-zinc-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {formatTime(visita.scheduled_date)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Descrição */}
            {visita.description && (
              <div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5 sm:mb-2">
                  Descrição
                </span>
                <p className="text-sm sm:text-base text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap leading-relaxed">
                  {visita.description}
                </p>
              </div>
            )}

            {/* Criado por */}
            {criador && (
              <div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5 sm:mb-2">
                  Criado por
                </span>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-50">
                    {criador.name || criador.email}
                  </span>
                </div>
              </div>
            )}

            {/* Observações */}
            {visita.notes && (
              <div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5 sm:mb-2">
                  Observações
                </span>
                <p className="text-sm sm:text-base text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap leading-relaxed">
                  {visita.notes}
                </p>
              </div>
            )}
          </div>

          {/* Botão Concluir Visita - somente se status estiver aberto */}
          {isStatusOpen(visita.status) && (
            <div className="pt-4 sm:pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleCompleteVisit}
                disabled={completing || !!successMessage}
                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-[#008B1C] text-white text-sm sm:text-base font-medium rounded-lg hover:bg-[#007015] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {completing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Concluindo...
                  </>
                ) : (
                  'Concluir Visita'
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

