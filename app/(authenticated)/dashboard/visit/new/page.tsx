'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getCurrentUser, getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { createVisitFormSchema, type CreateVisitFormInput } from '@/schemas/visit.schema';
import { localDateTimeToUTC } from '@/lib/utils';
import type { Client, Employee } from '@/lib/types';

export default function NewVisitPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateVisitFormInput>({
    resolver: zodResolver(createVisitFormSchema),
    defaultValues: {
      scheduled_time: '08:00',
      visit_type: 'installation',
      status: 'open',
    },
  });

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/');
          return;
        }
        setUser(currentUser);

        // Carregar clientes
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name')
          .order('name');

        if (clientsError) throw clientsError;
        setClients(clientsData || []);

        // Carregar funcionários
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('id, name, role, is_active')
          .eq('is_active', true)
          .order('name');

        if (employeesError) throw employeesError;
        setEmployees(employeesData || []);
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  const onSubmit = async (data: CreateVisitFormInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Converter data/hora local para UTC
      const scheduledDateUTC = localDateTimeToUTC(data.scheduled_date, data.scheduled_time);

      // Obter sessão para enviar token no header
      const session = await getSession();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Adiciona o token de acesso no header se disponível
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/visits', {
        method: 'POST',
        headers,
        credentials: 'include', // Inclui cookies para autenticação
        body: JSON.stringify({
          client_id: data.client_id,
          title: data.title,
          description: data.description || null,
          scheduled_date: scheduledDateUTC,
          visit_type: data.visit_type,
          status: data.status,
          notes: data.notes || null,
          assigned_to: data.assigned_to && data.assigned_to !== '' ? data.assigned_to : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao criar visita');
      }

      // Sucesso - redirecionar para o dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Erro ao criar visita:', err);
      setError(err.message || 'Ocorreu um erro ao criar a visita');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-zinc-50">Criar Nova Visita</h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Cliente */}
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Cliente *
            </label>
            <select
              id="client_id"
              {...register('client_id')}
              className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 text-base"
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.client_id.message}</p>
            )}
          </div>

          {/* Título */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              id="title"
              {...register('title')}
              className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 text-base"
            />
            {errors.title && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Descrição
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 text-base"
            />
            {errors.description && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="scheduled_date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Data Agendada *
              </label>
              <input
                type="date"
                id="scheduled_date"
                {...register('scheduled_date')}
                className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 text-base"
              />
              {errors.scheduled_date && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.scheduled_date.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="scheduled_time" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Hora *
              </label>
              <input
                type="time"
                id="scheduled_time"
                {...register('scheduled_time')}
                className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 text-base"
              />
              {errors.scheduled_time && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.scheduled_time.message}</p>
              )}
            </div>
          </div>

          {/* Tipo de Visita */}
          <div>
            <label htmlFor="visit_type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Tipo de Visita *
            </label>
            <select
              id="visit_type"
              {...register('visit_type')}
              className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 text-base"
            >
              <option value="installation">Instalação</option>
              <option value="maintenance">Manutenção</option>
              <option value="delivery">Entrega</option>
              <option value="inspection">Visita Técnica</option>
              <option value="equipment_pickup">Buscar Equipamento</option>
            </select>
            {errors.visit_type && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.visit_type.message}</p>
            )}
          </div>

          {/* Atribuir a Funcionário */}
          <div>
            <label htmlFor="assigned_to" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Atribuir a Funcionário
            </label>
            <select
              id="assigned_to"
              {...register('assigned_to')}
              className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 text-base"
            >
              <option value="">Não atribuído</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} {employee.role && `(${employee.role})`}
                </option>
              ))}
            </select>
            {errors.assigned_to && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.assigned_to.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Status *
            </label>
            <select
              id="status"
              {...register('status')}
              className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 text-base"
            >
              <option value="open">Aberta</option>
              <option value="completed">Finalizada</option>
              <option value="canceled">Cancelada</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.status.message}</p>
            )}
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Observações
            </label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={3}
              className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 text-base"
            />
            {errors.notes && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.notes.message}</p>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#008B1C] hover:bg-[#006B15] disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Criando...' : 'Criar Visita'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
