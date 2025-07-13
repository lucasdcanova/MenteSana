import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserCog, UserMinus, ShieldCheck } from "lucide-react";

// Função para obter iniciais de um nome
const getInitials = (name: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

interface GroupMembersListProps {
  groupId: number;
  isAdmin: boolean;
}

const GroupMembersList: React.FC<GroupMembersListProps> = ({ groupId, isAdmin }) => {
  // Buscar membros do grupo
  const {
    data: membersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/support-groups", groupId, "members"],
    enabled: !!groupId,
  });

  const members = membersData?.data || [];
  const pagination = membersData?.pagination;

  // Renderizar carregamento
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Renderizar erro
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erro ao carregar membros</AlertTitle>
        <AlertDescription>
          Não foi possível carregar a lista de membros do grupo. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  // Renderizar lista vazia
  if (members.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium mb-2">Nenhum membro</h3>
        <p className="text-muted-foreground">
          Este grupo ainda não tem membros.
        </p>
      </div>
    );
  }

  // Organizar membros por papel (admin primeiro)
  const sortedMembers = [...members].sort((a, b) => {
    if (a.membership.role === "admin" && b.membership.role !== "admin") return -1;
    if (a.membership.role !== "admin" && b.membership.role === "admin") return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {sortedMembers.map((member) => (
        <div key={member.membership.id} className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={member.user.profilePicture} />
            <AvatarFallback>
              {getInitials(`${member.user.firstName} ${member.user.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center">
              <span className="font-medium">
                {member.user.firstName} {member.user.lastName}
              </span>
              {member.membership.role === "admin" && (
                <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Admin</span>
                </Badge>
              )}
              {member.membership.role === "moderator" && (
                <Badge variant="outline" className="ml-2 flex items-center gap-1">
                  <UserCog className="h-3 w-3" />
                  <span>Moderador</span>
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Entrou {new Date(member.membership.joinedAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      ))}
      
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Mostrando {members.length} de {pagination.total} membros
          </p>
        </div>
      )}
    </div>
  );
};

export default GroupMembersList;