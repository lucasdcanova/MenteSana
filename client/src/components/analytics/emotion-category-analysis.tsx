import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  Tooltip,
  Legend 
} from "recharts";

interface EmotionCategoryAnalysisProps {
  data: {
    categories: {
      category: string;
      value: number;
      fullMark: number;
    }[];
  };
}

export function EmotionCategoryAnalysis({ data }: EmotionCategoryAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise por Categoria Emocional</CardTitle>
        <CardDescription>
          Intensidade das emoções relatadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.categories}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="Intensidade Atual"
              dataKey="value"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
            />
            <Tooltip />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}