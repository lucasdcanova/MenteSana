import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";

interface PatientProgressMetricsProps {
  data: {
    overallImprovement: number;
    improvementChange: number;
    completionRate: number;
    completionChange: number;
    averageProgressScore: number;
    patientEngagement: number;
    patientEngagementChange: number;
    progressByPatient: {
      name: string;
      initial: number;
      current: number;
      improvement: number;
    }[];
    sessionToProgressCorrelation: {
      patientId: number;
      patientName: string;
      sessionCount: number;
      progressScore: number;
      improvementRate: number;
    }[];
  };
}

export function PatientProgressMetrics({ data }: PatientProgressMetricsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Melhoria Geral</p>
              <div className="text-2xl font-bold">{data.overallImprovement}%</div>
              <div className="flex items-center text-xs">
                <div className={`flex items-center ${data.improvementChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.improvementChange >= 0 ? 
                    <ArrowUp className="h-3 w-3 mr-1" /> : 
                    <ArrowDown className="h-3 w-3 mr-1" />
                  }
                  <span>{Math.abs(data.improvementChange)}%</span>
                </div>
                <span className="text-muted-foreground ml-1">vs. período anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Taxa de Conclusão de Tratamento</p>
              <div className="text-2xl font-bold">{data.completionRate}%</div>
              <div className="flex items-center text-xs">
                <div className={`flex items-center ${data.completionChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.completionChange >= 0 ? 
                    <ArrowUp className="h-3 w-3 mr-1" /> : 
                    <ArrowDown className="h-3 w-3 mr-1" />
                  }
                  <span>{Math.abs(data.completionChange)}%</span>
                </div>
                <span className="text-muted-foreground ml-1">vs. período anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Engajamento dos Pacientes</p>
              <div className="text-2xl font-bold">{data.patientEngagement}%</div>
              <div className="flex items-center text-xs">
                <div className={`flex items-center ${data.patientEngagementChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.patientEngagementChange >= 0 ? 
                    <ArrowUp className="h-3 w-3 mr-1" /> : 
                    <ArrowDown className="h-3 w-3 mr-1" />
                  }
                  <span>{Math.abs(data.patientEngagementChange)}%</span>
                </div>
                <span className="text-muted-foreground ml-1">vs. período anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Progresso por Paciente</CardTitle>
            <CardDescription>
              Comparação entre estado inicial e atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={data.progressByPatient}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="initial" name="Avaliação Inicial" fill="#A569BD" />
                <Bar dataKey="current" name="Avaliação Atual" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Correlação: Sessões vs. Progresso</CardTitle>
            <CardDescription>
              Impacto do número de sessões no progresso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid />
                <XAxis 
                  type="number" 
                  dataKey="sessionCount" 
                  name="Número de Sessões" 
                  unit="sess." 
                />
                <YAxis 
                  type="number" 
                  dataKey="progressScore" 
                  name="Pontuação de Progresso" 
                  unit="pts" 
                />
                <ZAxis 
                  type="number" 
                  dataKey="improvementRate" 
                  range={[60, 400]} 
                  name="Taxa de Melhoria" 
                  unit="%" 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name, props) => {
                    if (name === 'Pontuação de Progresso') return [value, name];
                    if (name === 'Número de Sessões') return [value, name];
                    return [value, 'Taxa de Melhoria'];
                  }}
                  labelFormatter={(value) => {
                    const patient = data.sessionToProgressCorrelation.find(p => p.sessionCount === value);
                    return patient ? `Paciente: ${patient.patientName}` : '';
                  }}
                />
                <Scatter 
                  name="Pacientes" 
                  data={data.sessionToProgressCorrelation} 
                  fill="#8884d8" 
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}