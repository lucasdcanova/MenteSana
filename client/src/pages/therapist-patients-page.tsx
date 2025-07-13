import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/layout/page-layout";
import { 
  BarChart, 
  Calendar, 
  Search,
  AlertCircle,
  TrendingUp, 
  Clock, 
  Edit, 
  Plus,
  FileText,
  ArrowUpRight,
  Users,
  MessageSquare
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { PageTransition } from "@/components/layout/page-transition";
import { User } from "@shared/schema";

// Interface para mostrar os detalhes do paciente e sua atividade
interface PatientWithActivity {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  isTherapist: boolean;
  profilePicture?: string | null;
  dateOfBirth?: Date | null;
  bio?: string | null;
  lastSession?: string;
  nextSession?: string;
  sessionCount?: number;
  progress?: number;
  recentMoods?: string[];
  journalEntries?: number;
  medicalRecords?: number;
}

export default function TherapistPatientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithActivity | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Log de depuração para verificar o carregamento da página
  console.log("[TherapistPatientsPage] Página carregada, usuário:", user, "location:", location);

  // Verificar se o usuário é um terapeuta
  useEffect(() => {
    if (user && !user.isTherapist) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, toast, navigate]);

  // Buscar pacientes do terapeuta
  const { data: patients, isLoading: isLoadingPatients } = useQuery<PatientWithActivity[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patients");
      const patientsData = await res.json();
      
      // Verificar se temos dados de pacientes
      if (patientsData && patientsData.length > 0) {
        // Adicionar dados complementares para cada paciente
        return patientsData.map((patient: User) => ({
          ...patient,
          lastSession: getRandomDate(60), // Última sessão nos últimos 60 dias
          nextSession: getRandomDate(-30), // Próxima sessão nos próximos 30 dias
          sessionCount: Math.floor(Math.random() * 20) + 1,
          progress: Math.floor(Math.random() * 100),
          recentMoods: getRandomMoods(),
          journalEntries: Math.floor(Math.random() * 50) + 1,
          medicalRecords: Math.floor(Math.random() * 10),
        }));
      } else {
        // Para fins de demonstração/teste quando não há pacientes reais
        // Criar alguns pacientes fictícios para mostrar a interface
        const mockPatients = [
          {
            id: 100,
            username: "maria_silva",
            firstName: "Maria",
            lastName: "Silva",
            email: "maria@example.com", 
            isTherapist: false,
            profilePicture: null,
            dateOfBirth: new Date("1995-05-15"),
            bio: "Paciente desde janeiro de 2025",
            lastSession: "02/04/2025",
            nextSession: "15/04/2025",
            sessionCount: 12,
            progress: 68,
            recentMoods: ["Ansioso", "Estressado", "Esperançoso"],
            journalEntries: 34,
            medicalRecords: 3,
          },
          {
            id: 101,
            username: "joao_santos",
            firstName: "João",
            lastName: "Santos",
            email: "joao@example.com", 
            isTherapist: false,
            profilePicture: null,
            dateOfBirth: new Date("1988-10-23"),
            bio: "Paciente desde fevereiro de 2025",
            lastSession: "28/03/2025",
            nextSession: "11/04/2025",
            sessionCount: 8,
            progress: 45,
            recentMoods: ["Deprimido", "Cansado"],
            journalEntries: 15,
            medicalRecords: 2,
          },
          {
            id: 102,
            username: "ana_oliveira",
            firstName: "Ana",
            lastName: "Oliveira",
            email: "ana@example.com", 
            isTherapist: false,
            profilePicture: null,
            dateOfBirth: new Date("1992-03-07"),
            bio: "Paciente desde março de 2025",
            lastSession: "01/04/2025",
            nextSession: "08/04/2025",
            sessionCount: 4,
            progress: 22,
            recentMoods: ["Motivado", "Feliz"],
            journalEntries: 7,
            medicalRecords: 1,
          }
        ];
        return mockPatients;
      }
    },
    enabled: !!user?.isTherapist,
  });

  // Funções auxiliares para gerar dados simulados
  function getRandomDate(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (daysOffset > 0 ? Math.floor(Math.random() * daysOffset) : daysOffset));
    return date.toLocaleDateString("pt-BR");
  }

  function getRandomMoods(): string[] {
    const moods = ["Ansioso", "Tranquilo", "Estressado", "Feliz", "Deprimido", "Irritado", "Motivado"];
    const count = Math.floor(Math.random() * 3) + 1;
    const selectedMoods: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * moods.length);
      if (!selectedMoods.includes(moods[randomIndex])) {
        selectedMoods.push(moods[randomIndex]);
      }
    }
    
    return selectedMoods;
  }

  // Filtrar pacientes pelo termo de busca
  const filteredPatients = patients?.filter(patient => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Classificar pacientes com base na aba selecionada
  const filteredAndSortedPatients = () => {
    if (!filteredPatients) return [];
    
    switch (activeTab) {
      case "recent":
        return [...filteredPatients].sort((a, b) => {
          const dateA = new Date(a.lastSession || "");
          const dateB = new Date(b.lastSession || "");
          return dateB.getTime() - dateA.getTime();
        });
      case "upcoming":
        return [...filteredPatients].sort((a, b) => {
          const dateA = new Date(a.nextSession || "");
          const dateB = new Date(b.nextSession || "");
          return dateA.getTime() - dateB.getTime();
        });
      case "progress":
        return [...filteredPatients].sort((a, b) => 
          (b.progress || 0) - (a.progress || 0)
        );
      default:
        return filteredPatients;
    }
  };

  // Renderizar card de detalhes do paciente
  const renderPatientDetails = () => {
    if (!selectedPatient) {
      return (
        <Card className="h-full flex items-center justify-center">
          <CardContent className="text-center p-6">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">Selecione um paciente para ver detalhes</h3>
            <p className="text-sm text-gray-500 mt-2">
              Clique em um paciente na lista para visualizar suas informações completas
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <Avatar className="h-14 w-14 mr-4">
                <AvatarImage 
                  src={selectedPatient.profilePicture || ""} 
                  alt={`${selectedPatient.firstName} ${selectedPatient.lastName}`} 
                />
                <AvatarFallback className="bg-primary/10 text-primary-foreground">
                  {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{selectedPatient.firstName} {selectedPatient.lastName}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.open(`/patient/${selectedPatient.id}/records`, '_blank')}>
              <FileText className="mr-2 h-4 w-4" />
              Prontuário
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg bg-primary/5 p-4">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-primary mr-2" />
                <h3 className="text-sm font-medium">Próxima Sessão</h3>
              </div>
              <p className="mt-2 text-lg font-semibold">{selectedPatient.nextSession || "Não agendada"}</p>
            </div>
            
            <div className="rounded-lg bg-primary/5 p-4">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-primary mr-2" />
                <h3 className="text-sm font-medium">Progresso</h3>
              </div>
              <p className="mt-2 text-lg font-semibold">{selectedPatient.progress}%</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium mb-1 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                Histórico
              </h3>
              <p className="text-sm pl-6">
                <span className="font-medium">Última sessão:</span> {selectedPatient.lastSession}
              </p>
              <p className="text-sm pl-6">
                <span className="font-medium">Total de sessões:</span> {selectedPatient.sessionCount}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-gray-500" />
                Humor Recente
              </h3>
              <div className="pl-6">
                {selectedPatient.recentMoods?.map((mood, index) => (
                  <Badge key={index} variant="outline" className="mr-1 mb-1">
                    {mood}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                Atividades
              </h3>
              <p className="text-sm pl-6">
                <span className="font-medium">Entradas no diário:</span> {selectedPatient.journalEntries}
              </p>
              <p className="text-sm pl-6">
                <span className="font-medium">Registros médicos:</span> {selectedPatient.medicalRecords}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Notas</h3>
            <textarea 
              className="w-full h-24 text-sm p-3 border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Adicione notas sobre este paciente..."
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" className="w-1/2 mr-2">
            <Edit className="mr-2 h-4 w-4" />
            Editar Perfil
          </Button>
          <Button className="w-1/2 ml-2 bg-primary hover:bg-primary/90">
            <MessageSquare className="mr-2 h-4 w-4" />
            Enviar Mensagem
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Renderizar o conteúdo principal
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meus Pacientes</h1>
              <p className="text-gray-600">Gerencie e acompanhe o progresso dos seus pacientes</p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex items-center">
              <Button className="bg-primary hover:bg-primary/90 mr-2">
                <Plus className="mr-2 h-4 w-4" />
                Novo Paciente
              </Button>
              
              <Button variant="outline">
                <BarChart className="mr-2 h-4 w-4" />
                Relatórios
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Lista de pacientes */}
            <div className="md:col-span-5">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-3">
                    <div className="relative w-full">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Buscar pacientes..."
                        className="pl-8 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="w-full">
                      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-4 w-full">
                          <TabsTrigger 
                            value="all" 
                            className="text-[9px] xxs:text-xs sm:text-sm py-1 h-9 px-0 whitespace-nowrap overflow-hidden text-ellipsis leading-none"
                          >
                            Todos
                          </TabsTrigger>
                          <TabsTrigger 
                            value="recent" 
                            className="text-[9px] xxs:text-xs sm:text-sm py-1 h-9 px-0 whitespace-nowrap overflow-hidden text-ellipsis leading-none"
                          >
                            Recentes
                          </TabsTrigger>
                          <TabsTrigger 
                            value="upcoming" 
                            className="text-[9px] xxs:text-xs sm:text-sm py-1 h-9 px-0 whitespace-nowrap overflow-hidden text-ellipsis leading-none"
                          >
                            Próximos
                          </TabsTrigger>
                          <TabsTrigger 
                            value="progress" 
                            className="text-[9px] xxs:text-xs sm:text-sm py-1 h-9 px-0 whitespace-nowrap overflow-hidden text-ellipsis leading-none"
                          >
                            Progresso
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-270px)] w-full" enableMouseWheel={true}>
                    {isLoadingPatients ? (
                      <div className="p-4 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-[200px]" />
                              <Skeleton className="h-4 w-[160px]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndSortedPatients().length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 p-4">
                        <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500 text-center">
                          {searchQuery 
                            ? "Nenhum paciente encontrado com este nome" 
                            : "Você ainda não tem pacientes"}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredAndSortedPatients().map((patient) => (
                          <div
                            key={patient.id}
                            className={`p-4 flex cursor-pointer transition-colors hover:bg-gray-50 ${
                              selectedPatient?.id === patient.id ? "bg-primary/5" : ""
                            }`}
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <Avatar className="h-12 w-12 mr-4">
                              <AvatarImage 
                                src={patient.profilePicture || ""} 
                                alt={`${patient.firstName} ${patient.lastName}`} 
                              />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {patient.firstName[0]}{patient.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h3 className="font-medium text-gray-900">
                                  {patient.firstName} {patient.lastName}
                                </h3>
                                <ArrowUpRight className="h-4 w-4 text-gray-400" />
                              </div>
                              
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                                <p>Próxima: {patient.nextSession || "Não agendada"}</p>
                              </div>
                              
                              <div className="mt-2 flex items-center">
                                <div
                                  className="h-1.5 flex-1 rounded-full bg-gray-200"
                                  title={`Progresso: ${patient.progress}%`}
                                >
                                  <div
                                    className="h-1.5 rounded-full bg-primary"
                                    style={{ width: `${patient.progress}%` }}
                                  />
                                </div>
                                <span className="ml-2 text-xs text-gray-500">
                                  {patient.progress}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            {/* Detalhes do paciente */}
            <div className="md:col-span-7">
              {renderPatientDetails()}
            </div>
          </div>
        </div>
  );
}