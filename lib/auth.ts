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
 * Helper para obter o usuário atual
 * @returns User atual ou null
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Helper para obter a sessão atual
 */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

