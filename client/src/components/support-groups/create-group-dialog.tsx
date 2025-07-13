import React, { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Esquema de validação para criação de grupo
const createGroupSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }).max(100),
  description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres" }).max(2000),
  topic: z.string({ required_error: "Escolha um tópico" }),
  isPrivate: z.boolean().default(false),
  rules: z.string().optional(),
  meetingFrequency: z.string().optional(),
  therapistId: z.number().optional().nullable(),
  withTherapistSupport: z.boolean().default(false),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({
  open,
  onOpenChange,
  topics = [],
  onSuccess,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Verificar se o usuário é terapeuta ao abrir o modal
  useEffect(() => {
    if (open && user && !user.isTherapist) {
      toast({
        title: "Acesso restrito",
        description: "Apenas terapeutas podem criar grupos de apoio.",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  }, [open, user, toast, onOpenChange]);
  
  // Formulário
  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      topic: "",
      isPrivate: false,
      rules: "",
      meetingFrequency: "",
      therapistId: null,
      withTherapistSupport: false,
    },
  });

  // Mutação para criar grupo
  const createGroupMutation = useMutation({
    mutationFn: async (values: CreateGroupFormValues) => {
      const response = await apiRequest("POST", "/api/support-groups", values);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar grupo");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Grupo criado com sucesso!",
        description: "O grupo foi criado e está disponível para participação.",
      });
      form.reset();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar grupo",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao criar o grupo",
        variant: "destructive",
      });
    },
  });

  // Função para submeter o formulário
  const onSubmit = (values: CreateGroupFormValues) => {
    // Verificar novamente se o usuário é terapeuta antes de submeter
    if (!user?.isTherapist) {
      toast({
        title: "Acesso restrito",
        description: "Apenas terapeutas podem criar grupos de apoio.",
        variant: "destructive",
      });
      onOpenChange(false);
      return;
    }
    
    // Define os valores do terapeuta corretamente
    const formData = {
      ...values,
      therapistId: user.id // O ID do terapeuta é o próprio ID do usuário
    };
    
    // Para debug
    console.log("Enviando dados para criação de grupo:", formData);
    
    createGroupMutation.mutate(formData);
  };

  // Frequências de reunião disponíveis
  const meetingFrequencies = [
    { value: "semanal", label: "Semanal" },
    { value: "quinzenal", label: "Quinzenal" },
    { value: "mensal", label: "Mensal" },
    { value: "sob-demanda", label: "Sob demanda" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sm:px-2">
          <DialogTitle className="text-xl sm:text-2xl">Criar um novo grupo de apoio</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Crie um espaço seguro para compartilhar experiências e receber apoio da comunidade
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5 px-1 sm:px-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Nome do grupo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ansiedade e Depressão" {...field} className="text-sm sm:text-base" />
                  </FormControl>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Tópico principal</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm sm:text-base">
                        <SelectValue placeholder="Selecione um tópico" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[40vh]">
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id} className="text-sm sm:text-base">
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs sm:text-sm">
                    Selecione o tema principal do grupo
                  </FormDescription>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o propósito do grupo e quem pode se beneficiar dele..."
                      className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs sm:text-sm">
                    Explique o objetivo do grupo e quais tipos de experiências serão compartilhadas
                  </FormDescription>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rules"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Regras do grupo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: 1. Respeite a privacidade dos participantes. 2. Evite críticas..."
                      className="min-h-[60px] sm:min-h-[80px] text-sm sm:text-base resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs sm:text-sm">
                    Defina diretrizes para manter o grupo saudável e seguro
                  </FormDescription>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meetingFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Frequência (opcional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-sm sm:text-base">
                          <SelectValue placeholder="Selecione uma frequência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {meetingFrequencies.map((frequency) => (
                          <SelectItem key={frequency.value} value={frequency.value} className="text-sm sm:text-base">
                            {frequency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs sm:text-sm">
                      Regularidade das reuniões
                    </FormDescription>
                    <FormMessage className="text-xs sm:text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm sm:text-base">Grupo privado</FormLabel>
                      <FormDescription className="text-xs sm:text-sm">
                        Membros precisam de aprovação
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="withTherapistSupport"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 sm:p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm sm:text-base">
                      Solicitar suporte profissional
                    </FormLabel>
                    <FormDescription className="text-xs sm:text-sm">
                      Terapeuta designado para moderar o grupo
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="sm:px-2 pt-2 flex flex-col sm:flex-row gap-2 sm:gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto text-sm">
                  Cancelar
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={createGroupMutation.isPending}
                className="w-full sm:w-auto text-sm"
              >
                {createGroupMutation.isPending 
                  ? "Criando..." 
                  : "Criar grupo"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;