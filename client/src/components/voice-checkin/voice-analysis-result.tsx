import { VoiceCheckin } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VoiceAnalysisResultProps {
  checkin: VoiceCheckin;
}

export function VoiceAnalysisResult({ checkin }: VoiceAnalysisResultProps) {
  const dateText = formatDistanceToNow(new Date(checkin.createdAt), { 
    addSuffix: true,
    locale: ptBR 
  });

  // Map de cores para diferentes tons emocionais
  const emotionColors: Record<string, string> = {
    'alegre': 'bg-green-100 text-green-800 border-green-200',
    'feliz': 'bg-green-100 text-green-800 border-green-200',
    'triste': 'bg-blue-100 text-blue-800 border-blue-200',
    'depressivo': 'bg-blue-100 text-blue-800 border-blue-200',
    'ansioso': 'bg-amber-100 text-amber-800 border-amber-200',
    'nervoso': 'bg-amber-100 text-amber-800 border-amber-200',
    'preocupado': 'bg-amber-100 text-amber-800 border-amber-200',
    'irritado': 'bg-red-100 text-red-800 border-red-200',
    'raivoso': 'bg-red-100 text-red-800 border-red-200',
    'agressivo': 'bg-red-100 text-red-800 border-red-200',
    'calmo': 'bg-sky-100 text-sky-800 border-sky-200',
    'sereno': 'bg-sky-100 text-sky-800 border-sky-200',
    'neutro': 'bg-gray-100 text-gray-800 border-gray-200',
    'default': 'bg-gray-100 text-gray-800 border-gray-200',
  };

  // Função para obter a cor baseada no tom emocional
  const getEmotionColor = (emotion: string) => {
    return emotionColors[emotion.toLowerCase()] || emotionColors.default;
  };
  
  // Formatar duração em minutos e segundos
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins === 0) {
      return `${secs} segundos`;
    } else if (mins === 1) {
      return `${mins} minuto e ${secs} segundos`;
    } else {
      return `${mins} minutos e ${secs} segundos`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Análise de Check-in por Voz</CardTitle>
            <CardDescription>{dateText}</CardDescription>
          </div>
          {checkin.emotionalTone && (
            <Badge className={getEmotionColor(checkin.emotionalTone)}>
              {checkin.emotionalTone}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Informações básicas */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Duração</p>
              <p className="font-medium">{formatDuration(checkin.duration)}</p>
            </div>
            <div>
              <a 
                href={checkin.audioUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Ouvir gravação
              </a>
            </div>
          </div>

          {/* Transcrição */}
          {checkin.transcription && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="transcription">
                <AccordionTrigger>Transcrição</AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm p-3 bg-muted rounded-md">
                    {checkin.transcription}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Emoções detectadas */}
          {checkin.dominantEmotions && checkin.dominantEmotions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Emoções detectadas</h4>
              <div className="flex flex-wrap gap-2">
                {checkin.dominantEmotions.map((emotion, index) => (
                  <Badge key={index} variant="outline" className={getEmotionColor(emotion)}>
                    {emotion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Análise detalhada */}
          {checkin.moodAnalysis && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="analysis">
                <AccordionTrigger>Análise detalhada</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {Object.entries(checkin.moodAnalysis as Record<string, any>).map(([key, value]) => (
                      <div key={key}>
                        <h5 className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h5>
                        <p className="text-sm text-muted-foreground">{value.toString()}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </CardContent>
    </Card>
  );
}