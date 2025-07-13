/**
 * Serviço de cache para melhorar o desempenho de consultas frequentes
 * 
 * Este serviço implementa um sistema de cache em memória com expiração 
 * para reduzir a carga no banco de dados e melhorar os tempos de resposta.
 */

// Interface para configuração de cada entrada no cache
interface CacheOptions {
  // Tempo de vida do item em cache (em ms)
  ttl: number;
  // Se o cache deve ser invalidado quando ocorrer uma mutação relacionada
  invalidateOnMutation?: boolean;
  // Função para verificar se o cache deve ser invalidado
  // Recebe os dados da mutação e retorna true se o cache deve ser invalidado
  shouldInvalidate?: (mutationData: any) => boolean;
}

// Interface para as entradas do cache
interface CacheEntry<T> {
  // Dados armazenados em cache
  data: T;
  // Timestamp de expiração
  expiresAt: number;
  // Opções de cache
  options: CacheOptions;
}

// Classe principal do serviço de cache
export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private static instance: CacheService;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos por padrão

  // Implementação do padrão Singleton
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Obtém um item do cache
   * @param key Chave do item
   * @returns Os dados em cache ou undefined se não encontrado/expirado
   */
  public get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    // Verifica se o item existe e não expirou
    if (entry && entry.expiresAt > Date.now()) {
      console.log(`[Cache] Hit: ${key}`);
      return entry.data as T;
    }
    
    // Se o item expirou, remover do cache
    if (entry) {
      console.log(`[Cache] Expired: ${key}`);
      this.cache.delete(key);
    } else {
      console.log(`[Cache] Miss: ${key}`);
    }
    
    return undefined;
  }

  /**
   * Armazena um item no cache
   * @param key Chave do item
   * @param data Dados a serem armazenados
   * @param options Opções de cache
   */
  public set<T>(key: string, data: T, options?: Partial<CacheOptions>): void {
    const ttl = options?.ttl || this.DEFAULT_TTL;
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      options: {
        ttl,
        invalidateOnMutation: options?.invalidateOnMutation ?? true,
        shouldInvalidate: options?.shouldInvalidate
      }
    });
    
    console.log(`[Cache] Set: ${key}, expires in ${ttl/1000}s`);
  }

  /**
   * Remove um item do cache
   * @param key Chave do item
   */
  public delete(key: string): void {
    this.cache.delete(key);
    console.log(`[Cache] Deleted: ${key}`);
  }

  /**
   * Limpa o cache inteiro
   */
  public clear(): void {
    this.cache.clear();
    console.log(`[Cache] Cleared all entries`);
  }

  /**
   * Obtém dados do cache se disponíveis ou executa a função e armazena o resultado
   * @param key Chave para o item no cache
   * @param fn Função para obter os dados caso não estejam em cache
   * @param options Opções de cache
   * @returns Os dados do cache ou da execução da função
   */
  public async getOrSet<T>(
    key: string, 
    fn: () => Promise<T>, 
    options?: Partial<CacheOptions>
  ): Promise<T> {
    // Verifica se existe no cache
    const cachedData = this.get<T>(key);
    if (cachedData !== undefined) {
      return cachedData;
    }
    
    // Executa a função para obter os dados
    const data = await fn();
    
    // Armazena no cache
    this.set(key, data, options);
    
    return data;
  }

  /**
   * Notifica o sistema de cache sobre uma mutação para invalidar entradas relacionadas
   * @param entity Entidade que foi modificada (ex: 'session', 'user')
   * @param id Identificador da entidade
   * @param data Dados da mutação
   */
  public notifyMutation(entity: string, id: any, data?: any): void {
    console.log(`[Cache] Mutation: ${entity} ${id}`);
    
    // Prefixos de chaves que devem ser invalidados
    const prefixesToInvalidate = [`${entity}:`, `${entity}_${id}:`];
    
    // Entidades relacionadas que também devem ser invalidadas
    const relatedEntities: Record<string, string[]> = {
      'user': ['sessions', 'therapist', 'payments', 'streaks'],
      'session': ['therapist', 'user', 'payments'],
      'payment': ['user', 'sessions'],
      'therapist': ['sessions', 'users'],
      'journal': ['user', 'recommendations'],
      'notification': ['user']
    };
    
    // Adiciona prefixos para entidades relacionadas
    if (relatedEntities[entity]) {
      relatedEntities[entity].forEach(related => {
        prefixesToInvalidate.push(`${related}:`);
        prefixesToInvalidate.push(`${related}_${id}:`);
      });
    }
    
    // Usando Array.from para evitar o erro com MapIterator
    const entries = Array.from(this.cache.entries());
    
    // Itera sobre o cache e verifica quais entradas devem ser invalidadas
    for (const [key, entry] of entries) {
      // Ignora entradas que não devem ser invalidadas em mutações
      if (!entry.options.invalidateOnMutation) {
        continue;
      }
      
      // Se a chave começa com algum dos prefixos, invalida
      const shouldInvalidateByPrefix = prefixesToInvalidate.some(prefix => 
        key.startsWith(prefix)
      );
      
      // Verifica se deve invalidar por uma função personalizada
      const shouldInvalidateByFunction = entry.options.shouldInvalidate && 
        entry.options.shouldInvalidate(data);
      
      if (shouldInvalidateByPrefix || shouldInvalidateByFunction) {
        this.delete(key);
      }
    }
  }
}

// Exporta a instância global do serviço de cache
export const cacheService = CacheService.getInstance();