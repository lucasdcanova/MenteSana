import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Session } from '@shared/schema';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SessionsCalendarProps {
  sessions: Session[];
  isLoading: boolean;
  onDateSelect?: (date: Date) => void;
}

export function SessionsCalendar({ sessions, isLoading, onDateSelect }: SessionsCalendarProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  // Função para verificar se uma string de data é válida
  const isValidDateString = (dateStr: string | Date): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d instanceof Date && !isNaN(d.getTime());
  };

  // Função para converter string em data de forma segura
  const safeParseDate = (dateStr: string | Date): Date | null => {
    if (!isValidDateString(dateStr)) return null;
    return new Date(dateStr);
  };

  // Função para verificar se uma data tem sessões
  const hasSessionsOnDate = (date: Date) => {
    if (!date || !sessions?.length) return false;
    
    return sessions.some(session => {
      const sessionDate = safeParseDate(session.scheduledFor);
      return sessionDate && isSameDay(sessionDate, date);
    });
  };

  // Função para contar sessões em uma data
  const countSessionsOnDate = (date: Date) => {
    if (!date || !sessions?.length) return 0;
    
    return sessions.filter(session => {
      const sessionDate = safeParseDate(session.scheduledFor);
      return sessionDate && isSameDay(sessionDate, date);
    }).length || 0;
  };

  // Função para obter os detalhes das sessões em uma data
  const getSessionsOnDate = (date: Date) => {
    if (!date || !sessions?.length) return [];
    
    return sessions.filter(session => {
      const sessionDate = safeParseDate(session.scheduledFor);
      return sessionDate && isSameDay(sessionDate, date);
    }) || [];
  };

  // Manipulador de mudança de data
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setDate(date);
      if (onDateSelect) {
        onDateSelect(date);
      }
    }
  };

  // Avançar mês
  const nextMonth = () => {
    const nextMonth = new Date(month);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setMonth(nextMonth);
  };

  // Voltar mês
  const prevMonth = () => {
    const prevMonth = new Date(month);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setMonth(prevMonth);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Calendário de Sessões</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateChange}
          month={month}
          onMonthChange={setMonth}
          locale={ptBR}
          className="rounded-md border"
          modifiers={{
            hasSession: (day) => hasSessionsOnDate(day),
          }}
          modifiersClassNames={{
            hasSession: "bg-emerald-100 text-emerald-900 font-medium hover:bg-emerald-200"
          }}
          components={{
            Day: ({ date, displayMonth, activeModifiers, selected, disabled, hidden, ...props }: any) => {
              // Validar se a data é válida
              const isValidDate = date instanceof Date && !isNaN(date.getTime());
              
              if (!isValidDate) {
                console.warn('Data inválida recebida no componente Day:', date);
                // Retornar uma div vazia em caso de data inválida
                return <div {...props}>-</div>;
              }
              
              const count = countSessionsOnDate(date);
              const isOutsideMonth = displayMonth && date.getMonth() !== displayMonth.getMonth();
              
              return (
                <div className="relative w-full h-full">
                  <div {...props}>
                    {format(date, 'd')}
                    {count > 0 && !isOutsideMonth && (
                      <div className="absolute top-0 right-0 h-2 w-2 bg-emerald-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              );
            }
          }}
        />
        <div className="mt-4">
          <h3 className="font-medium mb-2">
            Sessões em {format(date, 'PP', { locale: ptBR })}
          </h3>
          {getSessionsOnDate(date).length > 0 ? (
            <div className="space-y-2">
              {getSessionsOnDate(date).map(session => (
                <div 
                  key={session.id} 
                  className="p-2 bg-emerald-50 border border-emerald-100 rounded-md"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {isValidDateString(session.scheduledFor) 
                        ? format(new Date(session.scheduledFor), 'HH:mm')
                        : 'Horário não especificado'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      session.status === 'completed' ? 'bg-green-100 text-green-800' :
                      session.status === 'canceled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {session.status === 'completed' ? 'Concluída' :
                      session.status === 'canceled' ? 'Cancelada' :
                      'Agendada'}
                    </span>
                  </div>
                  <div className="text-sm mt-1">
                    Paciente: {session.userId}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 text-gray-500 bg-gray-50 rounded-md">
              Nenhuma sessão agendada para esta data
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}