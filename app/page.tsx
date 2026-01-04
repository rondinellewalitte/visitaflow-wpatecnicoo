'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from '@/lib/auth';

// Schema de validação com Zod
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema as any),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { user, error: signInError } = await signIn(data.email, data.password);

      if (signInError) {
        setError(signInError.message || 'Erro ao fazer login');
        setLoading(false);
        return;
      }

      if (user) {
        // Login bem-sucedido, redirecionar para o dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black px-3 sm:px-4 py-4 sm:py-8 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col items-center mb-4 sm:mb-6">
            <Image
              src="/icon.svg"
              alt="VisitaFlow Logo"
              width={64}
              height={64}
              className="mb-3 sm:mb-4 w-14 h-14 sm:w-16 sm:h-16"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-center text-black dark:text-zinc-50">
              VisitaFlow - Técnico
            </h1>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                disabled={loading}
                className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 disabled:opacity-50 text-sm sm:text-base"
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                disabled={loading}
                className="w-full px-3 sm:px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008B1C] dark:bg-zinc-800 dark:text-zinc-50 disabled:opacity-50 text-sm sm:text-base"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-medium py-2.5 sm:py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
