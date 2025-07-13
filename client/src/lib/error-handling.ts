import { ErrorType } from '@/components/ui/error-handler';

// Erros personalizados
export class NetworkError extends Error {
  constructor(message: string = 'Erro de conexão com o servidor') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class APIError extends Error {
  status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

export class AuthError extends Error {
  constructor(message: string = 'Erro de autenticação') {
    super(message);
    this.name = 'AuthError';
  }
}

export class AIServiceError extends Error {
  constructor(message: string = 'Serviço de IA indisponível') {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Função para determinar o tipo de erro
export function getErrorType(error: Error): ErrorType {
  if (error instanceof NetworkError) return 'network';
  if (error instanceof AuthError) return 'authentication';
  if (error instanceof AIServiceError) return 'ai';
  if (error instanceof APIError) {
    if (error.status === 401 || error.status === 403) {
      return 'authorization';
    }
    return 'api';
  }
  return 'unknown';
}

// Função de ajuda para envolver chamadas de API com tratamento de erro
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  options: {
    fallback?: () => Promise<T> | T;
    errorMessage?: string;
    networkErrorMessage?: string;
    authErrorMessage?: string;
  } = {}
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call error:', error);
    
    // Tratar diferentes tipos de erros
    if (error instanceof Error) {
      if ('status' in error && (error as any).status === 401) {
        throw new AuthError(options.authErrorMessage || 'Sua sessão expirou. Por favor, faça login novamente.');
      }
      
      if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('connection')) {
        throw new NetworkError(options.networkErrorMessage || 'Erro de conexão. Verifique sua internet.');
      }
      
      // Se o erro já for um dos nossos tipos personalizados, apenas repasse
      if (
        error instanceof NetworkError || 
        error instanceof APIError || 
        error instanceof AuthError ||
        error instanceof AIServiceError
      ) {
        throw error;
      }
      
      // Erro genérico da API
      throw new APIError(options.errorMessage || error.message);
    }
    
    // Erro desconhecido
    throw new APIError(options.errorMessage || 'Ocorreu um erro desconhecido');
  }
}

// Wrapper específico para serviços de IA
export async function withAIErrorHandling<T>(
  aiCall: () => Promise<T>,
  fallback: () => Promise<T> | T,
  errorMessage?: string
): Promise<T> {
  try {
    return await aiCall();
  } catch (error) {
    console.warn('AI service error, using fallback:', error);
    
    try {
      // Tentar usar o fallback
      return typeof fallback === 'function' ? await fallback() : fallback;
    } catch (fallbackError) {
      // Se o fallback também falhar, lançar um erro de serviço de IA
      console.error('AI fallback also failed:', fallbackError);
      throw new AIServiceError(errorMessage || 'Não foi possível processar com IA. Tente novamente mais tarde.');
    }
  }
}

// Detector de problemas de rede
export function detectNetworkIssues(): boolean {
  return !navigator.onLine;
}

// Logger global de erros
export function logError(error: Error, context?: Record<string, any>): void {
  console.error(`[MindWell Error] ${error.name}: ${error.message}`, {
    timestamp: new Date().toISOString(),
    context: context || {},
    stack: error.stack
  });
  
  // Aqui você poderia adicionar envio para um serviço de monitoramento de erros
}

// Função para criar uma mensagem de erro amigável a partir de um erro técnico
export function getFriendlyErrorMessage(error: Error): string {
  // Mapeamento de mensagens técnicas para mensagens amigáveis
  const errorMap: Record<string, string> = {
    'Failed to fetch': 'Não foi possível conectar ao servidor. Verifique sua conexão de internet.',
    'Network request failed': 'Ocorreu um problema de rede. Verifique sua conexão.',
    'Unauthorized': 'Sua sessão expirou. Por favor, faça login novamente.',
    'OPENAI_API_KEY está faltando': 'O serviço de inteligência artificial está temporariamente indisponível.',
    'Request failed with status code 429': 'Estamos recebendo muitas solicitações. Por favor, tente novamente em alguns minutos.',
  };
  
  // Verificar padrões comuns de mensagens de erro
  for (const pattern in errorMap) {
    if (error.message.includes(pattern)) {
      return errorMap[pattern];
    }
  }
  
  // Mensagens baseadas no tipo de erro
  if (error instanceof NetworkError) {
    return 'Ocorreu um problema de conexão. Verifique se você está conectado à internet e tente novamente.';
  }
  
  if (error instanceof AuthError) {
    return 'Houve um problema com sua autenticação. Por favor, faça login novamente.';
  }
  
  if (error instanceof AIServiceError) {
    return 'O serviço de inteligência artificial está temporariamente indisponível. Estamos usando análises alternativas.';
  }
  
  // Mensagem genérica para outros tipos de erro
  return 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';
}