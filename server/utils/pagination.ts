/**
 * Utilidades para implementação de paginação em endpoints da API
 */
import { storage } from "../storage";
import { eq, gte, lte, desc, SQL, and, sql } from "drizzle-orm";
import { sessions, type Session } from "@shared/schema";
import { db } from "../db";

// Interface para parâmetros de paginação
export interface PaginationParams {
  page?: number;       // Número da página (começando em 1)
  limit?: number;      // Número de itens por página
  orderBy?: string;    // Campo para ordenação
  order?: 'asc' | 'desc'; // Direção da ordenação
}

// Interface para filtros específicos de sessão
export interface SessionFilters {
  status?: string;     // Filtro por status de sessão
  fromDate?: Date;     // Filtro por data de início
  toDate?: Date;       // Filtro por data de fim
  userId?: number;     // Filtro por ID do usuário
  therapistId?: number; // Filtro por ID do terapeuta
}

// Interface para resultados paginados
export interface PaginatedResult<T> {
  data: T[];           // Array de itens para a página atual
  pagination: {
    totalItems: number;  // Total de itens disponíveis
    totalPages: number;  // Número total de páginas
    currentPage: number; // Página atual
    itemsPerPage: number; // Itens por página
    hasNextPage: boolean; // Se existe uma próxima página
    hasPreviousPage: boolean; // Se existe uma página anterior
  };
}

// Constantes para valores padrão
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

/**
 * Busca sessões paginadas de acordo com os filtros fornecidos
 * @param params Parâmetros de paginação
 * @param filters Filtros específicos para sessões
 * @returns Resultado paginado com as sessões
 */
export async function getPaginatedSessions(
  params: PaginationParams,
  filters: SessionFilters = {}
): Promise<PaginatedResult<Session>> {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, orderBy = 'scheduledFor', order = 'desc' } = params;
  const offset = (page - 1) * limit;

  // Construir os filtros para a consulta
  const whereConditions: SQL[] = [];
  
  if (filters.status) {
    whereConditions.push(eq(sessions.status, filters.status));
  }
  
  if (filters.fromDate) {
    whereConditions.push(gte(sessions.scheduledFor, filters.fromDate));
  }
  
  if (filters.toDate) {
    whereConditions.push(lte(sessions.scheduledFor, filters.toDate));
  }
  
  if (filters.userId !== undefined) {
    whereConditions.push(eq(sessions.userId, filters.userId));
  }
  
  if (filters.therapistId !== undefined) {
    whereConditions.push(eq(sessions.therapistId, filters.therapistId));
  }
  
  // Executar a consulta para contar o total de itens
  const totalItemsResult = await db.select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
  
  const totalItems = Number(totalItemsResult[0].count);
  
  // Executar a consulta para obter os dados paginados
  let query = db.select().from(sessions);
  
  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions));
  }
  
  // Aplicar ordenação
  // Corrigindo a ordenação para evitar erro de SQL
  const orderColumn = sessions[orderBy as keyof typeof sessions] as any;
  if (orderColumn) {
    if (order === 'desc') {
      query = query.orderBy(desc(orderColumn));
    } else {
      query = query.orderBy(orderColumn);
    }
  }
  
  const data = await query.limit(limit).offset(offset);
  
  return buildPaginatedResult(data, totalItems, params);
}

/**
 * Conta o número total de sessões para um usuário com os filtros fornecidos
 * @param userId ID do usuário
 * @param filters Filtros adicionais
 * @returns Total de sessões
 */
export async function countSessionsWithFilters(
  userId: number,
  filters: Omit<SessionFilters, 'userId'> = {}
): Promise<number> {
  // Construir os filtros para a consulta
  const whereConditions: SQL[] = [eq(sessions.userId, userId)];
  
  if (filters.status) {
    whereConditions.push(eq(sessions.status, filters.status));
  }
  
  if (filters.fromDate) {
    whereConditions.push(gte(sessions.scheduledFor, filters.fromDate));
  }
  
  if (filters.toDate) {
    whereConditions.push(lte(sessions.scheduledFor, filters.toDate));
  }
  
  if (filters.therapistId !== undefined) {
    whereConditions.push(eq(sessions.therapistId, filters.therapistId));
  }
  
  // Executar a consulta para contar
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(and(...whereConditions));
    
  return Number(result[0].count);
}

/**
 * Processa e sanitiza os parâmetros de paginação da requisição
 * @param params Parâmetros brutos da requisição
 * @returns Parâmetros de paginação sanitizados
 */
export function sanitizePaginationParams(params: any): PaginationParams {
  let page = params.page ? parseInt(params.page) : DEFAULT_PAGE;
  let limit = params.limit ? parseInt(params.limit) : DEFAULT_LIMIT;
  
  // Sanitização dos parâmetros
  page = isNaN(page) || page < 1 ? DEFAULT_PAGE : page;
  limit = isNaN(limit) || limit < 1 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
  
  const orderBy = params.orderBy && typeof params.orderBy === 'string' 
    ? params.orderBy 
    : undefined;
    
  const order = params.order === 'desc' ? 'desc' : 'asc';
  
  return { page, limit, orderBy, order };
}

/**
 * Calcula os valores de offset e limit para SQL a partir dos parâmetros de paginação
 * @param params Parâmetros de paginação
 * @returns Objeto com offset e limit para uso em queries SQL
 */
export function getPaginationValues(params: PaginationParams): { offset: number, limit: number } {
  const page = params.page || DEFAULT_PAGE;
  const limit = params.limit || DEFAULT_LIMIT;
  
  // Calcula o offset com base na página e limite
  const offset = (page - 1) * limit;
  
  return { offset, limit };
}

/**
 * Constrói um objeto de resultado paginado
 * @param data Dados da página atual
 * @param totalItems Total de itens disponíveis
 * @param params Parâmetros de paginação usados
 * @returns Resultado paginado formatado
 */
export function buildPaginatedResult<T>(
  data: T[], 
  totalItems: number, 
  params: PaginationParams
): PaginatedResult<T> {
  const page = params.page || DEFAULT_PAGE;
  const limit = params.limit || DEFAULT_LIMIT;
  
  // Calcula o total de páginas
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    data,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
}