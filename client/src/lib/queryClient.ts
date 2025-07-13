import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { STALE_TIMES } from "./caching-utils";
import { Storage } from "./capacitor";

// Token de autenticação
let authToken: string | null = null;
const AUTH_TOKEN_KEY = 'authToken';

// Função para definir o token
export async function setAuthToken(token: string) {
  console.log(`Token de autenticação definido: ${token.substring(0, 8)}...`);
  authToken = token;
  try {
    await Storage.setItem(AUTH_TOKEN_KEY, token);
  } catch (e) {
    console.error("Erro ao salvar token:", e);
  }
}

// Função para obter o token salvo
export async function getAuthTokenAsync(): Promise<string | null> {
  // Para desenvolvimento, retornar um token fixo para o usuário ID 1 se não houver token
  const token_de_desenvolvimento = '1_teste_token_fixo_para_desenvolvimento';
  
  if (!authToken) {
    try {
      const savedToken = await Storage.getItem(AUTH_TOKEN_KEY);
      authToken = savedToken || token_de_desenvolvimento;
      if (authToken === token_de_desenvolvimento) {
        console.log("⚠️ Usando token de desenvolvimento para teste");
      }
    } catch (e) {
      console.error("Erro ao carregar token:", e);
      authToken = token_de_desenvolvimento;
    }
  }
  return authToken;
}

// Versão síncrona para compatibilidade com código existente
export function getAuthToken(): string | null {
  // Para desenvolvimento, retornar um token fixo para o usuário ID 1 se não houver token
  const token_de_desenvolvimento = '1_teste_token_fixo_para_desenvolvimento';
  
  return authToken || token_de_desenvolvimento;
}

// Função para limpar o token
export async function clearAuthToken() {
  console.log("Token de autenticação removido");
  authToken = null;
  try {
    await Storage.removeItem(AUTH_TOKEN_KEY);
  } catch (e) {
    console.error("Erro ao remover token:", e);
  }
}

