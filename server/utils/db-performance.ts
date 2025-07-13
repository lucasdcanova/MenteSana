/**
 * Utilitários para análise e otimização de desempenho do banco de dados
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { pool } from '../db';

/**
 * Interface para armazenar métricas de consulta
 */
interface QueryMetrics {
  query: string;
  count: number;
  totalTimeMs: number;
  avgTimeMs: number;
  lastExecutedAt: Date;
}

/**
 * Interface para definição de índice
 */
interface IndexDefinition {
  table: string;
  columns: string[];
  name?: string;
  unique?: boolean;
}

// Armazena métricas de consultas frequentes
const queryMetrics: Map<string, QueryMetrics> = new Map();

/**
 * Registra métricas de uma consulta para análise
 * @param query String da consulta executada
 * @param timeMs Tempo de execução em ms
 */
export function recordQueryMetrics(query: string, timeMs: number): void {
  // Normaliza a consulta (remove espaços extras, quebras de linha, etc.)
  const normalizedQuery = query
    .replace(/\s+/g, ' ')
    .trim();
  
  // Obtém ou cria métricas para esta consulta
  const existingMetrics = queryMetrics.get(normalizedQuery);
  
  if (existingMetrics) {
    // Atualiza as métricas existentes
    existingMetrics.count += 1;
    existingMetrics.totalTimeMs += timeMs;
    existingMetrics.avgTimeMs = existingMetrics.totalTimeMs / existingMetrics.count;
    existingMetrics.lastExecutedAt = new Date();
    queryMetrics.set(normalizedQuery, existingMetrics);
  } else {
    // Cria novas métricas
    queryMetrics.set(normalizedQuery, {
      query: normalizedQuery,
      count: 1,
      totalTimeMs: timeMs,
      avgTimeMs: timeMs,
      lastExecutedAt: new Date()
    });
  }
}

/**
 * Obtém as consultas mais frequentes ou mais lentas
 * @param limit Número máximo de consultas para retornar
 * @param sortBy Campo para ordenação (count=mais frequentes, avgTime=mais lentas)
 * @returns Métricas das consultas ordenadas
 */
export function getTopQueries(limit: number = 10, sortBy: 'count' | 'avgTime' = 'count'): QueryMetrics[] {
  // Converte o mapa para array
  const metricsArray = Array.from(queryMetrics.values());
  
  // Ordena pelo campo especificado
  if (sortBy === 'count') {
    metricsArray.sort((a, b) => b.count - a.count);
  } else {
    metricsArray.sort((a, b) => b.avgTimeMs - a.avgTimeMs);
  }
  
  // Retorna até o limite especificado
  return metricsArray.slice(0, limit);
}

/**
 * Analisa o plano de execução de uma consulta
 * @param query Consulta a ser analisada
 * @returns Detalhes do plano de execução
 */
export async function explainQuery(query: string): Promise<any> {
  try {
    // Executa EXPLAIN ANALYZE na consulta
    const result = await db.execute(sql`EXPLAIN ANALYZE ${sql.raw(query)}`);
    return result;
  } catch (error) {
    console.error('Erro ao analisar a consulta:', error);
    throw error;
  }
}

/**
 * Cria um índice no banco de dados para otimizar consultas frequentes
 * @param indexDef Definição do índice a ser criado
 * @returns Resultado da criação do índice
 */
export async function createIndex(indexDef: IndexDefinition): Promise<any> {
  const { table, columns, name, unique = false } = indexDef;
  
  // Gera um nome para o índice se não foi fornecido
  const indexName = name || `idx_${table}_${columns.join('_')}`;
  
  // Constrói a consulta SQL para criar o índice
  const indexType = unique ? 'UNIQUE INDEX' : 'INDEX';
  const columnsStr = columns.map(col => `"${col}"`).join(', ');
  const query = `CREATE ${indexType} IF NOT EXISTS "${indexName}" ON "${table}" (${columnsStr})`;
  
  try {
    // Executa a criação do índice
    const client = await pool.connect();
    try {
      await client.query(query);
      console.log(`[DB] Índice ${indexName} criado com sucesso para a tabela ${table}`);
      return { success: true, indexName };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[DB] Erro ao criar índice ${indexName}:`, error);
    throw error;
  }
}

/**
 * Lista os índices existentes para uma tabela
 * @param table Nome da tabela
 * @returns Lista de índices
 */
export async function listTableIndexes(table: string): Promise<any[]> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique
        FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
        WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND t.relname = $1
        ORDER BY
          i.relname, a.attnum;
      `, [table]);
      
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[DB] Erro ao listar índices para tabela ${table}:`, error);
    throw error;
  }
}

/**
 * Analisa estatísticas das tabelas e sugere índices para otimização
 * @returns Lista de sugestões de índices
 */
export async function suggestIndexes(): Promise<IndexDefinition[]> {
  try {
    const client = await pool.connect();
    try {
      // Consulta que analisa as tabelas e sugere índices
      const result = await client.query(`
        SELECT
          schemaname,
          relname as table_name,
          seq_scan,
          idx_scan,
          seq_tup_read,
          idx_tup_fetch
        FROM
          pg_stat_user_tables
        WHERE
          seq_scan > idx_scan
          AND seq_scan > 10
        ORDER BY
          seq_scan DESC;
      `);
      
      // Se não houver resultados, não há sugestões
      if (result.rows.length === 0) {
        return [];
      }
      
      // Prepara as sugestões de índices com base nas tabelas mais escaneadas
      const suggestedIndexes: IndexDefinition[] = [];
      
      for (const row of result.rows) {
        // Obtém as colunas frequentemente usadas em WHERE
        const columnsResult = await client.query(`
          SELECT
            attname as column_name
          FROM
            pg_stats
          WHERE
            schemaname = $1
            AND tablename = $2
            AND n_distinct > 0
          ORDER BY
            correlation DESC
          LIMIT 3;
        `, [row.schemaname, row.table_name]);
        
        // Se encontrou colunas, sugere um índice
        if (columnsResult.rows.length > 0) {
          const columns = columnsResult.rows.map(col => col.column_name);
          suggestedIndexes.push({
            table: row.table_name,
            columns
          });
        }
      }
      
      return suggestedIndexes;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DB] Erro ao sugerir índices:', error);
    return [];
  }
}

/**
 * Atualiza as estatísticas do banco de dados para o otimizador de consultas
 */
export async function updateDbStatistics(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('ANALYZE');
      console.log('[DB] Estatísticas do banco de dados atualizadas com sucesso');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DB] Erro ao atualizar estatísticas do banco:', error);
    return false;
  }
}