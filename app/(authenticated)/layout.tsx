'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession, getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
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
        // Primeiro, tenta restaurar a sessão do localStorage
        const session = await getSession();
        
        if (session?.user) {
          // Sessão válida encontrada
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }

        // Se não houver sessão, tenta getUser() (pode fazer requisição ao servidor)
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          // Nenhuma sessão válida encontrada, redirecionar para login
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

    // Listener para mudanças de autenticação (logout, expiração, etc)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        // Usuário deslogou ou sessão expirou
        setIsAuthenticated(false);
        router.push('/');
        router.refresh();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Sessão restaurada ou token atualizado
        setIsAuthenticated(true);
      }
    });

    // Cleanup: remover listener quando componente desmontar
    return () => {
      subscription.unsubscribe();
    };
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

