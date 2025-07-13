import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

// Cores para os gráficos
const MOOD_COLORS = {
  'Feliz': '#00C49F',
  'Triste': '#0088FE',
  'Ansioso': '#FFBB28',
  'Irritado': '#FF8042',
  'Calmo': '#A569BD',
  'Neutro': '#5DADE2'
};

interface MoodDistributionChartProps {
  data: {
    distribution: {
      name: string;
      value: number;
    }[];
    byTime: {
      hour: string;
      mood: string;
      count: number;
    }[];
  };
}

export function MoodDistributionChart({ data }: MoodDistributionChartProps) {
  // Agrupar dados por hora e tipo de humor para gráfico de barras empilhadas
  const hourlyData = Object.entries(
    data.byTime.reduce((acc, entry) => {
      if (!acc[entry.hour]) {
        acc[entry.hour] = {};
      }
      acc[entry.hour][entry.mood] = (acc[entry.hour][entry.mood] || 0) + entry.count;
      return acc;
    }, {} as Record<string, Record<string, number>>)
  ).map(([hour, moods]) => ({
    hour,
    ...moods
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Humor</CardTitle>
          <CardDescription>Baseado em entradas de diário</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.distribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={MOOD_COLORS[entry.name] || `#${Math.floor(Math.random()*16777215).toString(16)}`} 
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Padrões de Humor por Hora do Dia</CardTitle>
          <CardDescription>Variação de humor ao longo do dia</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="hour" type="category" width={60} />
              <Tooltip />
              <Legend />
              {Object.keys(MOOD_COLORS).map((mood) => (
                <Bar 
                  key={mood} 
                  dataKey={mood} 
                  stackId="a" 
                  fill={MOOD_COLORS[mood]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}