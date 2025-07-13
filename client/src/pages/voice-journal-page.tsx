import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { JournalEntry as JournalEntryType, InsertJournalEntry } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Mic, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VoiceJournalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<string>("calmo");
  const [showRequests, setShowRequests] = useState(true);
  const [showRequestsCount, setShowRequestsCount] = useState(2);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  
  // Fetch recent journal entries
  const { data: journalEntries = [] } = useQuery<JournalEntryType[]>({
    queryKey: ["/api/journal"],
    enabled: !!user,
  });
  
  // Sort entries by date (newest first)
  const recentEntries = [...journalEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  // Upload audio and create entry mutation
  const uploadAudioMutation = useMutation({
    mutationFn: async ({ 
      audioBlob, 
      userId, 
      text, 
      mood, 
      duration
    }: { 
      audioBlob: Blob | null;
      userId: number;
      text: string; 
      mood: string;
      duration?: number;
    }) => {
      let audioUrl = null;
      
      // Se houver um arquivo de áudio, fazer upload primeiro
      if (audioBlob) {
        const formData = new FormData();
        formData.append("audio", audioBlob, "journal-audio.wav");
        formData.append("userId", String(userId));
        
        const uploadResponse = await apiRequest("POST", "/api/upload/audio", undefined, {
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error("Falha ao fazer upload do áudio");
        }
        
        const uploadData = await uploadResponse.json();
        audioUrl = uploadData.audioUrl;
      }
      
      // Criar a entrada no diário
      const journalEntry: InsertJournalEntry = {
        userId,
        content: text || "Nota de voz",
        mood,
        audioUrl,
        audioDuration: duration
      };
      
      const res = await apiRequest("POST", "/api/journal", journalEntry);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      
      toast({
        title: "Nota salva",
        description: "Sua anotação de voz foi salva com sucesso."
      });
      
      // Limpar os estados
      setAudioBlob(null);
      setAudioUrl(null);
      setText("");
      setRecordingTime(0);
    },
    onError: (error: Error) => {
      console.error("Erro ao salvar nota:", error);
      toast({
        title: "Erro ao salvar nota",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Limpar quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };
      
      // Iniciar a gravação
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Iniciar o timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
      
      // Ocultar as requests enquanto grava
      setShowRequests(false);
      
    } catch (error) {
      console.error("Erro ao iniciar a gravação:", error);
      toast({
        title: "Erro ao iniciar gravação",
        description: "Não foi possível acessar o microfone.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Parar o timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Parar todas as faixas de áudio
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Mostrar as requests novamente
      setShowRequests(true);
    }
  };

  const saveRecording = () => {
    if (!user) return;
    
    if (audioBlob) {
      uploadAudioMutation.mutateAsync({
        audioBlob,
        userId: user.id,
        text: text || "Nota de voz",
        mood,
        duration: recordingTime
      });
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    setIsRecording(false);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    setText("");
    setShowRequests(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Obter data mais recente para o cabeçalho
  const now = new Date();
  
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center p-6 pt-10 pb-2">
        <div className="flex flex-col">
          <div className="text-xl font-bold">{now.getHours()}:{now.getMinutes() < 10 ? '0' : ''}{now.getMinutes()}</div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-white rounded-full"></div>
          <div className="w-4 h-4 bg-white rounded-full"></div>
          <div className="w-4 h-4 bg-white rounded-full"></div>
          <div className="w-4 h-4 bg-white rounded-full"></div>
        </div>
        <button className="text-white">
          <X className="h-6 w-6" />
        </button>
      </div>
      
      {/* Área principal */}
      <div className="flex-1 p-6 pt-2 overflow-auto flex flex-col">
        {/* Avatar e saudação */}
        <div className="flex items-start mb-4">
          <div className="w-12 h-12 bg-teal-400 rounded-full overflow-hidden mr-3">
            {user?.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt={user.firstName} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-teal-400 text-white text-xl font-bold">
                {user?.firstName?.[0] || 'U'}
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-4xl font-bold mb-1">
              Hey {user?.firstName || 'você'},
            </h1>
            <h2 className="text-4xl font-bold mb-6">
              o que posso ajudar?
            </h2>
            
            {showRequests && (
              <div className="text-teal-400 mb-6">
                {showRequestsCount} {showRequestsCount === 1 ? 'Solicitação' : 'Solicitações'} em progresso
              </div>
            )}
          </div>
        </div>
        
        {/* Histórico de diário recente */}
        {showRequests && recentEntries.length > 0 && (
          <div className="mb-8 space-y-2">
            {recentEntries.slice(0, showRequestsCount).map(entry => (
              <div 
                key={entry.id} 
                className="bg-gray-900 rounded-xl p-4 mb-2 border border-gray-800"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-gray-400">
                    {formatDistanceToNow(new Date(entry.date), { locale: ptBR, addSuffix: true })}
                  </div>
                  <div className="px-2 py-1 rounded-full bg-gray-800 text-xs">
                    {entry.mood}
                  </div>
                </div>
                <p className="mb-2 text-gray-200">{entry.content}</p>
                {entry.audioUrl && (
                  <audio src={entry.audioUrl} controls className="w-full h-10 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Área de gravação atual */}
        {isRecording && (
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-pulse flex items-center justify-center h-24 w-24 rounded-full bg-teal-900 mb-4">
                <Mic className="h-12 w-12 text-teal-400" />
              </div>
              <p className="text-2xl font-bold mb-2">{formatTime(recordingTime)}</p>
              <p className="text-gray-400">Gravando...</p>
            </div>
          </div>
        )}
        
        {audioUrl && !isRecording && (
          <div className="my-4">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <audio src={audioUrl} controls className="w-full mb-3" />
              <div className="flex gap-2">
                <Button 
                  onClick={cancelRecording}
                  variant="outline" 
                  className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                >
                  Descartar
                </Button>
                <Button 
                  onClick={saveRecording}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={uploadAudioMutation.isPending}
                >
                  {uploadAudioMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : "Salvar Nota"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Área de entrada */}
      <div className="p-6 pb-8 border-t border-gray-900">
        <div className="relative">
          <div className="flex items-center bg-gray-900 p-4 rounded-full border border-gray-800">
            <input 
              type="text"
              className="flex-1 bg-transparent outline-none text-gray-300 placeholder-gray-500"
              placeholder="Comece a escrever ou falar..."
              disabled={isRecording || !!audioUrl}
            />
            
            <button 
              className={`ml-2 w-12 h-12 rounded-full flex items-center justify-center ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!!audioUrl || uploadAudioMutation.isPending}
            >
              <Mic className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Indicadores na parte inferior */}
      <div className="flex justify-center pb-8">
        <div className="w-8 h-1 bg-gray-700 rounded-full mx-1"></div>
        <div className="w-8 h-1 bg-gray-700 rounded-full mx-1"></div>
      </div>
      
    </div>
  );
}