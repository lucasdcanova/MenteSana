import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getAuthToken } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import axios from "axios";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Calendar, Search, Trash2, Tag, Bookmark, Filter, AudioLines, ArrowUpDown, BookText } from "lucide-react";

// Interfaces
interface JournalEntry {
  id: number;
  date: string;
  content: string;
  mood: string;
  category: string | null;
  summary: string | null;
  tags: string[] | null;
  colorHex: string | null;
  emotionalTone: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  title?: string | null;
}

// Componente principal
export default function JournalHistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCategory, setFilteredCategory] = useState("todas");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);

  // Buscar entradas do diário
  const { data: entries, isLoading, error } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal"],
    enabled: !!user,
  });

  // Mutation para exclusão de entrada
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      console.log(`Tentando excluir entrada com ID: ${entryId}`);
      
      // Usar apiRequest do queryClient que já lida com tokens e autenticação
      try {
        // Registrando mais logs para debug
        console.log(`Iniciando processo de exclusão de entrada ${entryId}`);
        
        // Verificar token antes de tentar excluir (apenas para debug)
        const token = getAuthToken();
        if (!token) {
          console.warn("Alerta: Token não encontrado no início da deleção, tentaremos recuperá-lo automaticamente");
        } else {
          console.log(`Token disponível para exclusão: ${token.substring(0, 8)}...`);
        }
        
        console.log(`Chamando apiRequest para DELETE /api/journal/${entryId}`);
        
        // Usar apiRequest que está configurado para lidar com autenticação
        const response = await apiRequest("DELETE", `/api/journal/${entryId}`);
        
        console.log(`Resposta da exclusão via apiRequest: status=${response.status}`);
        
        return entryId;
      } catch (error) {
        console.error(`Erro ao excluir entrada ${entryId}:`, error);
        // Rethrow para tratamento no onError
        throw error;
      }
    },
    onSuccess: (deletedId) => {
      console.log(`Entrada ${deletedId} excluída com sucesso`);
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({
        title: "Entrada excluída",
        description: "A entrada foi removida com sucesso do seu diário.",
      });
      setEntryToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Erro ao excluir entrada:", error);
      toast({
        title: "Erro ao excluir",
        description: `Não foi possível excluir a entrada: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Extrair categorias únicas das entradas
  const categories = useMemo(() => {
    if (!entries) return ["todas"];
    
    const uniqueCategories = new Set<string>();
    uniqueCategories.add("todas");
    
    entries.forEach(entry => {
      if (entry.category) {
        uniqueCategories.add(entry.category);
      }
    });
    
    return Array.from(uniqueCategories);
  }, [entries]);

  // Filtrar e ordenar entradas
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    
    let filtered = [...entries];
    
    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.content.toLowerCase().includes(searchLower) || 
        entry.summary?.toLowerCase().includes(searchLower) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        entry.category?.toLowerCase().includes(searchLower) ||
        entry.mood.toLowerCase().includes(searchLower) ||
        entry.emotionalTone?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtrar por categoria
    if (filteredCategory !== "todas") {
      filtered = filtered.filter(entry => entry.category === filteredCategory);
    }
    
    // Ordenar por data
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    return filtered;
  }, [entries, searchTerm, filteredCategory, sortOrder]);

  // Função para confirmar exclusão
  const handleDeleteEntry = (id: number) => {
    setEntryToDelete(id);
  };

  // Função para executar exclusão
  const confirmDelete = async () => {
    if (entryToDelete) {
      try {
        console.log(`Execução direta de exclusão para ID: ${entryToDelete}`);
        
        // Usar diretamente axios para contornar qualquer problema com apiRequest
        const token = getAuthToken();
        if (!token) {
          console.error("Token não encontrado para exclusão direta");
          throw new Error("Você não está autenticado. Faça login novamente.");
        }
        
        // Fazer requisição direta com axios
        const response = await axios.delete(`/api/journal/${entryToDelete}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log("Resposta da exclusão direta:", response);
        
        if (response.status >= 200 && response.status < 300) {
          queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
          toast({
            title: "Entrada excluída",
            description: "A entrada foi removida com sucesso do seu diário.",
          });
          setEntryToDelete(null);
        } else {
          throw new Error(`Erro na exclusão: ${response.statusText}`);
        }
      } catch (error) {
        console.error("Erro na exclusão direta:", error);
        toast({
          title: "Erro ao excluir",
          description: `Falha ao excluir a entrada. Tente novamente mais tarde.`,
          variant: "destructive",
        });
      }
    }
  };

  // Função para alternar a ordenação
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Renderizar o conteúdo principal - sem o PageLayout pois já é adicionado pelo ProtectedRouteWithLayout
  return (
    <div className="flex flex-col gap-6 px-4 pb-4 ios-scroll-fix">
      {/* Removido o PageHeader para evitar redundância com o título na header */}
      
      {/* Espaçamento adicional após o header */}
      <div className="h-4"></div>

      {/* Filtros e busca */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar no diário..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="category-filter" className="sr-only">Filtrar por categoria</Label>
          <Select
            value={filteredCategory}
            onValueChange={setFilteredCategory}
          >
            <SelectTrigger id="category-filter" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === "todas" 
                    ? "Todas as categorias" 
                    : category.charAt(0).toUpperCase() + category.slice(1)
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Button 
            variant="outline" 
            className="w-full md:w-auto"
            onClick={toggleSortOrder}
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
          </Button>
        </div>
      </div>

      {/* Contagem de resultados */}
      <div className="text-sm text-muted-foreground">
        {filteredEntries.length === 0 && !isLoading 
          ? "Nenhuma entrada encontrada" 
          : `${filteredEntries.length} ${filteredEntries.length === 1 ? "entrada" : "entradas"} encontrada${filteredEntries.length !== 1 ? "s" : ""}`
        }
      </div>

      {/* Lista de entradas */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="pb-2">
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-red-500">
            Erro ao carregar entradas do diário. Por favor, tente novamente.
          </p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/journal"] })}
            className="mt-4"
          >
            Tentar novamente
          </Button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-lg border border-gray-100 p-8 text-center bg-white">
          <div className="max-w-md mx-auto">
            {searchTerm || filteredCategory !== "todas" ? (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-50 text-orange-500 mb-4">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhuma entrada encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Tente ajustar os filtros ou usar outros termos de busca para encontrar o que está procurando.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setFilteredCategory("todas");
                  }}
                  className="mr-2"
                >
                  Limpar filtros
                </Button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                  <BookText className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Seu diário está vazio</h3>
                <p className="text-muted-foreground mb-4">
                  Comece a registrar seus pensamentos e sentimentos para acompanhar sua jornada emocional e receber insights personalizados.
                </p>
                <div className="mt-2 space-y-3 max-w-xs mx-auto">
                  <p className="text-sm text-muted-foreground">Registre seus pensamentos e receba:</p>
                  <ul className="text-sm text-left space-y-2 mb-4">
                    <li className="flex items-start">
                      <div className="mr-2 mt-0.5 text-primary">✓</div>
                      <div>Análise de tendências emocionais ao longo do tempo</div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-0.5 text-primary">✓</div>
                      <div>Recomendações personalizadas de bem-estar</div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-0.5 text-primary">✓</div>
                      <div>Insights que auxiliam no autoconhecimento</div>
                    </li>
                  </ul>
                </div>
                <Link to="/journal">
                  <Button className="mt-2">
                    Escrever no diário
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry) => (
            <div key={entry.id}>
              <Card className="overflow-hidden h-full flex flex-col" style={{
                borderLeft: entry.colorHex ? `4px solid ${entry.colorHex}` : undefined
              }}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {entry.title || "Entrada do diário"}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-1">
                        {entry.category && (
                          <Badge variant="outline" className="mr-2">
                            {entry.category}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Excluir entrada</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-xs mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(entry.date), "PPP", { locale: ptBR })}
                    {entry.audioUrl && (
                      <Badge variant="outline" className="ml-2 flex items-center gap-1">
                        <AudioLines className="h-3 w-3" />
                        Áudio
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2 flex-grow">
                  <div className="line-clamp-4 text-sm mb-2">
                    {entry.content}
                  </div>
                  {entry.summary && (
                    <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                      <span className="font-medium flex items-center gap-1 mb-1">
                        <Bookmark className="h-3 w-3" /> Resumo:
                      </span>
                      <p className="line-clamp-2">{entry.summary}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-1">
                  {entry.tags?.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />{tag}
                    </Badge>
                  ))}
                  {entry.tags && entry.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{entry.tags.length - 3}
                    </Badge>
                  )}
                  <div className="ml-auto">
                    <Badge className="text-xs" style={{
                      backgroundColor: entry.colorHex || undefined,
                      color: entry.colorHex ? "#fff" : undefined
                    }}>
                      {entry.emotionalTone || entry.mood}
                    </Badge>
                  </div>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {/* Dialog de confirmação de exclusão - movido para o fim da página para melhor renderização */}
      <AlertDialog 
        open={entryToDelete !== null} 
        onOpenChange={(open) => {
          // Se o dialog estiver fechando, resetar o entryToDelete
          if (!open) setEntryToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrada do diário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A entrada será permanentemente removida
              do seu histórico de diário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault(); // Prevenir comportamento padrão
                e.stopPropagation(); // Evitar propagação do evento
                console.log("Botão de confirmação de exclusão clicado para ID:", entryToDelete);
                confirmDelete();
              }}
              disabled={deleteEntryMutation.isPending}
            >
              {deleteEntryMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}