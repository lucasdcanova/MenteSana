import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceArea
} from "recharts";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface PredictiveTrendsChartProps {
  data: {
    trends: {
      date: string;
      actual: number;
      predicted: number;
      lowerBound: number;
      upperBound: number;
    }[];
    predictionAccuracy: number;
    anomalies: {
      startDate: string;
      endDate: string;
      description: string;
      severity: "low" | "medium" | "high";
    }[];
  };
}

export function PredictiveTrendsChart({ data }: PredictiveTrendsChartProps) {
  const severityColors = {
    low: "bg-yellow-100 text-yellow-800 border-yellow-200",
    medium: "bg-orange-100 text-orange-800 border-orange-200",
    high: "bg-red-100 text-red-800 border-red-200"
  };

  // Encontrar limites do gráfico
  const minValue = Math.min(
    ...data.trends.map(d => Math.min(d.actual || Infinity, d.lowerBound || Infinity))
  );
  const maxValue = Math.max(
    ...data.trends.map(d => Math.max(d.actual || 0, d.upperBound || 0))
  );
  
  // Adicionar um buffer de 10% para melhor visualização
  const yAxisDomain = [
    Math.max(0, Math.floor(minValue * 0.9)),
    Math.ceil(maxValue * 1.1)
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Tendências Preditivas</CardTitle>
              <CardDescription>
                Projeções baseadas em análise de dados históricos
              </CardDescription>
            </div>
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              Precisão: {data.predictionAccuracy}%
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={yAxisDomain} />
              <Tooltip />
              <Legend />
              
              {/* Área de confiança da previsão - removida para simplificar */}
              
              {/* Linha de valores reais */}
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#10b981" 
                name="Valores Reais" 
                dot={{ r: 4 }} 
                strokeWidth={2}
                connectNulls
              />
              
              {/* Linha de valores previstos */}
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#8884d8" 
                name="Valores Previstos" 
                dot={{ r: 4 }}
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {data.anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anomalias Detectadas</CardTitle>
            <CardDescription>
              Padrões incomuns que requerem atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.anomalies.map((anomaly, index) => (
                <div 
                  key={index}
                  className={cn(
                    "border p-4 rounded-md flex items-start space-x-3",
                    severityColors[anomaly.severity]
                  )}
                >
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium mb-1">
                      {anomaly.startDate} {anomaly.startDate !== anomaly.endDate && `- ${anomaly.endDate}`}
                    </div>
                    <p className="text-sm">{anomaly.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}