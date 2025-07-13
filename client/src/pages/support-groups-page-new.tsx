import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Users, Video, MessageCircle, ArrowRight, UserPlus } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import CreateGroupDialog from "@/components/support-groups/create-group-dialog";

/**
 * Página principal de grupos de apoio - versão reconstruída para evitar bugs de navegação
 */
const SupportGroupsPageNew: React.FC = () => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Consulta para obter os tópicos disponíveis
  const { 
    data: topics = [], 
    isLoading: isTopicsLoading 
  } = useQuery({
    queryKey: ["/api/support-groups/topics"],
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  // Consulta para obter os grupos de apoio com filtros
  const {
    data: groupsResponse,
    isLoading: isGroupsLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "/api/support-groups",
      { search: searchQuery || undefined, topic: selectedTopic || undefined },
    ],
    staleTime: 60000, // 1 minuto
    refetchOnWindowFocus: false,
  });

  const groups = groupsResponse?.data || [];
  const pagination = groupsResponse?.pagination || null;

  // Função para aplicar filtros
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  // Função para resetar filtros
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedTopic(null);
    // Limpar query keys para recarregar dados
    queryClient.invalidateQueries({
      queryKey: ["/api/support-groups"],
    });
  };

  // Função para navegar para a página de detalhes do grupo com segurança
  const navigateToGroup = (groupId: number) => {
    if (isNavigating) return; // Evitar múltiplas navegações
    
    setIsNavigating(true);
    
    // Prefetch dos dados do grupo para evitar problemas de carregamento
    queryClient.prefetchQuery({
      queryKey: ["/api/support-groups", groupId],
      staleTime: 60000, // 1 minuto
    });
    
    // Navegação com atraso controlado
    setTimeout(() => {
      navigate(`/support-groups/${groupId}`);
      // Reset do estado de navegação após um tempo adicional
      setTimeout(() => setIsNavigating(false), 500);
    }, 100);
  };

  // Função para entrar em um grupo
  const handleJoinGroup = async (groupId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isNavigating) return; // Evitar múltiplas ações durante navegação
    
    if (!user) {
      toast({
        title: "Faça login para participar",
        description: "Você precisa estar logado para participar de um grupo de apoio.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsNavigating(true); // Bloquear interações durante a operação
      
      const response = await fetch(`/api/support-groups/${groupId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Não foi possível entrar no grupo");
      }

      toast({
        title: "Você entrou no grupo!",
        description: "Agora você pode participar das discussões e reuniões.",
      });
      
      // Recarregar dados
      await queryClient.invalidateQueries({
        queryKey: ["/api/support-groups"],
      });
      
      // Prefetch dos dados do grupo para evitar problemas de carregamento
      await queryClient.prefetchQuery({
        queryKey: ["/api/support-groups", groupId],
        staleTime: 60000, // 1 minuto
      });

      // Atraso para garantir que os dados foram carregados
      setTimeout(() => {
        navigate(`/support-groups/${groupId}`);
        // Reset do estado de navegação após um tempo adicional
        setTimeout(() => setIsNavigating(false), 500);
      }, 300);
      
    } catch (error) {
      console.error("Erro ao entrar no grupo:", error);
      
      toast({
        title: "Erro ao entrar no grupo",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
      
      setIsNavigating(false);
    }
  };

  // Efeito para garantir que isNavigating seja resetado se algo der errado
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      if (isNavigating) {
        setIsNavigating(false);
      }
    }, 3000); // Reset de segurança após 3 segundos

    return () => clearTimeout(resetTimer);
  }, [isNavigating]);

  return (
    <div className="container max-w-5xl mx-auto px-3 sm:px-4 py-4">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Grupos de Apoio</h1>
        {user?.isTherapist && (
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            size="sm" 
            className="text-xs sm:text-sm"
            disabled={isNavigating}
          >
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Criar Grupo
          </Button>
        )}
      </div>

      {/* Filtros e pesquisa */}
      <div className="bg-card rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border">
        <div className="flex flex-col gap-3 sm:gap-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Buscar grupos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm h-9"
              disabled={isNavigating}
            />
            <Button 
              type="submit" 
              variant="secondary" 
              size="sm" 
              className="text-xs sm:text-sm whitespace-nowrap"
              disabled={isNavigating}
            >
              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
            {(searchQuery || selectedTopic) && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters} 
                className="text-xs sm:text-sm"
                disabled={isNavigating}
              >
                Limpar
              </Button>
            )}
          </form>
          
          {/* Tópicos */}
          {isTopicsLoading ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-7 sm:h-8 w-20 sm:w-24 rounded-full flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {topics.map((topic: any) => (
                <Badge
                  key={topic.id}
                  variant={selectedTopic === topic.id ? "default" : "outline"} 
                  className={`cursor-pointer text-xs sm:text-sm py-1 px-2 sm:px-3 flex-shrink-0 ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => !isNavigating && setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
                >
                  {topic.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de grupos */}
      {error ? (
        <Alert variant="destructive" className="mb-4 sm:mb-6 text-sm">
          <AlertTitle className="text-base">Erro ao carregar grupos</AlertTitle>
          <AlertDescription className="text-sm">
            Não foi possível carregar os grupos de apoio. Por favor, tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      ) : isGroupsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                <Skeleton className="h-5 sm:h-6 w-3/4 mb-2" />
                <Skeleton className="h-3 sm:h-4 w-full" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pb-2 sm:pb-3">
                <div className="space-y-1 sm:space-y-2">
                  <Skeleton className="h-3 sm:h-4 w-full" />
                  <Skeleton className="h-3 sm:h-4 w-full" />
                  <Skeleton className="h-3 sm:h-4 w-2/3" />
                </div>
                <div className="flex gap-2 mt-3 sm:mt-4">
                  <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
                  <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
                </div>
              </CardContent>
              <CardFooter className="p-3 sm:p-4 pt-0 sm:pt-0">
                <Skeleton className="h-8 sm:h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-6 sm:py-10 bg-white rounded-xl shadow-sm border border-gray-100 max-w-xl mx-auto">
          {searchQuery || selectedTopic ? (
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-50 text-orange-500 mb-4">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum grupo encontrado</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Nenhum grupo corresponde aos filtros aplicados. Tente ajustar sua busca ou explorar outros tópicos.
              </p>
              <Button 
                onClick={resetFilters} 
                variant="outline" 
                className="mx-auto"
                disabled={isNavigating}
              >
                <Search className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum grupo disponível</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                No momento não existem grupos de apoio disponíveis. Que tal criar o primeiro grupo e iniciar uma comunidade?
              </p>
              <div className="space-y-3 max-w-xs mx-auto mb-6">
                <p className="text-sm text-left text-muted-foreground">Grupos de apoio permitem:</p>
                <ul className="text-sm text-left space-y-2">
                  <li className="flex items-start">
                    <div className="mr-2 mt-0.5 text-primary">✓</div>
                    <div>Compartilhar experiências em um ambiente seguro</div>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-2 mt-0.5 text-primary">✓</div>
                    <div>Obter suporte de pessoas com vivências semelhantes</div>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-2 mt-0.5 text-primary">✓</div>
                    <div>Participar de discussões e sessões coletivas</div>
                  </li>
                </ul>
              </div>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)} 
                size="lg"
                disabled={isNavigating}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar um grupo
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {groups.map((group: any) => (
            <Card 
              key={group.id} 
              className={`overflow-hidden transition-opacity ${isNavigating ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50 cursor-pointer'}`}
              onClick={() => navigateToGroup(group.id)}
            >
              <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base sm:text-lg">{group.name}</CardTitle>
                  <Badge variant="outline" className="ml-2 text-xs sm:text-sm">
                    {group.topic}
                  </Badge>
                </div>
                <CardDescription className="text-xs sm:text-sm">
                  {group.isPrivate && "Grupo privado • "}
                  Criado {formatDistanceToNow(new Date(group.createdAt), { locale: pt, addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 py-2 sm:py-3">
                <p className="text-xs sm:text-sm line-clamp-2 mb-2 sm:mb-3">
                  {group.description}
                </p>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span>{group.memberCount || 0} {group.memberCount === 1 ? "membro" : "membros"}</span>
                  </div>
                  {group.therapist && (
                    <div className="flex items-center">
                      <span className="text-xs">Moderado por profissional</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-3 sm:p-4 pt-0 sm:pt-0 flex gap-2">
                <Button
                  onClick={(e) => handleJoinGroup(group.id, e)}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  disabled={isNavigating}
                >
                  <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Participar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  disabled={isNavigating}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigateToGroup(group.id);
                  }}
                >
                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Ver grupo
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Paginação */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-4 sm:mt-6">
          <div className="flex gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs sm:text-sm px-2 sm:px-3"
              disabled={pagination.page === 1 || isNavigating}
              onClick={() => {
                if (isNavigating) return;
                
                queryClient.prefetchQuery({
                  queryKey: [
                    "/api/support-groups",
                    {
                      search: searchQuery || undefined,
                      topic: selectedTopic || undefined,
                      page: pagination.page - 1,
                    },
                  ],
                });
              }}
            >
              Anterior
            </Button>
            <div className="flex items-center px-2 sm:px-3 text-xs sm:text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs sm:text-sm px-2 sm:px-3"
              disabled={pagination.page === pagination.totalPages || isNavigating}
              onClick={() => {
                if (isNavigating) return;
                
                queryClient.prefetchQuery({
                  queryKey: [
                    "/api/support-groups",
                    {
                      search: searchQuery || undefined,
                      topic: selectedTopic || undefined,
                      page: pagination.page + 1,
                    },
                  ],
                });
              }}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Criação de Grupo */}
      <CreateGroupDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => !isNavigating && setIsCreateDialogOpen(open)}
        topics={topics || []}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["/api/support-groups"],
          });
        }}
      />
    </div>
  );
};

export default SupportGroupsPageNew;