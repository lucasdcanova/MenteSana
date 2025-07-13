import React from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays } from "date-fns";

// Esquema de validação para agendamento de reunião
const scheduleMeetingSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres" }).max(100),
  description: z.string().optional(),
  scheduledFor: z.string().refine((date) => {
    const now = new Date();
    const scheduledDate = new Date(date);
    return scheduledDate > now;
  }, { message: "A data deve ser no futuro" }),
  duration: z.number().int().min(15).max(240).default(60),
  meetingUrl: z.string().url({ message: "URL inválida" }).optional().or(z.literal('')),
});

type ScheduleMeetingFormValues = z.infer<typeof scheduleMeetingSchema>;

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  groupName: string;
  onSuccess?: () => void;
}

const ScheduleMeetingDialog: React.FC<ScheduleMeetingDialogProps> = ({
  open,
  onOpenChange,
  groupId,
  groupName,
  onSuccess,
}) => {
  const { toast } = useToast();
  
  // Data mínima para o agendamento (agora)
  const now = new Date();
  const minDateTimeLocal = format(now, "yyyy-MM-dd'T'HH:mm");
  
  // Hora padrão (próximo dia às 19:00)
  const defaultDateTime = format(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      19,
      0
    ),
    "yyyy-MM-dd'T'HH:mm"
  );

  // Formulário
  const form = useForm<ScheduleMeetingFormValues>({
    resolver: zodResolver(scheduleMeetingSchema),
    defaultValues: {
      title: `Reunião do grupo ${groupName}`,
      description: "",
      scheduledFor: defaultDateTime,
      duration: 60,
      meetingUrl: "",
    },
  });

  // Mutação para agendar reunião
  const scheduleMeetingMutation = useMutation({
    mutationFn: async (values: ScheduleMeetingFormValues) => {
      const response = await apiRequest("POST", `/api/support-groups/${groupId}/meetings`, values);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao agendar reunião");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reunião agendada com sucesso!",
        description: "A reunião foi agendada e os membros serão notificados.",
      });
      form.reset();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao agendar reunião",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao agendar a reunião",
        variant: "destructive",
      });
    },
  });

  // Função para submeter o formulário
  const onSubmit = (values: ScheduleMeetingFormValues) => {
    scheduleMeetingMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agendar reunião do grupo</DialogTitle>
          <DialogDescription>
            Agende uma nova reunião para os membros do grupo "{groupName}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da reunião</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o propósito da reunião, tópicos a serem discutidos..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Inclua informações importantes sobre a reunião
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e hora</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        min={minDateTimeLocal}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={15}
                        max={240}
                        step={15}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="meetingUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link da reunião (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Link para a videochamada (Google Meet, Zoom, etc)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={scheduleMeetingMutation.isPending}
              >
                {scheduleMeetingMutation.isPending 
                  ? "Agendando..." 
                  : "Agendar reunião"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleMeetingDialog;