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
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Star, 
  Library, 
  Award, 
  GraduationCap, 
  Calendar as CalendarIconSolid, 
  Languages, 
  Heart, 
  Plus, 
  Trash2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ProfileImageUpload from "@/components/profile/profile-image-upload";

// Esquema de formulário para perfil do terapeuta
const therapistProfileSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  location: z.string().optional(),
  profilePicture: z.string().optional(),
  bio: z.string().optional(),
  specialization: z.string().min(2, "Especialização é obrigatória"),
  hourlyRate: z.number().min(0, "Valor da consulta não pode ser negativo").optional(),
  education: z.string().optional(),
  yearsOfExperience: z.number().min(0).optional(),
  professionalBio: z.string().optional(),
  approachDescription: z.string().optional(),
  videoIntroUrl: z.string().optional(),
  availableForEmergency: z.boolean().optional(),
  
  // Formação acadêmica detalhada
  graduationCourse: z.string().optional(),
  graduationInstitution: z.string().optional(),
  graduationYear: z.number().optional(),
  
  // Pós-graduação
  postGradType: z.string().optional(),
  postGradTitle: z.string().optional(),
  postGradInstitution: z.string().optional(),
  postGradYear: z.number().optional(),
  
  // Experiência profissional atual
  currentInstitution: z.string().optional(),
  currentPosition: z.string().optional(),
  currentStartDate: z.string().optional(),
  currentResponsibilities: z.string().optional(),
  
  // Experiência profissional anterior
  previousInstitution: z.string().optional(),
  previousPosition: z.string().optional(),
  previousStartDate: z.string().optional(),
  previousEndDate: z.string().optional(),
  previousResponsibilities: z.string().optional(),
  
  // Publicações e pesquisas
  publications: z.string().optional(),
  
  // Preferências de atendimento
  preferredPatientProfile: z.string().optional(),
  preferredApproach: z.string().optional(),
});

// Função para obter as iniciais do nome
function getInitials(firstName: string, lastName: string) {
  return `${firstName ? firstName[0] : ''}${lastName ? lastName[0] : ''}`;
}

