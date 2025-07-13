import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Calendar as CalendarIcon, Clock, Calendar, ChevronLeft, ChevronRight, HeartPulse, UserX, RefreshCw } from "lucide-react";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { Therapist, Session } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

// Custom time slot component for scheduling
// Mutation para cancelar consulta
const useCancelAppointment = () => {
  const toast = useToast();
  
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('DELETE', `/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Falha ao cancelar consulta');
      }
      return response.json();
    },
    onSuccess: (_, sessionId) => {
      // Atualizar diretamente o cache das consultas além de invalidar
      const queryKey = ["/api/sessions"];
      queryClient.setQueryData<{data: Session[]}>(queryKey, (oldData) => {
        if (!oldData) return oldData;
        
        // Atualizar o status da sessão no cache para "Cancelada"
        const newData = {
          ...oldData,
          data: oldData.data.map(session => 
            session.id === sessionId 
              ? { ...session, status: "Cancelada" } 
              : session
          )
        };
        
        return newData;
      });
      
      // Invalidar a consulta para atualizar os dados completamente
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      
      toast.toast({
        title: "Consulta cancelada",
        description: "A consulta foi cancelada com sucesso.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Appointment cancellation error:", error);
      toast.toast({
        title: "Erro",
        description: "Não foi possível cancelar a consulta. Tente novamente.",
        variant: "destructive",
      });
    }
  });
};

// Componente de Botão de Cancelamento
const CancelButton = ({ sessionId }: { sessionId: number }) => {
  const cancelAppointment = useCancelAppointment();
  
  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm('Tem certeza que deseja cancelar esta consulta?')) {
      cancelAppointment.mutate(sessionId);
    }
  };
  
  return (
    <Button 
      size="sm" 
      variant="outline" 
      className="text-xs px-3 h-8 border-red-300 text-red-600 hover:bg-red-50"
      onClick={handleCancel}
      disabled={cancelAppointment.isPending}
    >
      {cancelAppointment.isPending ? 'Cancelando...' : 'Cancelar'}
    </Button>
  );
};

const TimeSlot = ({ 
  time, 
  isAvailable, 
  isSelected, 
  onSelect 
}: { 
  time: string, 
  isAvailable: boolean, 
  isSelected: boolean,
  onSelect: () => void 
}) => {
  return (
    <button
      onClick={onSelect}
      disabled={!isAvailable}
      className={`
        w-full rounded-md text-center py-2 px-1 text-sm transition-colors
        ${isSelected 
          ? 'bg-primary text-white' 
          : isAvailable 
            ? 'bg-white hover:bg-primary/10 border border-gray-200' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
        }
      `}
    >
      {time}
    </button>
  );
};

// Therapist card component
const TherapistCard = ({ 
  therapist, 
  selected, 
  onSelect 
}: { 
  therapist: Therapist, 
  selected: boolean, 
  onSelect: () => void 
}) => {
  return (
    <div 
      className={`
        p-4 rounded-xl border bg-white cursor-pointer transition-all
        ${selected ? 'border-primary shadow-sm' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onSelect}
    >
      <div className="flex items-center">
        {therapist.imageUrl ? (
          <img 
            src={therapist.imageUrl} 
            alt={`${therapist.firstName} ${therapist.lastName}`}
            className="w-12 h-12 rounded-full object-cover mr-3" 
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary bg-opacity-20 flex items-center justify-center mr-3">
            <span className="text-primary-dark font-semibold">
              {therapist.firstName.charAt(0)}{therapist.lastName.charAt(0)}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg">Dr. {therapist.firstName} {therapist.lastName}</h3>
          <p className="text-sm text-gray-600">{therapist.specialization || "Terapia Geral"}</p>
        </div>
        
        <div className="flex-shrink-0">
          {therapist.rating ? (
            <div className="flex items-center bg-green-50 rounded-full px-2 py-1">
              <span className="text-green-600 text-sm font-semibold">{therapist.rating.toFixed(1)}</span>
              <span className="text-yellow-500 ml-1">★</span>
            </div>
          ) : null}
        </div>
      </div>
      
      <div className="mt-3">
        <div className="flex flex-wrap gap-2 mb-3">
          {therapist.tags?.slice(0, 3).map(tag => (
            <span 
              key={tag} 
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        
        <p className="text-sm text-gray-500 line-clamp-2">
          {therapist.bio || "Profissional especializado em saúde mental, oferecendo suporte terapêutico personalizado."}
        </p>
      </div>
    </div>
  );
};

// Calendar day component
const DayBox = ({ 
  date, 
  isSelected, 
  onSelect 
}: { 
  date: Date, 
  isSelected: boolean, 
  onSelect: () => void 
}) => {
  const isToday = isSameDay(date, new Date());
  const dayName = format(date, 'EEE', { locale: pt }).slice(0, 3);
  const dayNumber = format(date, 'd');
  
  return (
    <button
      onClick={onSelect}
      className={`
        flex flex-col items-center p-2 rounded-lg transition-colors
        ${isSelected 
          ? 'bg-primary text-white' 
          : isToday 
            ? 'bg-primary/10 text-primary font-semibold' 
            : 'hover:bg-gray-100'
        }
      `}
    >
      <span className="text-xs font-medium">{dayName}</span>
      <span className={`text-lg ${isSelected ? 'font-bold' : ''}`}>{dayNumber}</span>
    </button>
  );
};

// Week selector component
const WeekSelector = ({ 
  currentDate, 
  onDateChange 
}: { 
  currentDate: Date, 
  onDateChange: (date: Date) => void 
}) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(currentDate), i));
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <button 
          onClick={() => onDateChange(addDays(currentDate, -7))}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h3 className="text-lg font-medium">
          {format(currentDate, "MMMM yyyy", { locale: pt })}
        </h3>
        
        <button 
          onClick={() => onDateChange(addDays(currentDate, 7))}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <DayBox
            key={index}
            date={day}
            isSelected={isSameDay(day, currentDate)}
            onSelect={() => onDateChange(day)}
          />
        ))}
      </div>
    </div>
  );
};

// Session card component for therapist view
const SessionCardItem = ({ 
  session 
}: { 
  session: Session
}) => {
  const sessionDate = new Date(session.scheduledFor);
  const isPast = sessionDate < new Date();
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-primary mr-2" />
            <p className="font-medium">
              {format(sessionDate, 'HH:mm')}
            </p>
          </div>
          <h3 className="text-lg font-semibold mt-1">
            Paciente #{session.userId || "Anônimo"}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {session.notes || "Sem anotações"}
          </p>
        </div>
        
        <div>
          {!isPast ? (
            <Link href={`/video-call/${session.id}`}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs px-3 h-8">
                Atender
              </Button>
            </Link>
          ) : (
            <span className="text-gray-400 text-xs py-1 px-2 bg-gray-100 rounded-full">Concluída</span>
          )}
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {format(sessionDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>
    </div>
  );
};

// Main Schedule Page
export default function SchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const therapistId = params?.therapistId ? parseInt(params.therapistId) : undefined;
  // Verifica se o usuário é terapeuta através do objeto user ou da flag de sessão
  const forcedTherapistView = typeof window !== 'undefined' ? sessionStorage.getItem('viewingAsTherapist') === 'true' : false;
  const isTherapist = user?.isTherapist || forcedTherapistView || false;
  
  // Limpa a flag após uso
  useEffect(() => {
    if (forcedTherapistView) {
      sessionStorage.removeItem('viewingAsTherapist');
    }
  }, [forcedTherapistView]);
  
  // Refs para os elementos de rolagem
  const datePickerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  
  // States
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<number | null>(therapistId || null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  
  // Fetch available therapists
  const { data: therapists, isLoading: isLoadingTherapists } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });
  
  // Fetch existing sessions (to check availability or display in therapist view)
  const { data: sessionsResponse, isLoading: isLoadingSessions } = useQuery<{data: Session[]}>({
    queryKey: ["/api/sessions"],
  });
  
  // Extrair o array de sessões da resposta
  const sessions = sessionsResponse?.data || [];
  
  // Filter sessions by selected date for therapist view
  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.scheduledFor);
    return isSameDay(sessionDate, selectedDate) && 
          (isTherapist ? session.therapistId === user?.id : true);
  }).sort((a, b) => {
    return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
  });
  
  // Filter upcoming sessions for patient view (to display in the upcoming sessions box)
  const upcomingSessions = sessions
    .filter(session => {
      const sessionDate = new Date(session.scheduledFor);
      // Excluir consultas canceladas e mostrar apenas futuras
      return (!isTherapist && 
              sessionDate >= new Date() && 
              session.status !== "Cancelada" && 
              session.status.toLowerCase() !== "canceled" &&
              !session.status.includes("cancel"));
    })
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .slice(0, 3); // Limit to 3 upcoming sessions
  
  // Filter out already booked times for patient booking view
  const bookedTimes = sessions
    .filter(session => {
      const sessionDate = new Date(session.scheduledFor);
      return isSameDay(sessionDate, selectedDate) && 
            (selectedTherapist ? session.therapistId === selectedTherapist : true);
    })
    .map(session => format(new Date(session.scheduledFor), 'HH:mm'));
  
  // Generate available time slots (9AM to 6PM, hourly)
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 9;
    return `${hour.toString().padStart(2, '0')}:00`;
  });
  
  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async (data: {
      therapistId: number;
      scheduledFor: Date;
      notes: string;
    }) => {
      const response = await apiRequest("POST", "/api/sessions", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Consulta agendada",
        description: "Sua consulta foi agendada com sucesso.",
        variant: "default",
      });
      
      // Redirecionar para a página inicial após o agendamento
      navigate("/");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível agendar a consulta. Tente novamente.",
        variant: "destructive",
      });
      console.error("Appointment booking error:", error);
    },
  });
  
  // Handle booking confirmation
  const handleConfirmBooking = () => {
    if (!selectedTherapist || !selectedTime) return;
    
    // Parse time string and combine with selected date
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    createAppointment.mutate({
      therapistId: selectedTherapist,
      scheduledFor: scheduledDate,
      notes: notes,
    });
    
    setConfirmDialogOpen(false);
  };
  
  // Get selected therapist details
  const selectedTherapistDetails = therapists?.find(t => t.id === selectedTherapist);
  
  // Rolagem automática quando um terapeuta é selecionado
  useEffect(() => {
    if (selectedTherapist && datePickerRef.current) {
      setTimeout(() => {
        datePickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [selectedTherapist]);
  
  // Rolagem automática quando um horário é selecionado
  useEffect(() => {
    if (selectedTime && summaryRef.current) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [selectedTime]);

  // Renderiza o componente principal
  return (
    <>
      <div className="p-4 max-w-md mx-auto ios-scroll-fix">
        {isTherapist ? (
          // Conteúdo para terapeutas
          <>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center mb-4">
                <Calendar className="h-5 w-5 text-primary mr-2" />
                <h2 className="text-xl font-semibold">Consultas Agendadas</h2>
              </div>
              
              <WeekSelector 
                currentDate={selectedDate} 
                onDateChange={setSelectedDate} 
              />
            </div>
            
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
                </h2>
                <span className="text-sm text-gray-500">
                  {filteredSessions?.length || 0} consultas
                </span>
              </div>
              
              {isLoadingSessions ? (
                <div className="text-center py-8">Carregando agenda...</div>
              ) : filteredSessions && filteredSessions.length > 0 ? (
                <div className="space-y-3">
                  {filteredSessions.map(session => (
                    <SessionCardItem key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma consulta agendada para esta data.
                </div>
              )}
            </div>
          </>
        ) : (
          // Conteúdo para pacientes - Redesenhado para mostrar terapeutas primeiro
          <div className="space-y-6">
            {/* Box de consultas agendadas */}
            {upcomingSessions.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-primary mr-2" />
                    <h2 className="text-xl font-semibold">Suas Consultas</h2>
                  </div>
                  <Link href="/profile">
                    <span className="text-primary text-sm hover:underline">Ver todas</span>
                  </Link>
                </div>
                
                <div className="space-y-3">
                  {upcomingSessions.map(session => {
                    const sessionDate = new Date(session.scheduledFor);
                    const isPast = sessionDate < new Date();
                    const therapistName = session.therapistName || "Terapeuta";
                    
                    return (
                      <div key={session.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-lg">
                              {therapistName}
                            </p>
                            <div className="flex items-center mt-1">
                              <Clock className="h-4 w-4 text-primary mr-1" />
                              <p className="text-sm text-gray-700">
                                {format(sessionDate, "dd 'de' MMMM 'às' HH:mm", { locale: pt })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            {!isPast ? (
                              <>
                                <Link href={`/video-call/${session.id}`}>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs px-3 h-8">
                                    Entrar
                                  </Button>
                                </Link>
                                <CancelButton sessionId={session.id} />
                              </>
                            ) : (
                              <span className="text-gray-400 text-xs py-1 px-2 bg-gray-100 rounded-full">Concluída</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Seção de Atendimento de Emergência */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm mb-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-500 rounded-full p-2 mr-3">
                  <HeartPulse className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-red-700">Atendimento de Emergência</h2>
              </div>
              <p className="text-red-700 mb-4">
                Precisa de ajuda imediata? Temos terapeutas disponíveis para atendimento de emergência.
              </p>
              <Link href="/emergency">
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  Ver Terapeutas Disponíveis Agora
                </Button>
              </Link>
            </div>
            
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <h2 className="text-xl font-semibold">Escolha um Terapeuta</h2>
              </div>
              
              {isLoadingTherapists ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Carregando terapeutas...</p>
                </div>
              ) : therapists && therapists.length > 0 ? (
                <div className="space-y-4">
                  {therapists.map(therapist => (
                    <TherapistCard
                      key={therapist.id}
                      therapist={therapist}
                      selected={selectedTherapist === therapist.id}
                      onSelect={() => {
                        setSelectedTherapist(therapist.id);
                        setSelectedTime(null); // Limpar a seleção de horário ao mudar de terapeuta
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 text-orange-500 mb-4">
                    <UserX className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Sem terapeutas disponíveis</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-4">
                    No momento não há terapeutas disponíveis para agendamento. Tente novamente mais tarde ou entre em contato com nosso suporte.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/therapists"] })}
                    className="mt-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar lista
                  </Button>
                </div>
              )}
            </div>
            
            {selectedTherapist && (
              <div ref={datePickerRef} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <Calendar className="h-5 w-5 text-primary mr-2" />
                  <h2 className="text-xl font-semibold">Escolha uma Data</h2>
                </div>
                
                <WeekSelector 
                  currentDate={selectedDate} 
                  onDateChange={(date) => {
                    setSelectedDate(date);
                    setSelectedTime(null); // Limpar a seleção de horário ao mudar de data
                  }}
                />
                
                <div className="mt-6">
                  <div className="flex items-center mb-4">
                    <Clock className="h-5 w-5 text-primary mr-2" />
                    <h2 className="text-xl font-semibold">Escolha um Horário</h2>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(time => (
                      <TimeSlot
                        key={time}
                        time={time}
                        isAvailable={!bookedTimes.includes(time)}
                        isSelected={selectedTime === time}
                        onSelect={() => setSelectedTime(time)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {selectedTherapist && selectedTime && selectedTherapistDetails && (
              <div ref={summaryRef} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold mb-4">Resumo da Consulta</h2>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Terapeuta</p>
                  <p className="font-medium">
                    Dr. {selectedTherapistDetails.firstName} {selectedTherapistDetails.lastName}
                  </p>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Data e Horário</p>
                  <p className="font-medium">
                    {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })} às {selectedTime}
                  </p>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => setConfirmDialogOpen(true)}
                >
                  Confirmar Agendamento
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Diálogo de confirmação */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Agendamento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Terapeuta</p>
              <p className="font-medium">
                Dr. {selectedTherapistDetails?.firstName} {selectedTherapistDetails?.lastName}
              </p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Data e Horário</p>
              <p className="font-medium">
                {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })} às{" "}
                {selectedTime}
              </p>
            </div>
            
            <div className="mb-4">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Informe detalhes importantes para o terapeuta"
                className="mt-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmBooking}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}