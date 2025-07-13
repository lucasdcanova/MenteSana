import { useState, useRef, useEffect } from "react";
import { Mic, Square, Save, Loader2, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface VoiceJournalRecorderProps {
  onSave: (audioBlob: Blob | null, text: string, duration?: number) => void;
  isProcessing?: boolean;
  onCancel: () => void;
  initialText?: string;
}

export function VoiceJournalRecorder({ 
  onSave, 
  isProcessing = false, 
  onCancel,
  initialText = ""
}: VoiceJournalRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showTextField, setShowTextField] = useState(false);
  const [text, setText] = useState(initialText);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

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
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
      };
      
      // Iniciar a gravação
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Iniciar o timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Erro ao iniciar a gravação:", error);
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
      
      // Salvar automaticamente após parar a gravação (sem necessidade de confirmação)
      setTimeout(() => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          onSave(audioBlob, text, recordingTime);
        }
      }, 500); // Pequeno delay para garantir que o blob seja criado corretamente
    }
  };

  // Mantido para compatibilidade, mas não será usado no fluxo principal
  const saveRecording = () => {
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      onSave(audioBlob, text, recordingTime);
    } else {
      // Apenas texto sem áudio
      onSave(null, text);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Card className="w-full border-0 shadow-md bg-white dark:bg-gray-900 relative">
      <Button 
        variant="ghost" 
        size="icon"
        className="absolute right-2 top-2 text-gray-400 hover:text-gray-500 z-10"
        onClick={onCancel}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardContent className="p-5">
        {/* Área de texto */}
        {showTextField || initialText ? (
          <div className="mb-4">
            <Textarea 
              className="w-full p-4 bg-[#f5fcf8] border-[#a8e6c9] rounded-xl focus:ring-[#7ddcb0] focus:border-[#7ddcb0] min-h-[120px] mb-2"
              placeholder="Escreva seus pensamentos aqui..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        ) : null}

        {/* Gravação de voz */}
        <div className="flex flex-col items-center gap-4">
          {isRecording ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="animate-pulse flex items-center justify-center h-16 w-16 rounded-full bg-[#e9fbf2] border-2 border-[#7ddcb0]">
                <Mic className="h-8 w-8 text-[#4dbb8a]" />
              </div>
              <p className="text-xl font-semibold text-gray-800">{formatTime(recordingTime)}</p>
              <Progress value={Math.min((recordingTime / 180) * 100, 100)} className="w-full h-2 bg-[#e9fbf2]" />
              <Button 
                onClick={stopRecording} 
                size="lg" 
                className="mt-2 bg-[#4dbb8a] hover:bg-[#3b9e73] text-white"
              >
                <Square className="mr-2 h-4 w-4" />
                Parar Gravação
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              {audioUrl ? (
                <div className="w-full">
                  <audio src={audioUrl} controls className="w-full mb-4 h-12" />
                  <div className="flex gap-2 justify-between mt-4">
                    <Button 
                      onClick={startRecording} 
                      variant="outline"
                      className="flex-1 border-[#a8e6c9] text-[#4dbb8a] hover:bg-[#e9fbf2] hover:text-[#3b9e73]"
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Gravar Novamente
                    </Button>
                    <Button 
                      onClick={() => setShowTextField(!showTextField)}
                      variant="outline"
                      className="flex-1 border-[#a8e6c9] text-[#4dbb8a] hover:bg-[#e9fbf2] hover:text-[#3b9e73]"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {showTextField ? "Ocultar Texto" : "Adicionar Texto"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center w-full">
                  <div className="flex flex-row items-center justify-between mb-4">
                    <Button 
                      onClick={startRecording} 
                      size="lg"
                      className="flex-1 bg-[#4dbb8a] hover:bg-[#3b9e73] text-white"
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Gravar Nota
                    </Button>
                    
                    <div className="px-2 text-gray-400">ou</div>
                    
                    <Button 
                      onClick={() => setShowTextField(true)}
                      variant="outline"
                      size="lg" 
                      className="flex-1 border-[#a8e6c9] text-[#4dbb8a] hover:bg-[#e9fbf2] hover:text-[#3b9e73]"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Escrever Nota
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Botão de salvar */}
          {(audioUrl || showTextField) && !isRecording && (
            <Button 
              onClick={saveRecording} 
              size="lg"
              disabled={isProcessing || (!audioUrl && !text.trim())}
              className="w-full mt-2 bg-[#4dbb8a] hover:bg-[#3b9e73] text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Nota
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}