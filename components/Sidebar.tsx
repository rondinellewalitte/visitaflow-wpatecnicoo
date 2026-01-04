'use client';

import { useEffect } from 'react';
import PushNotificationManager from './PushNotificationManager';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

/**
 * Menu lateral (Sidebar) com configurações
 * Inclui configurações de notificações push e logout
 */
export default function Sidebar({ isOpen, onClose, onLogout }: SidebarProps) {
  // Fecha o sidebar quando pressiona ESC
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Previne scroll do body quando sidebar está aberto
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay (fundo escuro) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Menu lateral"
      >
        <div className="flex flex-col h-full">
          {/* Header do Sidebar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Configurações
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Fechar menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Conteúdo do Sidebar */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Seção de Notificações */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 uppercase tracking-wide mb-4">
                  Notificações
                </h3>
                <PushNotificationManager />
              </section>

              {/* Seção de Conta */}
              <section className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 uppercase tracking-wide mb-4">
                  Conta
                </h3>
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sair da Conta
                </button>
              </section>

              {/* Espaço para futuras configurações */}
              {/* <section>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 uppercase tracking-wide mb-4">
                  Outras Configurações
                </h3>
                <div className="space-y-4">
                  {/* Futuras configurações aqui */}
                {/* </div>
              </section> */}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

