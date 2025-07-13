import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface TreatmentEffectivenessChartProps {
  data: {
    byCategory: {
      category: string;
      effectiveness: number;
      patientCount: number;
    }[];
  };
}

export function TreatmentEffectivenessChart({ data }: TreatmentEffectivenessChartProps) {
  // Ordenar categorias por eficácia para melhor visualização
  const sortedData = [...data.byCategory].sort((a, b) => b.effectiveness - a.effectiveness);

  // Cores customizadas para as barras baseadas na eficácia
  const getBarColor = (effectiveness: number) => {
    if (effectiveness >= 80) return "#10b981"; // Verde para alta eficácia
    if (effectiveness >= 60) return "#84cc16"; // Verde-limão para boa eficácia
    if (effectiveness >= 40) return "#facc15"; // Amarelo para média eficácia
    if (effectiveness >= 20) return "#f97316"; // Laranja para baixa eficácia
    return "#ef4444"; // Vermelho para muito baixa eficácia
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eficácia do Tratamento por Categoria</CardTitle>
        <CardDescription>
          Análise da eficácia dos tratamentos aplicados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} unit="%" />
            <YAxis dataKey="category" type="category" />
            <Tooltip 
              formatter={(value) => [`${value}%`, "Eficácia"]}
              labelFormatter={(value) => `Categoria: ${value}`}
            />
            <Legend />
            <Bar 
              dataKey="effectiveness" 
              name="Eficácia do Tratamento" 
              fill="#10b981"
              label={{ position: 'right', formatter: (value) => `${value}%` }}
              // Aplicar cores customizadas baseadas na eficácia
              shape={(props) => {
                const { x, y, width, height, effectiveness } = props;
                return (
                  <rect 
                    x={x} 
                    y={y} 
                    width={width} 
                    height={height} 
                    fill={getBarColor(effectiveness)} 
                    radius={[0, 2, 2, 0]}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}