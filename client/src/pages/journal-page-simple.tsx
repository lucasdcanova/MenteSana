import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { InsertJournalEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Componentes de UI
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AudioProcessingStatus } from "@/components/ui/audio-processing-status";

// Ícones
import { Loader2, Mic, MicOff, Save, Text, Trash } from "lucide-react";

export default function DiarioSimplePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [processingFeedback, setProcessingFeedback] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  
  // Estados para entrada de texto
  const [textContent, setTextContent] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  
  // Estados para humor
  const [mood, setMood] = useState("neutro");
  
  // Refs para gravação
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isIOSRef = useRef<boolean>(false);

  // Detectar iOS
  useEffect(() => {
    // Verificar se é dispositivo iOS
    const userAgent = navigator.userAgent || navigator.vendor;
    isIOSRef.current = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    
    if (isIOSRef.current) {
      console.log("Dispositivo iOS detectado - usando configurações otimizadas");
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
    };
  }, [audioUrl]);

  // Mutação para salvar a entrada processada após conclusão
  const saveProcessedEntryMutation = useMutation({
    mutationFn: async (data: { 
      audioId: string, 
      mood: string,
      audioUrl: string | null,
      colorHex: string
    }) => {
      if (!data.audioId) {
        throw new Error("ID de áudio não fornecido");
      }
      
      setProcessingStep("Salvando entrada...");
      
      const res = await apiRequest('POST', '/api/journal-entries/save-processed', {
        audioId: data.audioId,
        mood: data.mood,
        audioUrl: data.audioUrl,
        colorHex: data.colorHex
      });
      
      if (!res.ok) {
        throw new Error("Erro ao salvar a entrada processada");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Entrada processada salva com sucesso:", data);
      
      // Limpar todos os dados da gravação
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
      setAudioBlob(null);
      setAudioId(null);
      setIsRecording(false);
      setProcessingFeedback(false);
      setProcessingStep(null);
      setProcessingProgress(0);
      setIsProcessingComplete(false);
      
      // Mostrar confirmação 
      toast({
        title: "Entrada registrada com sucesso",
        description: "Seu áudio foi processado e adicionado ao diário",
      });
      
      // Atualizar o cache de entradas de diário
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal-last-entry'] });
      
      // Redirecionar para o histórico após um breve delay
      setTimeout(() => {
        setLocation("/journal-history");
      }, 1000);
    },
    onError: (error: Error) => {
      console.error("Erro ao salvar entrada processada:", error);
      setProcessingFeedback(false);
      setProcessingStep("Erro ao salvar entrada");
      
      toast({
        title: "Erro ao salvar entrada",
        description: error.message || "Não foi possível salvar a entrada processada",
        variant: "destructive",
      });
    }
  });

  // Efeito para verificar o status do processamento
  useEffect(() => {
    // Se não temos audioId, não fazemos nada
    if (!audioId || isProcessingComplete) return;
    
    // Variável para controlar se o componente está montado
    let isMounted = true;
    let failedAttempts = 0;
    const MAX_RETRY_ATTEMPTS = 5;
    
    // Função para buscar status
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/processing-status/${audioId}`);
        
        // Se a resposta for 404, pode significar que o processamento não existe ou expirou
        if (res.status === 404) {
          failedAttempts++;
          console.log(`Status 404 para audioId ${audioId}. Tentativa ${failedAttempts} de ${MAX_RETRY_ATTEMPTS}`);
          
          if (failedAttempts >= MAX_RETRY_ATTEMPTS) {
            // Após várias tentativas, consideramos que o processamento falhou
            throw new Error("O processamento do áudio não está mais disponível");
          }
          
          // No iOS, alguns dispositivos podem ter problemas de conexão temporários
          // Continuamos tentando sem mostrar erro ainda
          return;
        }
        
        if (!res.ok) {
          throw new Error(`Erro ao verificar status de processamento (${res.status})`);
        }
        
        // Resetar contador de falhas quando obtemos uma resposta válida
        failedAttempts = 0;
        
        const status = await res.json();
        
        // Se o componente foi desmontado durante a requisição, não atualizamos o estado
        if (!isMounted) return;
        
        console.log("Status de processamento:", status);
        
        // Atualizar estado de progresso
        setProcessingProgress(status.progress);
        
        // Atualizar passo de acordo com o status
        if (status.status === 'queued') {
          setProcessingStep("Aguardando processamento...");
        } else if (status.status === 'transcribing') {
          setProcessingStep("Transcrevendo áudio...");
        } else if (status.status === 'analyzing') {
          setProcessingStep("Analisando sentimento...");
        } else if (status.status === 'categorizing') {
          setProcessingStep("Categorizando conteúdo...");
        } else if (status.status === 'generating-title') {
          setProcessingStep("Gerando título...");
        } else if (status.status === 'complete') {
          setProcessingStep("Processamento concluído!");
          setIsProcessingComplete(true);
          
          // Adicionar breve delay para mostrar a conclusão antes de mudar para o próximo passo
          setTimeout(() => {
            if (isMounted) {
              setProcessingStep("Preparando para salvar...");
              // Salvar a entrada processada
              saveProcessedEntryMutation.mutate({ 
                audioId, 
                mood, 
                audioUrl: audioUrl || null,
                colorHex: getColorForMood(mood)
              });
            }
          }, 1000);
        } else if (status.status === 'error') {
          setProcessingStep("Erro no processamento");
          toast({
            title: "Erro no processamento",
            description: status.error || "Ocorreu um erro durante o processamento do áudio",
            variant: "destructive",
          });
          setProcessingFeedback(false);
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error);
        
        // Após várias tentativas, mostrar erro para o usuário
        if (failedAttempts >= MAX_RETRY_ATTEMPTS && isMounted) {
          setProcessingFeedback(false);
          setProcessingStep("Erro no processamento");
          
          toast({
            title: "Erro no processamento de áudio",
            description: "Não foi possível processar o áudio. Por favor, tente novamente.",
            variant: "destructive",
          });
          
          // Limpar o audioId para evitar mais tentativas
          setAudioId(null);
        }
      }
    };
    
    // Verificar status imediatamente
    checkStatus();
    
    // Configurar intervalo para verificação periódica
    const intervalId = setInterval(checkStatus, 3000);
    
    // Limpar intervalo ao desmontar
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [audioId, isProcessingComplete, mood, audioUrl, saveProcessedEntryMutation, toast]);
  
  // Obter cor baseada no humor
  const getColorForMood = (mood: string) => {
    switch(mood.toLowerCase()) {
      case "feliz":
      case "happy":
      case "alegre": return "#86efac"; // Verde claro 
      case "triste":
      case "sad": return "#a1a1aa"; // Cinza
      case "ansioso":
      case "anxious": return "#fdba74"; // Laranja claro
      case "irritado":
      case "angry": 
      case "raiva": return "#fda4af"; // Vermelho claro
      case "calmo":
      case "calm": return "#a5b4fc"; // Lilás claro
      default: return "#7dd3fc"; // Azul claro padrão
    }
  };
  
  // Alternar entre entrada de voz e texto
  const toggleInputMode = () => {
    // Parar gravação se estiver ativa
    if (isRecording) {
      stopRecording();
    }
    
    // Se tiver áudio gravado, perguntar ao usuário
    if (audioUrl && !showTextInput) {
      if (confirm("Você tem uma gravação. Mudar para modo de texto irá descartá-la. Continuar?")) {
        setAudioUrl(null);
        setAudioBlob(null);
        setShowTextInput(true);
      }
    } else {
      // Simplesmente alternar o modo
      setShowTextInput(!showTextInput);
    }
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
        description: "Você precisa estar logado para criar entradas",
        variant: "destructive",
      });
      setProcessingFeedback(false);
      return;
    }
    
    createJournalEntryMutation.mutate({
      content: textContent,
      mood,
      userId: user.id,
      title: "Entrada de texto"
    });
  };

  // Versão simplificada do startRecording
  const startRecording = () => {
    console.log("Botão de gravação clicado");
    
    // Feedback inicial
    toast({
      title: "Iniciando gravação",
      description: "Solicitando acesso ao microfone...",
    });
    
    // Verificar suporte a MediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Dispositivo não compatível",
        description: "Seu navegador não suporta gravação de áudio",
        variant: "destructive",
      });
      return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        console.log("Acesso ao microfone concedido");
        
        // Criar gravador com configurações simples
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        mediaRecorderRef.current = recorder;
        
        // Configurar evento de dados disponíveis
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };
        
        // Configurar evento de início da gravação
        recorder.onstart = () => {
          console.log("Gravação iniciada");
          setIsRecording(true);
          setRecordingTime(0);
          
          // Iniciar timer para a gravação
          timerRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
          }, 1000);
          
          toast({
            title: "Gravação iniciada",
            description: "Fale o que deseja registrar em seu diário",
          });
        };
        
        // Configurar evento de parada da gravação
        recorder.onstop = () => {
          console.log("Gravação finalizada");
          
          // Parar o timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          // Liberar as faixas de áudio
          stream.getTracks().forEach(track => track.stop());
          
          // Verificar se temos dados
          if (chunksRef.current.length === 0) {
            toast({
              title: "Erro na gravação",
              description: "Nenhum áudio foi capturado",
              variant: "destructive",
            });
            setIsRecording(false);
            return;
          }
          
          // Criar o blob de áudio com tipo adequado e que seja compatível com OpenAI
          // OpenAI suporta: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
          const mimeType = isIOSRef.current ? 'audio/m4a' : 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          console.log("Tipo de mídia gerado:", mimeType, "Tamanho do blob:", blob.size);
          
          // Verificar tamanho mínimo
          if (blob.size < 1000) {
            toast({
              title: "Gravação muito curta",
              description: "Por favor, fale por mais tempo",
              variant: "destructive",
            });
            setIsRecording(false);
            return;
          }
          
          // Criar URL para o áudio e atualizar estado
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setAudioBlob(blob);
          setIsRecording(false);
          
          // Iniciar processamento automático
          setProcessingFeedback(true);
          setProcessingStep("Processando áudio...");
          transcribeAudioMutation.mutate({ audio: blob, mood });
        };
        
        // Iniciar a gravação
        recorder.start(200);
        
      })
      .catch(err => {
        console.error("Erro ao acessar microfone:", err);
        
        let message = "Não foi possível acessar o microfone";
        if (err.name === "NotAllowedError") {
          message = "Permissão de microfone negada. Por favor, permita o acesso.";
        }
        
        toast({
          title: "Erro de acesso",
          description: message,
          variant: "destructive",
        });
      });
  };

  // Versão simplificada do stopRecording
  const stopRecording = () => {
    if (!mediaRecorderRef.current) {
      console.error("Gravador não disponível");
      return;
    }
    
    if (mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      toast({
        title: "Gravação finalizada",
        description: "Processando o áudio...",
      });
    }
  };

  // Excluir áudio gravado
  const deleteAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioUrl(null);
    setAudioBlob(null);
  };

  // Formatar tempo de gravação
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Mutação para criar entrada de diário com texto
  const createJournalEntryMutation = useMutation({
    mutationFn: async (entry: InsertJournalEntry) => {
      const res = await apiRequest('POST', '/api/journal-entries', entry);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries/user'] });
      
      toast({
        title: "Entrada salva com sucesso",
        description: "Sua entrada foi adicionada ao diário",
      });
      
      // Limpar estados
      setAudioUrl(null);
      setAudioBlob(null);
      setTextContent('');
      setProcessingFeedback(false);
      setProcessingStep(null);
      
      // Redirecionar para o histórico após um breve delay
      setTimeout(() => {
        setLocation("/journal-history");
      }, 800);
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

  // Mutação para transcrever e processar áudio
  const transcribeAudioMutation = useMutation({
    mutationFn: async (data: { audio: Blob, mood: string }) => {
      // Verificação inicial do blob de áudio
      if (!data.audio) {
        throw new Error("Nenhum áudio para transcrever");
      }
      
      // Verificar tamanho mínimo do arquivo
      if (data.audio.size < 1000) {
        throw new Error("O arquivo de áudio é muito pequeno ou vazio");
      }
      
      // Atualizar feedback visual
      setProcessingStep("Enviando áudio...");
      
      // Determinar o tipo e extensão do arquivo de forma precisa
      let fileExtension = 'webm';
      let mimeType = data.audio.type || "audio/webm";
      
      console.log("Tipo MIME original do áudio:", mimeType);
      
      // Normalizar MIME type para iOS e outros dispositivos
      if (mimeType.includes('mp4') || mimeType.includes('x-m4a') || mimeType.includes('m4a')) {
        // Dispositivos iOS geralmente gravam em AAC dentro de contêiner MP4/M4A
        fileExtension = 'm4a'; 
        mimeType = 'audio/m4a';
      } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
        fileExtension = 'mp3';
        mimeType = 'audio/mp3';
      } else if (mimeType.includes('ogg') || mimeType.includes('opus')) {
        fileExtension = 'ogg';
        mimeType = 'audio/ogg';
      } else if (mimeType.includes('wav')) {
        fileExtension = 'wav';
        mimeType = 'audio/wav';
      } else {
        // Padrão para webm (mais compatível com OpenAI)
        fileExtension = 'webm';
        mimeType = 'audio/webm';
      }
      
      console.log(`Formato normalizado: .${fileExtension} (${mimeType})`);
      
      // Criar um arquivo com os metadados corretos e nome único
      const audioFile = new File([data.audio], `audio_${Date.now()}.${fileExtension}`, { 
        type: mimeType 
      });
      
      console.log(`Arquivo preparado: ${audioFile.name}, Tamanho: ${(audioFile.size / 1024).toFixed(2)} KB`);
      
      // Enviar e processar a resposta com tratamento de erros aprimorado
      try {
        setProcessingStep("Iniciando processamento...");
        
        // Enviar para o endpoint de entrada de diário com acompanhamento
        const formDataDirect = new FormData();
        formDataDirect.append("audio", audioFile);
        formDataDirect.append("mood", data.mood);
        formDataDirect.append("userId", String(user?.id || 1));
        formDataDirect.append("isIOS", String(navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')));
        formDataDirect.append("deviceInfo", navigator.userAgent);
        
        console.log("POST /api/journal-entries/audio-direct - Enviando request com informações extras");
        
        // Configurar timeout para evitar espera excessiva
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout
        
        // Enviar direto para o novo endpoint de entrada com acompanhamento
        const res = await apiRequest('POST', '/api/journal-entries/audio-direct', undefined, {
          body: formDataDirect,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Verificar se a resposta foi bem-sucedida
        if (!res.ok) {
          throw new Error("Erro ao enviar o áudio. Tente novamente.");
        }
        
        // Processar resposta
        const result = await res.json();
        console.log("Resposta do servidor (início do processamento):", result);
        
        // Armazenar o audioId para acompanhamento do progresso
        if (result.audioId) {
          setAudioId(result.audioId);
        } else {
          throw new Error("ID de áudio não recebido do servidor");
        }
        
        return result;
      } catch (error) {
        console.error("Erro no envio do áudio:", error);
        setProcessingStep("Erro no processamento");
        
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("Erro desconhecido ao processar o áudio");
        }
      }
    },
    onSuccess: (data) => {
      console.log("Áudio enviado com sucesso para processamento:", data);
      
      // Não limpar audioUrl ainda, pois precisamos dele para reprodução
      setProcessingStep("Processando áudio...");
      setProcessingProgress(10);
      
      // Não redirecionar ainda, aguardar o processo completo via polling
    },
    onError: (error: Error) => {
      console.error("Erro no envio do áudio:", error);
      setProcessingFeedback(false);
      setProcessingStep(null);
      setProcessingProgress(0);
      setAudioId(null);
      
      // Criar uma mensagem de erro mais amigável
      let errorMessage = "Não foi possível enviar seu áudio. Tente novamente.";
      
      if (error.message) {
        if (error.message.includes("muito pequeno")) {
          errorMessage = "A gravação é muito curta. Por favor, grave por mais tempo.";
        } else if (error.message.includes("não encontrado")) {
          errorMessage = "Houve um problema ao salvar o áudio. Tente novamente.";
        } else if (error.message.includes("transcrição falhou")) {
          errorMessage = "Não conseguimos entender a gravação. Tente falar mais claramente.";
        } else if (error.message.length < 100) {
          // Usar a mensagem original se não for muito longa
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Problema na gravação",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="container px-4 md:px-6 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
        Diário Pessoal
      </h1>
      
      <Card className="mb-6 shadow-md border-0 rounded-xl">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            {/* Seletor de humor */}
            <div className="w-full space-y-2">
              <label htmlFor="mood-select" className="text-sm font-medium">
                Como você está se sentindo?
              </label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger id="mood-select" className="w-full border-gray-200 rounded-xl h-10">
                  <SelectValue placeholder="Selecione seu humor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alegre">😊 Alegre</SelectItem>
                  <SelectItem value="calmo">😌 Calmo</SelectItem>
                  <SelectItem value="motivado">🚀 Motivado</SelectItem>
                  <SelectItem value="grato">🙏 Grato</SelectItem>
                  <SelectItem value="neutro">😐 Neutro</SelectItem>
                  <SelectItem value="ansioso">😰 Ansioso</SelectItem>
                  <SelectItem value="triste">😢 Triste</SelectItem>
                  <SelectItem value="raiva">😡 Com raiva</SelectItem>
                  <SelectItem value="frustrado">😤 Frustrado</SelectItem>
                  <SelectItem value="confuso">😕 Confuso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão para alternar entre modo de voz e texto */}
            <Button 
              variant="outline" 
              className="w-full rounded-xl border-gray-200"
              onClick={toggleInputMode}
              type="button"
            >
              {showTextInput ? (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  <span>Usar Voz</span>
                </>
              ) : (
                <>
                  <Text className="w-4 h-4 mr-2" />
                  <span>Usar Texto</span>
                </>
              )}
            </Button>
            
            {/* Modo de texto */}
            {showTextInput ? (
              <div className="space-y-4">
                <Textarea
                  placeholder="Escreva sobre como você está se sentindo..."
                  className="min-h-[150px] rounded-xl border-gray-200 resize-none"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
                
                <Button 
                  className="w-full rounded-xl"
                  onClick={processTextInput}
                  disabled={processingFeedback || !textContent.trim()}
                  type="button"
                >
                  {processingFeedback ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      <span>Salvar</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Modo de voz - VERSÃO SIMPLIFICADA E ROBUSTA
              <div className="space-y-4">
                {!audioUrl ? (
                  // Interface de gravação simplificada
                  <div className="flex flex-col items-center space-y-4">
                    {/* Botão direto sem aninhamentos desnecessários */}
                    <div className="relative">
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={processingFeedback}
                        className={`w-24 h-24 rounded-full text-white flex items-center justify-center shadow-lg ${
                          isRecording ? 'bg-red-500 animate-pulse' : 'bg-primary'
                        }`}
                        type="button"
                      >
                        {isRecording ? (
                          <MicOff className="w-12 h-12" />
                        ) : (
                          <Mic className="w-12 h-12" />
                        )}
                      </button>
                    </div>
                    
                    <div className="text-center">
                      {isRecording ? (
                        <>
                          <div className="font-semibold text-lg">{formatTime(recordingTime)}</div>
                          <p className="text-sm text-gray-500">Toque para parar</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">Toque para iniciar gravação</p>
                      )}
                    </div>
                  </div>
                ) : (
                  // Interface de áudio gravado
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <audio 
                        src={audioUrl} 
                        controls 
                        className="w-full max-w-xs rounded-lg" 
                        controlsList="nodownload"
                      />
                    </div>
                    
                    {!processingFeedback && (
                      <Button 
                        variant="destructive"
                        className="w-full rounded-xl"
                        onClick={deleteAudio}
                        type="button"
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        <span>Excluir gravação</span>
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Interface de processamento e acompanhamento de progresso */}
                {processingFeedback && (
                  <div className="flex flex-col items-center space-y-4">
                    {!audioId ? (
                      <div className="w-full max-w-xs space-y-4">
                        {/* Animação de carregamento inicial */}
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                        <p className="text-sm font-medium text-center">Preparando seu áudio...</p>
                      </div>
                    ) : (
                      <div className="w-full max-w-xs space-y-4">
                        {/* Título do processamento */}
                        <h3 className="text-lg font-semibold text-center">Processando Áudio</h3>
                        
                        {/* Componente de status de processamento */}
                        <AudioProcessingStatus 
                          audioId={audioId}
                          onComplete={(entryId) => {
                            console.log("Processamento concluído, entrada:", entryId);
                            setIsProcessingComplete(true);
                            
                            // Adicionar breve delay antes de redirecionar
                            setTimeout(() => {
                              // Limpar todos os dados da gravação
                              if (audioUrl) {
                                URL.revokeObjectURL(audioUrl);
                              }
                              setAudioUrl(null);
                              setAudioBlob(null);
                              setAudioId(null);
                              setIsRecording(false);
                              setProcessingFeedback(false);
                              setProcessingStep(null);
                              setProcessingProgress(0);
                              setIsProcessingComplete(false);
                              
                              // Atualizar o cache de entradas
                              queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
                              queryClient.invalidateQueries({ queryKey: ['/api/journal-entries/user'] });
                              queryClient.invalidateQueries({ queryKey: ['/api/journal-last-entry'] });
                              
                              // Mostrar confirmação
                              toast({
                                title: "Entrada registrada com sucesso",
                                description: "Seu áudio foi processado e adicionado ao diário",
                              });
                              
                              // Redirecionar para o histórico
                              setLocation(`/journal-history`);
                            }, 1000);
                          }}
                          className="mt-2"
                        />
                        
                        {/* Descrição adicional */}
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Seu áudio está sendo processado com inteligência artificial.<br />
                          Isso inclui transcrição, análise de sentimento e categorização.
                        </p>
                        
                        {/* Botão para cancelar (opcional) */}
                        {!isProcessingComplete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full rounded-xl"
                            onClick={() => {
                              // Limpar estados de processamento
                              setProcessingFeedback(false);
                              setProcessingStep(null);
                              setProcessingProgress(0);
                              setAudioId(null);
                              setIsProcessingComplete(false);
                              
                              toast({
                                title: "Processamento cancelado",
                                description: "O processamento de áudio foi cancelado"
                              });
                            }}
                          >
                            Cancelar processamento
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}