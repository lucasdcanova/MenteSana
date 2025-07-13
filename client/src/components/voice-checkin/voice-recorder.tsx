import { useState, useRef, useEffect } from "react";
import { Mic, Square, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface VoiceRecorderProps {
  onSave: (audioBlob: Blob, duration: number) => void;
  isProcessing?: boolean;
}

export function VoiceRecorder({ onSave, isProcessing = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
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
    }
  };

  const saveRecording = () => {
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      onSave(audioBlob, recordingTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4">
          {isRecording ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="animate-pulse flex items-center justify-center h-16 w-16 rounded-full bg-red-100 border-2 border-red-500">
                <Mic className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-xl font-semibold">{formatTime(recordingTime)}</p>
              <Progress value={Math.min((recordingTime / 180) * 100, 100)} className="w-full h-2" />
              <Button 
                onClick={stopRecording} 
                size="lg" 
                variant="destructive"
                className="mt-2"
              >
                <Square className="mr-2 h-4 w-4" />
                Parar Gravação
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              {audioUrl ? (
                <div className="w-full">
                  <audio src={audioUrl} controls className="w-full mb-4" />
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button 
                      onClick={startRecording} 
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Gravar Novamente
                    </Button>
                    <Button 
                      onClick={saveRecording} 
                      size="lg"
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Check-in
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-6">
                    <div className="flex items-center justify-center h-24 w-24 rounded-full bg-primary/10 mx-auto mb-4">
                      <Mic className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">Check-in por Voz</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-6">
                      Compartilhe como está se sentindo hoje através de uma gravação de voz.
                      Nossa IA analisará seu tom de voz e palavras para entender seu estado emocional.
                    </p>
                  </div>
                  <Button 
                    onClick={startRecording} 
                    size="lg"
                    className="w-full"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Iniciar Gravação
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}