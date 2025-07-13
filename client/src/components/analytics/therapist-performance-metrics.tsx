import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Users, Clock, Star, ThumbsUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  description: string;
  icon: React.ReactNode;
}

function MetricCard({ title, value, change, description, icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
            {icon}
          </div>
        </div>
        {change !== undefined && (
          <div className="flex items-center mt-4 text-xs">
            <div className={`flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? 
                <ArrowUp className="h-3 w-3 mr-1" /> : 
                <ArrowDown className="h-3 w-3 mr-1" />
              }
              <span>{Math.abs(change)}%</span>
            </div>
            <span className="text-muted-foreground ml-1">{description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TherapistPerformanceMetricsProps {
  metrics: {
    activePatients: number;
    activePatientsChange: number;
    sessionCompletionRate: number;
    sessionCompletionChange: number;
    averageRating: number;
    ratingChange: number;
    patientRetentionRate: number;
    retentionChange: number;
  };
}

export function TherapistPerformanceMetrics({ metrics }: TherapistPerformanceMetricsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Métricas de Desempenho</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pacientes Ativos"
          value={metrics.activePatients}
          change={metrics.activePatientsChange}
          description="vs. período anterior"
          icon={<Users className="h-5 w-5 text-emerald-700" />}
        />
        <MetricCard
          title="Taxa de Conclusão"
          value={`${metrics.sessionCompletionRate}%`}
          change={metrics.sessionCompletionChange}
          description="vs. período anterior"
          icon={<Clock className="h-5 w-5 text-emerald-700" />}
        />
        <MetricCard
          title="Avaliação Média"
          value={metrics.averageRating.toFixed(1)}
          change={metrics.ratingChange}
          description="vs. período anterior"
          icon={<Star className="h-5 w-5 text-emerald-700" />}
        />
        <MetricCard
          title="Retenção de Pacientes"
          value={`${metrics.patientRetentionRate}%`}
          change={metrics.retentionChange}
          description="vs. período anterior"
          icon={<ThumbsUp className="h-5 w-5 text-emerald-700" />}
        />
      </div>
    </div>
  );
}