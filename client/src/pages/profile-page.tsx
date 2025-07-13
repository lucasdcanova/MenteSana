import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, User, Phone, Mail, MapPin, Briefcase, Heart, Shield, Users, Calendar as CalendarIconSolid, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ProfileImageUpload from "@/components/profile/profile-image-upload";

// Esquema de formulário para perfil geral
const profileFormSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  location: z.string().optional(),
  occupation: z.string().optional(),
  bio: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.date().optional(),
});

// Esquema para o formulário de medos e ansiedades
const fearsAnxietiesSchema = z.object({
  fears: z.array(z.string()).optional(),
  anxieties: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
});

// Função para obter as iniciais do nome
function getInitials(firstName: string, lastName: string) {
  return `${firstName ? firstName[0] : ''}${lastName ? lastName[0] : ''}`;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [currentField, setCurrentField] = useState<"fears" | "anxieties" | "goals" | null>(null);
  
  // Estado para medos, ansiedades e objetivos
  const [fears, setFears] = useState<string[]>(user?.fears as string[] || []);
  const [anxieties, setAnxieties] = useState<string[]>(user?.anxieties as string[] || []);
  const [goals, setGoals] = useState<string[]>(user?.goals as string[] || []);
  
  // Estado para histórico de sessões
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  
  // Estados para estatísticas profissionais (para terapeutas)
  const [patientCount, setPatientCount] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [isLoadingTherapistStats, setIsLoadingTherapistStats] = useState(false);

  // Formulário para perfil geral
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      location: user?.location || "",
      occupation: user?.occupation || "",
      bio: user?.bio || "",
      gender: user?.gender || "",
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth) : undefined,
    },
  });

  // Formulário para medos e ansiedades
  const fearsAnxietiesForm = useForm<z.infer<typeof fearsAnxietiesSchema>>({
    resolver: zodResolver(fearsAnxietiesSchema),
    defaultValues: {
      fears: user?.fears as string[] || [],
      anxieties: user?.anxieties as string[] || [],
      goals: user?.goals as string[] || [],
    },
  });

  // Carregar sessões do usuário
  useEffect(() => {
    if (user) {
      setIsLoadingSessions(true);
      fetch(`/api/sessions?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setSessions(data);
          setIsLoadingSessions(false);
          
          // Atualizar contagem de sessões concluídas para terapeutas
          if (user.isTherapist) {
            const completed = data.filter((session: any) => session.status === "completed").length;
            setCompletedSessions(completed);
          }
        })
        .catch(error => {
          console.error("Erro ao carregar sessões:", error);
          setIsLoadingSessions(false);
        });
    }
  }, [user]);
  
  // Carregar estatísticas do terapeuta
  useEffect(() => {
    if (user && user.isTherapist && user.therapistId) {
      setIsLoadingTherapistStats(true);
      
      // Carregar contagem de pacientes
      fetch(`/api/therapists/${user.therapistId}/patients/count`)
        .then(res => res.json())
        .then(data => {
          setPatientCount(data.count || 0);
        })
        .catch(error => {
          console.error("Erro ao carregar contagem de pacientes:", error);
        });
      
      // Carregar avaliação média
      fetch(`/api/therapists/${user.therapistId}/rating`)
        .then(res => res.json())
        .then(data => {
          setAvgRating(data.rating || 0);
        })
        .catch(error => {
          console.error("Erro ao carregar avaliação média:", error);
        })
        .finally(() => {
          setIsLoadingTherapistStats(false);
        });
    }
  }, [user]);

  // Atualizar formulário quando o usuário mudar
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || "",
        occupation: user.occupation || "",
        bio: user.bio || "",
        gender: user.gender || "",
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : undefined,
      });
      
      // Atualizar estados
      setFears(user.fears as string[] || []);
      setAnxieties(user.anxieties as string[] || []);
      setGoals(user.goals as string[] || []);
      
      // Atualizar formulário de medos e ansiedades
      fearsAnxietiesForm.reset({
        fears: user.fears as string[] || [],
        anxieties: user.anxieties as string[] || [],
        goals: user.goals as string[] || [],
      });
    }
  }, [user, profileForm, fearsAnxietiesForm]);

  // Função para atualizar perfil geral
  const onSubmitProfile = async (data: z.infer<typeof profileFormSchema>) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar perfil");
      }
      
      // Atualizar cache do usuário
      const updatedUser = await response.json();
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para adicionar novo item à lista (medos, ansiedades ou objetivos)
  const addItem = () => {
    if (!newItem.trim() || !currentField) return;
    
    // Atualizar estado local
    if (currentField === "fears") {
      setFears(prev => [...prev, newItem]);
    } else if (currentField === "anxieties") {
      setAnxieties(prev => [...prev, newItem]);
    } else if (currentField === "goals") {
      setGoals(prev => [...prev, newItem]);
    }
    
    // Limpar input
    setNewItem("");
  };

  // Função para remover item da lista
  const removeItem = (field: "fears" | "anxieties" | "goals", index: number) => {
    if (field === "fears") {
      setFears(prev => prev.filter((_, i) => i !== index));
    } else if (field === "anxieties") {
      setAnxieties(prev => prev.filter((_, i) => i !== index));
    } else if (field === "goals") {
      setGoals(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Função para salvar medos e ansiedades
  const saveFearsAnxieties = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = {
        fears,
        anxieties,
        goals,
      };
      
      const response = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar informações");
      }
      
      // Atualizar cache do usuário
      const updatedUser = await response.json();
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      toast({
        title: "Informações atualizadas",
        description: "Seus medos, ansiedades e objetivos foram atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar suas informações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [, navigate] = useLocation();
  
  // Redirecionar terapeutas para página específica de perfil
  useEffect(() => {
    if (user && user.isTherapist) {
      navigate("/therapist-profile");
    }
  }, [user, navigate]);
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa estar logado para acessar seu perfil.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-50 pb-20 ios-scroll-fix">
        {/* Cabeçalho do perfil com estilo iOS - aprimorado com blur e glassmorphism */}
        <div className="bg-white/95 backdrop-blur-md px-4 pt-8 pb-6 shadow-sm relative overflow-hidden z-10 ios-safe-area-pt">
          {/* Efeito de gradiente sutilmente animado */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-70 z-0"></div>
          
          <div className="max-w-md mx-auto flex flex-col items-center relative z-10">
            {/* Foto de perfil com sombra e efeito de elevação */}
            <div className="mb-4 relative">
              <div className="absolute inset-0 bg-white rounded-full blur-md opacity-50 scale-90"></div>
              <ProfileImageUpload 
                currentImage={user.profilePicture}
                userName={`${user.firstName} ${user.lastName}`}
                size="lg"
                showButtons={false}
              />
              {/* Indicador de edição */}
              <button 
                className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-md border-2 border-white"
                onClick={() => {
                  // Abrir diálogo de edição de foto
                  toast({
                    title: "Editar foto",
                    description: "Funcionalidade será implementada em breve.",
                  });
                }}
              >
                <PenSquare className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {/* Nome com estilo iOS */}
            <h2 className="text-2xl font-bold text-gray-900 animate-fade-in" style={{animationDelay: "0.1s"}}>
              {user.firstName} {user.lastName}
            </h2>
            
            {/* Badge com estilo moderno */}
            <Badge 
              variant="outline" 
              className="mt-1 bg-primary/10 text-primary border-none font-medium px-3 py-1 rounded-full animate-fade-in"
              style={{animationDelay: "0.2s"}}
            >
              {user.isTherapist ? "Terapeuta" : "Paciente"}
            </Badge>
            
            {/* Ícones de contato com efeito de hover aprimorado */}
            <div className="w-full max-w-sm mt-6 flex justify-around px-4 animate-fade-in" style={{animationDelay: "0.3s"}}>
              {user.email && (
                <div className="flex flex-col items-center group">
                  <div className="rounded-full bg-gray-100 p-2.5 mb-2 shadow-sm group-hover:bg-primary/10 group-hover:shadow-md transition-all duration-300">
                    <Mail className="h-5 w-5 text-gray-600 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs text-gray-600 group-hover:text-primary transition-colors">Email</span>
                </div>
              )}
              
              {user.phone && (
                <div className="flex flex-col items-center group">
                  <div className="rounded-full bg-gray-100 p-2.5 mb-2 shadow-sm group-hover:bg-primary/10 group-hover:shadow-md transition-all duration-300">
                    <Phone className="h-5 w-5 text-gray-600 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs text-gray-600 group-hover:text-primary transition-colors">Telefone</span>
                </div>
              )}
              
              {user.location && (
                <div className="flex flex-col items-center group">
                  <div className="rounded-full bg-gray-100 p-2.5 mb-2 shadow-sm group-hover:bg-primary/10 group-hover:shadow-md transition-all duration-300">
                    <MapPin className="h-5 w-5 text-gray-600 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs text-gray-600 group-hover:text-primary transition-colors">Localização</span>
                </div>
              )}
              
              {!user.location && user.occupation && (
                <div className="flex flex-col items-center group">
                  <div className="rounded-full bg-gray-100 p-2.5 mb-2 shadow-sm group-hover:bg-primary/10 group-hover:shadow-md transition-all duration-300">
                    <Briefcase className="h-5 w-5 text-gray-600 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs text-gray-600 group-hover:text-primary transition-colors">Ocupação</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs de conteúdo estilo iOS - aprimoradas com suavização e animações */}
        <div className="container max-w-md mx-auto px-4 pt-4 flex-1">
          <Tabs 
            defaultValue="general" 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 rounded-full bg-gray-100/80 backdrop-blur-sm p-1 shadow-inner border border-gray-100 animate-fade-in" 
                     style={{animationDelay: "0.4s"}}>
              <TabsTrigger 
                value="general" 
                className="rounded-full text-[13px] font-medium transition-all duration-300
                  data-[state=active]:bg-white 
                  data-[state=active]:text-primary 
                  data-[state=active]:shadow-sm
                  data-[state=active]:scale-[1.02]
                  data-[state=active]:font-semibold"
              >
                <User className="h-4 w-4 mr-1.5" />
                Perfil
              </TabsTrigger>
              {!user.isTherapist && (
                <TabsTrigger 
                  value="health" 
                  className="rounded-full text-[13px] font-medium transition-all duration-300
                    data-[state=active]:bg-white 
                    data-[state=active]:text-primary 
                    data-[state=active]:shadow-sm
                    data-[state=active]:scale-[1.02]
                    data-[state=active]:font-semibold"
                >
                  <Heart className="h-4 w-4 mr-1.5" />
                  Saúde
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="history" 
                className="rounded-full text-[13px] font-medium transition-all duration-300
                  data-[state=active]:bg-white 
                  data-[state=active]:text-primary 
                  data-[state=active]:shadow-sm
                  data-[state=active]:scale-[1.02]
                  data-[state=active]:font-semibold"
              >
                <CalendarIconSolid className="h-4 w-4 mr-1.5" />
                Histórico
              </TabsTrigger>
            </TabsList>
            
            {/* Aba de informações gerais */}
            <TabsContent value="general">
              {/* Estatísticas profissionais para terapeutas */}
              {user.isTherapist && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Estatísticas Profissionais</CardTitle>
                    <CardDescription>
                      Estatísticas baseadas em sua atividade na plataforma.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4 flex flex-col items-center">
                        <span className="text-2xl font-bold">{patientCount}</span>
                        <span className="text-sm text-muted-foreground">Pacientes</span>
                      </div>
                      
                      <div className="border rounded-lg p-4 flex flex-col items-center">
                        <span className="text-2xl font-bold">{completedSessions}</span>
                        <span className="text-sm text-muted-foreground">Sessões</span>
                      </div>
                      
                      <div className="border rounded-lg p-4 flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-5 h-5 text-yellow-400"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <span className="text-sm text-muted-foreground">Avaliação</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden animate-fade-in" 
                      style={{animationDelay: "0.5s"}}>
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Informações Pessoais
                  </CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais. {!user.isTherapist ? 'Estas informações serão visíveis para seu terapeuta.' : 'Estas informações serão visíveis para seus pacientes.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu nome" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sobrenome</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu sobrenome" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="seu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input placeholder="(00) 00000-0000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Localização</FormLabel>
                              <FormControl>
                                <Input placeholder="Cidade, Estado" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="occupation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ocupação</FormLabel>
                              <FormControl>
                                <Input placeholder="Sua profissão" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gênero</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um gênero" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="male">Masculino</SelectItem>
                                  <SelectItem value="female">Feminino</SelectItem>
                                  <SelectItem value="nonbinary">Não-binário</SelectItem>
                                  <SelectItem value="other">Outro</SelectItem>
                                  <SelectItem value="prefer_not_to_say">Prefiro não informar</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={profileForm.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data de Nascimento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: ptBR })
                                    ) : (
                                      <span>Selecione uma data</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sobre Mim</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Compartilhe um pouco sobre você" 
                                {...field} 
                                className="min-h-[120px]"
                              />
                            </FormControl>
                            <FormDescription>
                              Uma breve descrição sobre você, seus interesses e o que você está buscando.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Aba de saúde mental - apenas para pacientes */}
            {!user.isTherapist && (
              <TabsContent value="health">
                <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden animate-fade-in" 
                        style={{animationDelay: "0.5s"}}>
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Saúde Mental
                    </CardTitle>
                    <CardDescription>
                      Compartilhe informações sobre seus medos, ansiedades e objetivos terapêuticos.
                      Estas informações ajudarão seu terapeuta a entender melhor suas necessidades.
                    </CardDescription>
                  </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Medos */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Medos e Inseguranças
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Liste seus principais medos e inseguranças que gostaria de trabalhar.
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {fears.length > 0 ? (
                          fears.map((fear, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="text-sm py-1 px-3"
                            >
                              {fear}
                              <button 
                                className="ml-2 text-xs hover:text-destructive"
                                onClick={() => removeItem("fears", index)}
                              >
                                ✕
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm italic">
                            Nenhum medo adicionado. Adicione abaixo.
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="Novo medo ou insegurança" 
                          value={currentField === "fears" ? newItem : ""}
                          onChange={(e) => {
                            setCurrentField("fears");
                            setNewItem(e.target.value);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && addItem()}
                        />
                        <Button variant="outline" onClick={addItem}>
                          Adicionar
                        </Button>
                      </div>
                    </div>
                    
                    {/* Ansiedades */}
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Heart className="h-5 w-5" />
                        Ansiedades e Preocupações
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Quais ansiedades e preocupações recorrentes você enfrenta no dia a dia?
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {anxieties.length > 0 ? (
                          anxieties.map((anxiety, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="text-sm py-1 px-3"
                            >
                              {anxiety}
                              <button 
                                className="ml-2 text-xs hover:text-destructive"
                                onClick={() => removeItem("anxieties", index)}
                              >
                                ✕
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm italic">
                            Nenhuma ansiedade adicionada. Adicione abaixo.
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="Nova ansiedade ou preocupação" 
                          value={currentField === "anxieties" ? newItem : ""}
                          onChange={(e) => {
                            setCurrentField("anxieties");
                            setNewItem(e.target.value);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && addItem()}
                        />
                        <Button variant="outline" onClick={addItem}>
                          Adicionar
                        </Button>
                      </div>
                    </div>
                    
                    {/* Objetivos */}
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <PenSquare className="h-5 w-5" />
                        Objetivos Terapêuticos
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Quais são seus principais objetivos com a terapia? O que você deseja alcançar?
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {goals.length > 0 ? (
                          goals.map((goal, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="text-sm py-1 px-3"
                            >
                              {goal}
                              <button 
                                className="ml-2 text-xs hover:text-destructive"
                                onClick={() => removeItem("goals", index)}
                              >
                                ✕
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm italic">
                            Nenhum objetivo adicionado. Adicione abaixo.
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="Novo objetivo terapêutico" 
                          value={currentField === "goals" ? newItem : ""}
                          onChange={(e) => {
                            setCurrentField("goals");
                            setNewItem(e.target.value);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && addItem()}
                        />
                        <Button variant="outline" onClick={addItem}>
                          Adicionar
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={saveFearsAnxieties} 
                      disabled={isLoading}
                      className="mt-4"
                    >
                      {isLoading ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            )}
            
            {/* Aba de histórico */}
            <TabsContent value="history">
              <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden animate-fade-in" 
                      style={{animationDelay: "0.5s"}}>
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarIconSolid className="h-5 w-5 text-primary" />
                    Histórico de Atendimentos
                  </CardTitle>
                  <CardDescription>
                    Veja todas as suas consultas anteriores e agendadas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-10">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                  ) : sessions && sessions.length > 0 ? (
                    <div className="space-y-5">
                      {sessions.map((session: any, index: number) => (
                        <div 
                          key={session.id} 
                          className="border border-gray-100 rounded-xl p-5 hover:bg-accent/20 transition-all duration-300 shadow-sm hover:shadow animate-fade-in"
                          style={{animationDelay: `${0.1 * (index + 1)}s`}}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-[15px]">
                                Consulta com {session.therapistName || "Terapeuta"}
                              </h4>
                              <p className="text-muted-foreground text-sm mt-0.5 flex items-center">
                                <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                {format(new Date(session.scheduledFor), "PPP 'às' HH:mm", { locale: ptBR })}
                              </p>
                              <Badge 
                                variant={
                                  session.status === "completed" ? "default" :
                                  session.status === "canceled" ? "destructive" : "outline"
                                }
                                className="mt-2.5 rounded-full px-3 py-0.5 text-xs font-medium"
                              >
                                {session.status === "completed" ? "Concluída" :
                                 session.status === "canceled" ? "Cancelada" : "Agendada"}
                              </Badge>
                            </div>
                            <Badge 
                              variant="outline" 
                              className="capitalize rounded-full text-xs font-medium shadow-sm border-gray-200 bg-gray-50/80"
                            >
                              {session.type === "video" ? "Videochamada" : 
                               session.type === "chat" ? "Chat" : session.type}
                            </Badge>
                          </div>
                          
                          {session.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Observações:</span> {session.notes}
                              </p>
                            </div>
                          )}
                          
                          <div className="mt-4 flex justify-end">
                            {session.status === "scheduled" && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mr-2 text-[13px] font-medium rounded-full border-gray-200 shadow-sm"
                                >
                                  Reagendar
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  className="text-[13px] font-medium rounded-full shadow-sm"
                                  onClick={() => window.location.href = `/video-call/${session.id}`}
                                >
                                  {new Date(session.scheduledFor) <= new Date() 
                                    ? "Entrar na Consulta" 
                                    : "Ver Detalhes"}
                                </Button>
                              </>
                            )}
                            
                            {session.status === "completed" && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-[13px] font-medium rounded-full border-gray-200 shadow-sm"
                              >
                                Ver Anotações
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 px-4 animate-fade-in">
                      <div className="bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5 shadow-sm">
                        <Users className="h-10 w-10 text-muted-foreground opacity-80" />
                      </div>
                      <h3 className="text-lg font-medium">Nenhuma consulta encontrada</h3>
                      <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                        Você ainda não realizou nenhuma consulta ou agendamento. Agende sua primeira consulta para começar.
                      </p>
                      <Button className="mt-5 rounded-full font-medium px-6 shadow-md">
                        Agendar Primeira Consulta
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
    </>
  );
}