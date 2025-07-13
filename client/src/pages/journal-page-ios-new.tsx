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
  Edit,
  Clock,
  MessageSquare,
  CalendarDays,
  Calendar,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";

export default function JournalPageIOS() {
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
  
  // Buscar entradas de diário para exibir na interface
  const { data: journalEntries = [], isLoading: isLoadingEntries } = useQuery<JournalEntryType[]>({
    queryKey: ['/api/journal'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/journal');
      return response.json();
    },
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Mutação para criar uma entrada de diário
  const createJournalEntryMutation = useMutation<JournalEntryType, Error, InsertJournalEntry>({
    mutationFn: async (entry) => {
      const response = await apiRequest("POST", "/api/journal", entry);
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
      queryClient.invalidateQueries({ queryKey: ['/api/journal'] });
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

  // Função para reproduzir sons de feedback do sistema iOS
  const playIOSSystemSound = (type: 'start' | 'stop' | 'cancel') => {
    // Criar um oscilador para sons de sistema
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurações diferentes para cada tipo de som
      if (type === 'start') {
        // Som de início de gravação (tom mais agudo)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      } else if (type === 'stop') {
        // Som de término de gravação (dois tons)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(900, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.25);
      } else if (type === 'cancel') {
        // Som de cancelamento (tom descendente)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }
    } catch (err) {
      console.log('Erro ao reproduzir som do sistema:', err);
      // Silenciando o erro - alguns navegadores podem não suportar AudioContext
    }
  };

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
      
      // Reproduzir som de início de gravação (característica iOS)
      playIOSSystemSound('start');
      
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
      
      // Reproduzir som de finalização da gravação (característica iOS)
      playIOSSystemSound('stop');
      
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
      
      // Reproduzir som de cancelamento (característico de iOS)
      playIOSSystemSound('cancel');
      
      // Fornecer feedback tátil diferente para cancelamento
      if (navigator.vibrate) {
        navigator.vibrate([10, 20, 50]);
      }
      
      // Limpar o áudio gravado
      setAudioUrl(null);
      setAudioBlob(null);
      setRecordingTime(0);
      
      // Feedback visual de cancelamento
      toast({
        title: "Gravação cancelada",
        description: "A gravação foi cancelada e não será salva.",
        variant: "default",
      });
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
    setProcessingStep("Analisando conteúdo...");
    
    // Primeiro vamos gerar a análise completa, incluindo título
    generateAnalysis(textContent, mood)
      .then(analysis => {
        // Agora criamos a entrada com todos os dados enriquecidos
        const entry: InsertJournalEntry = {
          userId: user!.id,
          content: textContent,
          mood,
          title: analysis.title || undefined,
          tags: analysis.tags || undefined,
          colorHex: analysis.colorHex || undefined
        };
        
        setProcessingStep("Salvando entrada...");
        createJournalEntryMutation.mutate(entry);
      })
      .catch(error => {
        console.error("Erro ao analisar conteúdo:", error);
        // Fallback: salvar apenas com os dados básicos se a análise falhar
        const entry: InsertJournalEntry = {
          userId: user!.id,
          content: textContent,
          mood
        };
        
        setProcessingStep("Salvando entrada...");
        createJournalEntryMutation.mutate(entry);
      });
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
  
  // Definição do tipo de retorno da análise
  interface JournalAnalysis {
    title: string | null;
    category?: string | null;
    summary?: string | null;
    tags: string[] | null;
    colorHex: string | null;
    emotionalTone?: string | null;
  }
  
  // Função para gerar análise do texto com título, categoria, etc.
  const generateAnalysis = async (content: string, mood: string): Promise<JournalAnalysis> => {
    try {
      // Obter token de autenticação do localStorage usando a chave correta
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/journal/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          mood,
          enhancedAnalysis: isEnhancedAnalysis
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erro ao analisar conteúdo');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Erro na análise de texto:', error);
      // Retornar dados básicos em caso de falha
      return {
        title: null,
        tags: null,
        colorHex: null
      };
    }
  };
  
  // Formatar data para exibição no formato ideal para iOS
  const formatEntryDate = (dateParam: Date | string) => {
    // Converter para Date se for string
    const date = typeof dateParam === 'string' ? parseISO(dateParam) : dateParam;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return `Hoje, ${format(date, 'HH:mm')}`;
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return `Ontem, ${format(date, 'HH:mm')}`;
    } else {
      return format(date, "dd 'de' MMMM, HH:mm", { locale: ptBR });
    }
  };
  
  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] overflow-hidden">
      {/* Conteúdo principal - Página de Diário Otimizada para iOS */}
      <main 
        className="pt-[calc(env(safe-area-inset-top,0px)+42px)] pb-[calc(env(safe-area-inset-bottom,0px)+8px)] px-3 mt-0 mobile-page-enter ios-scroll-fix"
      >
        <div className="max-w-lg mx-auto w-full">
          {/* Cabeçalho estilo iOS melhorado com elementos mais visíveis */}
          <div 
            className="flex flex-col mb-4 pb-3 hardware-accelerated"
            style={{
              borderBottom: "1px solid rgba(0,0,0,0.08)"
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="mr-3 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/90 to-primary/70 hardware-accelerated"
                  style={{
                    boxShadow: "0 4px 12px rgba(var(--ios-primary-rgb), 0.2), 0 0 0 1px rgba(var(--ios-primary-rgb), 0.05) inset",
                    transform: "translateZ(0)"
                  }}
                >
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 
                    className="text-xl font-bold"
                    style={{
                      fontFamily: "var(--ios-display-font)",
                      letterSpacing: "-0.02em",
                      fontWeight: 700,
                      background: "linear-gradient(135deg, rgba(var(--ios-primary-rgb), 1), rgba(var(--ios-primary-rgb), 0.8))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      lineHeight: 1.2
                    }}
                  >
                    Diário Pessoal
                  </h1>
                  
                  {/* Data atual com melhor visibilidade */}
                  <div 
                    className="mt-1 text-sm font-medium text-slate-700 flex items-center"
                    style={{
                      fontFamily: "var(--ios-system-font)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    <Calendar className="mr-1 h-3.5 w-3.5 text-primary/70" />
                    {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </div>

                  {/* Descrição com melhor legibilidade */}
                  <p 
                    className="mt-1 text-xs text-gray-600 leading-tight"
                    style={{
                      fontFamily: "var(--ios-system-font)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.4
                    }}
                  >
                    Registre pensamentos ou grave áudio para seu bem-estar
                  </p>
                </div>
              </div>
              
              <Link href="/journal-history">
                <button 
                  className="ios-button ios-button-secondary flex items-center justify-center py-2 px-3.5 rounded-full bg-primary/15 text-primary text-sm font-medium active:scale-95 transition-transform border border-primary/15 hardware-accelerated"
                  style={{
                    boxShadow: "0 3px 8px rgba(var(--ios-primary-rgb), 0.1)",
                    WebkitTapHighlightColor: "transparent",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    fontFamily: "var(--ios-system-font)",
                    transform: "translateZ(0)"
                  }}
                >
                  <History className="mr-1 h-4 w-4" />
                  Histórico
                </button>
              </Link>
            </div>
          </div>
        
          {/* Seletor de modo estilo iOS tipo Tab Segmented Control - Tamanho melhorado */}
          <div 
            className="flex items-center gap-1 p-1 mb-3 bg-slate-100/70 rounded-xl shadow-inner hardware-accelerated" 
            style={{
              border: "1px solid rgba(0, 0, 0, 0.03)",
              backdropFilter: "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
              transform: "translateZ(0)"
            }}
          >
            <button 
              onClick={() => setShowTextInput(true)}
              className={`ios-button flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium tap-highlight ${
                showTextInput ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-700 shadow-xs border border-slate-100'
              }`}
              style={{
                transition: "all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)",
                fontFamily: "var(--ios-system-font)",
                border: showTextInput ? "none" : "1px solid rgba(0, 0, 0, 0.05)"
              }}
            >
              <PencilLine className={`h-4 w-4 ${showTextInput ? 'text-white' : 'text-slate-600'} mr-1.5`} />
              Escrever
            </button>
            
            <button 
              onClick={() => setShowTextInput(false)}
              className={`ios-button flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium tap-highlight ${
                !showTextInput ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-700 shadow-xs border border-slate-100'
              }`}
              style={{
                transition: "all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)",
                fontFamily: "var(--ios-system-font)",
                border: !showTextInput ? "none" : "1px solid rgba(0, 0, 0, 0.05)"
              }}
            >
              <Mic className={`h-4 w-4 ${!showTextInput ? 'text-white' : 'text-slate-600'} mr-1.5`} />
              Falar
            </button>
          </div>
          
          <div 
            className="text-center mb-2"
            style={{
              color: processingFeedback ? "#6B7280" : "#9CA3AF",
              fontSize: "11px",
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
              {/* Área de TEXTO - Otimizada para iOS */}
              {showTextInput ? (
                <m.div
                  key="text-input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="w-full"
                >
                  <div 
                    className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 mb-3"
                    style={{ 
                      WebkitBackdropFilter: "blur(10px)",
                      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.025), 0 4px 8px rgba(0, 0, 0, 0.015)"
                    }}
                  >
                    <Textarea
                      className="ios-input resize-none h-full w-full text-base border-0 p-5 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 min-h-[170px] hardware-accelerated"
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
                    className="my-3 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-gray-100 transition-all duration-300"
                    style={{ 
                      WebkitBackdropFilter: "blur(10px)",
                      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)"
                    }}
                  >
                    <label className="text-[13px] font-medium text-gray-700 mb-1 flex items-center">
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
                        className="ios-input w-full bg-white border-gray-200 rounded-xl h-11 shadow-sm mt-1 hardware-accelerated"
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
                  
                  {/* Botão de envio no estilo iOS */}
                  <button
                    className="ios-button ios-button-primary w-full mt-2 py-5 rounded-xl hardware-accelerated active:scale-[0.98] transition-transform"
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
                  className="w-full"
                >
                  <div 
                    className="w-full h-[150px] bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-3 transition-all duration-300 mb-2 relative"
                    style={{ 
                      WebkitBackdropFilter: "blur(10px)",
                      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.025), 0 4px 8px rgba(0, 0, 0, 0.015)"
                    }}
                  >
                    {/* Área de Gravação de Áudio - Design otimizado para iOS */}
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
                              Estamos processando sua gravação para identificar os principais temas e estado emocional.
                            </p>
                          </div>
                          
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
                      <div className="flex flex-col items-center justify-center">
                        {/* Botão de gravação unificado - estilo iOS aprimorado */}
                        <button 
                          className="cursor-pointer flex flex-col items-center bg-transparent border-0 tap-highlight p-0 mb-4 outline-none appearance-none hardware-accelerated"
                          onClick={isRecording ? stopRecording : startRecording}
                          style={{
                            WebkitTapHighlightColor: "transparent",
                            transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                          }}
                        >
                          <div 
                            className={`relative rounded-full ${isRecording ? 'bg-red-500' : 'bg-primary'} flex items-center justify-center shadow-lg active:scale-95 transition-all hardware-accelerated`}
                            style={{
                              boxShadow: isRecording 
                                ? "0 8px 20px rgba(239, 68, 68, 0.4), inset 0 -1px 5px rgba(0,0,0,0.1), 0 0 0 8px rgba(239, 68, 68, 0.15)" 
                                : "0 10px 25px rgba(var(--ios-primary-rgb), 0.25), 0 5px 10px rgba(var(--ios-primary-rgb), 0.2), inset 0 -1px 5px rgba(0,0,0,0.1)",
                              width: "85px", /* Tamanho aumentado para melhor legibilidade */
                              height: "85px", /* Tamanho aumentado para melhor legibilidade */
                              transform: "translateZ(0)",
                              backfaceVisibility: "hidden",
                              transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                              willChange: "transform, box-shadow"
                            }}
                          >
                            {/* Efeito de pulso durante a gravação - estilo iOS aprimorado */}
                            {isRecording && (
                              <>
                                <div className="absolute inset-0 rounded-full border-2 border-white/70 animate-ping opacity-60" 
                                     style={{ animationDuration: "1.5s" }}></div>
                                <div className="absolute inset-0 rounded-full border-3 border-white/30 animate-ping opacity-40"
                                     style={{ animationDuration: "2s", animationDelay: "0.3s" }}></div>
                                <div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse"
                                     style={{ animationDuration: "2.5s" }}></div>
                              </>
                            )}
                            
                            <AnimatePresence mode="wait">
                              {isRecording ? (
                                <m.div
                                  key="recording"
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.9, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
                                  className="w-full h-full"
                                >
                                  {/* Ícone estático durante a gravação */}
                                  <div className="relative flex items-center justify-center w-full h-full z-10">
                                    <StopCircle className="h-9 w-9 text-white" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
                                  </div>
                                  
                                  {/* Indicador flutuante de tempo de gravação no estilo iOS */}
                                  <div 
                                    className="absolute -bottom-12 bg-black/90 backdrop-blur-md px-3 py-1 rounded-full shadow-lg"
                                    style={{
                                      WebkitBackdropFilter: "blur(8px)",
                                      boxShadow: "0 3px 10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05) inset",
                                      animation: "fade-in 0.3s cubic-bezier(0.17, 0.67, 0.38, 0.97) forwards"
                                    }}
                                  >
                                    <div className="flex items-center">
                                      <div className="h-2 w-2 rounded-full bg-red-500 mr-2" 
                                          style={{ animation: "ios-pulse 1.5s infinite" }}></div>
                                      <span 
                                        className="text-white text-sm font-medium"
                                        style={{
                                          fontFamily: "var(--ios-mono-font), monospace",
                                          letterSpacing: "0.02em",
                                          fontVariantNumeric: "tabular-nums"
                                        }}
                                      >
                                        {formatTime(recordingTime)}
                                      </span>
                                    </div>
                                  </div>
                                </m.div>
                              ) : (
                                <m.div 
                                  key="mic"
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.9, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
                                  className="w-full h-full"
                                >
                                  <div className="relative flex items-center justify-center w-full h-full z-10">
                                    <Mic className="h-9 w-9 text-white" />
                                  </div>
                                </m.div>
                              )}
                            </AnimatePresence>
                            
                            {/* Sombra interna mais suave e natural - estilo iOS */}
                            <div className="absolute inset-0 rounded-full opacity-20 pointer-events-none" 
                                 style={{ 
                                   background: "radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.3) 100%)",
                                 }}></div>
                          </div>
                          <span 
                            className="mt-1 text-xs font-medium text-slate-700"
                            style={{
                              fontFamily: "var(--ios-system-font)",
                              letterSpacing: "-0.01em",
                              fontSize: "10px"
                            }}
                          >
                            {isRecording ? 'Toque para finalizar' : audioUrl ? 'Nova gravação' : 'Toque para iniciar'}
                          </span>
                        </button>
                        
                        {/* Botão de cancelar visível apenas durante a gravação - redesenhado em mini-estilo iOS */}
                        <AnimatePresence>
                          {isRecording && (
                            <m.button 
                              initial={{ opacity: 0, scale: 0.85, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.85, y: 5 }}
                              transition={{ 
                                duration: 0.3, 
                                ease: [0.23, 1, 0.32, 1],
                                delay: 0.15
                              }}
                              className="ios-button rounded-full h-7 px-3 bg-white/90 border border-red-100 text-red-500 font-medium active:scale-95 transition-all hardware-accelerated"
                              onClick={cancelRecording}
                              style={{
                                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.08)",
                                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                                fontFamily: "var(--ios-system-font)",
                                fontSize: "11px",
                                letterSpacing: "-0.01em",
                                transform: "translateZ(0)",
                                willChange: "transform"
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              <span style={{ fontWeight: 500 }}>Cancelar</span>
                            </m.button>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                  
                  {/* Nota centralizada super-compacta estilo iOS pill */}
                  <div className="flex justify-center">
                    <div 
                      className="mt-1 mb-0 inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50/60 border border-blue-100/80"
                      style={{
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        boxShadow: "0 1px 3px rgba(59, 130, 246, 0.05)"
                      }}
                    >
                      <Sparkles className="h-2.5 w-2.5 text-blue-600 mr-1" />
                      <p 
                        className="text-blue-700/90 leading-tight"
                        style={{
                          fontFamily: "var(--ios-system-font)",
                          letterSpacing: "-0.01em",
                          fontSize: "9px",
                          lineHeight: 1.2
                        }}
                      >
                        <span className="font-semibold">Transcrição Automática</span>
                      </p>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </LazyMotion>
          
          {/* Seção de Histórico de Entradas - Estilo iOS Nativo */}
          <div className="mt-8 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 
                className="text-base font-semibold text-slate-800"
                style={{
                  fontFamily: "var(--ios-display-font)",
                  letterSpacing: "-0.01em",
                  fontWeight: 600
                }}
              >
                Entradas Recentes
              </h2>
              <Link href="/journal-history">
                <button 
                  className="ios-button flex items-center justify-center px-3.5 py-1.5 text-sm font-semibold text-white rounded-full active:scale-95 transition-transform hardware-accelerated"
                  style={{
                    fontFamily: "var(--ios-system-font)",
                    letterSpacing: "-0.01em",
                    boxShadow: "0 2px 6px rgba(var(--ios-primary-rgb), 0.2)",
                    WebkitTapHighlightColor: "transparent",
                    transform: "translateZ(0)",
                    background: "linear-gradient(135deg, rgba(var(--ios-primary-rgb), 1), rgba(var(--ios-primary-rgb), 0.9))",
                    border: "1px solid rgba(var(--ios-primary-rgb), 0.2)"
                  }}
                >
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  Ver todas
                </button>
              </Link>
            </div>
            
            {!user ? (
              // Estado não autenticado - design no estilo iOS
              <div 
                className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 text-center border border-gray-100 transition-all duration-300"
                style={{
                  WebkitBackdropFilter: "blur(10px)",
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.025), 0 4px 8px rgba(0, 0, 0, 0.015)"
                }}
              >
                <div 
                  className="w-16 h-16 mx-auto mb-3 flex items-center justify-center rounded-full"
                  style={{
                    background: "linear-gradient(135deg, rgba(var(--ios-primary-rgb), 0.15), rgba(var(--ios-primary-rgb), 0.25))",
                    boxShadow: "0 4px 12px rgba(var(--ios-primary-rgb), 0.1)"
                  }}
                >
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                
                <h3 
                  className="text-lg font-semibold mb-2 text-slate-800"
                  style={{
                    fontFamily: "var(--ios-display-font)",
                    letterSpacing: "-0.01em"
                  }}
                >
                  Login Necessário
                </h3>
                
                <p 
                  className="text-sm text-slate-600 mb-4"
                  style={{
                    fontFamily: "var(--ios-system-font)",
                    fontSize: "15px",
                    lineHeight: "1.4",
                    letterSpacing: "-0.01em"
                  }}
                >
                  Faça login para visualizar e criar entradas no seu diário pessoal
                </p>
                
                <Link href="/auth">
                  <button 
                    className="ios-button ios-button-primary w-full py-3 rounded-xl text-white text-base font-medium active:scale-95 transition-transform shadow-md"
                    style={{
                      boxShadow: "0 6px 16px rgba(var(--ios-primary-rgb), 0.25)",
                      transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                      transform: "translateZ(0)",
                      willChange: "transform",
                      fontSize: "16px",
                      fontFamily: "var(--ios-system-font)",
                      background: "linear-gradient(135deg, rgba(var(--ios-primary-rgb), 1), rgba(var(--ios-primary-rgb), 0.9))"
                    }}
                  >
                    Entrar
                  </button>
                </Link>
              </div>
            ) : isLoadingEntries ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : journalEntries.length === 0 ? (
              <div 
                className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 text-center border border-gray-100 transition-all duration-300"
                style={{
                  WebkitBackdropFilter: "blur(10px)",
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.025), 0 4px 8px rgba(0, 0, 0, 0.015)"
                }}
              >
                <MessageSquare className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p 
                  className="text-sm text-slate-500"
                  style={{
                    fontFamily: "var(--ios-system-font)",
                    fontSize: "15px",
                    letterSpacing: "-0.01em"
                  }}
                >
                  Suas entradas de diário aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {journalEntries.slice(0, 5).map((entry) => (
                  <div 
                    key={entry.id}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 transition-all duration-300 overflow-hidden relative active:scale-[0.985] tap-highlight cursor-pointer"
                    style={{
                      WebkitBackdropFilter: "blur(10px)",
                      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.025), 0 4px 8px rgba(0, 0, 0, 0.015)",
                      WebkitTapHighlightColor: "transparent",
                      transform: "translateZ(0)",
                      willChange: "transform"
                    }}
                  >
                    {/* Gradiente de fundo baseado no humor - estilo iOS */}
                    <div 
                      className="absolute -inset-1 opacity-10 rounded-2xl hardware-accelerated"
                      style={{
                        background: 
                          entry.mood === "alegre" ? "linear-gradient(135deg, rgba(88, 200, 155, 0.5), rgba(88, 200, 155, 0.1))" : 
                          entry.mood === "motivado" ? "linear-gradient(135deg, rgba(34, 197, 94, 0.5), rgba(34, 197, 94, 0.1))" :
                          entry.mood === "grato" ? "linear-gradient(135deg, rgba(52, 211, 153, 0.5), rgba(52, 211, 153, 0.1))" :
                          entry.mood === "relaxado" ? "linear-gradient(135deg, rgba(45, 160, 220, 0.5), rgba(45, 160, 220, 0.1))" :
                          entry.mood === "curioso" ? "linear-gradient(135deg, rgba(79, 156, 240, 0.5), rgba(79, 156, 240, 0.1))" :
                          entry.mood === "neutro" ? "linear-gradient(135deg, rgba(148, 163, 184, 0.5), rgba(148, 163, 184, 0.1))" :
                          entry.mood === "preocupado" ? "linear-gradient(135deg, rgba(250, 204, 21, 0.5), rgba(250, 204, 21, 0.1))" :
                          entry.mood === "estressado" ? "linear-gradient(135deg, rgba(245, 158, 11, 0.5), rgba(245, 158, 11, 0.1))" :
                          entry.mood === "triste" ? "linear-gradient(135deg, rgba(99, 102, 241, 0.5), rgba(99, 102, 241, 0.1))" :
                          entry.mood === "frustrado" ? "linear-gradient(135deg, rgba(249, 115, 22, 0.5), rgba(249, 115, 22, 0.1))" :
                          entry.mood === "irritado" ? "linear-gradient(135deg, rgba(239, 68, 68, 0.5), rgba(239, 68, 68, 0.1))" :
                          entry.mood === "exausto" ? "linear-gradient(135deg, rgba(147, 51, 234, 0.5), rgba(147, 51, 234, 0.1))" :
                          "linear-gradient(135deg, rgba(148, 163, 184, 0.5), rgba(148, 163, 184, 0.1))",
                        transform: "translateZ(0)",
                        willChange: "opacity, background",
                        zIndex: -1
                      }}
                    />
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <div 
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            background: "linear-gradient(135deg, rgba(var(--ios-primary-rgb), 0.1), rgba(var(--ios-primary-rgb), 0.2))",
                            boxShadow: "0 2px 4px rgba(var(--ios-primary-rgb), 0.08)"
                          }}
                        >
                          {entry.content.includes("Transcrição") ? (
                            <Mic className="h-4 w-4 text-primary" />
                          ) : (
                            <PencilLine className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="ml-2">
                          <div className="flex items-center">
                            <div 
                              className={`text-sm font-medium inline-flex items-center`}
                              style={{
                                fontFamily: "var(--ios-system-font)",
                                letterSpacing: "-0.01em"
                              }}
                            >
                              <div 
                                className="h-5 w-1.5 rounded-sm mr-2 hardware-accelerated"
                                style={{
                                  backgroundColor: 
                                    entry.mood === "alegre" ? "rgb(88, 200, 155)" : 
                                    entry.mood === "motivado" ? "rgb(34, 197, 94)" :
                                    entry.mood === "grato" ? "rgb(52, 211, 153)" :
                                    entry.mood === "relaxado" ? "rgb(45, 160, 220)" :
                                    entry.mood === "curioso" ? "rgb(79, 156, 240)" :
                                    entry.mood === "neutro" ? "rgb(148, 163, 184)" :
                                    entry.mood === "preocupado" ? "rgb(250, 204, 21)" :
                                    entry.mood === "estressado" ? "rgb(245, 158, 11)" :
                                    entry.mood === "triste" ? "rgb(99, 102, 241)" :
                                    entry.mood === "frustrado" ? "rgb(249, 115, 22)" :
                                    entry.mood === "irritado" ? "rgb(239, 68, 68)" :
                                    entry.mood === "exausto" ? "rgb(147, 51, 234)" :
                                    "rgb(148, 163, 184)",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)"
                                }}
                              />
                              <span className="mr-1.5">
                                {entry.mood === "alegre" ? "😊" : 
                                 entry.mood === "motivado" ? "💪" :
                                 entry.mood === "grato" ? "🙏" :
                                 entry.mood === "relaxado" ? "😌" :
                                 entry.mood === "curioso" ? "🧐" :
                                 entry.mood === "neutro" ? "😐" :
                                 entry.mood === "preocupado" ? "😟" :
                                 entry.mood === "estressado" ? "😫" :
                                 entry.mood === "triste" ? "😢" :
                                 entry.mood === "frustrado" ? "😤" :
                                 entry.mood === "irritado" ? "😠" :
                                 entry.mood === "exausto" ? "😩" : ""}
                              </span>
                              <span 
                                className="text-slate-800" 
                                style={{ 
                                  textShadow: "0 0.5px 0 rgba(255,255,255,0.7)",
                                  fontWeight: "600" 
                                }}
                              >
                                {entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div 
                        className="flex items-center text-xs text-slate-500" 
                        style={{
                          fontFamily: "var(--ios-system-font)",
                          letterSpacing: "-0.01em"
                        }}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {formatEntryDate(entry.date)}
                      </div>
                    </div>
                    {/* Título gerado por IA */}
                    {entry.title && (
                      <h3
                        className="text-slate-800 font-medium mt-2 mb-1"
                        style={{
                          fontFamily: "var(--ios-display-font)",
                          fontSize: "16px",
                          lineHeight: "1.3",
                          letterSpacing: "-0.01em"
                        }}
                      >
                        {entry.title}
                      </h3>
                    )}
                    <p 
                      className="text-slate-700 mt-1 line-clamp-3"
                      style={{
                        fontFamily: "var(--ios-system-font)",
                        fontSize: "15px",
                        lineHeight: "1.5",
                        letterSpacing: "-0.01em"
                      }}
                    >
                      {entry.content}
                    </p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {entry.tags.slice(0, 3).map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                            style={{
                              fontFamily: "var(--ios-system-font)",
                              fontSize: "10px",
                              background: "rgba(var(--ios-primary-rgb), 0.08)",
                              color: "rgba(var(--ios-primary-rgb), 0.9)"
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {entry.tags.length > 3 && (
                          <span 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                            style={{
                              fontFamily: "var(--ios-system-font)",
                              fontSize: "10px",
                              background: "rgba(var(--ios-primary-rgb), 0.05)",
                              color: "rgba(var(--ios-primary-rgb), 0.7)"
                            }}
                          >
                            +{entry.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}