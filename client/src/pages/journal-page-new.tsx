import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence, m } from "framer-motion";

// Ícones
import { 
  Mic, 
  MicOff, 
  Trash, 
  Save, 
  Text, 
  MessageSquare, 
  ArrowRight, 
  Clock, 
  Loader2, 
  Info, 
  BookText,
  CheckCircle 
} from "lucide-react";

/**
 * Página de Diário Redesenhada
 * 
 * Características:
 * - Interface com duas abas: Áudio e Texto
 * - Transcrição de áudio feita diretamente na página
 * - Suporte otimizado para dispositivos iOS
 * - Envia apenas texto para processamento posterior
 */
export default function JournalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { t } = useTranslation();

  // Aba atual (áudio ou texto)
  const [activeTab, setActiveTab] = useState<string>("audio");

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
  
  // Estados para mutações
  const [isSaving, setIsSaving] = useState(false);
  
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
      mediaRecorder.onstop = async () => {
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
        
        // Iniciar transcrição automaticamente
        // Pequeno delay para garantir que o estado seja atualizado
        setTimeout(() => {
          toast({
            title: t("journal.autoTranscribing"),
            description: t("journal.pleaseWait"),
          });
          transcribeAudio(blob);
        }, 500);
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
    
    // Mostrar toast
    toast({
      title: t("journal.actions.entryDiscarded"),
      description: t("journal.actions.startOver"),
    });
  };

  // Formatar tempo de gravação no formato MM:SS
  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Transcrever áudio
  const transcribeAudio = async (providedBlob?: Blob) => {
    // Usar o blob fornecido ou o blob no estado
    const blobToUse = providedBlob || audioBlob;
    
    if (!blobToUse) {
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
      if (blobToUse.type.includes('mp4') || blobToUse.type.includes('m4a')) {
        fileExtension = 'm4a';
      } else if (blobToUse.type.includes('aac')) {
        fileExtension = 'aac';
      } else if (blobToUse.type.includes('mpeg') || blobToUse.type.includes('mp3')) {
        fileExtension = 'mp3';
      }
      
      console.log(`Enviando arquivo de áudio para transcrição: tipo=${blobToUse.type}, tamanho=${Math.round(blobToUse.size/1024)}KB, extensão=${fileExtension}`);
      
      // Adicionar o blob com nome e tipo apropriados
      formData.append('audio', blobToUse, `recording.${fileExtension}`);
      
      // Adicionar metadados que ajudam no debug
      formData.append('source', 'journal-page-new');
      formData.append('extension', fileExtension);
      formData.append('mimeType', blobToUse.type);
      formData.append('timestamp', Date.now().toString());
      
      // Utilizar fetch diretamente para ter controle total sobre a requisição
      const token = localStorage.getItem('authToken');
      
      setTranscriptionProgress(25);
      
      // Fazer três tentativas com timeout entre elas
      let result = null;
      let attempt = 1;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempt <= maxAttempts && !result) {
        try {
          setTranscriptionProgress(25 + (attempt - 1) * 15);
          console.log(`Tentativa ${attempt}/${maxAttempts}`);
          
          // Configurar timeout para a requisição
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos
          
          // Usar a nova rota limpa que sempre retorna JSON e trata corretamente HTML
          const fetchResponse = await fetch('/api/clean-transcribe', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData,
            credentials: 'include',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          console.log(`Resposta da tentativa ${attempt}: status ${fetchResponse.status}`);
          
          if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            throw new Error(`Erro na resposta (${fetchResponse.status}): ${errorText}`);
          }
          
          // Receber resposta como texto primeiro
          const responseText = await fetchResponse.text();
          console.log(`Resposta de transcrição recebida (${responseText.length} bytes)`);
          
          // Tentar parsear como JSON
          try {
            const jsonResult = JSON.parse(responseText);
            console.log("Transcrição JSON:", jsonResult);
            
            // Verificar se temos uma transcrição válida
            // Na nova API limpa, o texto está em jsonResult.text
            if (jsonResult.text) {
              // Nova API limpa que retorna { success: true, text: "..." }
              result = { transcription: jsonResult.text };
              setTranscriptionProgress(90);
              break; // Sucesso, sair do loop
            } else if (jsonResult.transcription) {
              // API legada que retorna { transcription: "..." }
              result = jsonResult;
              setTranscriptionProgress(90);
              break; // Sucesso, sair do loop
            } else {
              throw new Error("Transcrição retornada vazia");
            }
          } catch (parseError) {
            console.warn("Resposta não é um JSON válido, usando como texto puro:", parseError);
            
            // Verificar se o texto recebido tem conteúdo
            if (responseText && responseText.trim().length > 0) {
              // Se não for um JSON válido mas temos texto, usamos o texto como transcrição
              result = { transcription: responseText.trim() };
              setTranscriptionProgress(90);
              break; // Sucesso, sair do loop
            } else {
              throw new Error("Texto de transcrição vazio");
            }
          }
        } catch (error) {
          console.error(`Erro na tentativa ${attempt}:`, error);
          lastError = error;
          
          // Se não for a última tentativa, tentar novamente após delay
          if (attempt < maxAttempts) {
            const delayMs = attempt * 2000; // Backoff exponencial
            console.log(`Aguardando ${delayMs}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
        
        attempt++;
      }
      
      // Verificar resultado final após todas as tentativas
      if (!result) {
        throw lastError || new Error("Falha na transcrição após todas as tentativas");
      }
      
      // Resultado obtido com sucesso
      setTranscriptionProgress(100);
      setTranscriptionText(result.transcription);
      
      // Mostrar confirmação
      toast({
        title: t("journal.success.transcriptionComplete"),
        description: t("journal.savingAndRedirecting"),
      });
      
      // Iniciar salvamento automático da entrada
      setTimeout(() => {
        // Chamar a função para salvar diretamente
        saveEntry(result.transcription);
      }, 500);
      
      return true;
    } catch (error) {
      console.error("Erro final na transcrição:", error);
      toast({
        title: t("journal.errors.transcriptionFailedTitle"),
        description: error instanceof Error ? error.message : t("journal.errors.transcriptionFailedDesc"),
        variant: "destructive",
      });
      return false;
    } finally {
      // Finalizar após conclusão
      setTimeout(() => {
        setIsTranscribing(false);
      }, 500);
    }
  };

  // Salvar entrada e enviar diretamente para processamento completo
  const saveEntry = async (directContent?: string) => {
    // Determinar o conteúdo baseado no parâmetro direto ou na aba ativa
    const content = directContent || (activeTab === "audio" ? transcriptionText : textContent);
    
    if (!content.trim()) {
      toast({
        title: t("journal.errors.emptyContentTitle"),
        description: t("journal.errors.emptyContentDesc"),
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    console.log("Iniciando salvamento de entrada de diário...");
    
    try {
      // Preparar dados da entrada
      const entryData = {
        content,
        audioUrl: activeTab === "audio" ? audioUrl : null,
        hasAudio: activeTab === "audio",
        needsProcessing: true, // Flag para indicar que a entrada precisa de processamento posterior
        mood: "neutro", // Valor padrão que será substituído pela análise
        userId: user?.id || 1
      };
      
      console.log("Dados da entrada preparados:", entryData);
      
      // Importar função para obter o token de autenticação
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn("Token de autenticação não encontrado!");
      } else {
        console.log("Token de autenticação disponível:", token.substring(0, 10) + "...");
      }
      
      // Salvar entrada usando fetch diretamente para ter mais controle
      const saveResponse = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(entryData),
        credentials: 'include'
      });
      
      console.log("Resposta do salvamento:", saveResponse.status);
      
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error("Erro na resposta:", saveResponse.status, errorText);
        throw new Error(`${t("journal.errors.saveFailed")} (${saveResponse.status})`);
      }
      
      // Obter dados da entrada salva
      const savedEntryText = await saveResponse.text();
      let savedEntry;
      
      try {
        savedEntry = JSON.parse(savedEntryText);
        console.log("Entrada salva com sucesso:", savedEntry);
      } catch (parseError) {
        console.error("Erro ao parsear resposta:", parseError);
        console.log("Texto da resposta:", savedEntryText);
        
        // Mesmo com erro, consideramos que o salvamento foi bem-sucedido
        // pois o status da resposta é 2xx
      }
      
      // Iniciar processamento imediato da entrada com análise de IA
      try {
        if (savedEntry && savedEntry.id) {
          console.log("Iniciando processamento para entrada ID:", savedEntry.id);
          
          const processResponse = await fetch(`/api/journal/${savedEntry.id}/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
              sendToOpenAI: true, // Solicita análise OpenAI completa
              generateTitle: true, // Gera um título para a entrada
              categorize: true,    // Categoriza a entrada
              analyzeMood: true    // Analisa o humor
            }),
            credentials: 'include'
          });
          
          if (processResponse.ok) {
            console.log("Processamento da entrada iniciado com sucesso");
          } else {
            const processErrorText = await processResponse.text();
            console.warn("Resposta de processamento não-OK:", processResponse.status, processErrorText);
          }
        } else {
          console.warn("ID da entrada não disponível para processamento");
        }
      } catch (processError) {
        console.error("Erro ao iniciar processamento:", processError);
        // Não interrompe o fluxo se o processamento falhar
      }
      
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
        navigate("/journal-history");
      }, 800);
      
    } catch (error) {
      console.error("Erro ao salvar entrada:", error);
      toast({
        title: t("journal.errors.saveFailedTitle"),
        description: error instanceof Error ? error.message : t("journal.errors.saveFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("journal.title")}</h1>
        <Link href="/journal-history">
          <Button
            variant="outline"
            size="sm"
            className="text-sm"
          >
            <BookText className="h-4 w-4 mr-2" />
            {t("journal.viewHistory")}
          </Button>
        </Link>
      </div>
      
      <Card className={isIOSRef.current ? "ios-card-style" : "shadow-lg"}>
        <CardHeader className="pb-0">
          <CardDescription>
            {t("journal.description")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Tabs 
            defaultValue="audio" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                {t("journal.tabs.audio")}
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Text className="h-4 w-4" />
                {t("journal.tabs.text")}
              </TabsTrigger>
            </TabsList>
            
            {/* Aba de Áudio */}
            <TabsContent value="audio" className="space-y-6">
              {!audioUrl && !isTranscribing && (
                <div className="flex flex-col items-center justify-center py-8 bg-muted/20 rounded-lg">
                  <div 
                    className={`w-24 h-24 rounded-full flex items-center justify-center 
                      ${isRecording 
                        ? 'bg-red-500 animate-pulse' 
                        : 'bg-primary hover:bg-primary/90'} 
                      cursor-pointer transition-colors duration-300 mb-4 shadow-lg`}
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
              
              {/* O áudio agora é transcrito automaticamente sem mostrar o player */}
              
              {isTranscribing && (
                <div className="rounded-lg bg-muted/30 p-6 space-y-4">
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
              
              {/* Transcrição agora é salva automaticamente, sem mostrar o conteúdo */}
              {transcriptionText && !isTranscribing && isSaving && (
                <div className="rounded-lg bg-muted/30 p-6 space-y-4">
                  <h3 className="font-medium text-center flex items-center justify-center">
                    <Save className="h-5 w-5 mr-2 text-primary" />
                    {t("journal.actions.saving")}
                  </h3>
                  
                  <Progress value={75} className="w-full" />
                  
                  <p className="text-sm text-center text-muted-foreground">
                    {t("journal.savingAndRedirecting")}
                  </p>
                </div>
              )}
            </TabsContent>
            
            {/* Aba de Texto */}
            <TabsContent value="text" className="space-y-6">
              <div className="space-y-4">
                <Textarea
                  placeholder={t("journal.textPlaceholder")}
                  className="min-h-[250px] resize-y"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
                
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={cancelEntry}
                    className="flex-1"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    {t("journal.actions.discard")}
                  </Button>
                  
                  <Button
                    onClick={() => saveEntry()}
                    disabled={isSaving || !textContent.trim()}
                    className="flex-1"
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-muted/30 rounded-lg p-4 text-sm"
      >
        <h3 className="font-medium mb-2">{t("journal.howItWorks")}</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>{t("journal.steps.recordOrType")}</li>
          {activeTab === 'audio' ? (
            <li>{t("journal.steps.autoSaveAudio")}</li>
          ) : (
            <>
              <li>{t("journal.steps.reviewContent")}</li>
              <li>{t("journal.steps.saveEntry")}</li>
            </>
          )}
          <li>{t("journal.steps.checkHistory")}</li>
        </ol>
      </m.div>
    </div>
  );
}