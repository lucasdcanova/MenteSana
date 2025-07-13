import { User, ProgressTracking } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  LineChart, 
  Line, 
  Bar, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientProgressCardProps {
  patient: User;
  progressData?: ProgressTracking[];
  isLoading?: boolean;
}

export function PatientProgressCard({ patient, progressData, isLoading }: PatientProgressCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Organizar dados por categoria
  const progressByCategory = progressData?.reduce((acc, curr) => {
    if (!acc[curr.category]) {
      acc[curr.category] = [];
    }
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, ProgressTracking[]>);

  // Obter o valor mais recente para cada categoria
  const latestProgress = progressByCategory ? Object.entries(progressByCategory).reduce((acc, [category, items]) => {
    const sortedItems = [...items].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    acc[category] = sortedItems[0].value;
    return acc;
  }, {} as Record<string, number>) : {};

  // Preparar dados para o gráfico de linha
  const prepareChartData = () => {
    if (!progressData) return [];
    
    // Agrupar por data e categorizar
    const dataByDate = progressData.reduce((acc, curr) => {
      const dateStr = format(new Date(curr.date), 'dd/MM/yy');
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr };
      }
      acc[dateStr][curr.category] = curr.value;
      return acc;
    }, {} as Record<string, any>);
    
    // Converter para array
    return Object.values(dataByDate).sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('/'));
      const dateB = new Date(b.date.split('/').reverse().join('/'));
      return dateA.getTime() - dateB.getTime();
    });
  };

  const chartData = prepareChartData();
  const categories = progressByCategory ? Object.keys(progressByCategory) : [];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2'];

  // Verificar se há dados suficientes para mostrar o gráfico
  const hasChartData = chartData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso de {patient.firstName} {patient.lastName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Barras de progresso por categoria */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Progresso Atual</h3>
            
            {Object.entries(latestProgress).length > 0 ? (
              <>
                {Object.entries(latestProgress).map(([category, value], index) => (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{category}</span>
                      <span className="text-sm font-medium">{value}%</span>
                    </div>
                    <Progress
                      value={value}
                      className="h-2"
                      indicatorClassName={`bg-[${COLORS[index % COLORS.length]}]`}
                    />
                  </div>
                ))}
              </>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                Nenhum dado de progresso disponível para este paciente
              </div>
            )}
          </div>
          
          {/* Gráfico de progresso ao longo do tempo */}
          {hasChartData ? (
            <div>
              <h3 className="text-sm font-medium mb-4">Evolução ao Longo do Tempo</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  {categories.map((category, index) => (
                    <Line
                      key={category}
                      type="monotone"
                      dataKey={category}
                      stroke={COLORS[index % COLORS.length]}
                      activeDot={{ r: 8 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              Dados históricos insuficientes para exibir o gráfico
            </div>
          )}
          
          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {progressData?.length || 0}
              </div>
              <div className="text-xs text-gray-500">Atualizações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {Object.keys(progressByCategory || {}).length}
              </div>
              <div className="text-xs text-gray-500">Categorias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {progressData && progressData.length > 0 
                  ? Math.round(progressData.reduce((sum, item) => sum + item.value, 0) / progressData.length)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500">Média Geral</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}