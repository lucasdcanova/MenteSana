import { useQuery } from "@tanstack/react-query";
import { DailyStreak as DailyStreakType } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckCheck, Flame, Award, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Definições das atividades para exibição
type ActivityType = {
  label: string;
  icon: React.ReactNode;
};

const activityTypes: Record<string, ActivityType> = {
  "journal": { label: "Diário", icon: <Calendar className="h-4 w-4 mr-2" /> },
  "assistant": { label: "Assistente", icon: <CheckCheck className="h-4 w-4 mr-2" /> },
  "selfhelp": { label: "Auto-ajuda", icon: <Activity className="h-4 w-4 mr-2" /> }
};

export function DailyStreak() {
  const { data: streak, isLoading } = useQuery<DailyStreakType>({
    queryKey: ["/api/streaks"],
    refetchOnWindowFocus: false
  });

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Nunca";
    return format(new Date(date), "dd 'de' MMMM", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Flame className="h-5 w-5 mr-2 text-orange-500" />
            Carregando seu streak diário...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center">
            <div className="animate-pulse h-4 w-3/4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="ios-card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="ios-section-title">
          <Flame className="h-5 w-5 mr-2 text-orange-500" />
          <span>Seu Streak Diário</span>
        </div>
        <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-medium border border-orange-100">
          {streak?.currentStreak || 0} dias
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Streaks Info */}
        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
          <div className="flex items-center">
            <div className="bg-orange-100 p-2 rounded-full mr-3">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-sm">{streak?.currentStreak || 0} dias</p>
              <p className="text-xs text-gray-500">Streak atual</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="bg-yellow-100 p-2 rounded-full mr-3">
              <Award className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-sm">{streak?.longestStreak || 0} dias</p>
              <p className="text-xs text-gray-500">Recorde</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-medium text-gray-700">Progresso de hoje</p>
            <p className="text-xs text-gray-500">{streak?.activities?.length || 0}/3</p>
          </div>
          <Progress 
            value={streak?.activities?.length ? (streak.activities.length / 3) * 100 : 0} 
            className="h-2.5 rounded-full bg-gray-100" 
          />
        </div>

        {/* Activities */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-medium text-gray-700">Último check-in: {formatDate(streak?.lastCheckin)}</p>
          </div>
          <p className="text-xs font-medium text-gray-700 mb-2">Atividades de hoje:</p>
          
          <div className="grid grid-cols-3 gap-2">
            {streak?.activities && streak.activities.length > 0 ? (
              streak.activities.map((activity, index) => (
                <div 
                  key={index} 
                  className="text-xs flex items-center justify-center bg-green-50 text-green-700 border border-green-100 rounded-full py-1.5 px-2 shadow-sm"
                >
                  {activityTypes[activity] ? (
                    <>
                      {activityTypes[activity].icon}
                      <span className="truncate">{activityTypes[activity].label}</span>
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4 mr-2" />
                      <span className="truncate">{activity}</span>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center">
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
                  Nenhuma atividade hoje. Use o diário ou o assistente para registrar atividades.
                </p>
              </div>
            )}
            
            {/* Placeholders for incomplete activities */}
            {streak?.activities && streak.activities.length < 3 && 
              Array.from({ length: 3 - (streak?.activities?.length || 0) }).map((_, index) => (
                <div 
                  key={`placeholder-${index}`} 
                  className="text-xs flex items-center justify-center bg-gray-50 text-gray-400 border border-gray-200 rounded-full py-1.5 px-2 shadow-sm"
                >
                  <Activity className="h-3.5 w-3.5 mr-1 opacity-40" />
                  <span className="truncate opacity-60">Pendente</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}