import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";

interface SessionMetric {
  name: string;
  value: number;
  target: number;
  color: string;
}

interface SessionMetricsOverviewProps {
  data: {
    completedSessions: number;
    canceledSessions: number;
    totalHours: number;
    averageDuration: number;
    metrics: SessionMetric[];
    sessionsByDay: {
      day: string;
      scheduled: number;
      completed: number;
      canceled: number;
    }[];
  };
}

export function SessionMetricsOverview({ data }: SessionMetricsOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessões Realizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completedSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              No período selecionado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessões Canceladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.canceledSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de cancelamento: {Math.round(data.canceledSessions / (data.completedSessions + data.canceledSessions) * 100)}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Horas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalHours}</div>
            <p className="text-xs text-muted-foreground mt-1">
              De atendimento terapêutico
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Duração Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageDuration} min</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por sessão de terapia
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Dia da Semana</CardTitle>
            <CardDescription>
              Número de sessões por dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.sessionsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" name="Realizadas" fill="#10b981" />
                <Bar dataKey="canceled" name="Canceladas" fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Desempenho</CardTitle>
            <CardDescription>
              Comparativo com metas estabelecidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.metrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{metric.name}</span>
                    <span className="font-medium">{metric.value}/{metric.target}</span>
                  </div>
                  <Progress 
                    value={Math.min((metric.value / metric.target) * 100, 100)} 
                    className="h-2"
                    indicatorClassName={`bg-${metric.color}-500`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {Math.round((metric.value / metric.target) * 100)}% da meta atingida
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}