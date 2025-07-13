import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Componentes UI
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AnimatePresence, m } from "framer-motion";

// Ícones
import { 
  Mic, 
  MicOff, 
  Trash, 
  Save, 
  Text, 
  ArrowRight, 
  Clock, 
  Loader2, 
  Info, 
  BookText 
} from "lucide-react";

/**
 * Página de Diário Simplificada
 * 
 * Características:
 * - Foco exclusivo na gravação de áudio e entrada de texto
 * - Suporte otimizado para dispositivos iOS
 * - Transcrição de áudio via API
 * - Salva entradas para posterior processamento
 */
export default function JournalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { t } = useTranslation();

  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  
  // Estados para entrada de texto
  const [textContent, setTextContent] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  
  // Estados para mutações
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);
  
  // Refs para gravação
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isIOSRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Detectar iOS
  useEffect(() => {
    // Verificar se é dispositivo iOS
    const userAgent = navigator.userAgent || navigator.vendor;
    isIOSRef.current = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    
    if (isIOSRef.current) {
      console.log("Dispositivo iOS detectado - usando configurações otimizadas");
      document.documentElement.classList.add("ios-device");
    }
  }, []);

  // Limpar recursos quando o componente é desmontado
  useEffect(() => {
    return () => {
      // Limpar timeout
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Limpar URL de objeto
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      // Parar gravação se estiver ativa
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      
      // Limpar AudioContext
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  // Iniciar gravação de áudio
  const startRecording = async () => {
    try {
      // Verificar suporte antes de tentar acessar o microfone
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("API MediaDevices não suportada neste navegador");
      }
      
      // Solicitar permissão para acessar o microfone com configurações adaptadas
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      console.log("Solicitando acesso ao microfone...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Acesso ao microfone concedido!");
      
      // Limpar chunks anteriores
      chunksRef.current = [];
      
      // Determinar o tipo MIME com fallbacks para iOS
      let mimeType = 'audio/webm';
      
      if (isIOSRef.current) {
        console.log("Usando configurações especiais para iOS");
        // iOS usa diferentes formatos, tentamos em ordem de preferência
        const mimeTypes = ['audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/webm'];
        
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            console.log(`Formato suportado encontrado: ${mimeType}`);
            break;
          }
        }
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      }
      
      console.log(`Usando formato de gravação: ${mimeType}`);
      
      // Criar nova instância do MediaRecorder com o tipo MIME suportado
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      // Registrar evento de dados disponíveis
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // Registrar evento de parada da gravação
      mediaRecorder.onstop = () => {
        // Criar blob a partir dos chunks gravados usando o mesmo tipo MIME que foi usado para gravar
        const audioType = mimeType;
        
        console.log(`Criando blob de áudio com tipo: ${audioType}`);
        const blob = new Blob(chunksRef.current, { type: audioType });
        console.log(`Blob de áudio criado, tamanho: ${(blob.size / 1024).toFixed(2)} KB`);
        
        setAudioBlob(blob);
        
        // Criar URL para o blob para reprodução
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Parar o timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Parar todas as faixas do stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Iniciar gravação
      mediaRecorder.start();
      setIsRecording(true);
      
      // Iniciar timer para mostrar tempo de gravação
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast({
        title: t("journal.errors.microphoneAccessFailedTitle"),
        description: t("journal.errors.microphoneAccessFailedDesc"),
        variant: "destructive",
      });
    }
  };

  // Parar gravação de áudio
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Cancelar entrada de diário
  const cancelEntry = () => {
    // Limpar dados de áudio
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setIsTranscribing(false);
    setTranscriptionProgress(0);
    setTranscriptionText("");
    
    // Limpar dados de texto
    setTextContent("");
    
    // Limpar estado de gravação
    setIsRecording(false);
    
    // Limpar timeout se estiver ativo
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Alternar entre entrada de áudio e texto
  const toggleInputMethod = () => {
    if (isRecording) {
      stopRecording();
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setAudioBlob(null);
    }
    
    setShowTextInput(!showTextInput);
  };

  // Formatar tempo de gravação no formato MM:SS
  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Transcrever áudio
  const transcribeAudio = async () => {
    if (!audioBlob) {
      toast({
        title: t("journal.errors.noAudioRecorded"),
        description: t("journal.errors.tryAgain"),
        variant: "destructive",
      });
      return;
    }
    
    setIsTranscribing(true);
    setTranscriptionProgress(10); // Começar com 10% para mostrar que o processo iniciou
    
    try {
      // Criar form data para upload
      const formData = new FormData();
      
      // Obter extensão e tipo de arquivo com base no tipo MIME
      let fileExtension = 'webm';
      
      // Determinar a extensão correta com base no tipo MIME do Blob
      if (audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')) {
        fileExtension = 'm4a';
      } else if (audioBlob.type.includes('aac')) {
        fileExtension = 'aac';
      } else if (audioBlob.type.includes('mpeg') || audioBlob.type.includes('mp3')) {
        fileExtension = 'mp3';
      }
      
      console.log(`Enviando arquivo de áudio com tipo: ${audioBlob.type}, usando extensão: ${fileExtension}`);
      
      // Adicionar o blob com nome e tipo apropriados
      formData.append('audio', audioBlob, `recording.${fileExtension}`);
      
      // Enviar o áudio para transcrição
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao transcrever áudio: ${response.status}`);
      }
      
      setTranscriptionProgress(50);
      
      // Obter resultado da transcrição
      const result = await response.json();
      
      setTranscriptionProgress(100);
      setTranscriptionText(result.transcription);
      
    } catch (error) {
      console.error("Erro ao transcrever áudio:", error);
      toast({
        title: t("journal.errors.transcriptionFailedTitle"),
        description: error instanceof Error ? error.message : t("journal.errors.transcriptionFailedDesc"),
        variant: "destructive",
      });
    } finally {
      // Finalizar pós conclusão
      setTimeout(() => {
        setIsTranscribing(false);
      }, 500);
    }
  };

  // Salvar entrada de áudio transcrita
  const saveTranscribedEntry = async () => {
    if (!transcriptionText.trim()) {
      toast({
        title: t("journal.errors.emptyTranscriptionTitle"),
        description: t("journal.errors.emptyTranscriptionDesc"),
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Preparar dados da entrada
      const entryData = {
        content: transcriptionText,
        audioUrl: audioUrl, // Opcional, se quiser manter o áudio original
        hasAudio: true,
        needsProcessing: true // Flag para indicar que a entrada precisa de processamento posterior
      };
      
      // Salvar entrada
      const response = await apiRequest('POST', '/api/journal-entries', entryData);
      
      if (!response.ok) {
        throw new Error(t("journal.errors.saveFailed"));
      }
      
      // Obter dados da entrada salva
      const savedEntry = await response.json();
      
      // Limpar estados
      cancelEntry();
      
      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal-last-entry'] });
      
      // Mostrar confirmação
      toast({
        title: t("journal.success.title"),
        description: t("journal.success.entrySaved"),
      });
      
      // Redirecionar para o histórico após um breve delay
      setTimeout(() => {
        setLocation("/journal-history");
      }, 1000);
      
    } catch (error) {
      console.error("Erro ao salvar entrada transcrita:", error);
      toast({
        title: t("journal.errors.saveFailedTitle"),
        description: error instanceof Error ? error.message : t("journal.errors.saveFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar entrada de texto
  const saveTextEntry = async () => {
    if (!textContent.trim()) {
      toast({
        title: t("journal.errors.emptyContentTitle"),
        description: t("journal.errors.emptyContentDesc"),
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingText(true);
    
    try {
      // Preparar dados da entrada
      const entryData = {
        content: textContent,
        hasAudio: false,
        needsProcessing: true // Flag para indicar que a entrada precisa de processamento posterior
      };
      
      // Salvar entrada
      const response = await apiRequest('POST', '/api/journal-entries', entryData);
      
      if (!response.ok) {
        throw new Error(t("journal.errors.saveFailed"));
      }
      
      // Obter dados da entrada salva
      const savedEntry = await response.json();
      
      // Limpar estados
      cancelEntry();
      
      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal-last-entry'] });
      
      // Mostrar confirmação
      toast({
        title: t("journal.success.title"),
        description: t("journal.success.entrySaved"),
      });
      
      // Redirecionar para o histórico após um breve delay
      setTimeout(() => {
        setLocation("/journal-history");
      }, 1000);
      
    } catch (error) {
      console.error("Erro ao salvar entrada de texto:", error);
      toast({
        title: t("journal.errors.saveFailedTitle"),
        description: error instanceof Error ? error.message : t("journal.errors.saveFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSavingText(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      <Card className={isIOSRef.current ? "ios-card-style" : ""}>
        <CardHeader>
          <CardTitle>{t("journal.title")}</CardTitle>
          <CardDescription>
            {t("journal.description")}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col space-y-6">
            {!showTextInput && (
              <AnimatePresence mode="wait">
                <m.div
                  key="audio-input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {!audioUrl && !isTranscribing && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div 
                        className={`w-24 h-24 rounded-full flex items-center justify-center 
                          ${isRecording 
                            ? 'bg-red-500 animate-pulse' 
                            : 'bg-primary hover:bg-primary/90'} 
                          cursor-pointer transition-colors duration-300 mb-4`}
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        {isRecording ? (
                          <MicOff className="h-10 w-10 text-white" />
                        ) : (
                          <Mic className="h-10 w-10 text-white" />
                        )}
                      </div>
                      
                      {isRecording ? (
                        <div className="text-center">
                          <p className="font-mono text-2xl">
                            {formatRecordingTime(recordingTime)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("journal.recording")}
                          </p>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground">
                          {t("journal.tapToRecord")}
                        </p>
                      )}
                      
                      {isIOSRef.current && !isRecording && (
                        <div className="mt-4 text-xs text-amber-600 max-w-xs text-center">
                          <Info className="h-3 w-3 inline-block mr-1" />
                          {t("journal.iosRecordingTip")}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {audioUrl && !isTranscribing && (
                    <div className="flex flex-col items-center justify-center py-4">
                      <audio 
                        src={audioUrl} 
                        controls 
                        className="w-full max-w-md mb-4 rounded-lg" 
                      />
                      
                      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                        <Button
                          variant="outline"
                          onClick={cancelEntry}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          {t("journal.actions.discard")}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={transcribeAudio}
                          className="col-span-2"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          {t("journal.actions.transcribe")}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {isTranscribing && (
                    <div className="rounded-lg bg-secondary p-6 space-y-4">
                      <h3 className="font-medium text-center flex items-center justify-center">
                        <Clock className="h-5 w-5 mr-2 text-primary" />
                        {t("journal.transcribing")}
                      </h3>
                      
                      <Progress value={transcriptionProgress} className="w-full" />
                      
                      <p className="text-sm text-center text-muted-foreground">
                        {t("journal.pleaseWait")}
                      </p>
                    </div>
                  )}
                  
                  {transcriptionText && !isTranscribing && (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-card">
                        <h4 className="font-medium mb-2">{t("journal.transcriptionResult")}</h4>
                        <p className="text-sm">{transcriptionText}</p>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={cancelEntry}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          {t("journal.actions.discard")}
                        </Button>
                        
                        <Button
                          onClick={saveTranscribedEntry}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t("journal.actions.saving")}
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {t("journal.actions.save")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </m.div>
              </AnimatePresence>
            )}
            
            {showTextInput && (
              <AnimatePresence mode="wait">
                <m.div
                  key="text-input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder={t("journal.textPlaceholder")}
                    className="min-h-[200px] resize-y"
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={cancelEntry}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      {t("journal.actions.discard")}
                    </Button>
                    
                    <Button
                      onClick={saveTextEntry}
                      disabled={!textContent.trim() || isSavingText}
                    >
                      {isSavingText ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("journal.actions.saving")}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {t("journal.actions.save")}
                        </>
                      )}
                    </Button>
                  </div>
                </m.div>
              </AnimatePresence>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={toggleInputMethod}
                  className="text-muted-foreground"
                >
                  {showTextInput ? (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      {t("journal.switchToAudio")}
                    </>
                  ) : (
                    <>
                      <Text className="h-4 w-4 mr-2" />
                      {t("journal.switchToText")}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showTextInput 
                  ? t("journal.tooltips.switchToAudio")
                  : t("journal.tooltips.switchToText")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/journal-history')}
                >
                  <BookText className="h-4 w-4 mr-2" />
                  {t("journal.viewHistory")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("journal.tooltips.viewHistory")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
    </div>
  );
}