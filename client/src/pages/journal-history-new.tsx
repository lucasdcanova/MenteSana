import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  Calendar, 
  Book, 
  Plus, 
  Filter, 
  VolumeX,
  Trash,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Tipos
interface JournalEntry {
  id: number;
  date: string;
  title: string | null;
  content: string;
  mood: string;
  category: string | null;
  colorHex: string | null;
  summary: string | null;
  tags: string[] | null;
  audioUrl: string | null;
  audioDuration: number | null;
  emotionalTone: string | null;
  needsProcessing: boolean;
  processingStatus: string | null;
}

export default function JournalHistoryPage() {
  // Estados
  const [filter, setFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [processingStatus, setProcessingStatus] = useState<{[key: number]: boolean}>({});
  const [currentlyProcessing, setCurrentlyProcessing] = useState<number | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  
  // Hooks
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Buscar entradas do diário
  const { data, isLoading, error, refetch } = useQuery<{ data: JournalEntry[] }>({
    queryKey: ['/api/journal-entries/user'],
    queryFn: getQueryFn<{ data: JournalEntry[] }>(),
    enabled: !!user,
  });
  
  // Mutation para processar um entrada do diário (categoria e título)
  const processMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await apiRequest('POST', `/api/journal/${entryId}/process`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entrada processada",
        description: "A entrada foi categorizada e recebeu um título.",
        variant: "default",
      });
      // Atualizar a lista após o processamento
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries/user'] });
      setCurrentlyProcessing(null);
    },
    onError: (error) => {
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar a entrada. Tente novamente mais tarde.",
        variant: "destructive",
      });
      setCurrentlyProcessing(null);
      console.error("Erro ao processar entrada:", error);
    }
  });
  
  // Mutation para excluir uma entrada do diário
  const deleteMutation = useMutation({
    mutationFn: async (entryId: number) => {
      console.log(`Excluindo entrada do diário com ID: ${entryId}`);
      // Usar o token de autenticação diretamente do localStorage para garantir
      const authToken = localStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': authToken } : {};
      
      const response = await fetch(`/api/journal/${entryId}`, {
        method: 'DELETE',
        headers: headers,
        credentials: 'include'
      });
      
      console.log(`Resposta da exclusão: Status ${response.status}`);
      
      if (response.status === 204 || response.status === 200) {
        return { success: true };
      }
      
      // Se houver erro, tentar obter detalhes
      try {
        const errorData = await response.json();
        console.error('Erro detalhado:', errorData);
        return errorData;
      } catch (e) {
        return { success: false, error: `Status: ${response.status}` };
      }
    },
    onSuccess: () => {
      toast({
        title: "Entrada excluída",
        description: "A entrada foi excluída com sucesso.",
        variant: "default",
      });
      // Atualizar a lista após a exclusão
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries/user'] });
      setEntryToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro na exclusão",
        description: "Não foi possível excluir a entrada. Tente novamente mais tarde.",
        variant: "destructive",
      });
      console.error("Erro ao excluir entrada:", error);
    }
  });
  
  // Função para abrir o diálogo de confirmação de exclusão
  const openDeleteDialog = (entryId: number) => {
    setEntryToDelete(entryId);
    setDeleteDialogOpen(true);
  };
  
  // Função para confirmar a exclusão
  const confirmDelete = () => {
    if (entryToDelete) {
      deleteMutation.mutate(entryToDelete);
      setDeleteDialogOpen(false);
    }
  };
  
  // Agrupar entradas por mês
  const entriesByMonth: Record<string, JournalEntry[]> = {};
  
  if (data?.data) {
    data.data.forEach((entry: JournalEntry) => {
      const date = new Date(entry.date);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMMM yyyy', { locale: ptBR });
      
      if (!entriesByMonth[monthKey]) {
        entriesByMonth[monthKey] = [];
      }
      
      entriesByMonth[monthKey].push(entry);
    });
  }
  
  // Lista de meses para o filtro
  const months = Object.keys(entriesByMonth).map(key => ({
    value: key,
    label: format(new Date(key + '-01'), 'MMMM yyyy', { locale: ptBR })
  })).sort((a, b) => b.value.localeCompare(a.value));
  
  // Lista de entradas filtradas
  const filteredEntries = data?.data
    ? data.data
        .filter((entry: JournalEntry) => {
          // Filtrar por mês
          if (selectedMonth && selectedMonth !== 'all') {
            const date = new Date(entry.date);
            const monthKey = format(date, 'yyyy-MM');
            if (monthKey !== selectedMonth) return false;
          }
          
          // Filtrar por tipo
          if (filter !== 'all') {
            if (filter === 'text' && entry.audioUrl) return false;
            if (filter === 'audio' && !entry.audioUrl) return false;
          }
          
          return true;
        })
        .sort((a: JournalEntry, b: JournalEntry) => {
          // Ordenar por data (mais recente primeiro)
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        })
    : [];
  
  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };
  
  // Função para encurtar texto
  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };
  
  // Função para mapear humor para emoji
  const moodToEmoji = (mood: string): string => {
    const moodMap: Record<string, string> = {
      'alegre': '😊',
      'calmo': '😌',
      'motivado': '🚀',
      'grato': '🙏',
      'neutro': '😐',
      'ansioso': '😰',
      'triste': '😢',
      'raiva': '😡',
      'frustrado': '😤',
      'confuso': '😕'
    };
    
    return moodMap[mood] || '😐';
  };
  
  // Função para iniciar o processamento de uma entrada
  const processEntry = (entryId: number) => {
    setCurrentlyProcessing(entryId);
    setProcessingStatus(prev => ({ ...prev, [entryId]: true }));
    processMutation.mutate(entryId);
  };
  
  // Efeito para verificar entradas que precisam de processamento
  useEffect(() => {
    if (data?.data && !isLoading) {
      // Verificar se há entradas que precisam de processamento
      const entriesToProcess = data.data.filter(entry => entry.needsProcessing);
      
      if (entriesToProcess.length > 0 && !currentlyProcessing) {
        // Notificar o usuário de que há entradas que precisam de processamento
        toast({
          title: "Processando entradas",
          description: `${entriesToProcess.length} ${entriesToProcess.length === 1 ? 'entrada precisa' : 'entradas precisam'} de processamento.`,
          variant: "default",
        });
        
        // Iniciar o processamento da primeira entrada
        const firstEntry = entriesToProcess[0];
        processEntry(firstEntry.id);
      }
    }
  }, [data, isLoading, currentlyProcessing]);
  
  // Renderizar página
  return (
    <div className="container px-4 md:px-6 py-6 max-w-4xl mx-auto">
      <div className="flex flex-col space-y-4">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold">Histórico do Diário</h1>
          
          <Button
            className="rounded-full"
            onClick={() => setLocation("/journal")}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Nova Entrada</span>
          </Button>
        </div>
        
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex-1">
            <Select value={selectedMonth} onValueChange={(value: string) => setSelectedMonth(value)}>
              <SelectTrigger className="w-full rounded-xl">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Select value={filter} onValueChange={(value: string) => setFilter(value)}>
              <SelectTrigger className="w-full rounded-xl">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="text">Apenas texto</SelectItem>
                <SelectItem value="audio">Apenas áudio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Separator className="my-2" />
        
        {/* Estado de carregamento */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">Carregando entradas...</span>
          </div>
        )}
        
        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg text-center">
            <p>Erro ao carregar as entradas. Tente novamente mais tarde.</p>
          </div>
        )}
        
        {/* Lista vazia */}
        {!isLoading && filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <Book className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Nenhuma entrada encontrada</h3>
            <p className="text-gray-500 mb-6">
              {filter || selectedMonth
                ? "Tente ajustar os filtros ou "
                : "Comece a registrar seus pensamentos e sentimentos. "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-primary"
                onClick={() => setLocation("/journal")}
              >
                criar uma nova entrada
              </Button>
            </p>
          </div>
        )}
        
        {/* Lista de entradas */}
        {!isLoading && filteredEntries.length > 0 && (
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-4 pr-4">
              {filteredEntries.map((entry: JournalEntry) => (
                <Card 
                  key={entry.id}
                  className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow"
                  style={{
                    borderLeft: `4px solid ${entry.colorHex || '#4f46e5'}`
                  }}
                >
                  {/* Indicadores de status */}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {/* Indicador de áudio */}
                    {entry.audioUrl && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        Áudio
                      </span>
                    )}
                    
                    {/* Indicador de processamento */}
                    {entry.needsProcessing && (
                      <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                        {processingStatus[entry.id] ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Processando
                          </>
                        ) : (
                          "Aguardando processamento"
                        )}
                      </span>
                    )}
                  </div>
                  
                  <CardContent className="pt-6 pb-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold line-clamp-1">
                          {entry.title || entry.category || "Entrada sem título"}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex items-center bg-gray-100 px-2 py-0.5 rounded-full text-sm">
                          {moodToEmoji(entry.mood)} {entry.mood}
                        </span>
                        
                        {entry.category && (
                          <span className="inline-flex items-center bg-gray-100 px-2 py-0.5 rounded-full text-sm">
                            {entry.category}
                          </span>
                        )}
                        
                        {entry.tags && entry.tags.slice(0, 2).map(tag => (
                          <span 
                            key={tag} 
                            className="inline-flex items-center bg-gray-100 px-2 py-0.5 rounded-full text-sm"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      
                      <p className="text-gray-600 line-clamp-3">
                        {truncateText(entry.content)}
                      </p>
                      
                      {entry.audioUrl && (
                        <div className="pt-2">
                          <audio 
                            controls 
                            className="w-full h-8" 
                            src={entry.audioUrl}
                            controlsList="nodownload"
                          >
                            <VolumeX className="w-4 h-4 mr-1" />
                            Seu navegador não suporta áudio
                          </audio>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-0 pb-4 flex justify-between">
                    <div className="flex space-x-2">
                      <Link to={`/journal/${entry.id}`}>
                        <Button variant="ghost" size="sm" className="mt-2">
                          Ver detalhes
                        </Button>
                      </Link>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDeleteDialog(entry.id)}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                    
                    {/* Botão para processar manualmente */}
                    {entry.needsProcessing && !processingStatus[entry.id] && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => processEntry(entry.id)}
                      >
                        Processar agora
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
      
      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação de exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entrada do diário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 text-white hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}