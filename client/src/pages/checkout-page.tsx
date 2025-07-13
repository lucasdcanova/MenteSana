import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Receipt } from "lucide-react";

// Carregue o Stripe fora do componente para evitar recriação
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Chave pública do Stripe não configurada (VITE_STRIPE_PUBLIC_KEY)');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ sessionId, amount }: { sessionId?: number, amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pagamento-concluido`,
        },
      });

      if (error) {
        toast({
          title: "Erro no pagamento",
          description: error.message || "Ocorreu um erro ao processar o pagamento",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erro no pagamento",
        description: "Ocorreu um erro inesperado ao processar o pagamento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement className="mb-6" />
      <Button 
        disabled={!stripe || isLoading} 
        className="w-full" 
        type="submit"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando
          </>
        ) : (
          `Pagar R$ ${amount.toFixed(2)}`
        )}
      </Button>
    </form>
  );
};

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<{id: number, amount: number} | null>(null);
  const { toast } = useToast();
  
  // Obter o ID da sessão da URL
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const sessionParam = queryParams.get('session');
    
    if (!sessionParam) {
      setError('Sessão não especificada. Por favor, tente agendar uma consulta novamente.');
      setIsLoading(false);
      return;
    }
    
    // Obter os detalhes da sessão da API
    const fetchSessionDetails = async () => {
      try {
        const response = await apiRequest('GET', `/api/sessions/${sessionParam}`);
        const data = await response.json();
        
        // Valores de exemplo por enquanto - na implementação real, viriam da API
        setSessionDetails({
          id: parseInt(sessionParam),
          amount: 150.00 // Valor fixo para demonstração, deve vir do backend
        });
      } catch (err) {
        setError('Não foi possível obter os detalhes da sessão. Por favor, tente novamente.');
        console.error('Error fetching session details:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSessionDetails();
  }, []);

  useEffect(() => {
    // Só criar o PaymentIntent quando tivermos os detalhes da sessão
    if (!sessionDetails) return;
    
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("POST", "/api/payments/create-payment-intent", {
          amount: sessionDetails.amount,
          description: "Consulta de Terapia",
          sessionId: sessionDetails.id,
          currency: "brl"
        });

        const data = await response.json();
        
        if (response.ok) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error(data.error || "Erro ao criar intenção de pagamento");
        }
      } catch (err: any) {
        setError(err.message || "Falha ao inicializar o pagamento");
        toast({
          title: "Erro ao iniciar pagamento",
          description: err.message || "Não foi possível conectar-se ao serviço de pagamento",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [toast, sessionDetails]);

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Finalizar Pagamento</CardTitle>
          <CardDescription>
            Pague sua consulta de terapia de forma segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-6 text-destructive">
              <p className="mb-4">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </div>
          ) : clientSecret && sessionDetails ? (
            <>
              {/* Resumo da compra */}
              <div className="bg-muted/50 p-4 rounded-lg mb-6">
                <h3 className="font-medium flex items-center mb-3">
                  <Receipt className="h-4 w-4 mr-2" />
                  Resumo da Compra
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Consulta de Terapia</span>
                    <span className="font-medium">R$ {sessionDetails.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Imposto</span>
                    <span>Incluso</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between font-medium">
                    <span>Total</span>
                    <span>R$ {sessionDetails.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <CheckoutForm sessionId={sessionDetails.id} amount={sessionDetails.amount} />
              </Elements>
            </>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          Seus dados de pagamento são processados de forma segura pelo Stripe
        </CardFooter>
      </Card>
    </div>
  );
}