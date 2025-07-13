import { Request, Response, Router } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { 
  createPaymentIntentSchema, 
  attachPaymentMethodSchema, 
  refundPaymentSchema 
} from '../validators/payment-validators';
import { 
  errorHandler, 
  asyncHandler, 
  createApiError, 
  ErrorCode 
} from '../middlewares/error-handler';
import { 
  paymentRateLimiter, 
  paymentLogger, 
  csrfProtection 
} from '../middlewares/payment-security';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Chave secreta do Stripe não configurada (STRIPE_SECRET_KEY)');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Cria o router com os middlewares de segurança
const router = Router();
router.use(paymentLogger);
router.use(paymentRateLimiter);
router.use(csrfProtection);

/**
 * Cria uma intenção de pagamento (PaymentIntent)
 * @route POST /api/payments/create-payment-intent
 */
router.post('/create-payment-intent', asyncHandler(async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    throw createApiError(
      ErrorCode.AUTHENTICATION_ERROR,
      'Usuário não autenticado',
      401
    );
  }

  const userId = req.user!.id;
  const validationResult = createPaymentIntentSchema.safeParse(req.body);

  if (!validationResult.success) {
    throw createApiError(
      ErrorCode.VALIDATION_ERROR,
      'Dados de pagamento inválidos',
      400,
      validationResult.error.errors
    );
  }

  const { amount, currency, description, sessionId, metadata } = validationResult.data;

  // Busca informações do usuário para incluir como customer
  const user = await storage.getUser(userId);
  if (!user) {
    throw createApiError(
      ErrorCode.NOT_FOUND,
      'Usuário não encontrado',
      404
    );
  }

  let stripeCustomerId = user.stripeCustomerId;

  // Se o usuário não tiver um customerId no Stripe, cria um novo
  if (!stripeCustomerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: userId.toString()
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Atualiza o usuário com o customerId do Stripe
      await storage.updateUserStripeInfo(userId, { 
        stripeCustomerId
      });
    } catch (error) {
      console.error('Erro ao criar cliente no Stripe:', error);
      throw createApiError(
        ErrorCode.PAYMENT_ERROR,
        'Erro ao criar cliente no Stripe',
        500
      );
    }
  }

  // Cria a intenção de pagamento no Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Converte para centavos
    currency,
    customer: stripeCustomerId,
    description: description || 'Pagamento de serviço de terapia',
    metadata: {
      ...metadata,
      userId: userId.toString(),
      ...(sessionId ? { sessionId: sessionId.toString() } : {})
    }
  });

  // Registra o pagamento no banco de dados
  await storage.createPaymentRecord({
    userId,
    paymentIntentId: paymentIntent.id,
    amount: amount,
    currency,
    description: description || 'Pagamento de serviço de terapia',
    sessionId: sessionId || null,
    status: 'pending'
  });

  // Retorna o client_secret para confirmar o pagamento no frontend
  res.json({ 
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  });
}));

/**
 * Webhook para processar eventos do Stripe
 * @route POST /api/payments/webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    return res.status(500).json({ error: 'Chave do webhook não configurada' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      endpointSecret
    );
  } catch (err: any) {
    console.error(`Erro na assinatura do webhook: ${err.message}`);
    return res.status(400).json({ error: `Erro na assinatura do webhook: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(failedPayment);
        break;
      
      case 'charge.refunded':
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      
      // Outros eventos podem ser adicionados conforme necessário
      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`Erro ao processar evento ${event.type}:`, error);
    res.status(500).json({ error: `Erro ao processar evento: ${error.message}` });
  }
});

/**
 * Manipula evento de pagamento bem-sucedido
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const paymentRecord = await storage.getPaymentRecordByStripeId(paymentIntent.id);
    if (!paymentRecord) {
      console.error(`Pagamento não encontrado para o ID: ${paymentIntent.id}`);
      return;
    }

    // Atualiza o status do pagamento no banco de dados
    await storage.updatePaymentRecord(paymentRecord.id, {
      status: 'completed',
      updatedAt: new Date(),
      stripeChargeId: paymentIntent.latest_charge as string
    });

    // Se há uma sessão associada, atualiza seu status para 'confirmed'
    if (paymentRecord.sessionId) {
      const session = await storage.getSession(paymentRecord.sessionId);
      if (session && session.status === 'pending_payment') {
        await storage.updateSession(paymentRecord.sessionId, {
          status: 'confirmed',
          paymentStatus: 'paid'
        });
      }
    }

    // Notificação ao usuário pode ser enviada aqui
  } catch (error) {
    console.error('Erro ao processar pagamento bem-sucedido:', error);
    throw error;
  }
}

/**
 * Manipula evento de pagamento falho
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const paymentRecord = await storage.getPaymentRecordByStripeId(paymentIntent.id);
    if (!paymentRecord) {
      console.error(`Pagamento não encontrado para o ID: ${paymentIntent.id}`);
      return;
    }

    // Atualiza o status do pagamento no banco de dados
    await storage.updatePaymentRecord(paymentRecord.id, {
      status: 'failed',
      updatedAt: new Date(),
      failureReason: paymentIntent.last_payment_error?.message || 'Pagamento falhou'
    });

    // Se há uma sessão associada, atualiza seu status
    if (paymentRecord.sessionId) {
      const session = await storage.getSession(paymentRecord.sessionId);
      if (session && session.status === 'pending_payment') {
        await storage.updateSession(paymentRecord.sessionId, {
          status: 'payment_failed'
        });
      }
    }

    // Notificação ao usuário pode ser enviada aqui
  } catch (error) {
    console.error('Erro ao processar pagamento falho:', error);
    throw error;
  }
}

/**
 * Manipula evento de reembolso
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    if (!charge.payment_intent) {
      console.error('Cobrança sem payment_intent associado');
      return;
    }

    const paymentIntent = typeof charge.payment_intent === 'string' 
      ? charge.payment_intent 
      : charge.payment_intent.id;
      
    const paymentRecord = await storage.getPaymentRecordByStripeId(paymentIntent);
    if (!paymentRecord) {
      console.error(`Pagamento não encontrado para o ID: ${paymentIntent}`);
      return;
    }

    // Calcula valor reembolsado
    const amount = charge.amount_refunded / 100;
    const isFullRefund = charge.amount_refunded === charge.amount;

    // Atualiza o registro de pagamento
    await storage.updatePaymentRecord(paymentRecord.id, {
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      refundedAmount: amount,
      updatedAt: new Date()
    });

    // Se há uma sessão associada e o reembolso é total, atualiza seu status
    if (paymentRecord.sessionId && isFullRefund) {
      const session = await storage.getSession(paymentRecord.sessionId);
      if (session) {
        await storage.updateSession(paymentRecord.sessionId, {
          status: 'cancelled',
          cancellationReason: 'Pagamento reembolsado'
        });
      }
    }

    // Notificação ao usuário pode ser enviada aqui
  } catch (error) {
    console.error('Erro ao processar reembolso:', error);
    throw error;
  }
}

/**
 * Obtém os métodos de pagamento do usuário
 * @route GET /api/payments/payment-methods
 */
