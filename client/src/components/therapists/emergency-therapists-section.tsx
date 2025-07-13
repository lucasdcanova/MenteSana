import { useEmergencyTherapists } from "@/hooks/use-emergency-therapists";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StarIcon, Phone, MessageSquare, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export function EmergencyTherapistsSection() {
  const { emergencyTherapists = [], isLoading, isError, refetch } = useEmergencyTherapists();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [countdown, setCountdown] = useState(30);
  
  useEffect(() => {
    // Reset the countdown to 30 when we get new data
    setLastUpdated(new Date());
    setCountdown(30);
  }, [emergencyTherapists]);
  
  useEffect(() => {
    // Create a countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Atualizado",
        description: "Lista de terapeutas disponíveis atualizada",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível obter a lista mais recente",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleContactClick = (therapistId: number, method: 'video' | 'chat') => {
    if (method === 'video') {
      navigate(`/video-call?therapistId=${therapistId}&emergency=true`);
    } else {
      toast({
        title: "Chat iniciado",
        description: "Você será conectado com o terapeuta em instantes.",
      });
      navigate(`/chat?therapistId=${therapistId}&emergency=true`);
    }
  };

  // Renderização para estado de carregamento
  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 text-center md:text-left">
          <h2 className="text-xl font-semibold mb-2 md:mb-0">Terapeutas Disponíveis Agora</h2>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-xs text-gray-400">Carregando...</span>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((_, i) => (
            <Card key={i} className="overflow-hidden rounded-xl shadow-sm">
              <CardContent className="p-0">
                <div className="p-4 flex items-start gap-4 animate-pulse">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Skeleton className="h-4 w-24 rounded-full" />
                      <Skeleton className="h-4 w-24 rounded-full" />
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Skeleton className="h-8 w-28 rounded-full" />
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  // Renderização para estado de erro
  if (isError) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-3">Não foi possível carregar os terapeutas</h2>
        <p className="text-gray-600 mb-5">Ocorreu um erro ao buscar os terapeutas disponíveis.</p>
        <Button 
          onClick={handleManualRefresh} 
          className="bg-primary hover:bg-primary/90 active:scale-95 transition-transform rounded-full px-6 shadow-sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
        </Button>
      </div>
    );
  }

  // Renderização para casos de sucesso
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 text-center md:text-left">
        <h2 className="text-xl font-semibold mb-2 md:mb-0">Terapeutas Disponíveis Agora</h2>
        <div className="flex items-center justify-center md:justify-end gap-2 text-sm text-gray-500">
          <button 
            onClick={handleManualRefresh}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-all active:scale-95 active:bg-gray-200 hardware-accelerated ios-touch-fix"
            disabled={isRefreshing}
            style={{
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: isRefreshing ? '0 1px 2px rgba(0,0,0,0.05)' : '0 2px 3px rgba(0,0,0,0.05)',
              transform: isRefreshing ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            <RefreshCw className={`h-4 w-4 transition-all ${isRefreshing ? 'animate-spin text-primary' : 'text-gray-500'}`} />
            <span className="text-xs md:text-sm font-medium">
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </span>
          </button>
          <div className="text-xs bg-gray-100 text-gray-500 flex items-center px-3 py-1.5 rounded-full shadow-sm">
            <span className="hidden md:inline">Atualização em </span>
            <span className={`md:ml-1 font-medium ${countdown <= 5 ? 'text-primary' : ''}`}>{countdown}s</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {emergencyTherapists.length === 0 ? (
          // Caso não haja terapeutas disponíveis
          <div className="text-center py-10 px-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-600 mb-3">Nenhum terapeuta disponível no momento.</p>
            <p className="text-sm text-gray-500">Tente novamente em alguns instantes.</p>
          </div>
        ) : (
          // Mapeamento dos terapeutas disponíveis
          emergencyTherapists.map((therapist, index) => (
            <Card 
              key={therapist.id} 
              style={{ 
                animationDelay: `${index * 150}ms`,
                opacity: 0,
                animation: `fadeInUp 0.5s ease-out ${index * 150}ms forwards`
              }}
              className="overflow-hidden transition-all duration-200 hover:shadow-md active:scale-[0.99] active:bg-gray-50 rounded-xl shadow-sm"
            >
              <CardContent className="p-0">
                <div className="p-4 flex items-start gap-4">
                  {/* Avatar do terapeuta */}
                  <div className="relative">
                    {therapist.imageUrl ? (
                      <img 
                        src={therapist.imageUrl} 
                        alt={`${therapist.firstName} ${therapist.lastName}`} 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {therapist.firstName.charAt(0)}
                          {therapist.lastName.charAt(0)}
                        </span>
                      </div>
                    )}
                    {/* Indicador de online */}
                    <div className="absolute bottom-0 right-0 bg-green-500 rounded-full w-4 h-4 border-2 border-white" />
                  </div>
                  
                  {/* Informações do terapeuta */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      Dr(a). {therapist.firstName} {therapist.lastName}
                    </h3>
                    
                    {/* Avaliações */}
                    <div className="flex items-center gap-1 text-amber-500 mb-1">
                      <StarIcon className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">
                        {therapist.rating || 4.8} ({therapist.reviewCount || 24} avaliações)
                      </span>
                    </div>
                    
                    {/* Especialização */}
                    <p className="text-sm text-gray-600 mb-2">
                      {therapist.specialization || "Psicólogo(a) Clínico(a)"}
                    </p>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Disponível Agora
                      </Badge>
                      {therapist.emergencyReady && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Atendimento de Emergência
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Clock className="w-3 h-3 mr-1" /> 
                        Atendimento em ~5 min
                      </Badge>
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 transition-all active:scale-95 active:bg-green-800 shadow-sm rounded-full hardware-accelerated ios-touch-fix"
                        onClick={() => handleContactClick(therapist.id, 'video')}
                        style={{
                          boxShadow: '0 2px 8px rgba(0, 172, 138, 0.25)',
                        }}
                      >
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" /> 
                          <span>Videochamada</span>
                        </div>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="transition-all active:scale-95 active:bg-gray-100 rounded-full hardware-accelerated ios-touch-fix"
                        onClick={() => handleContactClick(therapist.id, 'chat')}
                      >
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 mr-1" /> 
                          <span>Chat</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}