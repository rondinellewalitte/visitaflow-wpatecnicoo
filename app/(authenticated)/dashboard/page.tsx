'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Tipo para as visitas conforme o schema do banco
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
}

// Tipo para o usuário criador
interface UsuarioCriador {
  id: string;
  email: string;
  name?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [criadores, setCriadores] = useState<Record<string, UsuarioCriador>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingVisitas, setLoadingVisitas] = useState(true);

  // Carregar visitas (autenticação já verificada no layout)
  useEffect(() => {
    async function loadUserAndVisitas() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          await loadVisitas(currentUser.id);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar dados');
        setLoadingVisitas(false);
      }
    }

    loadUserAndVisitas();
  }, []);

  useEffect(() => {
    if (!user) return;
  
    let channel: any;
  
    async function setupRealtime() {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();
  
      if (!employee) return;
  
      channel = supabase
        .channel(`visits-tech-${employee.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT | UPDATE
            schema: 'public',
            table: 'visits',
          },
          (payload) => {
            const newVisit = payload.new as any;
  
            // Só reage se a visita for do técnico
            if (newVisit?.assigned_to === employee.id) {
              console.log('🔄 Realtime update', payload);
              loadVisitas(user.id);
            }
          }
        )
        .subscribe();
    }
  
    setupRealtime();
  
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
  
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        console.log('👀 App voltou para o foco — recarregando visitas');
        loadVisitas(user.id);
      }
    }
  
    function handleFocus() {
      console.log('🎯 App recebeu foco — recarregando visitas');
      loadVisitas(user.id);
    }
  
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
  
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);
  
  

  // Função para carregar visitas do técnico
  async function loadVisitas(userId: string) {
    try {
      setLoadingVisitas(true);
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
        setVisitas([]);
        return;
      }

      // Buscar visitas filtradas por assigned_to (employee.id) e status em aberto
      const { data, error: fetchError } = await supabase
        .from('visits')
        .select('*')
        .eq('assigned_to', employee.id)
        .in('status', ['open', 'pending', 'em_aberto', 'pendente', 'agendada'])
        .order('scheduled_date', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setVisitas(data || []);

      // Buscar dados dos usuários criadores
      if (data && data.length > 0) {
        const createdByIds = data
          .map(v => v.created_by)
          .filter((id): id is string => id !== null && id !== undefined);
        
        const uniqueIds = [...new Set(createdByIds)];
        
        if (uniqueIds.length > 0) {
          const criadoresMap: Record<string, UsuarioCriador> = {};
          
          // Buscar dados dos usuários através de uma API route
          for (const userId of uniqueIds) {
            try {
              const response = await fetch(`/api/users/${userId}`);
              if (response.ok) {
                const userData = await response.json();
                criadoresMap[userId] = userData;
              }
            } catch (err) {
              console.error(`Erro ao buscar usuário ${userId}:`, err);
            }
          }
          
          setCriadores(criadoresMap);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar visitas:', err);
      setError(err.message || 'Erro ao carregar visitas');
    } finally {
      setLoadingVisitas(false);
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
      'maintenance': 'Manutenção',
      'delivery': 'Entrega',
      'inspection': 'Visita Técnica',
      'equipment_pickup': 'Buscar Equipamento',
    };
    return typeMap[visitType.toLowerCase()] || visitType;
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

  return (
    <>
      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-6">
          Minhas Visitas
        </h2>

        {/* Erro */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading das visitas */}
        {loadingVisitas ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">Carregando visitas...</p>
          </div>
        ) : visitas.length === 0 ? (
          // Lista vazia
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400">
              Nenhuma visita em aberto no momento.
            </p>
          </div>
        ) : (
          // Lista de visitas em cards (mobile-first)
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visitas.map((visita) => {
              const cardTheme = getCardThemeClasses(visita.status);
              const isTodayVisit = visita.scheduled_date && isToday(visita.scheduled_date);
              
              return (
                <div
                  key={visita.id}
                  onClick={() => router.push(`/visit/${visita.id}`)}
                  className={`bg-white dark:bg-zinc-900 rounded-xl border-2 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer p-5 sm:p-6 flex flex-col ${
                    cardTheme || 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {/* Badges no topo: HOJE e Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isTodayVisit && (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-500 text-white uppercase tracking-wide">
                          Hoje
                        </span>
                      )}
                    </div>
                    <span 
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${getStatusBadgeClasses(visita.status)}`}
                    >
                      {visita.status ? translateStatus(visita.status) : '-'}
                    </span>
                  </div>

                  {/* Header com título */}
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-tight line-clamp-2 uppercase mb-4">
                    {visita.title || 'Sem título'}
                  </h3>

                  {/* Informações secundárias */}
                  <div className="space-y-3 flex-1">
                    {/* Tipo da visita */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        Tipo
                      </span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {visita.visit_type ? translateVisitType(visita.visit_type) : '-'}
                      </span>
                    </div>

                    {/* Data e Horário agendado */}
                    {visita.scheduled_date && (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                            Data Agendada
                          </span>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {formatDate(visita.scheduled_date)}
                          </span>
                        </div>
                        {/* Horário destacado */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                          <svg
                            className="w-4 h-4 text-zinc-600 dark:text-zinc-400 flex-shrink-0"
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
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                            {formatTime(visita.scheduled_date)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Localização */}
                    <div className="flex items-start gap-2 pt-1">
                      <svg
                        className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5"
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
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 flex-1">
                        Ver localização na visita
                      </span>
                    </div>

                    {/* Criado por */}
                    {visita.created_by && criadores[visita.created_by] && (
                      <div className="flex items-center gap-2 pt-2">
                        <svg
                          className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0"
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
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                            Criado por
                          </span>
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                            {criadores[visita.created_by].name || criadores[visita.created_by].email}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Descrição (se houver) */}
                    {visita.description && (
                      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                          Descrição
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {visita.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