router.get('/payment-methods', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: 'Cliente Stripe não encontrado' });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card'
    });

    res.json(paymentMethods.data);
  } catch (error: any) {
    console.error('Erro ao buscar métodos de pagamento:', error);
    res.status(500).json({ error: 'Erro ao buscar métodos de pagamento', message: error.message });
  }
});

/**
 * Busca o histórico de pagamentos do usuário
 * @route GET /api/payments/history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const userId = req.user!.id;
    const payments = await storage.getPaymentRecordsByUser(userId);

    // Enriquece os dados com informações das sessões, se disponíveis
    const enrichedPayments = await Promise.all(payments.map(async (payment) => {
      if (payment.sessionId) {
        const session = await storage.getSession(payment.sessionId);
        return {
          ...payment,
          session: session ? {
            scheduledFor: session.scheduledFor,
            therapistName: session.therapistName,
            type: session.type,
            duration: session.duration
          } : null
        };
      }
      return payment;
    }));

    res.json(enrichedPayments);
  } catch (error: any) {
    console.error('Erro ao buscar histórico de pagamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de pagamentos', message: error.message });
  }
});

/**
 * Obtém detalhes de um pagamento específico
 * @route GET /api/payments/details/:paymentId
 */
router.get('/details/:paymentId', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const userId = req.user!.id;
    const paymentId = req.params.paymentId;

    // Verifica se o ID do pagamento é uma PaymentIntent ID do Stripe
    if (paymentId.startsWith('pi_')) {
      const payment = await storage.getPaymentRecordByStripeId(paymentId);
      
      if (!payment || payment.userId !== userId) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
      }

      // Busca dados atualizados no Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
      
      // Busca detalhes da sessão, se existir
      let session = null;
      if (payment.sessionId) {
        session = await storage.getSession(payment.sessionId);
      }

      res.json({
        payment,
        stripeDetails: paymentIntent,
        session: session ? {
          id: session.id,
          date: session.scheduledFor,
          therapist: session.therapistName,
          type: session.type,
          status: session.status
        } : null
      });
    } else {
      // Se for um ID interno
      const paymentIdNumber = parseInt(paymentId);
      if (isNaN(paymentIdNumber)) {
        return res.status(400).json({ error: 'ID de pagamento inválido' });
      }

      const payment = await storage.getPaymentRecord(paymentIdNumber);
      
      if (!payment || payment.userId !== userId) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
      }

      // Busca detalhes do Stripe, se existir um ID de PaymentIntent
      let stripeDetails = null;
      if (payment.paymentIntentId) {
        stripeDetails = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
      }

      // Busca detalhes da sessão, se existir
      let session = null;
      if (payment.sessionId) {
        session = await storage.getSession(payment.sessionId);
      }

      res.json({
        payment,
        stripeDetails,
        session: session ? {
          id: session.id,
          date: session.scheduledFor,
          therapist: session.therapistName,
          type: session.type,
          status: session.status
        } : null
      });
    }
  } catch (error: any) {
    console.error('Erro ao buscar detalhes do pagamento:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes do pagamento', message: error.message });
  }
});

// Adiciona o middleware de tratamento de erros no final da cadeia
router.use(errorHandler);

export default router;