import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Helper para fazer login do técnico
 * @param email - Email do técnico
 * @param password - Senha do técnico
 * @returns Objeto com user e error
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    error,
  };
}

/**
 * Helper para fazer logout
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Helper para obter a sessão atual
 * Prioriza getSession() que restaura a sessão do localStorage
 * @returns Session atual ou null
 */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Helper para obter o usuário atual
 * Primeiro tenta restaurar a sessão, depois obtém o usuário
 * @returns User atual ou null
 */
export async function getCurrentUser(): Promise<User | null> {
  // Primeiro, tenta obter a sessão (restaura do localStorage)
  const session = await getSession();
  if (session?.user) {
    return session.user;
  }
  
  // Se não houver sessão, tenta getUser() (pode fazer requisição ao servidor)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Verifica se existe uma sessão válida
 * Útil para verificar autenticação sem fazer requisição ao servidor
 * @returns true se existe sessão válida, false caso contrário
 */
export async function hasValidSession(): Promise<boolean> {
  const session = await getSession();
  if (!session) {
    return false;
  }
  
  // Verifica se a sessão não expirou
  const expiresAt = session.expires_at;
  if (expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    return expiresAt > now;
  }
  
  return true;
}

