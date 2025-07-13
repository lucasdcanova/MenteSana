import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { JournalEntry as JournalEntryType, InsertJournalEntry } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Mic, 
  Loader2, 
  FileAudio, 
  Sparkles, 
  History, 
  Send, 
  X,
  PencilLine,
  BookText,
  ArrowLeft,
  StopCircle,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";

export default function JournalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [textContent, setTextContent] = useState('');
  const [mood, setMood] = useState('neutro');
  const [transcriberMood, setTranscriberMood] = useState('neutro');
  const [showTextInput, setShowTextInput] = useState(false);
  const [isEnhancedAnalysis, setIsEnhancedAnalysis] = useState(true);
  const [processingFeedback, setProcessingFeedback] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mutação para criar uma entrada de diário
  const createJournalEntryMutation = useMutation<JournalEntryType, Error, InsertJournalEntry>({
    mutationFn: async (entry: InsertJournalEntry) => {
      const res = await apiRequest('POST', '/api/journal-entries', entry);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries/user'] });
      
      toast({
        title: "Entrada salva com sucesso",
        description: "Sua entrada foi adicionada ao diário",
        variant: "default",
      });
      
      // Limpar estados
      setAudioUrl(null);
      setAudioBlob(null);
      setTextContent('');
      setProcessingFeedback(false);
      setProcessingStep(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar entrada",
        description: error.message || "Ocorreu um erro ao salvar sua entrada",
        variant: "destructive",
      });
      setProcessingFeedback(false);
    },
  });
  
  // Mutação para transcrever áudio
  const transcribeAudioMutation = useMutation<any, Error, { audio: Blob, mood: string }>({
    mutationFn: async (data: { audio: Blob, mood: string }) => {
      // Usar o blob recebido do parâmetro em vez de verificar audioBlob
      if (!data.audio) throw new Error("Nenhum áudio para transcrever");
      
      // Verificar tamanho mínimo do arquivo
      if (data.audio.size < 1000) {
        throw new Error("O arquivo de áudio é muito pequeno ou vazio");
      }
      
      setProcessingFeedback(true);
      setProcessingStep("Processando áudio...");
      
      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      
      // Determinar a extensão do arquivo com base no tipo MIME
      let fileExtension = 'webm';
      let mimeType = data.audio.type || "audio/webm";
      
      if (mimeType.includes('mp4')) {
        fileExtension = 'mp4';
      } else if (mimeType.includes('mp3')) {
        fileExtension = 'mp3';
      } else if (mimeType.includes('m4a')) {
        fileExtension = 'm4a';
      }
      
      // Adicionar arquivo com nome específico e tipo correto
      const audioFile = new File([data.audio], `audio.${fileExtension}`, { 
        type: mimeType 
      });
      
      formData.append("audio", audioFile);
      formData.append("mood", data.mood);
      formData.append("duration", recordingTime.toString());
      formData.append("autoTranscribe", "true");
      formData.append("autoCategories", "true");
      
      console.log("Enviando áudio para transcrição:", 
        "Tamanho:", data.audio.size, "bytes", 
        "Tipo:", mimeType,
        "Nome do arquivo:", `audio.${fileExtension}`,
        "Duração:", recordingTime
      );
      
      try {
        // Enviar para a API usando a opção body para FormData
        const res = await apiRequest('POST', '/api/journal/transcribe', undefined, {
          body: formData
        });
        
        if (!res.ok) {
          // Se a resposta não for ok, lançar um erro com a mensagem do servidor
          const errorData = await res.json();
          throw new Error(errorData.message || "Erro ao processar o áudio");
        }
        
        const result = await res.json();
        
        // Verificar se o resultado contém uma mensagem de erro embutida
        if (result.transcription && result.transcription.includes("Não foi possível processar")) {
          throw new Error("Não foi possível processar o áudio adequadamente. Tente novamente.");
        }
        
        return result;
      } catch (error) {
        // Registrar erro e relançar para ser capturado pelo onError
        console.error("Erro na transcrição:", error);
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("Erro desconhecido ao processar o áudio");
        }
      }
    },
    onSuccess: (data) => {
      console.log("Transcrição concluída com sucesso:", data);
      setProcessingStep("Criando entrada no diário...");
      
      if (!user?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para criar entradas no diário",
          variant: "destructive",
        });
        setProcessingFeedback(false);
        return;
      }
      
      // Usar useLocation para navegação
      const [_, setLocation] = useLocation();
      
      createJournalEntryMutation.mutate({
        content: data.text,
        mood: data.mood || transcriberMood,
        audioUrl: data.audioUrl || null,
        audioDuration: recordingTime,
        userId: user.id,
        // Campo de título apenas se existir na esquema
        title: data.title || "Entrada de áudio"
      }, {
        onSuccess: () => {
          // Após a entrada ser criada com sucesso, redirecionamos para o histórico
          console.log("Entrada criada com sucesso, redirecionando para o histórico");
          // Usar setTimeout para dar tempo ao usuário de ver a mensagem de sucesso
          setTimeout(() => {
            setLocation("/journal-history");
          }, 800);
        }
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao transcrever áudio:", error);
      setProcessingFeedback(false);
      setProcessingStep(null);
      
      // Criar uma mensagem de erro mais amigável
      let errorMessage = "Não foi possível processar seu áudio. Tente novamente.";
      
      if (error.message) {
        if (error.message.includes("muito pequeno")) {
          errorMessage = "A gravação é muito curta. Por favor, grave por mais tempo.";
        } else if (error.message.includes("não encontrado")) {
          errorMessage = "Houve um problema ao salvar o áudio. Tente novamente.";
        } else if (error.message.length < 100) { // Usar a mensagem de erro original se não for muito longa
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Problema na gravação",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  // Função simplificada para gravação que funciona em todos os navegadores, incluindo iOS
  const startRecording = () => {
    console.log("Botão de gravação acionado manualmente");
    
    // 1. Primeiro, vamos mostrar feedback imediato ao usuário
    toast({
      title: "Solicitando acesso ao microfone",
      description: "Por favor, permita o acesso se solicitado",
      variant: "default",
    });
    
    // 2. Verificação básica de suporte
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      console.error("API MediaDevices não suportada neste navegador");
      toast({
        title: "Dispositivo não compatível",
        description: "Seu navegador não suporta gravação de áudio",
        variant: "destructive",
      });
      return;
    }
    
    // 3. Solicitar acesso ao microfone
    navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
    .then(function(stream) {
      console.log("✓ Acesso ao microfone concedido");
      
      // 4. Criar gravador - muito simples, sem opções extras para compatibilidade
      let recorder = null;
      try {
        recorder = new MediaRecorder(stream);
        console.log("✓ MediaRecorder criado com sucesso");
      } catch (err) {
        console.error("Erro ao criar MediaRecorder:", err);
        
        // Avisar usuário
        toast({
          title: "Erro na gravação",
          description: "Não foi possível iniciar o gravador de áudio",
          variant: "destructive",
        });
        
        // Liberar recursos
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      // 5. Configurar o gravador
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;
      
      // 6. Manipuladores de eventos para o gravador
      recorder.ondataavailable = function(e) {
        console.log("Dados de áudio recebidos:", e.data.size, "bytes");
        chunksRef.current.push(e.data);
      };
      
      recorder.onstart = function() {
        console.log("✓ Gravação iniciada com sucesso");
        setIsRecording(true);
        setRecordingTime(0);
        
        // Timer para atualizar o contador
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        
        // Notificar usuário
        toast({
          title: "Gravação iniciada",
          description: "Fale o que deseja registrar em seu diário",
        });
      };
      
      recorder.onstop = function() {
        console.log("✓ Gravação finalizada");
        
        // Mostrar feedback de processamento imediatamente
        setProcessingFeedback(true);
        setProcessingStep("Preparando áudio...");
        
        // Limpar timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Parar trilhas
        stream.getTracks().forEach(track => track.stop());
        
        // Processar o áudio gravado
        if (chunksRef.current.length === 0) {
          console.error("Nenhum dado de áudio capturado");
          toast({
            title: "Erro na gravação",
            description: "Nenhum áudio foi capturado. Tente novamente.",
            variant: "destructive",
          });
          setProcessingFeedback(false);
          return;
        }
        
        // Verificar tipo de mídia suportado pelo dispositivo
        let mimeType = 'audio/webm';
        
        // Em iOS, usar MP4 que é melhor suportado
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
          mimeType = 'audio/mp4';
        }
        
        // Criar blob com o tipo adequado
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log("✓ Blob de áudio criado:", blob.size, "bytes");
        
        if (blob.size < 100) {
          console.error("Blob de áudio muito pequeno, provavelmente sem conteúdo");
          toast({
            title: "Gravação vazia",
            description: "Nenhum som foi detectado. Tente novamente falando mais alto.",
            variant: "destructive",
          });
          setProcessingFeedback(false);
          return;
        }
        
        // Criar URL e atualizar estado
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        
        // Atualizar mensagem de processamento e notificar usuário
        setProcessingStep("Transcrevendo e analisando áudio...");
        toast({
          title: "Processando áudio",
          description: "Seu áudio está sendo transcrito e analisado automaticamente",
        });
        
        // Iniciar o processamento do áudio automaticamente
        console.log("Iniciando processamento automático do áudio");
        if (blob) {
          // Usar a mesma função de transcribeAudio mas chamar diretamente 
          // para não depender da interface
          transcribeAudioMutation.mutate({ 
            audio: blob,
            mood: transcriberMood
          });
        }
      };
      
      // 7. Iniciar a gravação com timeslice curto para obter chunks frequentes
      console.log("Iniciando gravação...");
      recorder.start(200);
      
    })
    .catch(function(err) {
      console.error("Erro ao acessar o microfone:", err);
      
      let message = "Não foi possível acessar o microfone";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        message = "Permissão para usar o microfone negada. Por favor, permita o acesso ao microfone.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        message = "Nenhum microfone encontrado. Verifique se há um microfone conectado.";
      }
      
      toast({
        title: "Erro de microfone",
        description: message,
        variant: "destructive",
      });
    });
  };
  
  // Parar gravação e enviar automaticamente
  const stopRecording = () => {
    console.log("Função stopRecording acionada");
    
    // 1. Mostrar feedback imediato
    toast({
      title: "Finalizando gravação",
      description: "Processando o áudio...",
    });
    
    // 2. Verificar se o gravador existe
    if (!mediaRecorderRef.current) {
      console.error("MediaRecorder não está disponível");
      return;
    }
    
    try {
      // 3. Verificar o estado do MediaRecorder e parar apenas se estiver gravando
      console.log("Status atual do MediaRecorder:", mediaRecorderRef.current.state);
      
      if (mediaRecorderRef.current.state === "recording") {
        console.log("✓ Parando gravação de áudio");
        
        // O evento onstop configurado na função startRecording vai cuidar do processamento
        mediaRecorderRef.current.stop();
      } else {
        console.warn("MediaRecorder não está em estado de gravação:", mediaRecorderRef.current.state);
        
        // Se não está gravando, provavelmente já parou ou houve algum erro
        // Vamos forçar a atualização de estado para corrigir a UI
        setIsRecording(false);
      }
    } catch (err) {
      console.error("Erro ao tentar parar gravação:", err);
      
      // Feedback de erro
      toast({
        title: "Erro na gravação",
        description: "Houve um problema ao finalizar a gravação. Tente novamente.",
        variant: "destructive",
      });
      
      // Força atualização de estado mesmo em caso de erro
      setIsRecording(false);
    }
    
    // Sempre parar o timer, independente do resultado
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  // Excluir áudio gravado
  const deleteAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setAudioBlob(null);
    }
  };
  
  // Alternar entre entrada por voz e texto
  const toggleInputMode = () => {
    if (isRecording) {
      stopRecording();
    }
    
    setShowTextInput(!showTextInput);
  };
  
  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Processar entrada de texto
  const processTextInput = () => {
    if (!textContent.trim()) {
      toast({
        title: "Conteúdo vazio",
        description: "Por favor, digite algo antes de salvar",
        variant: "destructive",
      });
      return;
    }
    
    setProcessingFeedback(true);
    setProcessingStep("Criando entrada...");
    
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar entradas no diário",
        variant: "destructive",
      });
      setProcessingFeedback(false);
      return;
    }
    
    createJournalEntryMutation.mutate({
      content: textContent,
      mood,
      userId: user.id,
      title: "Entrada de texto"  // Adicionar title para evitar erro de coluna faltante
    }, {
      onSuccess: () => {
        // Limpar o formulário e redirecionar após sucesso
        setTextContent('');
        
        // Usar setTimeout para dar tempo ao usuário de ver a mensagem de sucesso
        setTimeout(() => {
          const [_, setLocation] = useLocation();
          setLocation("/journal-history");
        }, 800);
      }
    });
  };
  
  // Transcrever áudio
  const transcribeAudio = () => {
    if (!audioBlob) {
      toast({
        title: "Nenhum áudio gravado",
        description: "Por favor, grave um áudio antes de processar",
        variant: "destructive",
      });
      return;
    }
    
    // Atualizar feedback visual antes de iniciar
    setProcessingFeedback(true);
    setProcessingStep("Iniciando transcrição e análise...");
    
    transcribeAudioMutation.mutate({ 
      audio: audioBlob,
      mood: transcriberMood
    });
  };

  // Definir as opções de humor com cores
  const moodOptions = [
    { value: 'alegre', label: 'Alegre', color: '#4ADE80' },
    { value: 'calmo', label: 'Calmo', color: '#60A5FA' },
    { value: 'ansioso', label: 'Ansioso', color: '#F59E0B' },
    { value: 'triste', label: 'Triste', color: '#38BDF8' },
    { value: 'irritado', label: 'Irritado', color: '#EF4444' },
    { value: 'frustrado', label: 'Frustrado', color: '#F87171' },
    { value: 'esperançoso', label: 'Esperançoso', color: '#38BDF8' },
    { value: 'neutro', label: 'Neutro', color: '#94A3B8' },
  ];
  
  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F5F7F9] overflow-hidden">
      {/* Cabeçalho */}
      <header className="bg-white border-b border-gray-100 shadow-sm z-20 sticky top-0">
        <div className="flex items-center justify-center px-4 h-14">
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline"
              className="rounded-full h-10 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary-dark"
              onClick={toggleInputMode}
            >
              {showTextInput ? (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  <span>Usar Voz</span>
                </>
              ) : (
                <>
                  <PencilLine className="h-4 w-4 mr-2" />
                  <span>Usar Texto</span>
                </>
              )}
            </Button>
            
            <Link to="/journal-history">
              <Button 
                variant="outline"
                className="rounded-full h-10 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary-dark"
              >
                <History className="h-4 w-4 mr-2" />
                <span>Histórico</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Data atual */}
      <div className="px-4 py-3">
        <div className="flex items-center">
          <div className="bg-primary/10 p-2 rounded-full mr-3">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {format(new Date(), "EEEE", { locale: ptBR })}
            </p>
            <p className="text-xs text-gray-500">
              {format(new Date(), "d 'de' MMMM, yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-24 flex-1 overflow-auto">
        {/* Card principal */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">
              {showTextInput
                ? "Escreva seus pensamentos"
                : audioUrl
                  ? "Gravação finalizada"
                  : isRecording
                    ? "Gravando seu áudio..."
                    : "Como você está se sentindo hoje?"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {showTextInput
                ? "Registre seus pensamentos e emoções do dia"
                : audioUrl
                  ? "Seu áudio será processado automaticamente"
                  : isRecording
                    ? `Falando há ${formatTime(recordingTime)}`
                    : "Toque no botão de microfone para começar uma gravação"}
            </p>
          </div>

          {/* Conteúdo principal */}
          <div className="p-4">
            <LazyMotion features={domAnimation}>
              <AnimatePresence mode="wait">
                {/* Modo de Texto */}
                {showTextInput && (
                  <m.div
                    key="text-input"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <Textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Como foi seu dia hoje? O que você está sentindo?"
                      className="w-full min-h-[150px] resize-none border-gray-200 rounded-xl"
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Como está seu humor?
                      </label>
                      <Select
                        value={mood}
                        onValueChange={setMood}
                      >
                        <SelectTrigger className="w-full border-gray-200 rounded-xl h-10">
                          <SelectValue placeholder="Selecione seu humor" />
                        </SelectTrigger>
                        <SelectContent>
                          {moodOptions.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              className="flex items-center"
                            >
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: option.color }}
                                />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleInputMode}
                        className="text-sm rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                      >
                        <Mic className="h-4 w-4 mr-1" />
                        Usar voz
                      </Button>
                      
                      <Button
                        onClick={processTextInput}
                        className="rounded-full bg-primary text-white hover:bg-primary/90"
                        disabled={createJournalEntryMutation.isPending}
                      >
                        {createJournalEntryMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            Salvar
                          </>
                        )}
                      </Button>
                    </div>
                  </m.div>
                )}

                {/* Modo de Áudio - Estado: Esperando começar */}
                {!showTextInput && !isRecording && !audioUrl && (
                  <m.div
                    key="audio-start"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center py-6"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        console.log("Botão de gravação clicado");
                        startRecording();
                      }}
                      className="h-20 w-20 rounded-full bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center justify-center"
                    >
                      <Mic className="h-10 w-10" />
                    </button>
                    <p className="text-sm text-gray-500 mt-4">
                      Toque para começar a gravar
                    </p>
                  </m.div>
                )}

                {/* Modo de Áudio - Estado: Gravando */}
                {!showTextInput && isRecording && (
                  <m.div
                    key="recording"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center py-6"
                  >
                    <m.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [1, 0.8, 1]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2
                      }}
                      className="relative mb-4"
                    >
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                      <button
                        type="button"
                        onClick={() => {
                          console.log("Botão de parar gravação clicado");
                          stopRecording();
                        }}
                        className="h-20 w-20 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 z-10 relative flex items-center justify-center"
                      >
                        <StopCircle className="h-10 w-10" />
                      </button>
                    </m.div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-medium text-gray-800">
                        {formatTime(recordingTime)}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Toque para parar a gravação
                      </p>
                    </div>
                  </m.div>
                )}

                {/* Modo de Áudio - Estado: Gravação finalizada (removido, processamento agora é automático) */}

                {/* Estado: Processando */}
                {processingFeedback && (
                  <m.div
                    key="processing"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center py-6 space-y-4"
                  >
                    <div className="relative">
                      <m.div
                        animate={{ 
                          rotate: 360 
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 2,
                          ease: "linear"
                        }}
                        className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary"
                      />
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-800">
                        {processingStep || "Processando..."}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Isso pode levar alguns segundos
                      </p>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </LazyMotion>
          </div>
        </div>

        {/* Dica informativa */}
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 mb-4">
          <div className="flex">
            <div className="mr-3 mt-0.5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Sobre o diário</h3>
              <p className="text-xs text-gray-600 mt-1">
                O diário é um espaço seguro para registrar seus pensamentos e sentimentos. 
                Suas entradas são analisadas para ajudar a identificar padrões emocionais
                e fornecer insights personalizados sobre seu bem-estar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}