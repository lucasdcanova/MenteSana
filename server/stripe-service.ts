/**
 * Serviço de pagamentos com Stripe
 * 
 * Este módulo implementa integração com a API do Stripe para processar 
 * pagamentos de consultas de terapia e assinaturas de planos na plataforma.
 */

import Stripe from 'stripe';

// Validar a presença da chave secreta do Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY não configurada no ambiente');
}

// Inicializar cliente Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil',
});

/**
 * Interface para dados do cliente Stripe
 */
interface CustomerData {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

/**
 * Interface para dados do pagamento 
 */
interface PaymentData {
  amount: number;
  currency: string;
  customer: string;
  description?: string;
  metadata?: Record<string, string>;
}

/**
 * Interface para dados de plano/produto
 */
interface SubscriptionData {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
}

/**
 * Cria um cliente no Stripe
 * @param customerData Dados do cliente
 * @returns Objeto do cliente criado no Stripe
 */
export async function createCustomer(customerData: CustomerData): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      metadata: customerData.metadata || {},
    });
    
    return customer;
  } catch (error) {
    console.error('Erro ao criar cliente no Stripe:', error);
    throw new Error(`Falha ao criar cliente no Stripe: ${(error as Error).message}`);
  }
}

/**
 * Cria uma intenção de pagamento (PaymentIntent)
 * @param paymentData Dados do pagamento
 * @returns Objeto do PaymentIntent criado
 */
export async function createPaymentIntent(paymentData: PaymentData): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100), // Conversão para centavos
      currency: paymentData.currency,
      customer: paymentData.customer,
      description: paymentData.description,
      metadata: paymentData.metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    return paymentIntent;
  } catch (error) {
    console.error('Erro ao criar PaymentIntent:', error);
    throw new Error(`Falha ao criar intenção de pagamento: ${(error as Error).message}`);
  }
}

/**
 * Cria ou atualiza uma assinatura (Subscription)
 * @param subscriptionData Dados da assinatura
 * @returns Objeto da Subscription criada
 */
export async function createSubscription(subscriptionData: SubscriptionData): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: subscriptionData.customerId,
      items: [
        {
          price: subscriptionData.priceId,
        },
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: subscriptionData.metadata || {},
    });
    
    return subscription;
  } catch (error) {
    console.error('Erro ao criar assinatura no Stripe:', error);
    throw new Error(`Falha ao criar assinatura: ${(error as Error).message}`);
  }
}

/**
 * Cancela uma assinatura existente
 * @param subscriptionId ID da assinatura
 * @returns Objeto da Subscription cancelada
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    throw new Error(`Falha ao cancelar assinatura: ${(error as Error).message}`);
  }
}

/**
 * Processa um webhook do Stripe
 * @param payload Conteúdo bruto da requisição
 * @param signature Assinatura do payload (cabeçalho stripe-signature)
 * @returns Evento processado
 */
export async function handleWebhook(payload: string, signature: string): Promise<Stripe.Event> {
  try {
    // O segredo do webhook deve ser configurado nas variáveis de ambiente
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET não configurada.');
    }
    
    // Verificar assinatura do evento
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    
    return event;
  } catch (error) {
    console.error('Erro ao processar webhook do Stripe:', error);
    throw new Error(`Webhook Error: ${(error as Error).message}`);
  }
}

/**
 * Recupera detalhes de um cliente
 * @param customerId ID do cliente no Stripe
 * @returns Objeto do Customer
 */
export async function getCustomer(customerId: string): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    return customer;
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    throw new Error(`Falha ao buscar cliente: ${(error as Error).message}`);
  }
}

/**
 * Recupera uma assinatura
 * @param subscriptionId ID da assinatura
 * @returns Objeto da Subscription
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    throw new Error(`Falha ao buscar assinatura: ${(error as Error).message}`);
  }
}

/**
 * Atualiza um cliente no Stripe
 * @param customerId ID do cliente
 * @param updateData Dados a serem atualizados
 * @returns Objeto do Customer atualizado
 */
export async function updateCustomer(
  customerId: string, 
  updateData: Partial<CustomerData>
): Promise<Stripe.Customer> {
  try {
    return await stripe.customers.update(customerId, updateData as Stripe.CustomerUpdateParams);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    throw new Error(`Falha ao atualizar cliente: ${(error as Error).message}`);
  }
}

/**
 * Lista os métodos de pagamento do cliente
 * @param customerId ID do cliente
 * @returns Lista de métodos de pagamento
 */
export async function listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    return paymentMethods.data;
  } catch (error) {
    console.error('Erro ao listar métodos de pagamento:', error);
    throw new Error(`Falha ao listar métodos de pagamento: ${(error as Error).message}`);
  }
}

/**
 * Verifica o status de um pagamento
 * @param paymentIntentId ID do PaymentIntent
 * @returns Objeto do PaymentIntent
 */
export async function checkPaymentStatus(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    throw new Error(`Falha ao verificar pagamento: ${(error as Error).message}`);
  }
}