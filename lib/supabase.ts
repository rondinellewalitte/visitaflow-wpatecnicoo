import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase
// Usa variáveis de ambiente para URL e chave anônima
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validação das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Helper para obter storage (localStorage quando disponível, caso contrário memory)
function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  // Fallback para memória quando localStorage não está disponível
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

// Cliente Supabase singleton para uso no cliente
// Configurado para persistir sessão no localStorage e restaurar automaticamente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: getStorage(),
  },
});

