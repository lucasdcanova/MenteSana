import { Request, Response, NextFunction } from 'express';
import { createApiError, ErrorCode } from './error-handler';
import rateLimit from 'express-rate-limit';

// Middleware para verificar CSRF Token
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Implementação simples de verificação CSRF baseada em tokens
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  
  // Obter token armazenado da sessão ou usar método personalizado
  const storedToken = req.session && (req.session as any).csrfToken;
  
  // Verifica se é uma solicitação que precisa de proteção CSRF (POST, PUT, DELETE)
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    // Apenas verificamos em produção e quando a sessão existe
    if (process.env.NODE_ENV === 'production' && req.session && !req.path.includes('/webhook')) {
      if (!csrfToken || csrfToken !== storedToken) {
        console.warn(`Possível ataque CSRF detectado: ${req.method} ${req.path}`);
        return next(createApiError(
          ErrorCode.AUTHORIZATION_ERROR,
          'Token CSRF inválido ou ausente',
          403
        ));
      }
    }
  }
  
  next();
}

// Limitador de taxa para rotas de pagamento (proteção contra força bruta)
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // limite de 20 solicitações por janela por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: ErrorCode.AUTHORIZATION_ERROR,
      message: 'Muitas solicitações de pagamento. Tente novamente mais tarde.',
      status: 429
    }
  },
  skip: (req) => {
    // Pulamos a limitação para webhooks do Stripe
    return req.path.includes('/webhook');
  }
});

// Registro de atividades de pagamento
export function paymentLogger(req: Request, res: Response, next: NextFunction) {
  // Log da atividade
  const userId = req.user?.id || 'não autenticado';
  const ip = req.ip || req.socket.remoteAddress || 'desconhecido';
  const userAgent = req.headers['user-agent'] || 'desconhecido';
  
  // Log com dados sensíveis reduzidos
  const safeBody = { ...req.body };
  if (safeBody.cardToken) safeBody.cardToken = '***redacted***';
  if (safeBody.cardNumber) safeBody.cardNumber = '***redacted***';
  if (safeBody.cvv) safeBody.cvv = '***redacted***';
  
  console.log(`[PAGAMENTO] ${req.method} ${req.path} | Usuário: ${userId} | IP: ${ip} | UA: ${userAgent.substring(0, 50)}... | Dados: ${JSON.stringify(safeBody)}`);
  
  // Monitoramento de resposta
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[PAGAMENTO] Resposta: ${res.statusCode} | Tamanho: ${body?.length || 0} bytes`);
    return originalSend.call(this, body);
  };
  
  next();
}