import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { InsertTherapistUrgencyStatus } from '@shared/schema';

// Interface compatível com o schema do servidor
interface TherapistUrgencyStatus {
  id: number;
  therapistId: number;
  isAvailableForUrgent: boolean;
  lastUpdated?: string;
  availableUntil?: string | null;
  maxWaitingTime?: number | null;
}

export function UrgencyToggle({ therapistId }: { therapistId: number }) {
  const { toast } = useToast();
  const [isAvailableForUrgent, setIsAvailableForUrgent] = useState(false);
  
  // Buscar status de urgência atual
  const { data, isLoading } = useQuery({
    queryKey: ['/api/therapist-urgency-status', therapistId],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/therapist-urgency-status/${therapistId}`);
        if (!response.ok) {
          throw new Error('Erro ao buscar status de disponibilidade');
        }
        const data = await response.json();
        console.log('Status de urgência recebido:', data);
        return data as TherapistUrgencyStatus;
      } catch (error) {
        console.error('Erro ao buscar status de urgência:', error);
        // Se ocorrer um erro, retornamos um status padrão
        return { id: 0, therapistId, isAvailableForUrgent: false } as TherapistUrgencyStatus;
      }
    },
    retry: 1
  });
  
  useEffect(() => {
    if (data) {
      setIsAvailableForUrgent(data.isAvailableForUrgent);
    }
  }, [data]);
  
  // Mutação para atualizar status de urgência
  const updateMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const payload: Partial<InsertTherapistUrgencyStatus> = {
        therapistId,
        isAvailableForUrgent: isAvailable
      };
      
      console.log('Enviando payload:', payload);
      
      const response = await apiRequest('POST', '/api/therapist-urgency-status', payload);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Erro na resposta da API:', errorData);
        throw new Error(errorData?.error || 'Erro ao atualizar status de urgência');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setIsAvailableForUrgent(data.isAvailableForUrgent);
      const message = data.isAvailableForUrgent
        ? 'Você está disponível para atendimentos de urgência'
        : 'Você não está mais disponível para atendimentos de urgência';
      
      toast({
        title: 'Status atualizado',
        description: message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/therapist-urgency-status', therapistId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const handleToggle = () => {
    console.log('Toggle clicado, valor atual:', isAvailableForUrgent, 'alterando para:', !isAvailableForUrgent);
    updateMutation.mutate(!isAvailableForUrgent);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidade para Urgências</CardTitle>
        <CardDescription>
          Indique se você está disponível para atender consultas de urgência.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isAvailableForUrgent ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            )}
            <span className="font-medium">
              {isAvailableForUrgent
                ? 'Disponível para urgências'
                : 'Indisponível para urgências'}
            </span>
          </div>
          <Switch
            checked={isAvailableForUrgent}
            onCheckedChange={handleToggle}
            disabled={isLoading || updateMutation.isPending}
          />
        </div>
        
        {isAvailableForUrgent && (
          <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-md text-sm text-green-800">
            Pacientes com necessidades urgentes poderão solicitar atendimento imediato com você.
          </div>
        )}
        
        {updateMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-800">
            Erro ao atualizar status: {updateMutation.error.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}