export default function TherapistProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para campos de arrays
  const [newLanguage, setNewLanguage] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  
  const [newCertification, setNewCertification] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  
  const [newSpecialty, setNewSpecialty] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  
  const [newTreatmentMethod, setNewTreatmentMethod] = useState("");
  const [treatmentMethods, setTreatmentMethods] = useState<string[]>([]);
  
  // Estados para visualização de dados
  const [patientCount, setPatientCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  
  // Query para buscar o terapeuta associado ao usuário
  const { data: therapist, isLoading: isLoadingTherapist } = useQuery({
    queryKey: [`/api/therapists/${user?.therapistId}`],
    queryFn: async () => {
      if (!user?.therapistId) return null;
      const res = await apiRequest("GET", `/api/therapists/${user.therapistId}`);
      return res.json();
    },
    enabled: !!user?.therapistId,
  });
  
  // Formulário para perfil do terapeuta
  const profileForm = useForm<z.infer<typeof therapistProfileSchema>>({
    resolver: zodResolver(therapistProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      location: user?.location || "",
      profilePicture: user?.profilePicture || "",
      bio: user?.bio || "",
      specialization: therapist?.specialization || "",
      hourlyRate: therapist?.hourlyRate || 0,
      education: therapist?.education || "",
      yearsOfExperience: therapist?.yearsOfExperience || 0,
      professionalBio: therapist?.professionalBio || "",
      approachDescription: therapist?.approachDescription || "",
      videoIntroUrl: therapist?.videoIntroUrl || "",
      availableForEmergency: therapist?.availableForEmergency || false,
      
      // Campos de experiência anterior
      previousInstitution: therapist?.previousInstitution || "",
      previousPosition: therapist?.previousPosition || "",
      previousStartDate: therapist?.previousStartDate || "",
      previousEndDate: therapist?.previousEndDate || "",
      previousResponsibilities: therapist?.previousResponsibilities || "",
    },
  });
  
  // Atualizar formulário quando os dados do terapeuta estiverem disponíveis
  useEffect(() => {
    if (user && therapist) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || "",
        profilePicture: user.profilePicture || "",
        bio: user.bio || "",
        specialization: therapist.specialization || "",
        hourlyRate: therapist.hourlyRate || 0,
        education: therapist.education || "",
        yearsOfExperience: therapist.yearsOfExperience || 0,
        professionalBio: therapist.professionalBio || "",
        approachDescription: therapist.approachDescription || "",
        videoIntroUrl: therapist.videoIntroUrl || "",
        availableForEmergency: therapist.availableForEmergency || false,
        
        // Campos de experiência anterior
        previousInstitution: therapist.previousInstitution || "",
        previousPosition: therapist.previousPosition || "",
        previousStartDate: therapist.previousStartDate || "",
        previousEndDate: therapist.previousEndDate || "",
        previousResponsibilities: therapist.previousResponsibilities || "",
        
        // Publicações e preferências
        publications: therapist.publications || "",
        preferredPatientProfile: therapist.preferredPatientProfile || "",
        preferredApproach: therapist.preferredApproach || "",
      });
      
      // Atualizar estados de arrays
      setLanguages(therapist.languages || []);
      setCertifications(therapist.certifications || []);
      setSpecialties(therapist.specialties || []);
      setTreatmentMethods(therapist.treatmentMethods || []);
      
      // Atualizar métricas
      setPatientCount(therapist.patientCount || 0);
      setAvgRating(therapist.rating || 0);
    }
  }, [user, therapist, profileForm]);
  
  // Query para buscar histórico de sessões
  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: [`/api/sessions/therapist/${user?.therapistId}`],
    queryFn: async () => {
      if (!user?.therapistId) return [];
      const res = await apiRequest("GET", `/api/sessions/therapist/${user.therapistId}`);
      return res.json();
    },
    enabled: !!user?.therapistId,
  });
  
  // Atualizar contagem de sessões concluídas
  useEffect(() => {
    if (sessions) {
      const completed = sessions.filter((session: any) => 
        session.status === "completed"
      ).length;
      setCompletedSessions(completed);
    }
  }, [sessions]);

  // Função para atualizar perfil do terapeuta
  const onSubmitProfile = async (data: z.infer<typeof therapistProfileSchema>) => {
    if (!user || !user.therapistId) return;
    
    setIsLoading(true);
    try {
      // Primeiro, atualizar dados do usuário
      const userUpdateResponse = await apiRequest("PATCH", `/api/users/${user.id}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        profilePicture: data.profilePicture,
        bio: data.bio,
      });
      
      if (!userUpdateResponse.ok) {
        throw new Error("Falha ao atualizar dados do usuário");
      }
      
      // Atualizar cache do usuário
      const updatedUser = await userUpdateResponse.json();
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      // Agora, atualizar dados do terapeuta
      const therapistUpdateResponse = await apiRequest("PATCH", `/api/therapists/${user.therapistId}`, {
        specialization: data.specialization,
        hourlyRate: data.hourlyRate,
        education: data.education,
        yearsOfExperience: data.yearsOfExperience,
        professionalBio: data.professionalBio,
        approachDescription: data.approachDescription,
        videoIntroUrl: data.videoIntroUrl,
        availableForEmergency: data.availableForEmergency,
        
        // Experiência profissional anterior
        previousInstitution: data.previousInstitution,
        previousPosition: data.previousPosition,
        previousStartDate: data.previousStartDate,
        previousEndDate: data.previousEndDate,
        previousResponsibilities: data.previousResponsibilities,
        
        // Publicações e preferências
        publications: data.publications,
        preferredPatientProfile: data.preferredPatientProfile,
        preferredApproach: data.preferredApproach,
        
        // Arrays
        languages: languages,
        certifications: certifications,
        specialties: specialties, 
        treatmentMethods: treatmentMethods,
      });
      
      if (!therapistUpdateResponse.ok) {
        throw new Error("Falha ao atualizar perfil profissional");
      }
      
      // Atualizar cache do terapeuta
      const updatedTherapist = await therapistUpdateResponse.json();
      queryClient.setQueryData([`/api/therapists/${user.therapistId}`], updatedTherapist);
      
      toast({
        title: "Perfil atualizado",
        description: "Seus dados profissionais foram atualizados com sucesso.",
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

  // Funções para gerenciar arrays de habilidades
  const addLanguage = () => {
    if (!newLanguage.trim()) return;
    setLanguages(prev => [...prev, newLanguage]);
    setNewLanguage("");
  };
  
  const removeLanguage = (index: number) => {
    setLanguages(prev => prev.filter((_, i) => i !== index));
  };
  
  const addCertification = () => {
    if (!newCertification.trim()) return;
    setCertifications(prev => [...prev, newCertification]);
    setNewCertification("");
  };
  
  const removeCertification = (index: number) => {
    setCertifications(prev => prev.filter((_, i) => i !== index));
  };
  
  const addSpecialty = () => {
    if (!newSpecialty.trim()) return;
    setSpecialties(prev => [...prev, newSpecialty]);
    setNewSpecialty("");
  };
  
  const removeSpecialty = (index: number) => {
    setSpecialties(prev => prev.filter((_, i) => i !== index));
  };
  
  const addTreatmentMethod = () => {
    if (!newTreatmentMethod.trim()) return;
    setTreatmentMethods(prev => [...prev, newTreatmentMethod]);
    setNewTreatmentMethod("");
  };
  
  const removeTreatmentMethod = (index: number) => {
    setTreatmentMethods(prev => prev.filter((_, i) => i !== index));
  };
  
  // Usar navegação wouter
  const [, navigate] = useLocation();
  
  if (!user || !user.isTherapist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Esta página é destinada apenas para terapeutas cadastrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/")}>
              Voltar para a Página Inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingTherapist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar com informações do perfil */}
        <div className="w-full md:w-1/3">
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <div className="mb-4">
                  <ProfileImageUpload 
                    currentImage={user.profilePicture}
                    userName={`${user.firstName} ${user.lastName}`}
                    size="xl"
                    showButtons={false}
                  />
                </div>
                <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
                <p className="text-muted-foreground mb-2">
                  {therapist?.specialization || "Terapeuta"}
                </p>
                
                {therapist?.rating && (
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < Math.round(therapist.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                    <span className="text-sm ml-1">({therapist.rating.toFixed(1)})</span>
                  </div>
                )}
                
                <Separator className="my-4" />
                
                <div className="w-full space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span>Perfil criado em {format(new Date(user.createdAt), "dd/MM/yyyy")}</span>
                  </div>
                  
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  
                  {user.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span>{user.location}</span>
                    </div>
                  )}
                  
                  {therapist?.hourlyRate !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">R$ {therapist.hourlyRate},00</span>
                      <span className="text-muted-foreground text-sm">por sessão</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Estatísticas do terapeuta */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas Profissionais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3 gap-4">
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
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">Avaliação</span>
                </div>
              </div>
              
              {/* Competências e especialidades */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Especialidades</h3>
                <div className="flex flex-wrap gap-1 mb-4">
                  {specialties && specialties.length > 0 ? (
                    specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma especialidade cadastrada</p>
                  )}
                </div>
                
                <h3 className="text-sm font-medium mb-2">Idiomas</h3>
                <div className="flex flex-wrap gap-1">
                  {languages && languages.length > 0 ? (
                    languages.map((language, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {language}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum idioma cadastrado</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Conteúdo principal */}
        <div className="w-full md:w-2/3">
          <Tabs 
            defaultValue="general" 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="general">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="professional">Perfil Profissional</TabsTrigger>
              <TabsTrigger value="patients">Pacientes</TabsTrigger>
            </TabsList>
            
            {/* Aba de informações gerais */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais que serão visíveis para seus pacientes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                      

                      
                      <FormField
                        control={profileForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biografia Pessoal</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Compartilhe um pouco sobre você" 
                                {...field} 
                                className="min-h-[120px]"
                              />
                            </FormControl>
                            <FormDescription>
                              Uma breve descrição pessoal que ajude seus pacientes a conhecerem você melhor.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Aba de perfil profissional */}
            <TabsContent value="professional">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Perfil Profissional</CardTitle>
                  <CardDescription>
                    Atualize suas informações profissionais, especialidades e valores.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="specialization"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Especialização Principal</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Psicologia Clínica" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="hourlyRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor da Sessão (R$)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Valor em reais" 
                                  {...field}
                                  value={field.value || ""}
                                  onChange={e => field.onChange(
                                    e.target.value === "" ? undefined : Number(e.target.value)
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="education"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Formação Acadêmica</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Mestrado em Psicologia" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="yearsOfExperience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Anos de Experiência</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Número de anos" 
                                  {...field}
                                  value={field.value || ""}
                                  onChange={e => field.onChange(
                                    e.target.value === "" ? undefined : Number(e.target.value)
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={profileForm.control}
                        name="professionalBio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biografia Profissional</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descreva sua experiência profissional, formação e abordagem" 
                                {...field} 
                                className="min-h-[150px]"
                              />
                            </FormControl>
                            <FormDescription>
                              Descreva sua trajetória profissional, formação acadêmica e experiências relevantes.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="approachDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Abordagem Terapêutica</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descreva sua abordagem terapêutica e métodos utilizados" 
                                {...field} 
                                className="min-h-[150px]"
                              />
                            </FormControl>
                            <FormDescription>
                              Explique sua abordagem terapêutica, técnicas e métodos utilizados nas sessões.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="videoIntroUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL de Vídeo de Apresentação</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://exemplo.com/video.mp4" 
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Adicione um vídeo curto onde você se apresenta para potenciais pacientes.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="availableForEmergency"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Disponível para Emergências
                              </FormLabel>
                              <FormDescription>
                                Indique se está disponível para atendimentos emergenciais.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              {/* Seção de Competências e Especialidades */}
              <Card>
                <CardHeader>
                  <CardTitle>Competências e Especialidades</CardTitle>
                  <CardDescription>
                    Adicione idiomas, certificações, especialidades e métodos de tratamento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Idiomas */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Languages className="h-5 w-5" />
                      Idiomas
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione os idiomas que você domina para atendimento.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {languages.length > 0 ? (
                        languages.map((language, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-sm py-1 px-3"
                          >
                            {language}
                            <button 
                              className="ml-2 text-xs hover:text-destructive"
                              onClick={() => removeLanguage(index)}
                            >
                              ✕
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm italic">
                          Nenhum idioma adicionado. Adicione abaixo.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Novo idioma" 
                        value={newLanguage}
                        onChange={(e) => setNewLanguage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addLanguage()}
                      />
                      <Button variant="outline" onClick={addLanguage}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Certificações */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Certificações
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione suas certificações profissionais.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {certifications.length > 0 ? (
                        certifications.map((certification, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-sm py-1 px-3"
                          >
                            {certification}
                            <button 
                              className="ml-2 text-xs hover:text-destructive"
                              onClick={() => removeCertification(index)}
                            >
                              ✕
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm italic">
                          Nenhuma certificação adicionada. Adicione abaixo.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Nova certificação" 
                        value={newCertification}
                        onChange={(e) => setNewCertification(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCertification()}
                      />
                      <Button variant="outline" onClick={addCertification}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Especialidades */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Especialidades
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione suas áreas de especialização.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {specialties.length > 0 ? (
                        specialties.map((specialty, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-sm py-1 px-3"
                          >
                            {specialty}
                            <button 
                              className="ml-2 text-xs hover:text-destructive"
                              onClick={() => removeSpecialty(index)}
                            >
                              ✕
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm italic">
                          Nenhuma especialidade adicionada. Adicione abaixo.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Nova especialidade" 
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addSpecialty()}
                      />
                      <Button variant="outline" onClick={addSpecialty}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Métodos de Tratamento */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Library className="h-5 w-5" />
                      Métodos de Tratamento
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione os métodos e técnicas que você utiliza.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {treatmentMethods.length > 0 ? (
                        treatmentMethods.map((method, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-sm py-1 px-3"
                          >
                            {method}
                            <button 
                              className="ml-2 text-xs hover:text-destructive"
                              onClick={() => removeTreatmentMethod(index)}
                            >
                              ✕
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm italic">
                          Nenhum método adicionado. Adicione abaixo.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Novo método de tratamento" 
                        value={newTreatmentMethod}
                        onChange={(e) => setNewTreatmentMethod(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTreatmentMethod()}
                      />
                      <Button variant="outline" onClick={addTreatmentMethod}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={() => profileForm.handleSubmit(onSubmitProfile)()}
                      disabled={isLoading}
                    >
                      {isLoading ? "Salvando..." : "Salvar Todas as Alterações"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Seção de Formação Acadêmica Detalhada */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Formação Acadêmica Detalhada
                  </CardTitle>
                  <CardDescription>
                    Forneça informações detalhadas sobre sua formação acadêmica e cursos específicos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Graduação */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Graduação</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="grow space-y-1">
                          <Label htmlFor="graduation-course">Curso</Label>
                          <Input 
                            id="graduation-course" 
                            placeholder="Ex: Psicologia"
                            value={profileForm.watch('education') || ''}
                            onChange={(e) => profileForm.setValue('education', e.target.value)}
                          />
                        </div>
                        <div className="grow space-y-1">
                          <Label htmlFor="graduation-institution">Instituição</Label>
                          <Input 
                            id="graduation-institution" 
                            placeholder="Ex: Universidade Federal"
                            value={profileForm.watch('graduationInstitution') || ''}
                            onChange={(e) => profileForm.setValue('graduationInstitution', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="graduation-year">Ano de Conclusão</Label>
                          <Input 
                            id="graduation-year" 
                            placeholder="Ex: 2015"
                            type="number"
                            value={profileForm.watch('graduationYear') || ''}
                            onChange={(e) => profileForm.setValue('graduationYear', 
                              e.target.value === "" ? undefined : Number(e.target.value)
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pós-graduação */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Pós-graduação</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="grow space-y-1">
                          <Label htmlFor="postgrad-type">Tipo</Label>
                          <Input 
                            id="postgrad-type" 
                            placeholder="Ex: Mestrado, Doutorado, Especialização"
                          />
                        </div>
                        <div className="grow space-y-1">
                          <Label htmlFor="postgrad-title">Título</Label>
                          <Input 
                            id="postgrad-title" 
                            placeholder="Ex: Psicologia Clínica"
                          />
                        </div>
                        <div className="grow space-y-1">
                          <Label htmlFor="postgrad-institution">Instituição</Label>
                          <Input 
                            id="postgrad-institution" 
                            placeholder="Ex: Universidade de São Paulo"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="postgrad-year">Ano</Label>
                          <Input 
                            id="postgrad-year" 
                            placeholder="Ex: 2018"
                            type="number"
                          />
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Plus className="h-4 w-4 mr-1" /> Adicionar Pós-graduação
                      </Button>
                    </div>
                  </div>

                  {/* Cursos e Formações Complementares */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Cursos e Formações Complementares</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="grow space-y-1">
                          <Label htmlFor="course-name">Nome do Curso</Label>
                          <Input 
                            id="course-name" 
                            placeholder="Ex: Terapia Cognitivo-Comportamental"
                          />
                        </div>
                        <div className="grow space-y-1">
                          <Label htmlFor="course-institution">Instituição</Label>
                          <Input 
                            id="course-institution" 
                            placeholder="Ex: Instituto Beck"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="course-hours">Carga Horária</Label>
                          <Input 
                            id="course-hours" 
                            placeholder="Ex: 120h"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="course-year">Ano</Label>
                          <Input 
                            id="course-year" 
                            placeholder="Ex: 2020"
                            type="number"
                          />
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Plus className="h-4 w-4 mr-1" /> Adicionar Curso
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={() => profileForm.handleSubmit(onSubmitProfile)()}
                      disabled={isLoading}
                    >
                      {isLoading ? "Salvando..." : "Salvar Formação Acadêmica"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Seção de Experiência Profissional */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Experiência Profissional
                  </CardTitle>
                  <CardDescription>
                    Detalhe sua trajetória profissional, incluindo instituições e cargos ocupados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Experiência Atual */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Experiência Atual</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="current-institution">Instituição/Clínica</Label>
                          <Input 
                            id="current-institution" 
                            placeholder="Ex: Clínica Mente Sã"
                            value={profileForm.watch('currentInstitution') || ''}
                            onChange={(e) => profileForm.setValue('currentInstitution', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="current-position">Cargo/Função</Label>
                          <Input 
                            id="current-position" 
                            placeholder="Ex: Psicólogo Clínico Senior"
                            value={profileForm.watch('currentPosition') || ''}
                            onChange={(e) => profileForm.setValue('currentPosition', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="current-start-date">Data de Início</Label>
                          <Input 
                            id="current-start-date" 
                            placeholder="Ex: 01/2019"
                            value={profileForm.watch('currentStartDate') || ''}
                            onChange={(e) => profileForm.setValue('currentStartDate', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="current-responsibilities">Principais Responsabilidades</Label>
                          <Textarea 
                            id="current-responsibilities" 
                            placeholder="Descreva suas principais atividades e responsabilidades"
                            className="min-h-[80px]"
                            value={profileForm.watch('currentResponsibilities') || ''}
                            onChange={(e) => profileForm.setValue('currentResponsibilities', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Experiências Anteriores */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Experiências Anteriores</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="previous-institution">Instituição/Clínica</Label>
                          <Input 
                            id="previous-institution" 
                            placeholder="Ex: Hospital Universitário"
                            value={profileForm.watch('previousInstitution') || ''}
                            onChange={(e) => profileForm.setValue('previousInstitution', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="previous-position">Cargo/Função</Label>
                          <Input 
                            id="previous-position" 
                            placeholder="Ex: Psicólogo Clínico"
                            value={profileForm.watch('previousPosition') || ''}
                            onChange={(e) => profileForm.setValue('previousPosition', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="previous-start-date">Data de Início</Label>
                          <Input 
                            id="previous-start-date" 
                            placeholder="Ex: 01/2015"
                            value={profileForm.watch('previousStartDate') || ''}
                            onChange={(e) => profileForm.setValue('previousStartDate', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="previous-end-date">Data de Término</Label>
                          <Input 
                            id="previous-end-date" 
                            placeholder="Ex: 12/2018"
                            value={profileForm.watch('previousEndDate') || ''}
                            onChange={(e) => profileForm.setValue('previousEndDate', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="previous-responsibilities">Responsabilidades</Label>
                          <Textarea 
                            id="previous-responsibilities" 
                            placeholder="Descreva suas principais atividades e responsabilidades"
                            className="min-h-[80px]"
                            value={profileForm.watch('previousResponsibilities') || ''}
                            onChange={(e) => profileForm.setValue('previousResponsibilities', e.target.value)}
                          />
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Plus className="h-4 w-4 mr-1" /> Adicionar Experiência
                      </Button>
                    </div>
                  </div>

                  {/* Publicações e Pesquisas */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Publicações e Pesquisas</h3>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="publications">Artigos, Livros e Pesquisas</Label>
                        <Textarea 
                          id="publications" 
                          placeholder="Liste suas publicações acadêmicas, artigos e pesquisas relevantes"
                          className="min-h-[100px]"
                          value={profileForm.watch('publications') || ''}
                          onChange={(e) => profileForm.setValue('publications', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferências de Atendimento */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Preferências de Atendimento</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="preferred-patient-profile">Perfil de Pacientes</Label>
                          <Textarea 
                            id="preferred-patient-profile" 
                            placeholder="Descreva o perfil de pacientes com os quais você tem mais afinidade"
                            className="min-h-[80px]"
                            value={profileForm.watch('preferredPatientProfile') || ''}
                            onChange={(e) => profileForm.setValue('preferredPatientProfile', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="preferred-approach">Abordagem Preferida</Label>
                          <Textarea 
                            id="preferred-approach" 
                            placeholder="Descreva sua abordagem preferencial e metodologia de trabalho"
                            className="min-h-[80px]"
                            value={profileForm.watch('preferredApproach') || ''}
                            onChange={(e) => profileForm.setValue('preferredApproach', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-6">
                    <Button 
                      onClick={() => profileForm.handleSubmit(onSubmitProfile)()}
                      disabled={isLoading}
                    >
                      {isLoading ? "Salvando..." : "Salvar Experiência"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Aba de pacientes */}
            <TabsContent value="patients">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Pacientes</CardTitle>
                  <CardDescription>
                    Visualize e gerencie seus pacientes atuais.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : sessions && sessions.length > 0 ? (
                    <div className="space-y-2">
                      {/* Mapeamento de pacientes a partir de sessões */}
                      {Array.from(new Set(sessions.map((s: any) => s.userId)))
                        .map((userId) => {
                          // Converter para string para garantir que seja uma chave válida para o React
                          const userIdKey = String(userId);
                          const userSessions = sessions.filter((s: any) => s.userId === userId);
                          const patientName = userSessions[0]?.userName || "Paciente";
                          const lastSession = userSessions.sort((a: any, b: any) => 
                            new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
                          )[0];
                          
                          return (
                            <div 
                              key={userIdKey} 
                              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                      {patientName.split(' ').map((n: string) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="font-medium">{patientName}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      Última sessão: {lastSession ? format(new Date(lastSession.scheduledFor), "dd/MM/yyyy") : "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {userSessions.length} {userSessions.length === 1 ? "sessão" : "sessões"}
                                  </Badge>
                                  <Button variant="ghost" size="sm">
                                    Ver detalhes
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Próxima sessão agendada */}
                              {userSessions.filter((s: any) => 
                                s.status === "scheduled" && new Date(s.scheduledFor) > new Date()
                              ).length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-sm">
                                    <span className="font-medium">Próxima sessão:</span>{" "}
                                    {format(
                                      new Date(userSessions
                                        .filter((s: any) => s.status === "scheduled" && new Date(s.scheduledFor) > new Date())
                                        .sort((a: any, b: any) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0].scheduledFor
                                      ), 
                                      "dd/MM/yyyy 'às' HH:mm", 
                                      { locale: ptBR }
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">Nenhum paciente encontrado</h3>
                      <p className="text-muted-foreground mt-1">
                        Você ainda não atendeu nenhum paciente.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}