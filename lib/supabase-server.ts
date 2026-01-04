/**
 * Cliente Supabase para uso em API Routes (server-side)
 * 
 * Para autenticação em API routes, usamos cookies (padrão do Supabase)
 * ou o header Authorization com o token do usuário.
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Garante ao TypeScript que as variáveis são strings (não undefined)
// após a validação acima
const SUPABASE_URL: string = supabaseUrl;
const SUPABASE_ANON_KEY: string = supabaseAnonKey;

/**
 * Cria um cliente Supabase para uso no servidor com autenticação via cookies
 * Use esta função em API Routes do Next.js App Router
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  // Constrói o header Cookie corretamente
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Passa os cookies do request para o Supabase
        Cookie: cookieHeader,
      },
    },
  });
}

/**
 * Cria um cliente Supabase autenticado com um token de acesso específico
 * Use esta função quando você tem o token de acesso do usuário
 */
export function createAuthenticatedSupabaseClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Cria um cliente Supabase usando service role key (sem autenticação de usuário)
 * Use apenas quando precisar de acesso administrativo
 */
export function createAdminSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  }

  return createClient(SUPABASE_URL, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Obtém o token de acesso dos cookies do Supabase
 */
async function getAccessTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    // O Supabase armazena o token em um cookie específico
    // Tenta diferentes nomes de cookies que o Supabase pode usar
    const possibleCookieNames = [
      'sb-access-token',
      'supabase-auth-token',
      `sb-${SUPABASE_URL.split('//')[1]?.split('.')[0]}-auth-token`,
    ];

    for (const cookieName of possibleCookieNames) {
      const cookie = cookieStore.get(cookieName);
      if (cookie) {
        return cookie.value;
      }
    }

    // Tenta obter do cookie padrão do Supabase
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.includes('access-token') || cookie.name.includes('auth-token')) {
        return cookie.value;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Obtém o usuário autenticado a partir dos cookies
 * @param request - Request object do Next.js (opcional, se não fornecido usa cookies)
 * @returns User ou null
 */
export async function getServerUser(request?: Request) {
  try {
    // Primeiro tenta obter o token do header Authorization
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const supabase = await createServerSupabaseClient();
        const {
          data: { user: userFromToken },
          error: tokenError,
        } = await supabase.auth.getUser(token);
        
        if (!tokenError && userFromToken) {
          return userFromToken;
        }
      }
    }

    // Tenta obter a sessão dos cookies
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (session && session.user) {
      return session.user;
    }

    // Tenta obter o token dos cookies e usar diretamente
    const accessToken = await getAccessTokenFromCookies();
    if (accessToken) {
      const {
        data: { user: userFromToken },
        error: tokenError,
      } = await supabase.auth.getUser(accessToken);
      
      if (!tokenError && userFromToken) {
        return userFromToken;
      }
    }

    // Última tentativa: getUser() direto
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (user && !userError) {
      return user;
    }

    // Log para debug
    if (sessionError) {
      console.error('[Auth] Erro ao obter sessão:', sessionError.message);
    }
    if (userError) {
      console.error('[Auth] Erro ao obter usuário:', userError.message);
    }

    return null;
  } catch (error: any) {
    console.error('[Auth] Erro ao obter usuário do servidor:', error.message);
    return null;
  }
}

