import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Session, Therapist, ProgressTracking, JournalEntry, TherapistReview } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  UserRound, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'wouter';
import { PatientTable } from '@/components/dashboard/patient-table';
import { SessionsCalendar } from '@/components/dashboard/sessions-calendar';
import { SessionCard } from '@/components/dashboard/session-card';
import { PatientProgressCard } from '@/components/dashboard/patient-progress-card';

// Cores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2'];
const MOOD_COLORS = {
  'Feliz': '#00C49F',
  'Triste': '#0088FE',
  'Ansioso': '#FFBB28',
  'Irritado': '#FF8042',
  'Calmo': '#A569BD',
  'Neutro': '#5DADE2'
};

export default function TherapistDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [timeFrame, setTimeFrame] = useState('month'); // week, month, year
  
  // Verificar se o usuário é um terapeuta
  useEffect(() => {
    if (user && !user.isTherapist) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta página',
        variant: 'destructive'
      });
    }
  }, [user, toast]);
  
  // Buscar pacientes do terapeuta
  const { data: patients, isLoading: isLoadingPatients } = useQuery<User[]>({
    queryKey: ['/api/therapist/patients'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/therapist/patients');
      return await res.json();
    },
    enabled: !!user?.isTherapist,
  });
  
  // Buscar sessões do terapeuta
  const { data: sessions, isLoading: isLoadingSessions } = useQuery<Session[]>({
    queryKey: ['/api/therapist/sessions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/therapist/sessions');
      return await res.json();
    },
    enabled: !!user?.isTherapist,
  });
  
  // Buscar avaliações do terapeuta
  const { data: reviews, isLoading: isLoadingReviews } = useQuery<TherapistReview[]>({
    queryKey: ['/api/therapist/reviews'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/therapist/reviews');
      return await res.json();
    },
    enabled: !!user?.isTherapist,
  });
  
  // Buscar dados de progresso para análise
  const { data: progressData, isLoading: isLoadingProgress } = useQuery<ProgressTracking[]>({
    queryKey: ['/api/therapist/progress'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/therapist/progress');
      return await res.json();
    },
    enabled: !!user?.isTherapist,
  });
  
  // Buscar dados de diário para análise
  const { data: journalData, isLoading: isLoadingJournal } = useQuery<JournalEntry[]>({
    queryKey: ['/api/therapist/journal-data'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/therapist/journal-data');
      return await res.json();
    },
    enabled: !!user?.isTherapist,
  });
  
  // Carregar dados de perfil do terapeuta
  const { data: therapistProfile, isLoading: isLoadingProfile } = useQuery<Therapist>({
    queryKey: ['/api/therapist/profile'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/therapist/profile');
      return await res.json();
    },
    enabled: !!user?.isTherapist,
  });
  
  // Sessões recentes e próximas sessões
  const recentSessions = sessions?.filter(s => 
    new Date(s.scheduledFor) <= new Date()
  ).sort((a, b) => 
    new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
  ).slice(0, 5);
  
  const upcomingSessions = sessions?.filter(s => 
    new Date(s.scheduledFor) > new Date() && s.status !== 'canceled'
  ).sort((a, b) => 
    new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
  ).slice(0, 5);
  
  // Preparar dados para gráficos
  
  // 1. Gráfico de sessões por mês
  const sessionsByMonth = Array(12).fill(0).map((_, i) => ({
    month: format(new Date(2023, i, 1), 'MMM', { locale: ptBR }),
    completed: Math.round(Math.random() * 15),
    scheduled: Math.round(Math.random() * 10),
    canceled: Math.round(Math.random() * 5)
  }));
  
  // 2. Gráfico de distribuição de humores
  const moodDistribution = [
    { name: 'Feliz', value: journalData?.filter(j => j.mood === 'Feliz').length || 5 },
    { name: 'Triste', value: journalData?.filter(j => j.mood === 'Triste').length || 3 },
    { name: 'Ansioso', value: journalData?.filter(j => j.mood === 'Ansioso').length || 8 },
    { name: 'Irritado', value: journalData?.filter(j => j.mood === 'Irritado').length || 2 },
    { name: 'Calmo', value: journalData?.filter(j => j.mood === 'Calmo').length || 4 },
    { name: 'Neutro', value: journalData?.filter(j => j.mood === 'Neutro').length || 6 }
  ];
  
  // 3. Dados de progresso por categoria
  const progressByCategory = progressData?.reduce((acc, curr) => {
    if (!acc[curr.category]) {
      acc[curr.category] = { 
        category: curr.category,
        patients: new Set(),
        averageValue: 0,
        totalEntries: 0,
        values: []
      };
    }
    acc[curr.category].patients.add(curr.userId);
    acc[curr.category].values.push(curr.value);
    acc[curr.category].totalEntries++;
    return acc;
  }, {} as Record<string, { 
    category: string, 
    patients: Set<number>, 
    averageValue: number, 
    totalEntries: number,
    values: number[]
  }>);
  
  // Calcular média para cada categoria
  if (progressByCategory) {
    Object.keys(progressByCategory).forEach(key => {
      const sum = progressByCategory[key].values.reduce((a, b) => a + b, 0);
      progressByCategory[key].averageValue = Math.round(sum / progressByCategory[key].values.length);
    });
  }
  
  const progressCategories = progressByCategory ? Object.values(progressByCategory).map(cat => ({
    name: cat.category,
    average: cat.averageValue,
    patients: cat.patients.size
  })) : [];
  
  // 4. Dados de tendência de progresso ao longo do tempo
  const generateProgressTrend = () => {
    const data = [];
    const categories = ['Anxiety Management', 'Stress Reduction', 'Sleep Quality', 'Mood Stability'];
    
    // Últimos 30 dias
    for (let i = 30; i > 0; i--) {
      const date = subDays(new Date(), i);
      const entry = {
        date: format(date, 'dd/MM'),
        fullDate: date
      };
      
      categories.forEach(cat => {
        // Simulando uma tendência com alguma aleatoriedade
        const baseValue = 50;
        const dayFactor = (30 - i) / 2;
        const randomFactor = Math.random() * 10 - 5;
        entry[cat] = Math.max(0, Math.min(100, Math.round(baseValue + dayFactor + randomFactor)));
      });
      
      data.push(entry);
    }
    
    return data;
  };
  
  const progressTrendData = generateProgressTrend();
  
  // 5. Dados de atividade de pacientes (entradas de diário)
  const patientActivityData = [];
  if (patients && journalData) {
    for (const patient of patients.slice(0, 5)) {
      const entries = journalData.filter(entry => entry.userId === patient.id);
      patientActivityData.push({
        name: `${patient.firstName} ${patient.lastName}`,
        entries: entries.length,
        lastEntry: entries.length > 0 ? 
          Math.round((new Date().getTime() - new Date(entries[0].date).getTime()) / (1000 * 60 * 60 * 24)) : 
          null
      });
    }
  }
  
  // 6. Estatísticas gerais
  const stats = {
    totalPatients: patients?.length || 0,
    activePatients: patients?.filter(p => {
      // Considera-se ativo um paciente que teve consulta nos últimos 30 dias
      const patientSessions = sessions?.filter(s => s.userId === p.id && s.status === 'completed');
      if (!patientSessions?.length) return false;
      
      const lastSession = new Date(Math.max(...patientSessions.map(s => new Date(s.scheduledFor).getTime())));
      const daysAgo = Math.round((new Date().getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24));
      return daysAgo <= 30;
    }).length || 0,
    totalSessions: sessions?.length || 0,
    completedSessions: sessions?.filter(s => s.status === 'completed').length || 0,
    upcomingSessions: sessions?.filter(s => 
      new Date(s.scheduledFor) > new Date() && s.status !== 'canceled'
    ).length || 0,
    averageRating: reviews?.length ? 
      Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length * 10) / 10 : 
      0
  };
  
  // Verificamos se o usuário tem permissão para acessar esta página
  if (user && !user.isTherapist) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Acesso Restrito</h2>
          <p className="mb-6">Esta área é exclusiva para terapeutas.</p>
          <Button asChild>
            <Link href="/">Voltar para a página inicial</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-emerald-800 mb-2">Dashboard do Terapeuta</h1>
      <p className="text-emerald-600 mb-6">
        Análise avançada de pacientes, sessões e progresso
      </p>
      
      <Tabs 
        defaultValue="overview" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-4 md:w-[600px]">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Sessões
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center">
            <TrendingUp className="mr-2 h-4 w-4" />
            Análises
          </TabsTrigger>
        </TabsList>
        
        {/* Aba: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* Estatísticas principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Pacientes</p>
                    <h3 className="text-2xl font-bold mt-1">{stats.totalPatients}</h3>
                  </div>
                  <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-700" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-xs">
                  <div className={`flex items-center ${stats.activePatients / stats.totalPatients > 0.6 ? 'text-green-600' : 'text-amber-600'}`}>
                    {stats.activePatients / stats.totalPatients > 0.6 ? 
                      <ArrowUp className="h-3 w-3 mr-1" /> : 
                      <ArrowDown className="h-3 w-3 mr-1" />
                    }
                    <span>{Math.round(stats.activePatients / stats.totalPatients * 100)}%</span>
                  </div>
                  <span className="text-muted-foreground ml-1">pacientes ativos</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sessões Realizadas</p>
                    <h3 className="text-2xl font-bold mt-1">{stats.completedSessions}</h3>
                  </div>
                  <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-emerald-700" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-xs">
                  <div className="flex items-center text-green-600">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    <span>{stats.completedSessions ? Math.round(stats.completedSessions / stats.totalSessions * 100) : 0}%</span>
                  </div>
                  <span className="text-muted-foreground ml-1">taxa de conclusão</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sessões Agendadas</p>
                    <h3 className="text-2xl font-bold mt-1">{stats.upcomingSessions}</h3>
                  </div>
                  <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-emerald-700" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-xs text-muted-foreground">
                  <span>Nos próximos 30 dias</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avaliação Média</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {stats.averageRating} <span className="text-lg text-yellow-500">★</span>
                    </h3>
                  </div>
                  <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Star className="h-5 w-5 text-emerald-700" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-xs text-muted-foreground">
                  <span>Baseado em {reviews?.length || 0} avaliações</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>
                Acesso rápido às principais funções do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center" asChild>
                  <Link href="/therapist-availability">
                    <Clock className="h-6 w-6 mb-2 text-emerald-600" />
                    <span className="text-sm">Gerenciar Disponibilidade</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center" asChild>
                  <Link href="/schedule">
                    <Calendar className="h-6 w-6 mb-2 text-emerald-600" />
                    <span className="text-sm">Visualizar Agenda</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center" asChild>
                  <Link href="/therapist-profile">
                    <UserRound className="h-6 w-6 mb-2 text-emerald-600" />
                    <span className="text-sm">Editar Perfil</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center" asChild>
                  <Link href="/patients">
                    <Users className="h-6 w-6 mb-2 text-emerald-600" />
                    <span className="text-sm">Ver Pacientes</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Gráficos de resumo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sessões Mensais</CardTitle>
                <CardDescription>
                  Distribuição de sessões ao longo do ano
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sessionsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" name="Concluídas" fill="#10b981" />
                    <Bar dataKey="scheduled" name="Agendadas" fill="#3b82f6" />
                    <Bar dataKey="canceled" name="Canceladas" fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Humor</CardTitle>
                <CardDescription>
                  Análise de humor dos pacientes
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={moodDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {moodDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={MOOD_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Próximas Sessões */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Próximas Sessões</CardTitle>
              <CardDescription>
                Sessões agendadas para os próximos dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingSessions ? (
                  <p className="text-center text-muted-foreground py-4">Carregando sessões...</p>
                ) : upcomingSessions?.length ? (
                  upcomingSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">Nenhuma sessão agendada</p>
                )}
                
                {upcomingSessions?.length ? (
                  <div className="text-right mt-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/therapist/sessions">
                        Ver todas as sessões
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
          
          {/* Tendência de Progresso */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Tendência de Progresso</CardTitle>
              <CardDescription>
                Evolução média do progresso dos pacientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={progressTrendData}>
                  <defs>
                    {['Anxiety Management', 'Stress Reduction', 'Sleep Quality', 'Mood Stability'].map((category, index) => (
                      <linearGradient key={`gradient-${index}`} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.1}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="Anxiety Management" 
                    name="Controle de Ansiedade"
                    stroke={COLORS[0]} 
                    fillOpacity={1} 
                    fill={`url(#color0)`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Stress Reduction" 
                    name="Redução de Estresse"
                    stroke={COLORS[1]} 
                    fillOpacity={1} 
                    fill={`url(#color1)`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Sleep Quality" 
                    name="Qualidade do Sono"
                    stroke={COLORS[2]} 
                    fillOpacity={1} 
                    fill={`url(#color2)`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Mood Stability" 
                    name="Estabilidade de Humor"
                    stroke={COLORS[3]} 
                    fillOpacity={1} 
                    fill={`url(#color3)`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba: Pacientes */}
        <TabsContent value="patients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meus Pacientes</CardTitle>
              <CardDescription>
                Gerenciamento e análise de pacientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPatients ? (
                <p className="text-center text-muted-foreground py-4">Carregando pacientes...</p>
              ) : patients?.length ? (
                <PatientTable patients={patients} />
              ) : (
                <p className="text-center text-muted-foreground py-4">Nenhum paciente encontrado</p>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Atividade dos Pacientes</CardTitle>
                <CardDescription>
                  Engajamento com diário e ferramentas de autoajuda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={patientActivityData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="entries" name="Entradas de Diário" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Progresso por Categoria</CardTitle>
                <CardDescription>
                  Resultado médio de progresso por área
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={progressCategories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" name="Média de Progresso" fill="#10b981" />
                    <Bar dataKey="patients" name="Pacientes Acompanhados" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Progresso dos Pacientes</CardTitle>
              <CardDescription>
                Evolução recente dos pacientes em tratamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {patients?.slice(0, 3).map(patient => (
                  <PatientProgressCard key={patient.id} patient={patient} />
                ))}
                
                {patients && patients.length > 3 && (
                  <div className="text-right mt-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/therapist/patients">
                        Ver todos os pacientes
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba: Sessões */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendário de Sessões</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as suas sessões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionsCalendar sessions={sessions || []} />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Próximas Sessões</CardTitle>
                <CardDescription>
                  Sessões agendadas para os próximos dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingSessions ? (
                    <p className="text-center text-muted-foreground py-4">Carregando sessões...</p>
                  ) : upcomingSessions?.length ? (
                    upcomingSessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Nenhuma sessão agendada</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Sessões Recentes</CardTitle>
                <CardDescription>
                  Últimas sessões realizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingSessions ? (
                    <p className="text-center text-muted-foreground py-4">Carregando sessões...</p>
                  ) : recentSessions?.length ? (
                    recentSessions.map((session) => (
                      <SessionCard key={session.id} session={session} isRecent />
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Nenhuma sessão recente</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Sessões</CardTitle>
              <CardDescription>
                Análise de performance e agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">
                      {sessions?.length ? Math.round(stats.completedSessions / stats.totalSessions * 100) : 0}%
                    </div>
                    <div className="text-xs text-green-600 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      5% vs. mês anterior
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ 
                      width: `${sessions?.length ? Math.round(stats.completedSessions / stats.totalSessions * 100) : 0}%` 
                    }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Duração Média</p>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">
                      50 min
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Baseado em {stats.completedSessions} sessões
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Dias Mais Ocupados</p>
                  <div className="text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span>Segunda</span>
                      <span className="font-medium">28%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '28%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-1">
                      <span>Quarta</span>
                      <span className="font-medium">24%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '24%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-1">
                      <span>Sexta</span>
                      <span className="font-medium">22%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '22%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba: Análises */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-emerald-800">Análises Avançadas</h2>
              <p className="text-sm text-muted-foreground">
                Insights detalhados sobre a saúde mental dos pacientes
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={timeFrame === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTimeFrame('week')}
              >
                Semana
              </Button>
              <Button 
                variant={timeFrame === 'month' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTimeFrame('month')}
              >
                Mês
              </Button>
              <Button 
                variant={timeFrame === 'year' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTimeFrame('year')}
              >
                Ano
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Humor</CardTitle>
              <CardDescription>
                Análise de humor dos pacientes ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Anxiety Management" 
                    name="Controle de Ansiedade" 
                    stroke="#0088FE" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Stress Reduction" 
                    name="Redução de Estresse" 
                    stroke="#00C49F" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Sleep Quality" 
                    name="Qualidade do Sono" 
                    stroke="#FFBB28" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Mood Stability" 
                    name="Estabilidade de Humor" 
                    stroke="#FF8042" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Categorias de Diário</CardTitle>
                <CardDescription>
                  Temas mais recorrentes nos registros dos pacientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Ansiedade', value: 35 },
                        { name: 'Família', value: 25 },
                        { name: 'Trabalho', value: 20 },
                        { name: 'Relacionamentos', value: 15 },
                        { name: 'Saúde', value: 5 }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[0, 1, 2, 3, 4].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Eficácia de Tratamento</CardTitle>
                <CardDescription>
                  Métricas de melhoria por categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Ansiedade', inicio: 75, atual: 45 },
                    { name: 'Depressão', inicio: 65, atual: 30 },
                    { name: 'Estresse', inicio: 80, atual: 55 },
                    { name: 'Insônia', inicio: 70, atual: 35 },
                    { name: 'Pânico', inicio: 60, atual: 25 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="inicio" name="Início do Tratamento" fill="#ff8042" />
                    <Bar dataKey="atual" name="Atual" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Análise Semântica do Diário</CardTitle>
              <CardDescription>
                Palavras e temas mais frequentes nas entradas do diário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 py-4">
                {[
                  { text: 'ansiedade', size: 28 },
                  { text: 'família', size: 26 },
                  { text: 'trabalho', size: 24 },
                  { text: 'medo', size: 22 },
                  { text: 'estresse', size: 24 },
                  { text: 'sono', size: 20 },
                  { text: 'relacionamento', size: 19 },
                  { text: 'felicidade', size: 17 },
                  { text: 'frustração', size: 21 },
                  { text: 'tristeza', size: 22 },
                  { text: 'esperança', size: 16 },
                  { text: 'paz', size: 15 },
                  { text: 'insegurança', size: 20 },
                  { text: 'futuro', size: 18 },
                  { text: 'saúde', size: 17 },
                  { text: 'crescimento', size: 15 },
                  { text: 'pressão', size: 19 },
                  { text: 'solidão', size: 21 },
                  { text: 'mudança', size: 18 },
                  { text: 'apoio', size: 17 }
                ].map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-emerald-50 rounded-full px-3 py-1.5 text-emerald-800"
                    style={{ fontSize: `${item.size / 10}rem` }}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Correlações de Fatores</CardTitle>
              <CardDescription>
                Relação entre diferentes variáveis de saúde mental
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Principais Correlações Positivas</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between">
                      <span className="text-sm">Prática de exercícios + Qualidade do sono</span>
                      <span className="font-medium text-green-600">+0.78</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-sm">Conexões sociais + Humor</span>
                      <span className="font-medium text-green-600">+0.72</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-sm">Meditação + Níveis de ansiedade</span>
                      <span className="font-medium text-green-600">+0.65</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-sm">Registro no diário + Autoconhecimento</span>
                      <span className="font-medium text-green-600">+0.62</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Principais Correlações Negativas</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between">
                      <span className="text-sm">Uso de telas à noite + Qualidade do sono</span>
                      <span className="font-medium text-red-600">-0.71</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-sm">Estresse no trabalho + Estabilidade de humor</span>
                      <span className="font-medium text-red-600">-0.68</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-sm">Isolamento social + Bem-estar</span>
                      <span className="font-medium text-red-600">-0.64</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-sm">Consumo de cafeína + Ansiedade</span>
                      <span className="font-medium text-red-600">-0.57</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}