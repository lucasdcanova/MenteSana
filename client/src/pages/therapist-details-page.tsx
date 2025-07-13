import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { Therapist } from '@shared/schema';
import { 
  Calendar, Clock, MapPin, Phone, ArrowLeft, Mail, 
  Video, Calendar as CalendarIcon, Star 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ReviewsSection } from '@/components/therapist/reviews-section';

export default function TherapistDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const therapistId = parseInt(id);
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Obter detalhes do terapeuta
  useEffect(() => {
    async function fetchTherapistDetails() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/therapists/${therapistId}`);
        
        if (!response.ok) {
          throw new Error('Falha ao carregar informações do terapeuta');
        }
        
        const data = await response.json();
        setTherapist(data);
      } catch (error) {
        console.error('Erro ao carregar terapeuta:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as informações do terapeuta',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    if (!isNaN(therapistId)) {
      fetchTherapistDetails();
    }
  }, [therapistId, toast]);

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-lg text-gray-500">Carregando informações do terapeuta...</p>
        </div>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <p className="text-xl text-gray-700">Terapeuta não encontrado</p>
          <Button asChild>
            <Link href="/therapists">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para lista de terapeutas
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate days of the week when the therapist is available
  const getAvailableDays = () => {
    const daysOfWeek = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    return daysOfWeek.filter(
      day => (therapist.availability as Record<string, boolean>)[day]
    );
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/therapists">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para lista de terapeutas
        </Link>
      </Button>

      {/* Header com informações principais */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-28 h-28 md:w-40 md:h-40 rounded-full bg-emerald-100 overflow-hidden flex-shrink-0">
          {therapist.imageUrl ? (
            <div className="w-full h-full" style={{
              backgroundImage: `url(${therapist.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-200">
              <span className="text-3xl font-medium text-emerald-800">{`${therapist.firstName[0]}${therapist.lastName[0]}`}</span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-emerald-900">
                Dr. {therapist.firstName} {therapist.lastName}
              </h1>
              <p className="text-lg text-emerald-700">{therapist.specialization}</p>
              
              {/* Localização e taxa */}
              <div className="flex items-center mt-2 text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="mr-4">{therapist.location || 'São Paulo, Brasil'}</span>
                <span className="font-semibold">R$ {therapist.hourlyRate?.toFixed(2) || '150,00'}/hora</span>
              </div>
              
              {/* Avaliação */}
              <div className="flex items-center mt-2">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <span className="ml-1 font-medium">
                    {therapist.rating ? (therapist.rating / 10).toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>
              
              {/* Tags */}
              <div className="flex flex-wrap mt-3 gap-2">
                {therapist.tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="text-xs bg-emerald-100 text-emerald-800 rounded-full px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
              <Button>
                <Calendar className="mr-2 h-4 w-4" />
                Agendar consulta
              </Button>
              <Button variant="outline">
                <Video className="mr-2 h-4 w-4" />
                Conversa rápida
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs para diferentes seções */}
      <Tabs defaultValue="about" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="about">Sobre</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações</TabsTrigger>
          <TabsTrigger value="schedule">Horários</TabsTrigger>
        </TabsList>
        
        {/* Seção Sobre */}
        <TabsContent value="about">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Sobre</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {therapist.bio || `Dr. ${therapist.firstName} ${therapist.lastName} é um profissional especializado em ${therapist.specialization}. 
                    
Com vasta experiência clínica e formação acadêmica sólida, oferece tratamento personalizado para diversas condições psicológicas.

Sua abordagem integra técnicas baseadas em evidências científicas, sempre focando nas necessidades individuais de cada paciente.`}
                  </p>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">Especialidades</h3>
                  <ul className="list-disc pl-5 text-gray-700">
                    {therapist.tags.map((tag, index) => (
                      <li key={index}>{tag}</li>
                    ))}
                  </ul>
                  
                  <h3 className="text-lg font-semibold mt-6 mb-2">Formação</h3>
                  <ul className="list-disc pl-5 text-gray-700">
                    <li>Doutorado em Psicologia Clínica - Universidade de São Paulo</li>
                    <li>Mestrado em Neuropsicologia - Universidade Federal do Rio de Janeiro</li>
                    <li>Graduação em Psicologia - PUC-SP</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Contato</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-emerald-600 mr-3" />
                      <span>{therapist.email || `${therapist.firstName.toLowerCase()}.${therapist.lastName.toLowerCase()}@mentehealthy.com`}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-emerald-600 mr-3" />
                      <span>{therapist.phone || "(11) 98765-4321"}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-emerald-600 mr-3" />
                      <span>{therapist.location || "São Paulo, SP"}</span>
                    </div>
                    
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-emerald-600 mr-3 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Dias disponíveis:</span>
                        <p>{getAvailableDays().map(day => 
                          day.charAt(0).toUpperCase() + day.slice(1)
                        ).join(', ')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-emerald-600 mr-3 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Horários:</span>
                        <p>9:00 - 18:00</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Seção Avaliações */}
        <TabsContent value="reviews">
          <ReviewsSection therapistId={therapistId} />
        </TabsContent>
        
        {/* Seção Horários */}
        <TabsContent value="schedule">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">Disponibilidade</h2>
              
              <div className="flex flex-col space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Próximos horários disponíveis</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((_, index) => {
                      const date = new Date();
                      date.setDate(date.getDate() + index);
                      return (
                        <Button 
                          key={index} 
                          variant="outline" 
                          className="flex items-center justify-start h-auto py-3"
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="font-medium">
                              {date.toLocaleDateString('pt-BR', { weekday: 'long' }).charAt(0).toUpperCase() + 
                              date.toLocaleDateString('pt-BR', { weekday: 'long' }).slice(1)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Horários regulares</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    {['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'].map((day) => {
                      const isAvailable = (therapist.availability as Record<string, boolean>)[day];
                      const displayDay = day.charAt(0).toUpperCase() + day.slice(1);
                      
                      return (
                        <div key={day} className="flex justify-between py-2 border-b border-gray-100">
                          <span className="font-medium">{displayDay}</span>
                          <span className={isAvailable ? 'text-emerald-600' : 'text-gray-400'}>
                            {isAvailable ? '9:00 - 18:00' : 'Indisponível'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}