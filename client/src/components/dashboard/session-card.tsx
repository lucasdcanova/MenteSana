import { Session } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Video, FileText, Clock } from 'lucide-react';
import { Link } from 'wouter';

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  // Formatação de data e hora
  const date = new Date(session.scheduledFor);
  const formattedDate = format(date, 'PP', { locale: ptBR });
  const formattedTime = format(date, 'HH:mm');
  const durationHours = Math.floor(session.duration / 60);
  const durationMinutes = session.duration % 60;
  const formattedDuration = `${durationHours}h${durationMinutes > 0 ? ` ${durationMinutes}min` : ''}`;
  
  // Status da sessão
  const statusStyles = {
    completed: "bg-green-100 text-green-800",
    scheduled: "bg-blue-100 text-blue-800",
    canceled: "bg-red-100 text-red-800"
  };
  
  const statusLabels = {
    completed: "Concluída",
    scheduled: "Agendada",
    canceled: "Cancelada"
  };
  
  // Verificar se a sessão é hoje
  const isToday = () => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
  
  return (
    <Card className="overflow-hidden border">
      <div className={`h-2 w-full ${
        session.status === "completed" ? "bg-green-500" : 
        session.status === "canceled" ? "bg-red-500" : 
        "bg-blue-500"
      }`}></div>
      <CardContent className="p-4">
        <div className="flex justify-between mb-3">
          <div className="font-medium">{session.therapistName || 'Terapeuta não especificado'}</div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyles[session.status]}`}>
            {statusLabels[session.status]}
          </span>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex text-sm text-gray-500 items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formattedDate}</span>
            {isToday() && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Hoje</span>}
          </div>
          
          <div className="flex text-sm text-gray-500 items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>{formattedTime} ({formattedDuration})</span>
          </div>
          
          {session.notes && (
            <div className="text-sm text-gray-600 line-clamp-2 italic">
              "{session.notes}"
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          {session.status === "scheduled" && (
            <Button size="sm" asChild>
              <Link href={`/video-call/${session.id}`}>
                <Video className="h-4 w-4 mr-1" />
                Entrar
              </Link>
            </Button>
          )}
          
          <Button size="sm" variant="outline" asChild>
            <Link href={`/session-notes/${session.id}`}>
              <FileText className="h-4 w-4 mr-1" />
              Notas
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}