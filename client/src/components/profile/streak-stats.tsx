import { useQuery } from "@tanstack/react-query";
import { DailyStreak as DailyStreakType } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Award, Calendar, CheckCircle } from "lucide-react";
import { format, isThisWeek, isThisMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

export function StreakStats() {
  const { data: streak, isLoading } = useQuery<DailyStreakType>({
    queryKey: ["/api/streaks"],
    refetchOnWindowFocus: false
  });

  // Formatar data como dia-mês em português
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Nunca";
    return format(new Date(date), "dd 'de' MMMM", { locale: ptBR });
  };

  // Calcular dias restantes para bater o recorde
  const daysToRecord = () => {
    if (!streak) return 0;
    return Math.max(0, streak.longestStreak - streak.currentStreak);
  };

  // Obter status do checkin de hoje
  const getCheckInStatus = () => {
    if (!streak || !streak.lastCheckin) return false;
    return isToday(new Date(streak.lastCheckin));
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-secondary">
            <Flame className="h-5 w-5 mr-2 text-orange-500" />
            Estatísticas de Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
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
          <Flame className="h-5 w-5 mr-2 text-orange-500" />
          Estatísticas de Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 flex flex-col items-center bg-gray-50">
              <div className="flex items-center">
                <Flame className="h-5 w-5 mr-1 text-orange-500" />
                <span className="text-sm text-gray-600">Streak Atual</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-secondary">{streak?.currentStreak || 0} dias</p>
            </div>
            
            <div className="border rounded-lg p-3 flex flex-col items-center bg-gray-50">
              <div className="flex items-center">
                <Award className="h-5 w-5 mr-1 text-yellow-500" />
                <span className="text-sm text-gray-600">Recorde</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-secondary">{streak?.longestStreak || 0} dias</p>
            </div>
          </div>
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Último check-in:</span>
            <span className="font-medium text-secondary">{formatDate(streak?.lastCheckin)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status hoje:</span>
            <span className={`font-medium flex items-center ${getCheckInStatus() ? 'text-green-600' : 'text-orange-500'}`}>
              {getCheckInStatus() ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Concluído
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-1" />
                  Pendente
                </>
              )}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Para bater o recorde:</span>
            <span className="font-medium text-secondary">
              {daysToRecord() === 0 ? (
                <span className="text-green-600">Recorde batido!</span>
              ) : (
                `${daysToRecord()} dia${daysToRecord() !== 1 ? 's' : ''} restante${daysToRecord() !== 1 ? 's' : ''}`
              )}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t text-xs text-gray-500">
          <p className="mb-1">
            💡 Dica: Mantenha seu streak realizando pelo menos uma atividade por dia.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}