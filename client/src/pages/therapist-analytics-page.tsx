import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronRight, 
  Download, 
  Users, 
  Calendar, 
  LineChart, 
  Brain,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// Importação dos componentes de análise
import { TherapistPerformanceMetrics } from "@/components/analytics/therapist-performance-metrics";
import { PatientProgressMetrics } from "@/components/analytics/patient-progress-metrics";
import { MoodDistributionChart } from "@/components/analytics/mood-distribution-chart";
import { SessionMetricsOverview } from "@/components/analytics/session-metrics-overview";
import { EmotionCategoryAnalysis } from "@/components/analytics/emotion-category-analysis";
import { TreatmentEffectivenessChart } from "@/components/analytics/treatment-effectiveness-chart";
import { PredictiveTrendsChart } from "@/components/analytics/predictive-trends-chart";
import { TimeFilterControls } from "@/components/analytics/time-filter-controls";
import { CorrelationMatrix } from "@/components/analytics/correlation-matrix";

export default function TherapistAnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState({
    period: "30d",
    startDate: null,
    endDate: null,
    comparisonEnabled: false
  });

  // Consulta para obter dados analíticos (simulados por enquanto)
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['/api/analytics', user?.id, filters],
    queryFn: async () => {
      // Aqui seria a chamada real para a API
      // Por enquanto retornamos dados simulados
      return mockAnalyticsData;
    },
    enabled: !!user?.id,
  });

  // Manipulador de mudança de filtros
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Manipulador de exportação de dados
  const handleExportData = () => {
    toast({
      title: "Exportação iniciada",
      description: "Seus dados analíticos estão sendo exportados para CSV.",
    });
    // Lógica de exportação aqui
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Erro ao carregar dados analíticos</h2>
        <p className="text-gray-600 mb-4">Não foi possível carregar as informações. Por favor, tente novamente.</p>
        <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Análises e Insights</h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso dos pacientes e o desempenho terapêutico
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <Button variant="outline" onClick={handleExportData} className="w-full md:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Exportar dados
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <TimeFilterControls onFilterChange={handleFilterChange} />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="overview" className="px-3 py-2">
              <LineChart className="mr-2 h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="patients" className="px-3 py-2">
              <Users className="mr-2 h-4 w-4" />
              Pacientes
            </TabsTrigger>
            <TabsTrigger value="sessions" className="px-3 py-2">
              <Calendar className="mr-2 h-4 w-4" />
              Sessões
            </TabsTrigger>
            <TabsTrigger value="insights" className="px-3 py-2">
              <Brain className="mr-2 h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Aba de Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <TherapistPerformanceMetrics metrics={analyticsData.performanceMetrics} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Pacientes Recentes</CardTitle>
                <CardDescription>Últimos pacientes atendidos</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {analyticsData.recentPatients.map((patient, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                          <span className="text-emerald-700 font-medium">{patient.firstName.charAt(0)}{patient.lastName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                          <p className="text-sm text-muted-foreground">{patient.lastSession}</p>
                        </div>
                      </div>
                      <Link href={`/therapist-patients/${patient.id}`}>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <EmotionCategoryAnalysis data={analyticsData.emotionCategoryData} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <SessionMetricsOverview data={analyticsData.sessionMetricsData} />
          </div>
        </TabsContent>
        
        {/* Aba de Pacientes */}
        <TabsContent value="patients" className="space-y-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <PatientProgressMetrics data={analyticsData.patientProgressData} />
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <MoodDistributionChart data={analyticsData.moodDistributionData} />
          </div>
          
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Entradas de Diário Recentes</CardTitle>
              <CardDescription>Últimas entradas dos pacientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                {analyticsData.recentJournalEntries.map((entry, index) => (
                  <div key={index} className="border-l-4 pl-4" style={{ borderColor: entry.colorHex }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{entry.patientName}</h4>
                        <p className="text-sm text-muted-foreground">{entry.date}</p>
                      </div>
                      <div className="px-2 py-1 rounded-full text-xs" style={{ 
                        backgroundColor: `${entry.moodColor}20`, 
                        color: entry.moodColor 
                      }}>
                        {entry.mood}
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{entry.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Sessões */}
        <TabsContent value="sessions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <TreatmentEffectivenessChart data={analyticsData.treatmentEffectivenessData} />
            </div>
            
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Categorias de Tratamento</CardTitle>
                <CardDescription>
                  Distribuição por tipo de abordagem terapêutica
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {analyticsData.treatmentCategories.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{category.name}</span>
                        <span>{category.count} sessões</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div 
                          className="bg-emerald-500 h-2.5 rounded-full"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground">{category.percentage}% do total</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <CorrelationMatrix data={analyticsData.correlationMatrixData} />
          </div>
        </TabsContent>
        
        {/* Aba de Insights */}
        <TabsContent value="insights" className="space-y-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <PredictiveTrendsChart data={analyticsData.predictiveTrendsData} />
          </div>
          
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Insights de IA</CardTitle>
              <CardDescription>
                Recomendações baseadas em análise de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2">
                {analyticsData.aiInsights.map((insight, index) => (
                  <div key={index} className="space-y-2 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-primary">{insight.title}</h3>
                    <p className="text-sm">{insight.description}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {insight.tags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-1 rounded-full text-xs"
                          style={{ 
                            backgroundColor: MOOD_COLORS[tag] ? `${MOOD_COLORS[tag]}20` : '#f3f4f6',
                            color: MOOD_COLORS[tag] || '#4b5563'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Separator className="my-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Constantes para as cores dos humores
const MOOD_COLORS = {
  'Feliz': '#00C49F',
  'Triste': '#0088FE',
  'Ansioso': '#FFBB28',
  'Irritado': '#FF8042',
  'Calmo': '#A569BD',
  'Neutro': '#5DADE2'
};

// Dados simulados para apresentação
const mockAnalyticsData = {
  // Métricas de desempenho do terapeuta
  performanceMetrics: {
    activePatients: 42,
    activePatientsChange: 8,
    sessionCompletionRate: 95,
    sessionCompletionChange: 3,
    averageRating: 4.8,
    ratingChange: 0.2,
    patientRetentionRate: 88,
    retentionChange: 5
  },
  
  // Dados de progresso dos pacientes
  patientProgressData: {
    overallImprovement: 67,
    improvementChange: 12,
    completionRate: 82,
    completionChange: 8,
    averageProgressScore: 78,
    patientEngagement: 91,
    patientEngagementChange: 15,
    progressByPatient: [
      { name: "Ana Silva", initial: 35, current: 75, improvement: 40 },
      { name: "Carlos Oliveira", initial: 45, current: 62, improvement: 17 },
      { name: "Marina Costa", initial: 28, current: 81, improvement: 53 },
      { name: "Rafael Santos", initial: 52, current: 88, improvement: 36 },
      { name: "Juliana Lima", initial: 40, current: 59, improvement: 19 }
    ],
    sessionToProgressCorrelation: [
      { patientId: 1, patientName: "Ana Silva", sessionCount: 12, progressScore: 75, improvementRate: 40 },
      { patientId: 2, patientName: "Carlos Oliveira", sessionCount: 8, progressScore: 62, improvementRate: 17 },
      { patientId: 3, patientName: "Marina Costa", sessionCount: 15, progressScore: 81, improvementRate: 53 },
      { patientId: 4, patientName: "Rafael Santos", sessionCount: 10, progressScore: 88, improvementRate: 36 },
      { patientId: 5, patientName: "Juliana Lima", sessionCount: 7, progressScore: 59, improvementRate: 19 },
      { patientId: 6, patientName: "Bruno Almeida", sessionCount: 18, progressScore: 92, improvementRate: 45 },
      { patientId: 7, patientName: "Camila Martins", sessionCount: 5, progressScore: 48, improvementRate: 12 },
      { patientId: 8, patientName: "Diego Ferreira", sessionCount: 9, progressScore: 67, improvementRate: 28 }
    ]
  },
  
  // Dados de distribuição de humor
  moodDistributionData: {
    distribution: [
      { name: "Feliz", value: 35 },
      { name: "Triste", value: 20 },
      { name: "Ansioso", value: 25 },
      { name: "Irritado", value: 10 },
      { name: "Calmo", value: 5 },
      { name: "Neutro", value: 5 }
    ],
    byTime: [
      { hour: "06:00", mood: "Ansioso", count: 12 },
      { hour: "06:00", mood: "Neutro", count: 8 },
      { hour: "09:00", mood: "Feliz", count: 15 },
      { hour: "09:00", mood: "Ansioso", count: 10 },
      { hour: "12:00", mood: "Feliz", count: 18 },
      { hour: "12:00", mood: "Irritado", count: 5 },
      { hour: "15:00", mood: "Feliz", count: 12 },
      { hour: "15:00", mood: "Calmo", count: 8 },
      { hour: "18:00", mood: "Triste", count: 14 },
      { hour: "18:00", mood: "Ansioso", count: 20 },
      { hour: "21:00", mood: "Triste", count: 22 },
      { hour: "21:00", mood: "Ansioso", count: 15 }
    ]
  },

  // Métricas das sessões
  sessionMetricsData: {
    completedSessions: 156,
    canceledSessions: 12,
    totalHours: 208,
    averageDuration: 50,
    metrics: [
      { name: "Sessões Mensais", value: 32, target: 40, color: "emerald" },
      { name: "Avaliações Positivas", value: 28, target: 30, color: "blue" },
      { name: "Horas de Terapia", value: 45, target: 50, color: "indigo" },
      { name: "Novas Consultas", value: 15, target: 20, color: "violet" }
    ],
    sessionsByDay: [
      { day: "Segunda", scheduled: 20, completed: 18, canceled: 2 },
      { day: "Terça", scheduled: 25, completed: 23, canceled: 2 },
      { day: "Quarta", scheduled: 30, completed: 28, canceled: 2 },
      { day: "Quinta", scheduled: 32, completed: 30, canceled: 2 },
      { day: "Sexta", scheduled: 28, completed: 25, canceled: 3 },
      { day: "Sábado", scheduled: 15, completed: 14, canceled: 1 },
      { day: "Domingo", scheduled: 0, completed: 0, canceled: 0 }
    ]
  },
  
  // Dados de categorias emocionais
  emotionCategoryData: {
    categories: [
      { category: "Ansiedade", value: 80, fullMark: 100 },
      { category: "Depressão", value: 65, fullMark: 100 },
      { category: "Raiva", value: 45, fullMark: 100 },
      { category: "Felicidade", value: 60, fullMark: 100 },
      { category: "Autoestima", value: 55, fullMark: 100 },
      { category: "Motivação", value: 70, fullMark: 100 }
    ]
  },
  
  // Dados de eficácia de tratamento
  treatmentEffectivenessData: {
    byCategory: [
      { category: "Terapia Cognitivo-Comportamental", effectiveness: 85, patientCount: 28 },
      { category: "Mindfulness e Meditação", effectiveness: 78, patientCount: 22 },
      { category: "Terapia Focada em Solução", effectiveness: 72, patientCount: 15 },
      { category: "Psicoterapia Interpessoal", effectiveness: 68, patientCount: 12 },
      { category: "Terapia de Aceitação e Compromisso", effectiveness: 82, patientCount: 18 },
      { category: "Terapia Narrativa", effectiveness: 64, patientCount: 10 }
    ]
  },
  
  // Dados de tendências preditivas
  predictiveTrendsData: {
    trends: [
      { date: "Jan", actual: 65, predicted: null, lowerBound: null, upperBound: null },
      { date: "Fev", actual: 68, predicted: null, lowerBound: null, upperBound: null },
      { date: "Mar", actual: 72, predicted: null, lowerBound: null, upperBound: null },
      { date: "Abr", actual: 75, predicted: null, lowerBound: null, upperBound: null },
      { date: "Mai", actual: 70, predicted: null, lowerBound: null, upperBound: null },
      { date: "Jun", actual: 78, predicted: null, lowerBound: null, upperBound: null },
      { date: "Jul", actual: 82, predicted: null, lowerBound: null, upperBound: null },
      { date: "Ago", actual: 87, predicted: null, lowerBound: null, upperBound: null },
      { date: "Set", actual: null, predicted: 90, lowerBound: 85, upperBound: 95 },
      { date: "Out", actual: null, predicted: 92, lowerBound: 86, upperBound: 98 },
      { date: "Nov", actual: null, predicted: 94, lowerBound: 88, upperBound: 100 },
      { date: "Dez", actual: null, predicted: 96, lowerBound: 89, upperBound: 102 }
    ],
    predictionAccuracy: 92,
    anomalies: [
      { 
        startDate: "Maio", 
        endDate: "Maio", 
        description: "Queda temporária possivelmente devido ao período de feriados e férias", 
        severity: "low" 
      },
      { 
        startDate: "Jul", 
        endDate: "Ago", 
        description: "Aumento acima do esperado, possivelmente relacionado à intensificação do programa de terapia em grupo", 
        severity: "medium" 
      }
    ]
  },
  
  // Dados de correlação para a matriz
  correlationMatrixData: {
    factors: ["Frequência", "Duração", "Engajamento", "Exercícios", "Humor", "Ansiedade"],
    matrix: [
      [1.00, 0.65, 0.72, 0.58, 0.81, -0.42],
      [0.65, 1.00, 0.54, 0.41, 0.63, -0.38],
      [0.72, 0.54, 1.00, 0.87, 0.75, -0.61],
      [0.58, 0.41, 0.87, 1.00, 0.69, -0.78],
      [0.81, 0.63, 0.75, 0.69, 1.00, -0.58],
      [-0.42, -0.38, -0.61, -0.78, -0.58, 1.00]
    ]
  },
  
  // Dados de categorias de tratamento
  treatmentCategories: [
    { name: "Terapia Individual", count: 82, percentage: 52 },
    { name: "Terapia em Grupo", count: 45, percentage: 29 },
    { name: "Avaliação Psicológica", count: 18, percentage: 12 },
    { name: "Sessão de Emergência", count: 11, percentage: 7 }
  ],
  
  // Dados de pacientes recentes
  recentPatients: [
    { id: 1, firstName: "Ana", lastName: "Silva", lastSession: "Hoje, 14:30" },
    { id: 2, firstName: "Carlos", lastName: "Oliveira", lastSession: "Ontem, 10:00" },
    { id: 3, firstName: "Marina", lastName: "Costa", lastSession: "18/05/2023, 16:15" },
    { id: 4, firstName: "Rafael", lastName: "Santos", lastSession: "15/05/2023, 09:45" },
    { id: 5, firstName: "Juliana", lastName: "Lima", lastSession: "10/05/2023, 15:30" }
  ],
  
  // Dados de entradas recentes do diário
  recentJournalEntries: [
    {
      patientName: "Ana Silva",
      date: "Hoje, 08:45",
      mood: "Ansioso",
      moodColor: "#FFBB28",
      colorHex: "#FFBB28",
      summary: "Sinto uma ansiedade constante em relação ao trabalho e tenho tido dificuldade para dormir...",
      tags: ["trabalho", "insônia", "ansiedade", "estresse"]
    },
    {
      patientName: "Carlos Oliveira",
      date: "Ontem, 20:15",
      mood: "Triste",
      moodColor: "#0088FE",
      colorHex: "#0088FE",
      summary: "Hoje foi um dia particularmente difícil. Senti-me sobrecarregado e sem energia...",
      tags: ["tristeza", "cansaço", "sobrecarga"]
    },
    {
      patientName: "Marina Costa",
      date: "18/05/2023, 12:30",
      mood: "Feliz",
      moodColor: "#00C49F",
      colorHex: "#00C49F",
      summary: "Consegui finalizar um projeto importante no trabalho e recebi elogios da minha chefia...",
      tags: ["conquista", "trabalho", "autoestima", "felicidade"]
    }
  ],
  
  // Insights gerados por IA
  aiInsights: [
    {
      title: "Padrão de Ansiedade Matinal",
      description: "Um padrão consistente de ansiedade nas entradas matutinas dos diários sugere possível relação com estresse relacionado ao trabalho. Considere técnicas específicas de respiração e mindfulness para este período do dia.",
      tags: ["Ansioso", "Padrão", "Matinal"]
    },
    {
      title: "Eficácia da Terapia em Grupo",
      description: "Pacientes que participam de sessões de terapia em grupo além das sessões individuais mostram melhoria de recuperação 28% mais rápida. Considere aumentar as recomendações para sessões em grupo.",
      tags: ["Grupo", "Eficácia", "Recomendação"]
    },
    {
      title: "Correlação entre Exercícios e Humor",
      description: "Forte correlação positiva (0.81) entre a prática regular de exercícios e melhoria do humor. Pacientes que relatam exercício regular apresentam 35% menos recaídas de depressão.",
      tags: ["Exercício", "Humor", "Depressão"]
    }
  ]
};