'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';

/**
 * Layout compartilhado para todas as rotas autenticadas
 * O header não recarrega quando navega entre rotas dentro deste layout
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/');
          return;
        }
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Verificar apenas uma vez na montagem do layout

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <AppHeader />
      {children}
    </div>
  );
}

