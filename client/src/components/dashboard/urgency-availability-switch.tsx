import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TherapistUrgencyStatus } from '@shared/schema';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Clock } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function UrgencyAvailabilitySwitch() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAvailable, setIsAvailable] = useState(false);

  // Buscar status atual de disponibilidade para urgências
  const { data: urgencyStatus, isLoading } = useQuery<TherapistUrgencyStatus>({
    queryKey: ['/api/therapist/urgency-status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/therapist/urgency-status');
      return await res.json();
    },
  });

  // Atualizar estado local quando os dados forem carregados
  useEffect(() => {
    if (urgencyStatus) {
      setIsAvailable(urgencyStatus.isAvailableForUrgent);
    }
  }, [urgencyStatus]);

  // Mutation para atualizar status de disponibilidade
  const updateStatusMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const res = await apiRequest('POST', '/api/therapist/urgency-status', {
        isAvailableForUrgent: isAvailable,
        // Se disponível, estará disponível por padrão pelas próximas 4 horas
        availableUntil: isAvailable ? addHours(new Date(), 4) : null,
        maxWaitingTime: isAvailable ? 15 : null // 15 minutos de tempo máximo de espera por padrão
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/urgency-status'] });
      toast({
        title: isAvailable 
          ? 'Você está disponível para consultas urgentes' 
          : 'Você não está mais disponível para consultas urgentes',
        description: isAvailable 
          ? 'Pacientes poderão te solicitar para atendimentos imediatos.' 
          : 'Você não receberá solicitações de atendimento urgente.',
        variant: isAvailable ? 'default' : undefined,
      });
    },
    onError: (error) => {
      // Reverter o switch para o estado anterior em caso de erro
      setIsAvailable(!isAvailable);
      toast({
        title: 'Erro ao atualizar disponibilidade',
        description: 'Não foi possível atualizar seu status de disponibilidade. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Função para alternar o status
  const handleToggle = (checked: boolean) => {
    setIsAvailable(checked);
    updateStatusMutation.mutate(checked);
  };

  // Cálculo de tempo restante se estiver disponível
  const getRemainingTime = () => {
    if (!urgencyStatus?.availableUntil) return null;

    const now = new Date();
    const availableUntil = new Date(urgencyStatus.availableUntil);
    
    if (availableUntil <= now) return null;
    
    const remainingMinutes = Math.floor((availableUntil.getTime() - now.getTime()) / (1000 * 60));
    
    if (remainingMinutes > 60) {
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    
    return `${remainingMinutes} minutos`;
  };

  const remainingTime = getRemainingTime();

  return (
    <Card className={`${isAvailable ? 'border-emerald-500' : 'border-slate-200'} transition-colors`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Disponibilidade para Urgências</CardTitle>
        <CardDescription>
          Ative para receber solicitações de atendimentos urgentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="urgency-mode" className="flex items-center gap-2 cursor-pointer">
              <AlertCircle className={`h-5 w-5 ${isAvailable ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>Modo de Atendimento Urgente</span>
            </Label>
            <Switch
              id="urgency-mode"
              checked={isAvailable}
              onCheckedChange={handleToggle}
              disabled={isLoading || updateStatusMutation.isPending}
            />
          </div>
          
          {isAvailable && remainingTime && (
            <div className="flex items-center text-sm text-emerald-600 mt-2">
              <Clock className="h-4 w-4 mr-1" />
              <span>
                Disponível por mais {remainingTime} 
                (até {format(new Date(urgencyStatus!.availableUntil!), 'HH:mm', { locale: ptBR })})
              </span>
            </div>
          )}
          
          {isAvailable && (
            <div className="mt-2 text-sm text-slate-500">
              Tempo máximo de espera: {urgencyStatus?.maxWaitingTime || 15} minutos
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}