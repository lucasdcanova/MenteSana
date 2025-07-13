import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MessageCircle, 
  Calendar, 
  Send, 
  LogOut, 
  UserPlus, 
  Settings, 
  Video,
  Info,
  ChevronLeft
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import GroupMembersList from "@/components/support-groups/group-members-list";
import GroupMeetingsList from "@/components/support-groups/group-meetings-list";
import ScheduleMeetingDialog from "@/components/support-groups/schedule-meeting-dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Funções utilitárias
const getInitials = (name: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

const SupportGroupDetailsPage = () => {
  const [, params] = useRoute("/support-groups/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  
  const groupId = params?.id ? parseInt(params.id) : null;

  // Verificar se o usuário é membro do grupo
  const { 
    data: membershipData, 
    isLoading: isMembershipLoading,
    refetch: refetchMembership
  } = useQuery({
    queryKey: ["/api/support-groups", groupId, "membership"],
    enabled: !!groupId && !!user,
    retry: 2,
    staleTime: 10000, // 10 segundos
    refetchOnWindowFocus: false, // Evitar múltiplas chamadas
  });

  const isMember = membershipData?.isMember || false;
  const userRole = membershipData?.role || "member";
  const isAdmin = userRole === "admin";

  // Buscar detalhes do grupo
  const { 
    data: group, 
    isLoading: isGroupLoading, 
    error: groupError,
    refetch: refetchGroup
  } = useQuery({
    queryKey: ["/api/support-groups", groupId],
    enabled: !!groupId,
    retry: 2,
    staleTime: 10000, // 10 segundos
    refetchOnWindowFocus: false, // Evitar múltiplas chamadas
  });

  // Buscar mensagens do grupo (apenas se for membro)
  const { 
    data: messagesData, 
    isLoading: isMessagesLoading,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ["/api/support-groups", groupId, "messages"],
    enabled: !!groupId && isMember,
    retry: 2,
    staleTime: 10000, // 10 segundos
    refetchOnWindowFocus: false, // Evitar múltiplas chamadas
  });

  const messages = messagesData?.data || [];
  const messagesPagination = messagesData?.pagination;

  // Mutação para enviar uma mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!groupId) throw new Error("ID do grupo inválido");
      
      const response = await apiRequest("POST", `/api/support-groups/${groupId}/messages`, {
        content: text
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao enviar mensagem");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setMessageText("");
      // Recarregar mensagens
      queryClient.invalidateQueries({
        queryKey: ["/api/support-groups", groupId, "messages"],
      });
      
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao enviar a mensagem",
        variant: "destructive",
      });
    }
  });

  // Mutação para entrar no grupo
  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error("ID do grupo inválido");
      
      const response = await apiRequest("POST", `/api/support-groups/${groupId}/join`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao entrar no grupo");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Recarregar status de membro e detalhes do grupo
      refetchMembership();
      refetchGroup();
      
      toast({
        title: "Você entrou no grupo!",
        description: "Agora você pode participar das discussões e reuniões.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao entrar no grupo",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao entrar no grupo",
        variant: "destructive",
      });
    }
  });

  // Mutação para sair do grupo
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error("ID do grupo inválido");
      
      const response = await apiRequest("POST", `/api/support-groups/${groupId}/leave`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao sair do grupo");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Recarregar status de membro e detalhes do grupo
      refetchMembership();
      refetchGroup();
      
      toast({
        title: "Você saiu do grupo",
        description: "Você não faz mais parte deste grupo de apoio.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao sair do grupo",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao sair do grupo",
        variant: "destructive",
      });
    }
  });

  // Manipulador para enviar mensagem
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  // Função para formatar data/hora
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Hoje às ${format(date, 'HH:mm')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem às ${format(date, 'HH:mm')}`;
    } else {
      return format(date, "dd/MM/yyyy 'às' HH:mm");
    }
  };

  // Se não houver ID do grupo válido, redirecionar para a lista de grupos após um pequeno atraso
  useEffect(() => {
    if (!groupId) {
      // Usar setTimeout para evitar problemas de renderização
      setTimeout(() => {
        setLocation("/support-groups");
      }, 100);
    }
  }, [groupId, setLocation]);

  if (!groupId) {
    return null;
  }

  return (
    <>
      <div className="container max-w-6xl mx-auto px-4">
        
        {/* Erro ao carregar o grupo */}
        {groupError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Erro ao carregar o grupo</AlertTitle>
            <AlertDescription>
              Não foi possível carregar os detalhes do grupo. Por favor, tente novamente mais tarde.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Cabeçalho do grupo */}
        {isGroupLoading ? (
          <div className="mb-6">
            <Skeleton className="h-8 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-20 w-full mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        ) : group ? (
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{group.name}</h1>
                  <Badge>{group.topic}</Badge>
                  {group.isPrivate && <Badge variant="outline">Privado</Badge>}
                </div>
                <p className="text-muted-foreground">
                  Criado {formatDistanceToNow(new Date(group.createdAt), { locale: pt, addSuffix: true })}
                  {group.therapist && ` • Moderado por ${group.therapist.firstName} ${group.therapist.lastName}`}
                </p>
              </div>
              
              <div className="flex gap-2">
                {!user ? (
                  <Button onClick={() => setLocation("/auth")}>
                    Faça login para participar
                  </Button>
                ) : !isMember ? (
                  <Button 
                    onClick={() => joinGroupMutation.mutate()} 
                    disabled={joinGroupMutation.isPending}
                  >
                    {joinGroupMutation.isPending ? (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Participar do grupo
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    {isAdmin && (
                      <Button variant="outline" onClick={() => setIsScheduleDialogOpen(true)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Agendar reunião
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => leaveGroupMutation.mutate()}
                      disabled={leaveGroupMutation.isPending}
                    >
                      {leaveGroupMutation.isPending ? (
                        <>
                          <Skeleton className="h-4 w-4 mr-2" />
                          Saindo...
                        </>
                      ) : (
                        <>
                          <LogOut className="mr-2 h-4 w-4" />
                          Sair do grupo
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.memberCount || 0} {group.memberCount === 1 ? "membro" : "membros"}
                  </Badge>
                  {group.meetingFrequency && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Reuniões {group.meetingFrequency.toLowerCase()}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Sobre este grupo</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {group.description}
                  </p>
                </div>
                
                {group.rules && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <h3 className="font-medium">Regras do grupo</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {group.rules}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
        
        {/* Conteúdo principal */}
        {!isMember && !isGroupLoading && group ? (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Participe para ver o conteúdo</AlertTitle>
            <AlertDescription>
              Você precisa fazer parte deste grupo para ver as mensagens e participar das discussões.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="messages" className="space-y-4">
            <TabsList>
              <TabsTrigger value="messages" className="flex gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>Mensagens</span>
              </TabsTrigger>
              <TabsTrigger value="meetings" className="flex gap-2">
                <Calendar className="h-4 w-4" />
                <span>Reuniões</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="flex gap-2">
                <Users className="h-4 w-4" />
                <span>Membros</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="messages" className="space-y-4">
              {/* Área de mensagens */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Conversas do grupo</CardTitle>
                  <CardDescription>
                    Compartilhe suas experiências e apoie outros membros
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isMessagesLoading ? (
                    <div className="space-y-4 mb-4">
                      {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="flex gap-2">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messagesError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Erro ao carregar mensagens</AlertTitle>
                      <AlertDescription>
                        Não foi possível carregar as mensagens do grupo. Por favor, tente novamente mais tarde.
                      </AlertDescription>
                    </Alert>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-10">
                      <h3 className="text-lg font-medium mb-2">Nenhuma mensagem ainda</h3>
                      <p className="text-muted-foreground mb-6">
                        Seja o primeiro a compartilhar algo com o grupo!
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4" enableMouseWheel={true}>
                      <div className="space-y-4 mb-4">
                        {messages.map((msg: any) => (
                          <div key={msg.message.id} className="flex gap-3">
                            <Avatar>
                              <AvatarImage src={msg.author.profilePicture} />
                              <AvatarFallback>{getInitials(`${msg.author.firstName} ${msg.author.lastName}`)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                <span className="font-medium">
                                  {msg.author.firstName} {msg.author.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatMessageTime(msg.message.createdAt)}
                                </span>
                              </div>
                              <div className="text-sm">
                                {msg.message.content}
                              </div>
                              {msg.message.attachmentUrl && (
                                <a 
                                  href={msg.message.attachmentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-block mt-2 text-xs text-blue-500 hover:underline"
                                >
                                  Ver anexo
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
                <CardFooter>
                  <form onSubmit={handleSendMessage} className="w-full flex gap-2">
                    <Textarea 
                      placeholder="Escreva sua mensagem..." 
                      value={messageText} 
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 min-h-[60px]"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? (
                        <Skeleton className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="meetings">
              {/* Componente de listagem de reuniões */}
              <Card>
                <CardHeader>
                  <CardTitle>Reuniões do grupo</CardTitle>
                  <CardDescription>
                    Participe de reuniões online com outros membros
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {group ? (
                    <GroupMeetingsList 
                      groupId={groupId} 
                      isAdmin={isAdmin} 
                      onSchedule={() => setIsScheduleDialogOpen(true)}
                    />
                  ) : (
                    <div className="flex justify-center py-8">
                      <Skeleton className="h-32 w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="members">
              {/* Componente de listagem de membros */}
              <Card>
                <CardHeader>
                  <CardTitle>Membros do grupo</CardTitle>
                  <CardDescription>
                    Pessoas que fazem parte deste grupo de apoio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {group ? (
                    <GroupMembersList 
                      groupId={groupId} 
                      isAdmin={isAdmin} 
                    />
                  ) : (
                    <div className="flex justify-center py-8">
                      <Skeleton className="h-32 w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
      
      {/* Modal de agendamento de reuniões */}
      {group && (
        <ScheduleMeetingDialog
          open={isScheduleDialogOpen}
          onOpenChange={setIsScheduleDialogOpen}
          groupId={groupId}
          groupName={group.name}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["/api/support-groups", groupId, "meetings"],
            });
          }}
        />
      )}
    </>
  );
};

export default SupportGroupDetailsPage;