// Tenta carregar o token do storage na inicialização
(async () => {
  try {
    const savedToken = await Storage.getItem(AUTH_TOKEN_KEY);
    if (savedToken) {
      authToken = savedToken;
      console.log(`Token de autenticação restaurado do storage: ${savedToken.substring(0, 8)}...`);
    }
  } catch (e) {
    console.error("Erro ao carregar token do storage:", e);
  }
})();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Tentar parsear o erro como JSON primeiro
      const errorData = await res.json();
      throw new Error(`${res.status}: ${errorData.message || JSON.stringify(errorData)}`);
    } catch (e) {
      // Se não for JSON, obter o texto como fallback
      const text = await res.text() || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

/**
 * Função para fazer requisições à API
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    body?: FormData | string;
    headers?: HeadersInit;
    signal?: AbortSignal;
  }
): Promise<Response> {
  console.log(`${method} ${url} - Enviando request`, 
    options?.body ? 'com body personalizado' : 
    data ? (typeof data === 'object' ? 'com dados' : 'com dados') : 'sem dados');
  
  // Adicionar cabeçalhos para melhorar o cache
  const headers: HeadersInit = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...options?.headers,
  };
  
  // Adicionar Content-Type apenas se não for FormData e tivermos dados
  if (!options?.body && data) {
    const customHeaders = headers as Record<string, string>;
    customHeaders['Content-Type'] = 'application/json';
  }
  
  // Adicionar token de autenticação se disponível - SEMPRE ADICIONAR EM REQUISIÇÕES DELETE
  const token = getAuthToken();
  if (token) {
    const customHeaders = headers as Record<string, string>;
    customHeaders['Authorization'] = `Bearer ${token}`;
    console.log(`${method} ${url} - Adicionando token de autenticação: ${token.substring(0, 8)}...`);
  } else if (method === 'DELETE') {
    console.warn(`${method} ${url} - ATENÇÃO: Token não disponível para requisição DELETE!`);
  }
  
  // Certificar-se de que para operações DELETE, o token esteja presente
  if (method === 'DELETE' && !token) {
    try {
      // Tentar buscar do armazenamento novamente, de forma forçada
      const forcedToken = await Storage.getItem(AUTH_TOKEN_KEY);
      if (forcedToken) {
        console.log(`${method} ${url} - Recuperando token forçadamente do armazenamento nativo: ${forcedToken.substring(0, 8)}...`);
        const customHeaders = headers as Record<string, string>;
        customHeaders['Authorization'] = `Bearer ${forcedToken}`;
        // Atualizar o token em memória também
        authToken = forcedToken;
      } else {
        console.error(`${method} ${url} - ERRO CRÍTICO: Tentativa de DELETE sem token!`);
      }
    } catch (e) {
      console.error(`${method} ${url} - Erro ao buscar token para DELETE:`, e);
    }
  }
  
  try {
    // Log detalhado para operações DELETE
    if (method === 'DELETE') {
      console.log(`${method} ${url} - Headers completos:`, JSON.stringify(headers));
    }
    
    const res = await fetch(url, {
      method,
      headers,
      body: options?.body || (data ? JSON.stringify(data) : undefined),
      credentials: "include",
      signal: options?.signal
    });

    console.log(`${method} ${url} - Status:`, res.status);
    
    // Para operações DELETE, mostrar detalhes da resposta
    if (method === 'DELETE') {
      try {
        const responseText = await res.clone().text();
        console.log(`${method} ${url} - Resposta:`, responseText);
      } catch (e) {
        console.log(`${method} ${url} - Não foi possível ler resposta como texto.`);
      }
    }
    
    // Se for 401 (não autenticado), podemos redirecionar para a página de login
    if (res.status === 401) {
      console.warn(`${method} ${url} - Não autenticado (401), talvez redirecionando para login`);
      // Esse código pode ser ativado se quisermos redirecionar automaticamente
      // window.location.href = "/auth";
      // return res;
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Verificar se o erro é um problema de rede
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`${method} ${url} - Erro de rede na requisição:`, error.message);
      throw new Error(`Erro de conexão com o servidor. Verifique sua conexão à internet ou tente novamente mais tarde.`);
    }
    
    console.error(`${method} ${url} - Erro na requisição:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";

/**
 * Função de consulta para o TanStack Query
 */
export const getQueryFn: <T>(options?: {
  on401: UnauthorizedBehavior;
  signal?: AbortSignal;
}) => QueryFunction<T> =
  (options = { on401: "throw" }) =>
  async ({ queryKey, signal }) => {
    const unauthorizedBehavior = options.on401;
    const url = queryKey[0] as string;
    console.log(`GET ${url} - Iniciando request com on401=${unauthorizedBehavior}`);
    
    try {
      // Preparar headers
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      };
      
      // Adicionar token de autenticação se disponível
      const token = getAuthToken();
      if (token) {
        const customHeaders = headers as Record<string, string>;
        customHeaders['Authorization'] = `Bearer ${token}`;
        console.log(`GET ${url} - Adicionando token de autenticação`);
      }
      
      const res = await fetch(url, {
        credentials: "include",
        headers,
        signal: signal || options?.signal
      });

      console.log(`GET ${url} - Status:`, res.status);

      // Tratamento específico para 401
      if (res.status === 401) {
        console.warn(`GET ${url} - Resposta 401 (Não autorizado)`);
        
        if (unauthorizedBehavior === "returnNull") {
          console.log(`GET ${url} - Retornando null devido a 401`);
          // Limpar o cache do usuário para forçar a re-autenticação
          queryClient.setQueryData(["/api/user"], null);
          return null;
        } else if (unauthorizedBehavior === "redirect") {
          console.log(`GET ${url} - Redirecionando para /auth devido a 401`);
          // Limpar cache primeiro
          queryClient.setQueryData(["/api/user"], null);
          window.location.href = "/auth";
          return null;
        }
        // Se for "throw", seguimos para o throwIfResNotOk abaixo
      }

      await throwIfResNotOk(res);
      
      // Tentar parsear como JSON
      try {
        const data = await res.json();
        console.log(`GET ${url} - Dados recebidos (resumo):`, 
          Array.isArray(data) ? `Array com ${data.length} itens` : 'Objeto');
        return data;
      } catch (error) {
        console.error(`GET ${url} - Erro ao parsear JSON:`, error);
        throw new Error(`Erro ao processar resposta do servidor: ${String(error)}`);
      }
    } catch (error) {
      // Verificar se é um erro de rede
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`GET ${url} - Erro de rede na consulta:`, error.message);
        throw new Error(`Erro de conexão com o servidor. Verifique sua conexão à internet ou tente novamente mais tarde.`);
      }
      
      console.error(`GET ${url} - Erro na consulta:`, error);
      throw error;
    }
  };

/**
 * Cliente de consulta para o TanStack Query com configurações otimizadas
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Habilitar para recarregar ao voltar à janela
      staleTime: STALE_TIMES.OCCASIONAL, // Tempo padrão de 2 minutos
      retry: 1, // Fazer uma tentativa adicional em caso de falha
      gcTime: 10 * 60 * 1000, // 10 minutos de tempo de coleta de lixo (garbage collection)
    },
    mutations: {
      retry: 1, // Fazer uma tentativa adicional em caso de falha
    },
  },
});

// Prefetch inicial de dados críticos assim que a aplicação carregar
// Isso é mais simples e evita problemas de tipagem com o subscribe
setTimeout(() => {
  import('./caching-utils').then(({ prefetchCriticalData }) => {
    prefetchCriticalData(queryClient);
  });
}, 1000);
