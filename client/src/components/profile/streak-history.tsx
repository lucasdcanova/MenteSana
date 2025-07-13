import { useQuery } from "@tanstack/react-query";
import { DailyStreak as DailyStreakType } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function StreakHistory() {
  const { data: streak, isLoading } = useQuery<DailyStreakType>({
    queryKey: ["/api/streaks"],
    refetchOnWindowFocus: false
  });

  // Gerar calendário do mês atual
  const generateCalendar = () => {
    const today = new Date();
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);
    
    const daysInMonth = eachDayOfInterval({
      start: firstDayOfMonth,
      end: lastDayOfMonth
    });

    // Obter dias de atividade (simulados com base no streak atual)
    // Aqui você substituiria isso por dados reais de atividade do backend
    const activityDates: Date[] = [];
    if (streak && streak.lastCheckin) {
      const lastCheckin = new Date(streak.lastCheckin);
      
      // Simular atividades recentes baseadas no streak
      for (let i = 0; i < streak.currentStreak; i++) {
        const date = new Date(lastCheckin);
        date.setDate(date.getDate() - i);
        
        // Adicionar somente datas do mês atual
        if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
          activityDates.push(date);
        }
      }
    }

    return { daysInMonth, activityDates };
  };

  const { daysInMonth, activityDates } = generateCalendar();

  // Verificar se uma data tem atividade
  const hasActivity = (date: Date) => {
    return activityDates.some(activityDate => isSameDay(activityDate, date));
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-secondary">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse h-4 w-3/4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center text-secondary">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          Histórico de Atividades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-3">
          <h3 className="font-medium text-secondary capitalize">
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
            <div key={index} className="text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Espaços vazios para alinhar o primeiro dia da semana */}
          {Array.from({ length: daysInMonth[0].getDay() }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square"></div>
          ))}
          
          {/* Dias do mês */}
          {daysInMonth.map((day, index) => {
            const isToday = isSameDay(day, new Date());
            const hasActivityOnDay = hasActivity(day);
            
            return (
              <div
                key={index}
                className={`
                  aspect-square flex items-center justify-center text-xs rounded-full
                  ${isToday ? 'border border-primary' : ''}
                  ${hasActivityOnDay ? 'bg-primary text-white' : ''}
                `}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-primary mr-2"></div>
              <span className="text-xs text-gray-600">Atividade concluída</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full border border-primary mr-2"></div>
              <span className="text-xs text-gray-600">Hoje</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}