import { z } from 'zod';

/**
 * Schema para validação da requisição de criação de PaymentIntent
 */
export const createPaymentIntentSchema = z.object({
  amount: z.number().positive({
    message: 'O valor deve ser positivo'
  }),
  currency: z.string().default('brl'),
  description: z.string().optional(),
  sessionId: z.number().optional(),
  metadata: z.record(z.string()).optional()
});

/**
 * Schema para validação da requisição de anexar método de pagamento
 */
export const attachPaymentMethodSchema = z.object({
  paymentMethodId: z.string({
    required_error: 'O ID do método de pagamento é obrigatório'
  }),
  makeDefault: z.boolean().default(false)
});

/**
 * Schema para validação da requisição de reembolso
 */
export const refundPaymentSchema = z.object({
  paymentIntentId: z.string({
    required_error: 'O ID do PaymentIntent é obrigatório'
  }),
  amount: z.number().positive().optional(),
  reason: z.enum(['requested_by_customer', 'duplicate', 'fraudulent']).optional()
});

/**
 * Schema para validação da requisição de confirmação de pagamento
 */
export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string({
    required_error: 'O ID do PaymentIntent é obrigatório'
  }),
  paymentMethodId: z.string({
    required_error: 'O ID do método de pagamento é obrigatório'
  })
});

// Tipos inferidos dos schemas
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type AttachPaymentMethodInput = z.infer<typeof attachPaymentMethodSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;