import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import Stripe from 'stripe';

// Enum para códigos de erro
export enum ErrorCode {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  PAYMENT_ERROR = 'payment_error',
  NOT_FOUND = 'not_found',
  INTERNAL_ERROR = 'internal_error',
  AUTHORIZATION_ERROR = 'authorization_error',
}

// Interface para erros estruturados
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
  status: number;
}

// Função para criar um erro da API
export function createApiError(
  code: ErrorCode, 
  message: string, 
  status: number = 400, 
  details?: any
): ApiError {
  return { code, message, status, details };
}

// Middleware para tratar erros
export function errorHandler(
  err: Error | ApiError | ZodError | Stripe.StripeRawError, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  console.error('Erro capturado pelo middleware:', err);
  
  // Caso já seja um ApiError
  if ('code' in err && 'status' in err) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || undefined
      }
    });
  }
  
  // Trata erros de validação do Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Dados inválidos fornecidos',
        details: err.errors
      }
    });
  }
  
  // Trata erros específicos do Stripe
  if ('type' in err && typeof err.type === 'string' && err.type.toString().startsWith('Stripe')) {
    // Mapeia códigos de erro do Stripe para HTTP status
    let status = 400;
    const stripeType = err.type.toString();
    
    if (stripeType.includes('StripeCardError')) status = 402;
    if (stripeType.includes('StripeInvalidRequestError')) status = 400;
    if (stripeType.includes('StripeAuthenticationError')) status = 401;
    if (stripeType.includes('StripeRateLimitError')) status = 429;
    if (stripeType.includes('StripeAPIError')) status = 500;
    
    return res.status(status).json({
      error: {
        code: ErrorCode.PAYMENT_ERROR,
        message: err.message || 'Erro no processamento do pagamento',
        details: {
          type: stripeType,
          code: (err as any).code,
          param: (err as any).param
        }
      }
    });
  }
  
  // Erro genérico
  return res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: err.message || 'Erro interno do servidor'
    }
  });
}

// Middleware para tratar async
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}