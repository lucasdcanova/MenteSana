import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, Plus, ExternalLink, Clock, User } from "lucide-react";
import { format, isBefore, isToday, addMinutes } from "date-fns";
import { pt } from "date-fns/locale";

interface GroupMeetingsListProps {
  groupId: number;
  isAdmin: boolean;
  onSchedule: () => void;
}

const GroupMeetingsList: React.FC<GroupMeetingsListProps> = ({
  groupId,
  isAdmin,
  onSchedule,
}) => {
  // Buscar reuniões do grupo
  const {
    data: meetings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/support-groups", groupId, "meetings"],
    enabled: !!groupId,
  });

  // Status da badge para cada tipo de status de reunião
  const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    scheduled: "secondary",
    ongoing: "default",
    completed: "outline",
    canceled: "destructive",
  };

  // Textos para cada status
  const statusText: Record<string, string> = {
    scheduled: "Agendada",
    ongoing: "Em andamento",
    completed: "Concluída",
    canceled: "Cancelada",
  };

  // Renderizar carregamento
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(2).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-28 mr-2" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  // Renderizar erro
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erro ao carregar reuniões</AlertTitle>
        <AlertDescription>
          Não foi possível carregar as reuniões do grupo. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  // Filtrando as reuniões (próximas e em andamento)
  const upcomingMeetings = meetings?.filter((meeting) => 
    meeting.meeting.status !== "completed" && 
    meeting.meeting.status !== "canceled"
  ) || [];
  
  // Histórico de reuniões (completadas ou canceladas)
  const pastMeetings = meetings?.filter((meeting) => 
    meeting.meeting.status === "completed" || 
    meeting.meeting.status === "canceled"
  ) || [];

  // Renderizar lista vazia e botão para agendar se for admin
  if (meetings?.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium mb-2">Nenhuma reunião agendada</h3>
        <p className="text-muted-foreground mb-6">
          Ainda não há reuniões agendadas para este grupo.
        </p>
        {isAdmin && (
          <Button onClick={onSchedule}>
            <Calendar className="mr-2 h-4 w-4" />
            Agendar reunião
          </Button>
        )}
      </div>
    );
  }

  // Formatar data e hora
  const formatMeetingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm', { locale: pt })}`;
    }
    return format(date, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt });
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Button onClick={onSchedule} className="w-full mb-4">
          <Plus className="mr-2 h-4 w-4" />
          Agendar nova reunião
        </Button>
      )}

      {upcomingMeetings.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Próximas reuniões</h3>
          <div className="space-y-4">
            {upcomingMeetings.map((meetingData) => {
              const meeting = meetingData.meeting;
              const meetingDate = new Date(meeting.scheduledFor);
              const endTime = addMinutes(meetingDate, meeting.duration);
              const isOngoing = meeting.status === "ongoing";
              const isPast = isBefore(endTime, new Date()) && !isOngoing;

              return (
                <Card key={meeting.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{meeting.title}</CardTitle>
                        <CardDescription>
                          {formatMeetingDate(meeting.scheduledFor)}
                        </CardDescription>
                      </div>
                      <Badge variant={statusVariants[meeting.status] || "outline"}>
                        {statusText[meeting.status] || meeting.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {meeting.description && (
                      <p className="text-sm text-muted-foreground">
                        {meeting.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{meeting.duration} minutos</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Criada por {meetingData.creator.firstName}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {meeting.meetingUrl && !isPast ? (
                      <Button size="sm" variant={isOngoing ? "default" : "outline"}>
                        <Video className="mr-2 h-4 w-4" />
                        <a 
                          href={meeting.meetingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          {isOngoing ? "Entrar agora" : "Link da reunião"}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {isPast 
                          ? "Esta reunião já ocorreu" 
                          : "O link da reunião estará disponível antes do início"}
                      </span>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {pastMeetings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Reuniões anteriores</h3>
          <div className="space-y-4">
            {pastMeetings.slice(0, 3).map((meetingData) => {
              const meeting = meetingData.meeting;
              
              return (
                <Card key={meeting.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{meeting.title}</CardTitle>
                        <CardDescription>
                          {formatMeetingDate(meeting.scheduledFor)}
                        </CardDescription>
                      </div>
                      <Badge variant={statusVariants[meeting.status] || "outline"}>
                        {statusText[meeting.status] || meeting.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {meeting.description && (
                      <p className="text-sm text-muted-foreground">
                        {meeting.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            
            {pastMeetings.length > 3 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Mostrando 3 de {pastMeetings.length} reuniões anteriores
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupMeetingsList;