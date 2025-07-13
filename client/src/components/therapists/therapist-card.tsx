import { Therapist } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Loader2, Info } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface TherapistCardProps {
  therapist: Therapist;
}

export function TherapistCard({ therapist }: TherapistCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Calculate therapist rating display (e.g., 4.9)
  const displayRating = therapist.rating ? (therapist.rating / 10).toFixed(1) : "N/A";
  
  // Check if therapist is available today
  const isAvailableToday = () => {
    // Get today in Portuguese
    const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const today = days[new Date().getDay()];
    return (therapist.availability as Record<string, boolean>)[today];
  };
  
  // Book session mutation
  const bookSessionMutation = useMutation({
    mutationFn: async ({ therapistId, date }: { therapistId: number, date: Date }) => {
      const res = await apiRequest("POST", "/api/sessions", {
        therapistId,
        date: date.toISOString(),
        status: "scheduled"
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setIsModalOpen(false);
      toast({
        title: "Consulta agendada",
        description: `Sua consulta com Dr. ${therapist.firstName} ${therapist.lastName} foi agendada com sucesso.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no agendamento",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Generate available dates for the next 7 days
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    const portugueseDays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayIndex = date.getDay(); // 0 = domingo, 1 = segunda, etc.
      const dayOfWeek = portugueseDays[dayIndex];
      
      // Check if therapist is available on this day of the week
      if ((therapist.availability as Record<string, boolean>)[dayOfWeek]) {
        dates.push(date);
      }
    }
    
    return dates;
  };
  
  // Available time slots (9 AM to 5 PM, hourly)
  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", 
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
  ];
  
  // Handle booking submission
  const handleBookSession = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Selecione uma data e horário",
        variant: "destructive"
      });
      return;
    }
    
    // Create Date object with selected date and time
    const [hours, minutes, period] = selectedTime.match(/(\d+):(\d+)\s(AM|PM)/)?.slice(1) || [];
    
    if (!hours || !minutes || !period) {
      toast({
        title: "Formato de horário inválido",
        variant: "destructive"
      });
      return;
    }
    
    const appointmentDate = new Date(selectedDate);
    let hour = parseInt(hours);
    
    // Convert to 24-hour format
    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }
    
    appointmentDate.setHours(hour, parseInt(minutes), 0, 0);
    
    bookSessionMutation.mutate({
      therapistId: therapist.id,
      date: appointmentDate
    });
  };
  
  return (
    <>
      <Card className="bg-light shadow-sm mb-4">
        <CardContent className="p-4">
          <div className="flex">
            <div className="w-16 h-16 rounded-full bg-accent mr-4 overflow-hidden">
              {therapist.imageUrl ? (
                <div className="w-full h-full" style={{
                  backgroundImage: `url(${therapist.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary">
                  <span className="text-primary-dark font-medium">{`${therapist.firstName[0]}${therapist.lastName[0]}`}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-secondary">Dr. {therapist.firstName} {therapist.lastName}</h3>
                  <p className="text-sm text-primary-dark">{therapist.specialization}</p>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium text-secondary ml-1">{displayRating}</span>
                </div>
              </div>
              <div className="flex flex-wrap mt-2 mb-3">
                {therapist.tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="text-xs bg-primary text-primary-dark rounded-full px-2 py-0.5 mr-1 mb-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${isAvailableToday() ? 'bg-green-500' : 'bg-yellow-500'} mr-1`}></div>
                  <span className={`text-xs ${isAvailableToday() ? 'text-green-600' : 'text-yellow-600'}`}>
                    {isAvailableToday() ? 'Disponível hoje' : 'Próxima disponibilidade: amanhã'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="px-3 py-1"
                    asChild
                  >
                    <Link href={`/therapist/${therapist.id}`}>
                      <Info className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button 
                    size="sm"
                    className="px-3 py-1 bg-primary-dark text-white hover:bg-secondary"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Agendar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-light max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar consulta</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-accent mr-3 overflow-hidden">
                {therapist.imageUrl ? (
                  <div className="w-full h-full" style={{
                    backgroundImage: `url(${therapist.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary">
                    <span className="text-primary-dark font-medium">{`${therapist.firstName[0]}${therapist.lastName[0]}`}</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-secondary">Dr. {therapist.firstName} {therapist.lastName}</h3>
                <p className="text-sm text-primary-dark">{therapist.specialization}</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-secondary mb-2">Selecione uma data</h4>
              <div className="flex flex-wrap gap-2">
                {getAvailableDates().map((date, index) => (
                  <button
                    key={index}
                    className={`px-3 py-2 rounded-md text-sm ${
                      selectedDate && date.toDateString() === selectedDate.toDateString()
                        ? 'bg-primary-dark text-white'
                        : 'bg-primary text-primary-dark'
                    }`}
                    onClick={() => setSelectedDate(date)}
                  >
                    {format(date, "E, MMM d")}
                  </button>
                ))}
              </div>
            </div>
            
            {selectedDate && (
              <div>
                <h4 className="text-sm font-medium text-secondary mb-2">Selecione um horário</h4>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time, index) => (
                    <button
                      key={index}
                      className={`px-3 py-2 rounded-md text-sm ${
                        selectedTime === time
                          ? 'bg-primary-dark text-white'
                          : 'bg-primary text-primary-dark'
                      }`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-4">
              <Button 
                className="w-full bg-primary-dark hover:bg-secondary"
                onClick={handleBookSession}
                disabled={!selectedDate || !selectedTime || bookSessionMutation.isPending}
              >
                {bookSessionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  "Confirmar Consulta"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
