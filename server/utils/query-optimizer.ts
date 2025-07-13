/**
 * Utilitários para otimização de consultas ao banco de dados
 */

import { db } from '../db';
import { cacheService } from '../cache-service';
import { SQL, sql } from 'drizzle-orm';

// Interface para opções de consulta
interface QueryOptions {
  // Chave para armazenar no cache (opcional)
  cacheKey?: string;
  // Tempo de vida do cache em ms
  cacheTtl?: number;
  // Usar transação existente (opcional)
  trx?: any;
  // Função para processamento após receber os resultados
  postProcess?: (results: any) => any;
  // Nível de log (0 = nenhum, 1 = básico, 2 = detalhado)
  logLevel?: 0 | 1 | 2;
}

// Tempo padrão de cache em ms (5 minutos)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Executa uma consulta SQL com otimizações (cache, métricas, etc)
 * 
 * @param query Consulta SQL a ser executada
 * @param params Parâmetros para a consulta
 * @param options Opções de otimização
 * @returns Resultados da consulta
 */
export async function optimizedQuery<T>(
  query: SQL,
  options: QueryOptions = {}
): Promise<T> {
  const {
    cacheKey,
    cacheTtl = DEFAULT_CACHE_TTL,
    trx,
    postProcess,
    logLevel = 1
  } = options;

  // Função para executar a consulta
  const executeQuery = async () => {
    const startTime = Date.now();
    
    // Log da consulta
    if (logLevel >= 1) {
      console.log(`[DB] Executando consulta${cacheKey ? ` (${cacheKey})` : ''}`);
    }
    if (logLevel >= 2) {
      console.log(`[DB] Query: ${query.toString()}`);
    }
    
    // Executa a consulta usando a transação ou a conexão padrão
    const queryRunner = trx || db;
    const results = await queryRunner.execute(query);
    
    // Registra métricas de desempenho
    const elapsedTime = Date.now() - startTime;
    if (logLevel >= 1) {
      console.log(`[DB] Consulta concluída em ${elapsedTime}ms, retornando ${Array.isArray(results) ? results.length : 1} resultado(s)`);
    }
    
    // Aplica pós-processamento se fornecido
    const processedResults = postProcess ? postProcess(results) : results;
    
    return processedResults;
  };
  
  // Se não tiver chave de cache, executa a consulta diretamente
  if (!cacheKey) {
    return executeQuery();
  }
  
  // Tenta buscar do cache ou executa a consulta
  return cacheService.getOrSet<T>(
    cacheKey, 
    executeQuery, 
    { ttl: cacheTtl }
  );
}

/**
 * Constrói uma condição SQL WHERE com vários filtros opcionais
 * Ignora automaticamente valores undefined, null, ou strings vazias
 * 
 * @param filters Objeto com filtros onde a chave é o nome da coluna
 * @returns Condição SQL para usar em consultas
 */
export function buildDynamicFilters(filters: Record<string, any>): SQL {
  const conditions: SQL[] = [];
  
  for (const [key, value] of Object.entries(filters)) {
    // Ignora valores vazios
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // Adiciona a condição de acordo com o tipo
    if (Array.isArray(value)) {
      // Para arrays, usa IN
      if (value.length > 0) {
        conditions.push(sql`${sql.identifier(key)} IN (${sql.join(value)})`);
      }
    } else if (typeof value === 'string' && value.includes('%')) {
      // Para strings com %, usa LIKE
      conditions.push(sql`${sql.identifier(key)} LIKE ${value}`);
    } else {
      // Para outros tipos, usa igualdade
      conditions.push(sql`${sql.identifier(key)} = ${value}`);
    }
  }
  
  // Se não houver condições, retorna TRUE
  if (conditions.length === 0) {
    return sql`TRUE`;
  }
  
  // Junta as condições com AND
  return sql.join(conditions, sql` AND `);
}

/**
 * Tenta executar uma função com retentativas em caso de erro
 * Útil para operações que podem falhar temporariamente
 * 
 * @param fn Função a ser executada
 * @param options Opções para retentativas
 * @returns Resultado da função
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    exponentialBackoff?: boolean;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    exponentialBackoff = true,
    shouldRetry = () => true
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Verifica se deve tentar novamente
      if (!shouldRetry(error)) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = exponentialBackoff 
          ? delayMs * Math.pow(2, attempt)
          : delayMs;
          
        console.log(`[Retry] Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}