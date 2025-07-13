import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VoiceRecorder } from "@/components/voice-checkin/voice-recorder";
import { VoiceCheckinHistory } from "@/components/voice-checkin/voice-checkin-history";
import { MicOff, InfoIcon } from "lucide-react";

export default function VoiceCheckinPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Consulta para obter os check-ins de voz do usuário
  const { data: voiceCheckins = [], isLoading } = useQuery({
    queryKey: ['/api/voice-checkins'],
    enabled: !!user,
  });

  // Mutação para criar um novo check-in de voz
  const createVoiceCheckinMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/voice-checkins", undefined, {
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar check-in de voz");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/voice-checkins'] });
      
      toast({
        title: "Check-in salvo com sucesso",
        description: "Seu check-in de voz foi processado e analisado",
      });
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast({
        title: "Erro ao processar check-in",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveRecording = async (audioBlob: Blob, duration: number) => {
    try {
      setIsProcessing(true);
      
      // Criar FormData para envio do arquivo
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      formData.append("duration", String(duration));
      formData.append("userId", String(user?.id));
      
      // Enviar para o servidor
      await createVoiceCheckinMutation.mutateAsync(formData);
      
    } catch (error) {
      console.error("Erro ao salvar gravação:", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex flex-col md:flex-row items-start gap-8">
        <div className="w-full md:w-1/2 space-y-4">
          <h1 className="text-2xl font-bold mb-4">Check-in Emocional por Voz</h1>
          
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Como funciona?</AlertTitle>
            <AlertDescription>
              Grave uma mensagem de voz de 30 segundos a 3 minutos contando como está se sentindo hoje. 
              Nossa IA analisará tanto o conteúdo quanto o tom da sua voz para identificar seu estado emocional.
            </AlertDescription>
          </Alert>
          
          <div className="mt-6">
            {navigator.mediaDevices ? (
              <VoiceRecorder 
                onSave={handleSaveRecording} 
                isProcessing={isProcessing}
              />
            ) : (
              <div className="text-center py-12 border rounded-lg bg-muted/50">
                <MicOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Acesso ao microfone não disponível</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4 max-w-md mx-auto">
                  Seu navegador não permite acesso ao microfone ou você negou a permissão. 
                  Por favor, habilite o acesso ao microfone para usar esta funcionalidade.
                </p>
                <Button>
                  Verificar permissões
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full md:w-1/2 mt-8 md:mt-0">
          <VoiceCheckinHistory 
            checkins={voiceCheckins} 
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}