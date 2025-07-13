/**
 * Utilitários para otimização de cache no frontend
 */

// Tempo em milissegundos para cada TTL de cache
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,    // 1 minuto
  MEDIUM: 5 * 60 * 1000,   // 5 minutos
  LONG: 30 * 60 * 1000,    // 30 minutos
  VERY_LONG: 24 * 60 * 60 * 1000 // 24 horas
};

/**
 * Opções para configuração do staleTime de queries React Query
 * Tempos maiores de stale time reduzem requisições ao servidor
 */
export const STALE_TIMES = {
  // Dados que mudam frequentemente (como mensagens)
  FREQUENT: 30 * 1000,           // 30 segundos
  
  // Dados que mudam ocasionalmente (como status)
  OCCASIONAL: 2 * 60 * 1000,     // 2 minutos
  
  // Dados semi-estáticos (como lista de terapeutas)
  SEMI_STATIC: 15 * 60 * 1000,   // 15 minutos
  
  // Dados estáticos (como tópicos de grupos)
  STATIC: 60 * 60 * 1000         // 1 hora
};

/**
 * Cria uma chave de cache padronizada para consultas
 * 
 * @param baseKey - Chave base (ex: 'therapists')
 * @param params - Parâmetros a serem incluídos na chave
 * @returns Chave formatada para o cache
 */
export function createCacheKey(baseKey: string, params?: Record<string, any>): string[] {
  if (!params || Object.keys(params).length === 0) {
    return [baseKey];
  }
  
  const sortedParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  
  return [baseKey, JSON.stringify(Object.fromEntries(sortedParams))];
}

/**
 * Gera um hash simples de uma string para uso em chaves de cache
 * Útil para chaves muito longas
 * 
 * @param value String para gerar hash
 * @returns Hash numérico
 */
export function simpleHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Prefetch de dados críticos para melhorar a experiência do usuário
 * em telas específicas
 * 
 * @param queryClient Cliente de consulta do React Query
 */
export function prefetchCriticalData(queryClient: any) {
  // Prefetch do estado emocional
  queryClient.prefetchQuery({
    queryKey: ['/api/emotional-state'],
    staleTime: STALE_TIMES.OCCASIONAL
  });
  
  // Prefetch de streaks
  queryClient.prefetchQuery({
    queryKey: ['/api/streaks'],
    staleTime: STALE_TIMES.OCCASIONAL
  });
  
  // Prefetch de notificações
  queryClient.prefetchQuery({
    queryKey: ['/api/notifications'],
    staleTime: STALE_TIMES.FREQUENT
  });
}