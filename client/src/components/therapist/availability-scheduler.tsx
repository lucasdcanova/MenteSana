import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const weekdays = [
  { id: 0, name: 'Domingo' },
  { id: 1, name: 'Segunda-feira' },
  { id: 2, name: 'Terça-feira' },
  { id: 3, name: 'Quarta-feira' },
  { id: 4, name: 'Quinta-feira' },
  { id: 5, name: 'Sexta-feira' },
  { id: 6, name: 'Sábado' },
];

// Schema de validação para o formulário
const availabilityFormSchema = z.object({
  dayOfWeek: z.string().min(1, "Escolha um dia da semana"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  isRecurring: z.boolean().default(true),
  specificDate: z.date().nullable().optional(),
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

interface TherapistAvailability {
  id: number;
  therapistId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate: string | null;
  createdAt: string;
}

export function AvailabilityScheduler({ therapistId }: { therapistId: number }) {
  const { toast } = useToast();
  const [availabilities, setAvailabilities] = useState<TherapistAvailability[]>([]);
  
  // Buscar disponibilidades existentes
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/therapist-availability', therapistId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/therapist-availability/${therapistId}`);
      return await response.json() as TherapistAvailability[];
    }
  });
  
  useEffect(() => {
    if (data) {
      setAvailabilities(data);
    }
  }, [data]);
  
  // Configurar o formulário
  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      isRecurring: true,
      specificDate: null,
    },
  });
  
  // Mutação para criar disponibilidade
  const createMutation = useMutation({
    mutationFn: async (values: AvailabilityFormValues) => {
      const formattedValues = {
        ...values,
        dayOfWeek: parseInt(values.dayOfWeek),
        specificDate: values.specificDate ? format(values.specificDate, 'yyyy-MM-dd') : null,
      };
      
      const response = await apiRequest('POST', '/api/therapist-availability', formattedValues);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar disponibilidade');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Disponibilidade adicionada',
        description: 'Sua disponibilidade foi adicionada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/therapist-availability', therapistId] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar disponibilidade',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Mutação para excluir disponibilidade
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/therapist-availability/${id}`);
      if (!response.ok) {
        throw new Error('Erro ao excluir disponibilidade');
      }
      return id;
    },
    onSuccess: (id) => {
      toast({
        title: 'Disponibilidade removida',
        description: 'A disponibilidade foi removida com sucesso.',
      });
      setAvailabilities(prev => prev.filter(a => a.id !== id));
      queryClient.invalidateQueries({ queryKey: ['/api/therapist-availability', therapistId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover disponibilidade',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handler para submissão do formulário
  function onSubmit(values: AvailabilityFormValues) {
    // Se não é recorrente, verificar se uma data específica foi selecionada
    if (!values.isRecurring && !values.specificDate) {
      toast({
        title: 'Data específica necessária',
        description: 'Por favor, selecione uma data específica para disponibilidade não recorrente.',
        variant: 'destructive',
      });
      return;
    }
    
    createMutation.mutate(values);
  }
  
  // Formatador para exibir a disponibilidade
  const formatAvailability = (availability: TherapistAvailability) => {
    const day = availability.isRecurring 
      ? weekdays.find(d => d.id === availability.dayOfWeek)?.name 
      : format(new Date(availability.specificDate as string), 'dd/MM/yyyy', { locale: ptBR });
    
    return `${day}, ${availability.startTime} - ${availability.endTime}`;
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Definir Disponibilidade</CardTitle>
          <CardDescription>
            Configure os horários em que você está disponível para consultas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Recorrente</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {form.watch("isRecurring") ? "Disponibilidade semanal" : "Data específica"}
                </span>
              </div>
              
              {form.watch("isRecurring") ? (
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia da Semana</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um dia da semana" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {weekdays.map((day) => (
                            <SelectItem key={day.id} value={day.id.toString()}>
                              {day.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="specificDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Específica</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de Início</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de Término</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Adicionando..." : "Adicionar Disponibilidade"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Disponibilidades Atuais</CardTitle>
          <CardDescription>
            Seus horários disponíveis para atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando disponibilidades...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              Erro ao carregar disponibilidades
            </div>
          ) : availabilities.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhuma disponibilidade encontrada
            </div>
          ) : (
            <ul className="space-y-2">
              {availabilities.map((availability) => (
                <li 
                  key={availability.id} 
                  className="flex justify-between items-center p-3 border rounded-md"
                >
                  <span>{formatAvailability(availability)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(availability.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}