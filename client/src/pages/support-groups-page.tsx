import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Users, Video, MessageCircle } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import CreateGroupDialog from "@/components/support-groups/create-group-dialog";

const SupportGroupsPage = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Consulta para obter os tópicos disponíveis
  const { data: topics, isLoading: isTopicsLoading } = useQuery({
    queryKey: ["/api/support-groups/topics"],
    retry: 3, // Aumentar o número de tentativas
  });

  // Consulta para obter os grupos de apoio com filtros
  const {
    data: groupsData,
    isLoading: isGroupsLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "/api/support-groups",
      { search: searchQuery || undefined, topic: selectedTopic || undefined },
    ],
    retry: 3, // Aumentar o número de tentativas
    refetchOnWindowFocus: true, // Recarregar ao focar na janela
    staleTime: 0, // Sempre considerar os dados como desatualizados
  });

  // Adicionar logs de depuração
  console.log("Dados dos grupos obtidos:", groupsData);
  
  // Usar operador de coalescência nula para garantir valores padrão
  const groups = (groupsData && groupsData.data) ? groupsData.data : [];
  const pagination = (groupsData && groupsData.pagination) ? groupsData.pagination : null;
  
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

  // Efeito para recarregar dados ao montar o componente
  React.useEffect(() => {
    // Força o recarregamento dos dados dos grupos ao montar o componente
    queryClient.invalidateQueries({
      queryKey: ["/api/support-groups"],
    });
  }, []);

  // Função para entrar em um grupo
  const handleJoinGroup = async (groupId: number) => {
    if (!user) {
      toast({
        title: "Faça login para participar",
        description: "Você precisa estar logado para participar de um grupo de apoio.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Log para depuração
      console.log(`Tentando entrar no grupo ${groupId} como usuário ${user.id}`);
      
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
      queryClient.invalidateQueries({
        queryKey: ["/api/support-groups"],
      });
      
      // Redirecionar para a página do grupo com pequeno atraso para evitar problemas de renderização
      setTimeout(() => {
        setLocation(`/support-groups/${groupId}`);
      }, 100);
    } catch (error) {
      console.error("Erro ao entrar no grupo:", error);
      toast({
        title: "Erro ao entrar no grupo",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="container max-w-5xl mx-auto px-3 sm:px-4">
        <div className="flex justify-between items-center my-3 sm:my-4">
          <h1 className="text-xl sm:text-2xl font-semibold">Grupos de Apoio</h1>
          {user?.isTherapist && (
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="text-xs sm:text-sm">
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
              />
              <Button type="submit" variant="secondary" size="sm" className="text-xs sm:text-sm whitespace-nowrap">
                <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
              {(searchQuery || selectedTopic) && (
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="text-xs sm:text-sm">
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
                {topics?.map((topic: any) => (
                  <Badge
                    key={topic.id}
                    variant={selectedTopic === topic.id ? "default" : "outline"} 
                    className="cursor-pointer text-xs sm:text-sm py-1 px-2 sm:px-3 flex-shrink-0"
                    onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
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
          <div className="text-center py-6 sm:py-10">
            <h3 className="text-base sm:text-lg font-medium mb-2">Nenhum grupo encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
              {searchQuery || selectedTopic
                ? "Nenhum grupo corresponde aos filtros aplicados."
                : "Não há grupos de apoio disponíveis no momento."}
            </p>
            {(searchQuery || selectedTopic) && (
              <Button onClick={resetFilters} variant="outline" size="sm" className="text-xs sm:text-sm">
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {groups.map((group: any) => (
              <Card key={group.id} className="overflow-hidden">
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
                <CardFooter className="p-3 sm:p-4 pt-0 sm:pt-0">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Usar setTimeout para evitar problemas de renderização
                      setTimeout(() => {
                        if (group && group.id) {
                          setLocation(`/support-groups/${group.id}`);
                        }
                      }, 50);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs sm:text-sm h-8 sm:h-9"
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
                disabled={pagination.page === 1}
                onClick={() => {
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
                disabled={pagination.page === pagination.totalPages}
                onClick={() => {
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
      </div>

      {/* Modal de Criação de Grupo */}
      <CreateGroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        topics={topics || []}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["/api/support-groups"],
          });
        }}
      />
    </>
  );
};

export default SupportGroupsPage;