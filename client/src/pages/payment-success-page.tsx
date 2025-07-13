import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CalendarCheck, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentDetails, setPaymentDetails] = useState({
    session: { id: null as number | null, date: '', therapist: '' },
    amount: '',
    paymentId: ''
  });

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const paymentIntent = queryParams.get('payment_intent');
    const redirectStatus = queryParams.get('redirect_status');
    
    if (redirectStatus === 'succeeded' && paymentIntent) {
      // Buscar dados reais do pagamento da API
      const fetchPaymentDetails = async () => {
        try {
          const response = await apiRequest(
            'GET', 
            `/api/payments/details/${paymentIntent}`
          );
          
          if (!response.ok) {
            throw new Error('Falha ao obter detalhes do pagamento');
          }
          
          const data = await response.json();
          
          // Formatar os dados recebidos da API
          setPaymentDetails({
            session: { 
              id: data.session?.id || null, 
              date: data.session ? new Date(data.session.date).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : '',
              therapist: data.session?.therapist || 'Terapeuta'
            },
            amount: `R$ ${(data.payment.amount || 0).toFixed(2)}`,
            paymentId: data.payment.paymentIntentId || paymentIntent
          });
          
          setPaymentStatus('success');
        } catch (err) {
          console.error('Erro ao buscar detalhes do pagamento:', err);
          setPaymentStatus('error');
        }
      };
      fetchPaymentDetails();
    } else {
      setPaymentStatus('error');
    }
  }, []);

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card className="border-primary/20">
        <CardHeader className="text-center">
          {paymentStatus === 'loading' ? (
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : paymentStatus === 'success' ? (
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
          ) : (
            <div className="text-destructive">
              Não foi possível confirmar o pagamento
            </div>
          )}
          <CardTitle className="text-2xl mt-4">
            {paymentStatus === 'loading' ? 'Verificando pagamento...' : 
             paymentStatus === 'success' ? 'Pagamento Concluído!' : 
             'Falha no Pagamento'}
          </CardTitle>
          <CardDescription>
            {paymentStatus === 'success' 
              ? 'Seu pagamento foi processado com sucesso' 
              : paymentStatus === 'loading' 
                ? 'Estamos verificando o status do seu pagamento' 
                : 'Não foi possível processar seu pagamento'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {paymentStatus === 'success' && (
            <div className="space-y-4 mt-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium flex items-center mb-2">
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  Detalhes da Consulta
                </h3>
                <div className="space-y-1 text-sm">
                  <p>Terapeuta: <span className="font-medium">{paymentDetails.session.therapist}</span></p>
                  <p>Data: <span className="font-medium">{paymentDetails.session.date}</span></p>
                  <p>Valor: <span className="font-medium">{paymentDetails.amount}</span></p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ID do Pagamento: {paymentDetails.paymentId}
                  </p>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Um recibo foi enviado para seu e-mail.</p>
                <p>A consulta já está confirmada em sua agenda.</p>
              </div>
            </div>
          )}
          
          {paymentStatus === 'error' && (
            <div className="text-center py-4">
              <p className="mb-4 text-sm">
                Ocorreu um problema ao confirmar seu pagamento. Por favor, entre em contato 
                com nosso suporte ou tente novamente.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center gap-4">
          {paymentStatus === 'success' ? (
            <>
              <Button variant="outline" onClick={() => setLocation('/agenda')}>
                Ver Agenda
              </Button>
              <Button onClick={() => setLocation('/')}>
                Voltar ao Início
              </Button>
            </>
          ) : paymentStatus === 'error' ? (
            <>
              <Button variant="outline" onClick={() => window.history.back()}>
                Voltar
              </Button>
              <Button onClick={() => setLocation('/')}>
                Página Inicial
              </Button>
            </>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}