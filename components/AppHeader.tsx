'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getCurrentUser, signOut } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';
import Sidebar from './Sidebar';

/**
 * Header compartilhado para páginas autenticadas
 * Não recarrega quando navega entre rotas autenticadas
 */
export default function AppHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Carregar dados do usuário apenas uma vez
  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          // Buscar o nome do user metadata
          if (currentUser.user_metadata?.full_name || currentUser.user_metadata?.name) {
            setEmployeeName(currentUser.user_metadata.full_name || currentUser.user_metadata.name);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar usuário:', err);
      }
    }

    loadUser();
  }, []); // Array vazio - executa apenas uma vez

  // Função para fazer logout
  async function handleLogout() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo e Nome */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Image
                src="/icon.svg"
                alt="VisitaFlow Logo"
                width={36}
                height={36}
                className="flex-shrink-0"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                  VisitaFlow
                </h1>
                {employeeName || user?.email ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {employeeName || user?.email}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Botão Menu (Hambúrguer) */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                aria-label="Abrir menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onLogout={handleLogout}
      />
    </>
  );
}

