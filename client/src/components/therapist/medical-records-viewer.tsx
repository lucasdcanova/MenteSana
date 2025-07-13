import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { MedicalRecord } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Edit, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface MedicalRecordsViewerProps {
  patientId: number;
  patientName: string;
}

// Schema para validação do formulário
const medicalRecordSchema = z.object({
  mainComplaint: z.string().min(3, { message: 'A queixa principal deve ter pelo menos 3 caracteres' }),
  accessLevel: z.string().min(1, { message: 'Selecione um nível de acesso' }),
  evolution: z.string().min(10, { message: 'A evolução deve ter pelo menos 10 caracteres' }),
  observations: z.string().optional(),
});

type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>;

const recordTypes = [
  { id: 'private', name: 'Privado' },
  { id: 'team', name: 'Equipe' },
  { id: 'patient', name: 'Paciente' },
];

export function MedicalRecordsViewer({ patientId, patientName }: MedicalRecordsViewerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Buscar os prontuários médicos do paciente
  const { data: records, isLoading, error } = useQuery({
    queryKey: [`/api/medical-records/patient/${patientId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/medical-records/patient/${patientId}`);
      return await response.json() as MedicalRecord[];
    },
    enabled: !!patientId && !!user?.isTherapist,
  });

  // Configurar o formulário para criar/editar registros
  const form = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      mainComplaint: '',
      accessLevel: '',
      evolution: '',
      observations: '',
    },
  });

  // Mutação para criar um novo registro médico
  const createMutation = useMutation({
    mutationFn: async (data: MedicalRecordFormValues) => {
      const payload = {
        ...data,
        patientId,
        therapistId: user?.id,
      };
      const response = await apiRequest('POST', '/api/medical-records', payload);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar registro médico');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Registro médico criado',
        description: 'O registro médico foi criado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/medical-records/patient/${patientId}`] });
      form.reset();
      setOpenDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar registro médico',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutação para atualizar um registro médico existente
  const updateMutation = useMutation({
    mutationFn: async (data: MedicalRecordFormValues & { id: number }) => {
      const { id, ...rest } = data;
      const response = await apiRequest('PATCH', `/api/medical-records/${id}`, rest);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar registro médico');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Registro médico atualizado',
        description: 'O registro médico foi atualizado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/medical-records/patient/${patientId}`] });
      form.reset();
      setOpenDialog(false);
      setSelectedRecord(null);
      setEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar registro médico',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filtrar registros por tipo
  const filteredRecords = selectedTab === 'all'
    ? records
    : records?.filter(record => record.accessLevel === selectedTab);

  // Função auxiliar para formatar a data
  const formatDate = (date: Date) => {
    return format(date, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  };

  // Manipular envio do formulário
  const onSubmit = (values: MedicalRecordFormValues) => {
    if (editMode && selectedRecord) {
      updateMutation.mutate({ ...values, id: selectedRecord.id });
    } else {
      createMutation.mutate(values);
    }
  };

  // Manipular clique em editar
  const handleEdit = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setEditMode(true);
    form.reset({
      mainComplaint: record.mainComplaint,
      accessLevel: record.accessLevel,
      evolution: record.evolution,
      observations: record.observations || '',
    });
    setOpenDialog(true);
  };

  // Manipular clique em adicionar novo registro
  const handleAddNew = () => {
    setSelectedRecord(null);
    setEditMode(false);
    form.reset({
      mainComplaint: '',
      accessLevel: '',
      evolution: '',
      observations: '',
    });
    setOpenDialog(true);
  };

  // Renderizar carregamento
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Renderizar erro
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Erro ao carregar prontuários</h3>
        <p className="text-muted-foreground">Não foi possível carregar os registros médicos.</p>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Prontuário Médico</CardTitle>
          <CardDescription>
            Registros médicos e histórico clínico de {patientName}
          </CardDescription>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Registro
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="all">Todos</TabsTrigger>
            {recordTypes.map(type => (
              <TabsTrigger key={type.id} value={type.id}>
                {type.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedTab} className="mt-0">
            {!filteredRecords?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  {selectedTab === 'all'
                    ? 'Ainda não existem registros médicos para este paciente.'
                    : `Não há registros do tipo "${recordTypes.find(t => t.id === selectedTab)?.name}".`}
                </p>
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Registro
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]" enableMouseWheel={true}>
                <div className="space-y-4">
                  {filteredRecords.map((record) => (
                    <Card key={record.id} className="border border-muted">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center">
                              <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full mr-2">
                                {recordTypes.find(t => t.id === record.accessLevel)?.name || 'Privado'}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(record.createdAt), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <CardTitle className="text-lg mt-1">{record.mainComplaint}</CardTitle>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="text-sm whitespace-pre-wrap mb-4">
                          <h4 className="text-sm font-medium mb-1">Evolução:</h4>
                          {record.evolution}
                        </div>
                        
                        {record.diagnosis && record.diagnosis.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-1">Diagnóstico:</h4>
                            <ul className="list-disc list-inside pl-2">
                              {record.diagnosis.map((item, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {record.observations && (
                          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-md">
                            <h4 className="text-sm font-medium text-amber-800 mb-1">Observações adicionais:</h4>
                            <p className="text-sm text-amber-700">{record.observations}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Diálogo para criar/editar registros */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Editar Registro Médico' : 'Novo Registro Médico'}
            </DialogTitle>
            <DialogDescription>
              {editMode 
                ? 'Atualize as informações do registro médico conforme necessário.' 
                : 'Adicione um novo registro ao prontuário médico do paciente.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="mainComplaint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Queixa Principal</FormLabel>
                    <FormControl>
                      <Input placeholder="Queixa principal do paciente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Acesso</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="" disabled>Selecione o nível de acesso</option>
                        <option value="private">Privado (apenas terapeuta)</option>
                        <option value="team">Equipe (disponível para equipe médica)</option>
                        <option value="patient">Paciente (visível para o paciente)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="evolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evolução</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Evolução do caso desde a última sessão" 
                        className="min-h-[120px]" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações adicionais" 
                        className="min-h-[80px]" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Registro'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}