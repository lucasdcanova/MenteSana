import { useState, useRef, useEffect } from "react";
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
  Send, 
  X,
  PencilLine,
  Smile,
  StopCircle,
  History,
  BookOpen,
  Edit
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
  const [, navigate] = useLocation();
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
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Mutação para criar uma entrada de diário
  const createJournalEntryMutation = useMutation<JournalEntryType, Error, InsertJournalEntry>({
    mutationFn: async (entry) => {
      const response = await apiRequest("POST", "/api/journal-entries", entry);
      return await response.json();
    },
    onSuccess: (data) => {
      setProcessingFeedback(false);
      setShowTextInput(false);
      setAudioUrl(null);
      setAudioBlob(null);
      setTextContent('');
      setRecordingTime(0);
      setProcessingStep(null);
      
      toast({
        title: "✅ Entrada criada com sucesso!",
        description: "Seu registro foi salvo no diário.",
      });
      
      // Invalidar a query de entradas de diário
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
    },
    onError: (error) => {
      setProcessingFeedback(false);
      setProcessingStep(null);
      toast({
        title: "Erro ao criar entrada",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para processar áudio
  const processAudioMutation = useMutation({
    mutationFn: async () => {
      setProcessingStep("Enviando gravação...");
      if (!audioBlob) throw new Error("Nenhum áudio gravado");
      
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('userId', user!.id.toString());
      formData.append('enhancedAnalysis', isEnhancedAnalysis.toString());
      
      // Obter token de autenticação do localStorage usando a chave correta
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/journal/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro ao processar áudio");
      }
      
      setProcessingStep("Analisando conteúdo...");
      
      return await response.json();
    },
    onSuccess: (data) => {
      setProcessingStep("Salvando entrada...");
      
      // Criar a entrada do diário apenas com os campos permitidos pelo esquema
      const entry: InsertJournalEntry = {
        userId: user!.id,
        content: data.transcript,
        mood: transcriberMood,
        audioUrl: null,
        // Os campos abaixo serão processados no backend
        tags: data.keyTopics ? data.keyTopics as string[] : undefined
      };
      
      createJournalEntryMutation.mutate(entry);
    },
    onError: (error: Error) => {
      setProcessingFeedback(false);
      setProcessingStep(null);
      toast({
        title: "Erro ao transcrever áudio",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Iniciar gravação com otimização para iOS
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      
      // Configurações otimizadas para iOS
      const constraints = { 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      };
      
      // Adicionar feedback de vibração (se disponível)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Configurações específicas para melhor desempenho no iOS
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };
      
      // Tente usar o tipo MIME especificado, se não for suportado, use o padrão
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } catch (e) {
        console.log('Formato não suportado, usando padrão do dispositivo');
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });
      
      mediaRecorderRef.current.addEventListener("stop", async () => {
        try {
          // Determinar o melhor formato para compatibilidade com iOS
          const mimeType = (MediaRecorder.isTypeSupported('audio/webm')) 
            ? 'audio/webm' 
            : 'audio/mp4';
            
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          setAudioBlob(audioBlob);
          
          // Adicionar feedback tátil ao finalizar (padrão iOS)
          if (navigator.vibrate) {
            navigator.vibrate([25, 50, 25]);
          }
          
          // Se a gravação tem tamanho razoável, criar URL e preparar para transcrição
          if (audioBlob.size > 1000) {
            const audioUrl = URL.createObjectURL(audioBlob);
            setAudioUrl(audioUrl);
            
            // Não iniciamos a transcrição aqui, pois agora isso é feito na função stopRecording após um delay
            // Isso proporciona melhor experiência visual e mais controle sobre o fluxo de processamento
          } else {
            // Se a gravação for muito curta, mostrar mensagem
            toast({
              title: "Gravação muito curta",
              description: "A gravação foi muito breve. Tente gravar novamente com mais conteúdo.",
              variant: "destructive",
            });
          }
        } catch (err) {
          console.error('Erro ao processar áudio gravado:', err);
          toast({
            title: "Erro ao processar áudio",
            description: "Não foi possível processar o áudio gravado.",
            variant: "destructive",
          });
        } finally {
          setIsRecording(false);
          
          // Parar todas as faixas
          stream.getTracks().forEach(track => track.stop());
        }
      });
      
      // Define um timeslice para coletar dados a cada 100ms - mais responsivo
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Iniciar o timer para atualizar o tempo de gravação
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error while recording:', error);
      toast({
        title: "Erro ao iniciar gravação",
        description: "Verifique se seu dispositivo tem permissão para acessar o microfone. Talvez seja necessário permitir acesso nas configurações do iOS.",
        variant: "destructive",
      });
    }
  };
  
  // Parar gravação e iniciar transcrição automaticamente - comportamento nativo do iOS
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      
      // Limpar o timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Fornecer feedback tátil ao concluir a gravação
      if (navigator.vibrate) {
        navigator.vibrate([15, 30, 15]);
      }
      
      // Iniciar transcrição automaticamente após pequeno atraso para UX mais fluida
      setTimeout(() => {
        // Verifica se há audioBlob disponível (após a gravação ser completada no handler do dataavailable)
        if (audioBlob) {
          // Inicia a transcrição automaticamente 
          processAudio();
        }
      }, 1500);
    }
  };
  
  // Cancelar gravação
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      
      // Limpar o timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Limpar o áudio gravado
      setAudioUrl(null);
      setAudioBlob(null);
      setRecordingTime(0);
    }
  };
  
  // Enviar entrada de texto
  const handleTextSubmit = () => {
    if (!textContent.trim()) {
      toast({
        title: "Texto vazio",
        description: "Por favor, digite algum conteúdo para o seu diário.",
        variant: "destructive",
      });
      return;
    }
    
    setProcessingFeedback(true);
    setProcessingStep("Salvando entrada...");
    
    const entry: InsertJournalEntry = {
      userId: user!.id,
      content: textContent,
      mood,
    };
    
    createJournalEntryMutation.mutate(entry);
  };
  
  // Processar o áudio gravado com transcrição automática - Padrão iOS
  const processAudio = () => {
    if (!audioBlob) {
      return;
    }
    
    // Verificar o tamanho do blob para garantir que ele não esteja vazio
    if (audioBlob.size < 1000) {
      toast({
        title: "Gravação muito curta",
        description: "A gravação parece muito curta ou vazia. Tente gravar novamente com mais conteúdo.",
        variant: "destructive",
      });
      return;
    }
    
    // Adicionar feedback visual e tátil para experiência mais nativa do iOS
    if (navigator.vibrate) {
      navigator.vibrate([15, 30, 15]);
    }
    
    setProcessingFeedback(true);
    setProcessingStep("Iniciando transcrição...");
    
    // Pequeno atraso para garantir atualização visual antes de iniciar a transcrição
    setTimeout(() => {
      try {
        processAudioMutation.mutate();
      } catch (error) {
        console.error("Erro ao iniciar processamento de áudio:", error);
        setProcessingFeedback(false);
        setProcessingStep(null);
        toast({
          title: "Erro ao processar áudio",
          description: "Ocorreu um erro ao iniciar o processamento. Tente novamente.",
          variant: "destructive",
        });
      }
    }, 500);
  };
  
  // Formatar o tempo de gravação
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="min-h-[100dvh] h-full flex flex-col bg-[#F9FAFB] overflow-hidden">
      {/* Conteúdo principal - Página de Diário Otimizada para iOS */}
      <main 
        className="flex-1 pt-[calc(env(safe-area-inset-top,0px)+52px)] pb-[calc(env(safe-area-inset-bottom,0px)+8px)] px-4 mt-0 mobile-page-enter ios-scroll-fix"
      >
        <div className="max-w-lg mx-auto w-full h-full flex flex-col">
          {/* Cabeçalho estilo iOS com design mais compacto */}
          <div 
            className="flex flex-col mb-3 pb-2 hardware-accelerated"
            style={{
              borderBottom: "1px solid rgba(0,0,0,0.04)"
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="mr-3 w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/90 to-primary/70 hardware-accelerated"
                  style={{
                    boxShadow: "0 2px 8px rgba(var(--ios-primary-rgb), 0.15), 0 0 0 1px rgba(var(--ios-primary-rgb), 0.05) inset",
                    transform: "translateZ(0)"
                  }}
                >
                  <BookOpen className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h1 
                    className="text-xl font-semibold"
                    style={{
                      fontFamily: "var(--ios-display-font)",
                      letterSpacing: "-0.02em",
                      fontWeight: 700,
                      background: "linear-gradient(135deg, rgba(var(--ios-primary-rgb), 1), rgba(var(--ios-primary-rgb), 0.8))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      marginBottom: "1px",
                      lineHeight: 1.2
                    }}
                  >
                    Diário Pessoal
                  </h1>
                  
                  {/* Data atual no estilo iOS incorporada no cabeçalho para economizar espaço */}
                  <div 
                    className="text-xs text-slate-500 font-medium"
                    style={{
                      fontFamily: "var(--ios-system-font)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </div>
                </div>
              </div>
              
              <Link href="/journal-history">
                <button 
                  className="ios-button ios-button-secondary flex items-center justify-center py-1.5 px-3.5 rounded-full bg-primary/10 text-primary text-sm font-medium active:scale-95 transition-transform border border-primary/10 hardware-accelerated"
                  style={{
                    boxShadow: "0 2px 6px rgba(var(--ios-primary-rgb), 0.05)",
                    WebkitTapHighlightColor: "transparent",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    fontFamily: "var(--ios-system-font)",
                    fontSize: "13px",
                    transform: "translateZ(0)"
                  }}
                >
                  <History className="mr-1 h-3.5 w-3.5" />
                  Histórico
                </button>
              </Link>
            </div>

            {/* Descrição mais compacta com ícone para economizar espaço vertical */}
            <div className="mt-1 pl-0.5 flex items-center">
              <p 
                className="text-xs text-gray-500 leading-relaxed"
                style={{
                  fontFamily: "var(--ios-system-font)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.4
                }}
              >
                <span className="inline-flex items-center">
                  <span className="text-primary/60 mr-1">•</span> 
                </span>
                Registre pensamentos ou grave mensagens de voz para acompanhar seu bem-estar.
              </p>
            </div>
          </div>
        
          {/* Seletor de modo estilo iOS tipo Tab Segmented Control - Compactado */}
          <div 
            className="flex items-center gap-1 p-1 mb-4 bg-slate-100/70 rounded-xl shadow-inner hardware-accelerated" 
            style={{
              border: "1px solid rgba(0, 0, 0, 0.03)",
              backdropFilter: "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
              transform: "translateZ(0)"
            }}
          >
            <button 
              onClick={() => setShowTextInput(true)}
              className={`ios-button flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-medium tap-highlight ${
                showTextInput ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-700 shadow-sm border border-slate-100'
              }`}
              style={{
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                fontFamily: "var(--ios-system-font)",
                border: showTextInput ? "none" : "1px solid rgba(0, 0, 0, 0.05)"
              }}
            >
              <PencilLine className={`h-4 w-4 ${showTextInput ? 'text-white' : 'text-slate-600'} mr-1.5`} />
              Escrever
            </button>
            
            <button 
              onClick={() => setShowTextInput(false)}
              className={`ios-button flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-medium tap-highlight ${
                !showTextInput ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-700 shadow-sm border border-slate-100'
              }`}
              style={{
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                fontFamily: "var(--ios-system-font)",
                border: !showTextInput ? "none" : "1px solid rgba(0, 0, 0, 0.05)"
              }}
            >
              <Mic className={`h-4 w-4 ${!showTextInput ? 'text-white' : 'text-slate-600'} mr-1.5`} />
              Falar
            </button>
          </div>
          
          <div 
            className="mt-2 text-center mb-4"
            style={{
              color: processingFeedback ? "#6B7280" : "#9CA3AF",
              fontSize: "13px",
              fontFamily: "var(--ios-system-font)",
              letterSpacing: "-0.01em",
              fontWeight: 400
            }}
          >
            <p className={processingStep ? "animate-pulse" : ""}>
              {processingStep 
                ? processingStep 
                : showTextInput 
                  ? "Compartilhe seus pensamentos livremente" 
                  : audioUrl && !isRecording
                    ? `Gravação de ${formatTime(recordingTime)} completa`
                    : isRecording
                      ? "Estou ouvindo atentamente"
                      : ""
              }
            </p>
          </div>
          
          <LazyMotion features={domAnimation}>
            <AnimatePresence mode="wait">
              {/* Área de TEXTO - Otimizada com elementos mais arredondados e sombras sutis */}
              {showTextInput ? (
                <m.div
                  key="text-input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="w-full flex-1 flex flex-col max-h-[calc(100dvh-220px)]"
                >
                  <div 
                    className="flex-1 bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300"
                    style={{ 
                      WebkitBackdropFilter: "blur(10px)",
                      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.025), 0 4px 8px rgba(0, 0, 0, 0.015)"
                    }}
                  >
                    <Textarea
                      className="ios-input resize-none h-full w-full text-base border-0 p-5 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 min-h-[180px] hardware-accelerated"
                      placeholder="Digite aqui o que estiver em sua mente..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      disabled={processingFeedback}
                      style={{
                        transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                        lineHeight: "1.6",
                        fontFamily: "var(--ios-system-font)",
                        fontSize: "16px",
                        letterSpacing: "-0.01em"
                      }}
                    />
                  </div>
                  
                  <div 
                    className="my-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-gray-100 transition-all duration-300"
                    style={{ 
                      WebkitBackdropFilter: "blur(10px)",
                      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)"
                    }}
                  >
                    <label className="text-[13px] font-medium text-gray-700 mb-2 flex items-center">
                      <div 
                        className="bg-primary/10 rounded-full p-1 mr-2"
                        style={{
                          boxShadow: "0 1px 2px rgba(0, 172, 138, 0.08) inset"
                        }}
                      >
                        <Smile className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>Como você está se sentindo agora?</span>
                    </label>
                    <Select
                      value={mood}
                      onValueChange={setMood}
                      disabled={processingFeedback}
                    >
                      <SelectTrigger 
                        className="ios-input w-full bg-white border-gray-200 rounded-xl h-12 shadow-sm mt-1 hardware-accelerated"
                        style={{
                          fontFamily: "var(--ios-system-font)",
                          transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                          borderColor: "rgba(0, 0, 0, 0.1)",
                          fontSize: "15px"
                        }}
                      >
                        <SelectValue placeholder="Selecione um sentimento" />
                      </SelectTrigger>
                      <SelectContent
                        className="bg-white/95 backdrop-blur-lg border border-gray-100 shadow-lg rounded-xl overflow-hidden z-50"
                        style={{
                          fontFamily: "var(--ios-system-font)",
                          WebkitBackdropFilter: "blur(20px)",
                          backdropFilter: "blur(20px)"
                        }}
                      >
                        <div className="py-1 px-1">
                          <SelectItem value="alegre" className="rounded-lg my-0.5 cursor-pointer">😊 Alegre</SelectItem>
                          <SelectItem value="motivado" className="rounded-lg my-0.5 cursor-pointer">💪 Motivado</SelectItem>
                          <SelectItem value="grato" className="rounded-lg my-0.5 cursor-pointer">🙏 Grato</SelectItem>
                          <SelectItem value="relaxado" className="rounded-lg my-0.5 cursor-pointer">😌 Relaxado</SelectItem>
                          <SelectItem value="curioso" className="rounded-lg my-0.5 cursor-pointer">🧐 Curioso</SelectItem>
                          <SelectItem value="neutro" className="rounded-lg my-0.5 cursor-pointer">😐 Neutro</SelectItem>
                          <SelectItem value="preocupado" className="rounded-lg my-0.5 cursor-pointer">😟 Preocupado</SelectItem>
                          <SelectItem value="estressado" className="rounded-lg my-0.5 cursor-pointer">😫 Estressado</SelectItem>
                          <SelectItem value="triste" className="rounded-lg my-0.5 cursor-pointer">😢 Triste</SelectItem>
                          <SelectItem value="frustrado" className="rounded-lg my-0.5 cursor-pointer">😤 Frustrado</SelectItem>
                          <SelectItem value="irritado" className="rounded-lg my-0.5 cursor-pointer">😠 Irritado</SelectItem>
                          <SelectItem value="exausto" className="rounded-lg my-0.5 cursor-pointer">😩 Exausto</SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Botão de envio no estilo iOS com animação de toque e efeito "squeeze" */}
                  <button
                    className="ios-button ios-button-primary w-full mt-2 py-6 rounded-xl hardware-accelerated active:scale-[0.98] transition-transform"
                    onClick={handleTextSubmit}
                    disabled={!textContent.trim() || processingFeedback}
                    style={{
                      boxShadow: "0 4px 12px rgba(var(--ios-primary-rgb), 0.2)",
                      transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                      fontFamily: "var(--ios-system-font)"
                    }}
                  >
                    {processingFeedback ? (
                      <div className="flex items-center justify-center text-white">
                        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span style={{ fontWeight: 500 }}>Processando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-white">
                        <Send className="mr-2 h-4 w-4" />
                        <span style={{ fontWeight: 500 }}>Enviar</span>
                      </div>
                    )}
                  </button>
                </m.div>
              ) : (
                <m.div
                  key="voice-input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="w-full flex-1 flex flex-col items-center"
                >
                  <div 
                    className="w-full h-[220px] bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-6 transition-all duration-300 mb-5 relative"
                    style={{ 
                      WebkitBackdropFilter: "blur(10px)",
                      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.025), 0 4px 8px rgba(0, 0, 0, 0.015)"
                    }}
                  >
                    {/* Área de Gravação de Áudio - Design avançado baseado em físicas do iOS */}
                    {audioUrl && processingFeedback ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="mb-4 p-4 bg-primary/10 rounded-full">
                          <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                        </div>
                        
                        <div className="w-full max-w-xs mx-auto">
                          <div className="text-center mb-4">
                            <h3 
                              className="text-base font-semibold text-slate-800 mb-2"
                              style={{
                                fontFamily: "var(--ios-display-font)",
                                letterSpacing: "-0.01em",
                                fontWeight: 600
                              }}
                            >
                              Transcrição Automática
                            </h3>
                            <p 
                              className="text-sm text-slate-600"
                              style={{
                                fontFamily: "var(--ios-system-font)",
                                fontSize: "14px",
                                lineHeight: "1.4",
                                letterSpacing: "-0.01em"
                              }}
                            >
                              Analisando seu áudio e identificando padrões emocionais para oferecer insights personalizados...
                            </p>
                          </div>
                          
                          {/* Indicador de progresso estilo iOS aprimorado */}
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5 shadow-inner">
                            <div 
                              className="h-full bg-primary rounded-full animate-progress-infinite"
                              style={{
                                width: '100%',
                                backgroundSize: '200% 100%',
                                backgroundImage: 'linear-gradient(to right, var(--ios-primary-color) 0%, var(--ios-primary-light) 50%, var(--ios-primary-color) 100%)'
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        {/* Botão de gravação unificado - estilo iOS aprimorado */}
                        <button 
                          className="cursor-pointer flex flex-col items-center bg-transparent border-0 tap-highlight p-0 mb-4 outline-none appearance-none hardware-accelerated"
                          onClick={isRecording ? stopRecording : startRecording}
                          style={{
                            WebkitTapHighlightColor: "transparent"
                          }}
                        >
                          <div 
                            className={`w-24 h-24 rounded-full ${isRecording ? 'bg-red-500' : 'bg-primary'} flex items-center justify-center shadow-lg active:scale-95 transition-all hardware-accelerated`}
                            style={{
                              boxShadow: isRecording 
                                ? "0 4px 12px rgba(239, 68, 68, 0.3), inset 0 -2px 5px rgba(0,0,0,0.1)" 
                                : "0 10px 20px rgba(var(--ios-primary-rgb), 0.25), 0 4px 8px rgba(var(--ios-primary-rgb), 0.2), inset 0 -2px 5px rgba(0,0,0,0.1)",
                              position: "relative",
                              transform: "translateZ(0)",
                              backfaceVisibility: "hidden",
                              transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)"
                            }}
                          >
                            {isRecording && (
                              <div className="absolute inset-0 rounded-full border-4 border-white/70 animate-ping opacity-60"></div>
                            )}
                            
                            {isRecording ? (
                              <div 
                                className="text-white text-xl font-semibold hardware-accelerated"
                                style={{
                                  fontFamily: "var(--ios-display-font)",
                                  fontVariantNumeric: "tabular-nums",
                                  letterSpacing: "0.02em",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.1)"
                                }}
                              >
                                {formatTime(recordingTime)}
                              </div>
                            ) : (
                              <Mic className="h-10 w-10 text-white" />
                            )}
                          </div>
                          {/* Texto abaixo do botão - instrução muito sutil */}
                          <span 
                            className="text-xs text-slate-500 mt-2 opacity-80"
                            style={{
                              fontFamily: "var(--ios-system-font)"
                            }}
                          >
                            {isRecording ? "Toque para parar" : ""}
                          </span>
                        </button>
                        
                        {/* Botão cancelar somente quando estiver gravando - estilo iOS */}
                        {isRecording && (
                          <button
                            className="ios-button rounded-full h-12 px-5 bg-white/90 border border-red-100 text-red-500 font-medium active:scale-95 hardware-accelerated"
                            onClick={cancelRecording}
                            style={{
                              boxShadow: "0 2px 10px rgba(239, 68, 68, 0.1)",
                              transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                              fontFamily: "var(--ios-system-font)"
                            }}
                          >
                            <X className="mr-1.5 h-4 w-4" />
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Nota adicional iOS-style com sutil destaque - Versão aprimorada */}
                  <div 
                    className="mt-auto w-full p-4 rounded-xl bg-blue-50/60 border border-blue-100/80 flex items-start"
                    style={{
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      boxShadow: "0 2px 10px rgba(59, 130, 246, 0.05)"
                    }}
                  >
                    <div 
                      className="bg-blue-100 rounded-full p-1.5 mr-3 mt-0.5 flex-shrink-0"
                      style={{
                        boxShadow: "0 1px 3px rgba(59, 130, 246, 0.1) inset"
                      }}
                    >
                      <Sparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p 
                        className="text-sm text-blue-800 font-medium mb-1"
                        style={{
                          fontFamily: "var(--ios-system-font)",
                          fontWeight: 600,
                          letterSpacing: "-0.01em"
                        }}
                      >
                        Transcrição Automática
                      </p>
                      <p 
                        className="text-xs text-blue-700/80 leading-relaxed"
                        style={{
                          fontFamily: "var(--ios-system-font)",
                          letterSpacing: "-0.01em",
                          lineHeight: 1.5
                        }}
                      >
                        Ao finalizar sua gravação, o áudio será automaticamente transcrito e analisado para identificar padrões emocionais e fornecer insights personalizados.
                      </p>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </LazyMotion>
        </div>
      </main>
    </div>
  );
}