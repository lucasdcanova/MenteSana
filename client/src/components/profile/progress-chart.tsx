import { useMemo } from "react";
import { ProgressTracking } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Layers } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProgressChartProps {
  progressData: ProgressTracking[] | undefined;
  isLoading: boolean;
}

export function ProgressChart({ progressData, isLoading }: ProgressChartProps) {
  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    if (!progressData || progressData.length === 0) return [];
    
    // Agrupar por data
    const now = new Date();
    const lastMonthDate = subDays(now, 30);
    
    // Filtrar dados do último mês
    const recentData = progressData.filter(item => 
      isAfter(new Date(item.date), lastMonthDate)
    );
    
    // Agrupar por categoria e ordenar por data
    const groupedByCategory: Record<string, ProgressTracking[]> = {};
    
    recentData.forEach(item => {
      if (!groupedByCategory[item.category]) {
        groupedByCategory[item.category] = [];
      }
      groupedByCategory[item.category].push(item);
    });
    
    // Ordenar dentro de cada categoria
    Object.keys(groupedByCategory).forEach(category => {
      groupedByCategory[category].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });
    
    // Transformar em formato para gráfico
    const processedData = Object.keys(groupedByCategory).flatMap(category => 
      groupedByCategory[category].map(item => ({
        ...item,
        formattedDate: format(new Date(item.date), "dd/MM", { locale: ptBR }),
        category
      }))
    );
    
    return processedData;
  }, [progressData]);
  
  // Contagem de categorias para decidir tipo de gráfico
  const categories = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    const uniqueCategories = Array.from(new Set(chartData.map(item => item.category)));
    return uniqueCategories;
  }, [chartData]);
  
  // Cores para as diferentes categorias
  const getCategoryColor = (category: string, index: number) => {
    const colors = [
      "#10b981", // Verde principal
      "#06b6d4", // Ciano
      "#8b5cf6", // Roxo
      "#f59e0b", // Âmbar
      "#ef4444"  // Vermelho
    ];
    
    // Map categorias específicas para cores consistentes
    const categoryMap: Record<string, string> = {
      "Ansiedade": "#ef4444",
      "Estresse": "#f59e0b", 
      "Qualidade do Sono": "#8b5cf6",
      "Estabilidade de Humor": "#06b6d4",
      "Conexão Social": "#10b981",
      // Traduzidas
      "Anxiety Management": "#ef4444",
      "Stress Reduction": "#f59e0b",
      "Sleep Quality": "#8b5cf6",
      "Mood Stability": "#06b6d4",
      "Social Connection": "#10b981",
    };
    
    return categoryMap[category] || colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-secondary">
            <Layers className="h-5 w-5 mr-2 text-primary" />
            Progresso ao Longo do Tempo
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
  
  // Se não houver dados
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-secondary">
            <Layers className="h-5 w-5 mr-2 text-primary" />
            Progresso ao Longo do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-gray-500">
            <p>Sem dados de progresso disponíveis.</p>
            <p className="text-sm mt-2">Atualize seu progresso para ver as tendências aqui.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center text-secondary">
          <Layers className="h-5 w-5 mr-2 text-primary" />
          Progresso ao Longo do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {categories.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border shadow-md rounded text-xs">
                          <p className="font-bold">{payload[0].payload.formattedDate}</p>
                          <p className="text-[10px]">{`${payload[0].payload.category}: ${payload[0].value}%`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {categories.map((category, index) => (
                  <Line
                    key={category}
                    type="monotone"
                    dataKey="value"
                    data={chartData.filter(item => item.category === category)}
                    name={category}
                    stroke={getCategoryColor(category, index)}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border shadow-md rounded text-xs">
                          <p className="font-bold">{payload[0].payload.formattedDate}</p>
                          <p className="text-[10px]">{`${payload[0].payload.category}: ${payload[0].value}%`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill={getCategoryColor(categories[0], 0)}
                  radius={[4, 4, 0, 0]}
                  name={categories[0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}