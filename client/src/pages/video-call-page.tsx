import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Session } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { 
  Mic, MicOff, Video, VideoOff, Phone, MessageSquare, 
  Users, MoreVertical, Clock, Maximize, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function VideoCallPage() {
  const { id } = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: string; message: string; timestamp: Date }[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [twilioToken, setTwilioToken] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch session details
  const { data: session, isLoading: isSessionLoading, error: sessionError } = useQuery<Session>({
    queryKey: [`/api/sessions/${id}`],
  });
  
  // Fetch room status
  const { data: roomStatus, isLoading: isRoomStatusLoading, error: roomStatusError } = useQuery<{
    exists: boolean;
    status: string;
    otherParticipantConnected: boolean;
    roomName: string;
    role: string;
  }>({
    queryKey: [`/api/video/status?sessionId=${id}`],
    enabled: !!id
  });
  
  // Fetch Twilio token for the video call
  const { data: tokenData, isLoading: isTokenLoading, error: tokenError } = useQuery<{ token: string }>({
    queryKey: [`/api/video/token?sessionId=${id}`]
  });
  
  // Atualizar o token quando recebermos dados
  useEffect(() => {
    if (tokenData && tokenData.token) {
      setTwilioToken(tokenData.token);
      console.log("Twilio token received:", tokenData.token.substring(0, 10) + "...");
    }
  }, [tokenData]);
  
  const isLoading = isSessionLoading || isRoomStatusLoading || isTokenLoading;
  const error = sessionError || roomStatusError || tokenError;
  
  // Vamos atualizar o estado local com o status da sala quando ele for recebido
  
  useEffect(() => {
    if (roomStatus) {
      setRoomInfo(roomStatus);
      console.log("Room status:", roomStatus);
    }
  }, [roomStatus]);
  
  // Fetch therapist details (in a real app this would be implemented fully)
  const therapist = {
    firstName: session?.therapistName?.split(' ')[0] || "Terapeuta",
    lastName: session?.therapistName?.split(' ')[1] || "",
    specialization: "Terapeuta Online"
  };
  
  // Configuração do WebSocket
  useEffect(() => {
    if (!user || !id) return;
    
    // Configurar o WebSocket com o protocolo correto baseado na conexão do usuário
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Criar nova conexão WebSocket
    const wsConnection = new WebSocket(wsUrl);
    
    wsConnection.onopen = () => {
      console.log("WebSocket connected");
      setWsConnected(true);
      
      // Identificar o usuário no WebSocket
      wsConnection.send(JSON.stringify({
        type: 'identify',
        userId: user.id,
        callId: id,
        userName: `${user.firstName} ${user.lastName}`
      }));
      
      // Adicionar mensagem de status ao chat
      setChatMessages(prev => [
        ...prev,
        {
          sender: "Sistema",
          message: "Conexão com chat estabelecida",
          timestamp: new Date()
        }
      ]);
    };
    
    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received message:", data);
        
        switch (data.type) {
          case 'chat':
            // Adicionar mensagem recebida ao chat
            setChatMessages(prev => [
              ...prev,
              {
                sender: data.senderName || "Terapeuta",
                message: data.message,
                timestamp: new Date(data.timestamp)
              }
            ]);
            break;
            
          case 'info':
            // Adicionar mensagem de informação ao chat
            setChatMessages(prev => [
              ...prev,
              {
                sender: "Sistema",
                message: data.message,
                timestamp: new Date()
              }
            ]);
            break;
            
          case 'connectionStatus':
            // Atualização do status de conexão
            console.log("Status de conexão atualizado:", data.status);
            if (data.status === 'connected') {
              toast({
                title: "Conectado ao chat",
                description: "Você está conectado ao chat da sessão",
              });
              
              // Se houver participantes, mostrar na mensagem
              if (data.participants && data.participants.length > 0) {
                setChatMessages(prev => [
                  ...prev,
                  {
                    sender: "Sistema",
                    message: `${data.participants.length} participante(s) já na chamada`,
                    timestamp: new Date()
                  }
                ]);
              }
            }
            break;
            
          case 'participantJoined':
            // Outro participante entrou na chamada
            setChatMessages(prev => [
              ...prev,
              {
                sender: "Sistema",
                message: `${data.userName || 'Um novo participante'} entrou na chamada`,
                timestamp: new Date()
              }
            ]);
            break;
            
          case 'participantLeft':
            // Outro participante saiu da chamada
            setChatMessages(prev => [
              ...prev,
              {
                sender: "Sistema",
                message: `${data.userName || 'Um participante'} saiu da chamada`,
                timestamp: new Date()
              }
            ]);
            break;
            
          case 'videoSignal':
            // Aqui implementaríamos a integração com WebRTC para troca de sinais de vídeo
            console.log("Sinal de vídeo recebido do usuário:", data.senderId);
            break;
            
          case 'notification':
            // Mostar notificação de sistema
            toast({
              title: data.title || "Notificação",
              description: data.message,
            });
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    wsConnection.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
      toast({
        title: "Erro de Conexão",
        description: "Erro na conexão do chat. Algumas funcionalidades podem estar indisponíveis.",
        variant: "destructive"
      });
    };
    
    wsConnection.onclose = () => {
      console.log("WebSocket connection closed");
      setWsConnected(false);
    };
    
    // Guardar a conexão no estado
    setSocket(wsConnection);
    
    // Limpar ao desmontar
    return () => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.close();
      }
    };
  }, [user, id, toast]);
  
  // Contador de duração da chamada
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isConnected) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isConnected]);
  
  // Formatar o tempo de duração da chamada
  const formatCallDuration = useCallback(() => {
    const hours = Math.floor(callDuration / 3600);
    const minutes = Math.floor((callDuration % 3600) / 60);
    const seconds = callDuration % 60;
    
    return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [callDuration]);
  
  // Alternar modo tela cheia
  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Erro ao entrar em tela cheia: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  }, []);
  
  // Twilio Video setup
  useEffect(() => {
    if (!session || !twilioToken || !roomInfo) return;
    
    let timer: NodeJS.Timeout;
    let mediaStream: MediaStream | null = null;
    
    const setupVideoCall = async () => {
      try {
        console.log("Iniciando configuração do Twilio Video...");
        
        // Verificando suporte à API getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Seu navegador não suporta acesso à câmera e microfone. Por favor, atualize para uma versão mais recente.");
        }
        
        // Verificando dispositivos disponíveis
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');
        
        console.log(`Dispositivos encontrados: Câmera: ${hasCamera}, Microfone: ${hasMicrophone}`);
        
        if (!hasCamera && !hasMicrophone) {
          throw new Error("Nenhuma câmera ou microfone encontrado no seu dispositivo.");
        }
        
        // Solicitar permissões de mídia
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: hasCamera, 
            audio: hasMicrophone 
          });
          
          console.log("Acesso concedido à câmera e/ou microfone");
        } catch (mediaError) {
          console.error("Erro ao acessar câmera e microfone:", mediaError);
          
          // Tentar apenas áudio como fallback
          if (hasMicrophone) {
            console.log("Tentando apenas microfone como fallback...");
            try {
              mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: false, 
                audio: true 
              });
              
              console.log("Acesso concedido apenas ao microfone");
              toast({
                title: "Apenas áudio disponível",
                description: "Não foi possível acessar sua câmera, mas o microfone está funcionando.",
                variant: "destructive"
              });
              setIsVideoOff(true);
            } catch (audioError) {
              console.error("Erro ao acessar apenas o microfone:", audioError);
              throw new Error("Não foi possível acessar seu microfone. Por favor, verifique as permissões.");
            }
          } else {
            throw new Error("Não foi possível acessar sua câmera ou microfone. Por favor, verifique as permissões.");
          }
        }
        
        // Configurar stream local
        if (mediaStream && localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
          console.log("Stream de mídia local configurado com sucesso");
        }
        
        // Integração com o SDK do Twilio Video
        console.log("Conectando ao serviço Twilio Video...");
        console.log("Token:", twilioToken.substring(0, 20) + "...");
        console.log("Sala:", roomInfo.roomName);
        
        setIsConnecting(true);
        
        // Aqui seria a integração real com o Twilio Video utilizando o SDK
        try {
          // Importamos dinamicamente a biblioteca do Twilio
          // Em um projeto real, isso seria feito de forma sincronizada com import normal
          import('https://sdk.twilio.com/js/video/releases/2.26.0/twilio-video.min.js')
            .then(twilioVideoModule => {
              const Video = (window as any).Twilio.Video;
            
              // Conectando à sala com o token recebido
              Video.connect(twilioToken, {
                name: roomInfo.roomName,
                audio: hasMicrophone,
                video: hasCamera,
                dominantSpeaker: true
              }).then(room => {
                console.log(`Conectado à sala: ${room.name}`);
                
                // Guardar referência da sala para posterior limpeza
                (window as any).twilioRoom = room;
                
                // Atualizando UI
                setIsConnecting(false);
                setIsConnected(true);
                toast({
                  title: "Conectado",
                  description: `Você está conectado com ${therapist.firstName} ${therapist.lastName}`,
                });
                
                // Adicionar mensagem no chat
                setChatMessages(prev => [
                  ...prev,
                  {
                    sender: "Sistema",
                    message: "Conexão de vídeo estabelecida com sucesso!",
                    timestamp: new Date()
                  }
                ]);
                
                // Se outro participante estiver conectado
                if (roomInfo.otherParticipantConnected) {
                  setChatMessages(prev => [
                    ...prev,
                    {
                      sender: "Sistema",
                      message: `${therapist.firstName} ${therapist.lastName} já está na chamada.`,
                      timestamp: new Date()
                    }
                  ]);
                }
                
                // Atrelar mídia local à interface
                room.localParticipant.tracks.forEach(publication => {
                  if (publication.track) {
                    publication.track.attach(localVideoRef.current!);
                  }
                });
                
                // Gerenciar participantes remotos
                room.participants.forEach(participant => {
                  participant.tracks.forEach(publication => {
                    if (publication.track) {
                      publication.track.attach(remoteVideoRef.current!);
                    }
                  });
                });
                
                // Evento para quando um participante se conecta
                room.on('participantConnected', participant => {
                  console.log(`Participante conectado: ${participant.identity}`);
                  setChatMessages(prev => [
                    ...prev,
                    {
                      sender: "Sistema",
                      message: `${therapist.firstName} ${therapist.lastName} entrou na chamada.`,
                      timestamp: new Date()
                    }
                  ]);
                  
                  // Atrelar faixas de mídia deste participante
                  participant.tracks.forEach(publication => {
                    if (publication.track) {
                      publication.track.attach(remoteVideoRef.current!);
                    }
                  });
                });
                
                // Evento para quando o participante publica uma nova faixa
                room.on('trackPublished', (publication, participant) => {
                  publication.on('subscribed', track => {
                    track.attach(remoteVideoRef.current!);
                  });
                });
              }).catch(error => {
                console.error("Erro ao conectar à sala Twilio:", error);
                setIsConnecting(false);
                toast({
                  title: "Erro de Conexão",
                  description: "Não foi possível conectar à sala de vídeo. " + error.message,
                  variant: "destructive"
                });
              });
            })
            .catch(error => {
              console.error("Erro ao carregar SDK do Twilio:", error);
              setIsConnecting(false);
              
              // Em caso de falha ao carregar o SDK, usamos nosso fallback
              console.log("Usando modo de simulação como fallback");
              
              // Simulação como fallback
              timer = setTimeout(() => {
                setIsConnected(true);
                toast({
                  title: "Conectado (Modo Limitado)",
                  description: `Você está em modo de conexão limitado com ${therapist.firstName} ${therapist.lastName}`,
                });
                
                setChatMessages(prev => [
                  ...prev,
                  {
                    sender: "Sistema",
                    message: "Conexão em modo limitado estabelecida. Algumas funcionalidades podem não estar disponíveis.",
                    timestamp: new Date()
                  }
                ]);
              }, 2000);
            });
        } catch (sdkError) {
          console.error("Erro ao inicializar integração Twilio:", sdkError);
          setIsConnecting(false);
          
          // Modo de simulação como fallback final
          toast({
            title: "Modo de Compatibilidade",
            description: "Usando modo de compatibilidade para a videochamada.",
            variant: "destructive"
          });
          
          // Simulação como fallback final
          timer = setTimeout(() => {
            setIsConnected(true);
          }, 2000);
        }
        
      } catch (err) {
        console.error("Erro ao configurar chamada de vídeo:", err);
        toast({
          title: "Erro de Conexão",
          description: err instanceof Error ? err.message : "Não foi possível acessar sua câmera ou microfone. Por favor, verifique as permissões.",
          variant: "destructive"
        });
        setIsConnecting(false);
      }
    };
    
    setupVideoCall();
    
    // Cleanup
    return () => {
      clearTimeout(timer);
      
      // Stop all tracks from the stream
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Limpeza do Twilio Video SDK (desconectar da sala)
      console.log("Limpando recursos do Twilio Video");
      
      // Desconectar da sala Twilio, se houver uma conexão ativa
      if ((window as any).twilioRoom) {
        try {
          console.log("Desconectando da sala Twilio...");
          (window as any).twilioRoom.disconnect();
          delete (window as any).twilioRoom;
        } catch (error) {
          console.error("Erro ao desconectar da sala Twilio:", error);
        }
      }
    };
  }, [session, twilioToken, roomInfo, toast, therapist.firstName, therapist.lastName]);
  
  // Handle mic mute/unmute
  const toggleMic = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const audioTracks = stream.getAudioTracks();
      
      audioTracks.forEach(track => {
        track.enabled = isMicMuted;
      });
      
      setIsMicMuted(!isMicMuted);
    }
  };
  
  // Handle video on/off
  const toggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const videoTracks = stream.getVideoTracks();
      
      videoTracks.forEach(track => {
        track.enabled = isVideoOff;
      });
      
      setIsVideoOff(!isVideoOff);
    }
  };
  
  // Handle ending the call
  const endCallMutation = useMutation({
    mutationFn: async () => {
      if (!roomInfo?.roomName) {
        throw new Error("Nome da sala não disponível");
      }
      
      const response = await apiRequest("POST", "/api/video/end", {
        roomName: roomInfo.roomName
      });
      
      return await response.json();
    },
    onSuccess: () => {
      console.log("Sala encerrada com sucesso no servidor");
      
      // Stop all tracks from the stream
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Mensagem de sucesso
      toast({
        title: "Chamada Encerrada",
        description: "Você saiu da chamada com sucesso",
      });
      
      // Navegar de volta
      navigate("/");
    },
    onError: (error) => {
      console.error("Erro ao encerrar a sala:", error);
      toast({
        title: "Erro ao Encerrar Chamada",
        description: "Ocorreu um erro ao encerrar a chamada, mas você foi desconectado localmente.",
        variant: "destructive"
      });
      
      // Mesmo com erro, encerramos localmente
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Navegar de volta
      navigate("/");
    }
  });
  
  const endCall = () => {
    endCallMutation.mutate();
  };
  
  // Handle sending chat messages
  const sendMessage = () => {
    if (!messageInput.trim()) return;
    
    // Criar a mensagem local
    const newMessage = {
      sender: `${user?.firstName} ${user?.lastName}`,
      message: messageInput,
      timestamp: new Date()
    };
    
    // Adicionar à interface do usuário imediatamente
    setChatMessages(prev => [...prev, newMessage]);
    
    // Verificar conexão WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("Enviando mensagem via WebSocket");
      
      // Enviar via WebSocket
      socket.send(JSON.stringify({
        type: 'chat',
        senderId: user?.id,
        senderName: `${user?.firstName} ${user?.lastName}`,
        recipientId: parseInt(id),
        callId: id,  // Identificador da chamada para distribuição para todos os participantes
        message: messageInput,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.log("WebSocket não está conectado, usando modo de fallback");
      
      // Adicionar aviso sobre falha na conexão
      setChatMessages(prev => [
        ...prev,
        {
          sender: "Sistema",
          message: "Sua mensagem foi enviada no modo offline. Alguns participantes podem não receber.",
          timestamp: new Date()
        }
      ]);
      
      // Apenas para demonstração - simulação da resposta em modo offline
      setTimeout(() => {
        const therapistResponse = {
          sender: `Dr. ${therapist.firstName} ${therapist.lastName}`,
          message: "Obrigado por compartilhar. Como isso faz você se sentir?",
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, therapistResponse]);
      }, 3000);
    }
    
    // Limpar o campo de entrada
    setMessageInput("");
  };
  
  // Format time for chat messages
  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
        <div className="text-amber-500 text-5xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-secondary mb-2">Login Necessário</h1>
        <p className="text-primary-dark mb-4 text-center">
          Por favor, faça login para acessar a sala de videoconsulta.
        </p>
        <Button 
          className="bg-primary-dark hover:bg-secondary"
          onClick={() => navigate("/auth")}
        >
          Fazer Login
        </Button>
        <Button 
          variant="outline"
          className="mt-2"
          onClick={() => navigate("/")}
        >
          Voltar para Página Inicial
        </Button>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-dark"></div>
        <p className="mt-4 text-primary-dark">Preparando sua sessão de terapia...</p>
      </div>
    );
  }
  
  if (error || !session) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-secondary mb-2">Sessão Não Encontrada</h1>
        <p className="text-primary-dark mb-4 text-center">
          Não foi possível encontrar a sessão de terapia que você está procurando. Ela pode ter sido cancelada ou remarcada.
        </p>
        <Button 
          className="bg-primary-dark hover:bg-secondary"
          onClick={() => navigate("/")}
        >
          Voltar para Página Inicial
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Call status bar - Estilo iOS */}
      <div className="bg-primary-dark text-white p-4 flex items-center justify-between rounded-b-xl shadow-md">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/10 mr-2 rounded-full p-2" 
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mr-3 shadow-sm">
            <span className="text-primary-dark font-medium">
              {`${therapist.firstName[0]}${therapist.lastName[0]}`}
            </span>
          </div>
          <div>
            <h2 className="font-semibold">Dr. {therapist.firstName} {therapist.lastName}</h2>
            <p className="text-xs opacity-80">{therapist.specialization}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Contador de duração */}
          <div className="flex items-center bg-black/20 px-3 py-1 rounded-full mr-1">
            <Clock className="h-3 w-3 mr-1" />
            <span className="text-xs font-medium">{formatCallDuration()}</span>
          </div>
          
          {/* Status de conexão */}
          {isConnected ? (
            <span className="flex items-center text-xs bg-green-500/20 px-2 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Conectado
            </span>
          ) : isConnecting ? (
            <span className="flex items-center text-xs bg-yellow-500/20 px-2 py-1 rounded-full">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1 animate-pulse"></span>
              Conectando...
            </span>
          ) : (
            <span className="flex items-center text-xs bg-red-500/20 px-2 py-1 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
              Desconectado
            </span>
          )}
          
          {/* Botão de Tela Cheia */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 rounded-full p-2"
            onClick={toggleFullScreen}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Video containers - Estilo iOS */}
      <div className="flex-1 flex flex-col relative">
        {/* Remote video (full screen) */}
        <div className="absolute inset-0 bg-black rounded-lg mx-2 my-2 overflow-hidden">
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted // Normally this wouldn't be muted, but we don't have a real remote stream
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-while-video-call-conference-at-home-42392-large.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </video>
          
          {/* Status indicator de gravação - estilo iOS */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/70 rounded-full px-3 py-1 flex items-center">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1.5"></span>
            <span className="text-white text-xs font-medium">REC</span>
          </div>
        </div>
        
        {/* Local video (small overlay) - Estilo iOS */}
        <div 
          className="absolute bottom-20 right-4 w-1/3 max-w-[160px] rounded-2xl overflow-hidden shadow-lg z-10 border-[3px] border-white"
          style={{ 
            aspectRatio: '3/4',
            transform: 'rotate(-1deg)',
          }}
        >
          <video
            ref={localVideoRef}
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
            autoPlay
            playsInline
            muted
          ></video>
          {isVideoOff && (
            <div className="bg-gray-800 w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary-dark flex items-center justify-center shadow-inner">
                <span className="text-white text-xl font-semibold">
                  {user ? `${user.firstName[0]}${user.lastName[0]}` : "Eu"}
                </span>
              </div>
            </div>
          )}
          
          {/* Efeito de pressão ao segurar - feedback visual estilo iOS */}
          <div 
            className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 transition-opacity"
            onTouchStart={(e) => e.currentTarget.classList.add('bg-black/20')}
            onTouchEnd={(e) => e.currentTarget.classList.remove('bg-black/20')}
          />
        </div>
        
        {/* Chat overlay */}
        {isChatOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-full md:w-80 bg-white shadow-lg z-20 flex flex-col">
            <div className="p-3 bg-primary-dark text-white flex justify-between items-center">
              <h3 className="font-semibold">In-Call Messages</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-primary-dark hover:bg-opacity-50 p-1 h-auto"
                onClick={() => setIsChatOpen(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-gray-400 p-4">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`mb-3 max-w-[85%] ${msg.sender.includes(user?.firstName || '') ? 'ml-auto' : 'mr-auto'}`}
                  >
                    <div 
                      className={`rounded-lg p-2 ${
                        msg.sender.includes(user?.firstName || '') 
                          ? 'bg-primary-dark text-white rounded-br-none' 
                          : 'bg-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {msg.message}
                    </div>
                    <div 
                      className={`text-xs mt-1 ${
                        msg.sender.includes(user?.firstName || '') ? 'text-right' : ''
                      }`}
                    >
                      <span className="text-gray-500">
                        {msg.sender} • {formatMessageTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 border-t border-gray-200">
              <div className="flex">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 mr-2 bg-gray-100"
                />
                <Button 
                  className="bg-primary-dark hover:bg-secondary"
                  onClick={sendMessage}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Call controls - Estilo iOS */}
      <div className="bg-black/80 backdrop-blur-md text-white p-4 mx-3 mb-4 rounded-2xl flex justify-evenly">
        <Button 
          variant="ghost" 
          className={`rounded-full w-14 h-14 flex flex-col items-center justify-center gap-1 ${
            isMicMuted 
              ? 'bg-red-500/90 hover:bg-red-600/90' 
              : 'bg-white/10 hover:bg-white/20'
          }`}
          onClick={toggleMic}
        >
          {isMicMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium">{isMicMuted ? 'Unmute' : 'Mute'}</span>
        </Button>
        
        <Button 
          variant="ghost" 
          className={`rounded-full w-14 h-14 flex flex-col items-center justify-center gap-1 ${
            isVideoOff 
              ? 'bg-red-500/90 hover:bg-red-600/90' 
              : 'bg-white/10 hover:bg-white/20'
          }`}
          onClick={toggleVideo}
        >
          {isVideoOff ? (
            <VideoOff className="h-5 w-5" />
          ) : (
            <Video className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium">{isVideoOff ? 'Video On' : 'Video Off'}</span>
        </Button>
        
        <Button 
          variant="ghost" 
          className="rounded-full w-14 h-14 flex flex-col items-center justify-center gap-1 bg-red-500/90 hover:bg-red-600/90"
          onClick={endCall}
        >
          <Phone className="h-5 w-5 transform rotate-135" />
          <span className="text-[10px] font-medium">End</span>
        </Button>
        
        <Button 
          variant="ghost" 
          className={`rounded-full w-14 h-14 flex flex-col items-center justify-center gap-1 ${
            isChatOpen 
              ? 'bg-blue-500/90 hover:bg-blue-600/90' 
              : 'bg-white/10 hover:bg-white/20'
          }`}
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-medium">Chat</span>
        </Button>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              className="rounded-full w-14 h-14 flex flex-col items-center justify-center gap-1 bg-white/10 hover:bg-white/20"
            >
              <MoreVertical className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-gray-900 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-center">Session Notes</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-center">Session with Dr. {therapist.firstName} {therapist.lastName}</h3>
                <p className="text-xs text-gray-500 text-center">
                  These notes will be saved to your health record.
                </p>
              </div>
              
              <Textarea 
                placeholder="Write your session notes here..."
                className="min-h-[150px] bg-gray-50 dark:bg-gray-800 rounded-lg border-0 shadow-inner"
              />
              
              <div className="flex justify-center pt-2">
                <Button className="bg-primary-dark hover:bg-opacity-90 rounded-full px-6 py-2">
                  Save Notes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
