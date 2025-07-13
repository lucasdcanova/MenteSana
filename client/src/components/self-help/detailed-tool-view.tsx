import { useState, useEffect, useRef } from "react";
import { SelfHelpTool } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Clock, Timer, CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface DetailedToolViewProps {
  tool: SelfHelpTool;
  onBack: () => void;
}

export function DetailedToolView({ tool, onBack }: DetailedToolViewProps) {
  const [step, setStep] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [exerciseComplete, setExerciseComplete] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Divide o conteúdo em passos baseados nas marcações ⸻
  const steps = tool.content.split('⸻').filter(step => step.trim().length > 0);
  const totalSteps = steps.length;
  
  // Calcula a duração total e por passo
  const totalDuration = tool.duration * 60; // em segundos
  const stepDuration = Math.floor(totalDuration / totalSteps);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timerRunning) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          // Se passar da duração deste passo, avance para o próximo
          if (newTime >= (step + 1) * stepDuration) {
            if (step < totalSteps - 1) {
              setStep(step + 1);
            } else {
              setTimerRunning(false);
              setExerciseComplete(true);
            }
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, step, stepDuration, totalSteps]);
  
  // Reinicia o timer quando mudar o passo manualmente
  useEffect(() => {
    setTimeElapsed(step * stepDuration);
  }, [step, stepDuration]);
  
  // Inicia a reprodução de áudio quando o timer está rodando
  useEffect(() => {
    if (audioRef.current) {
      if (timerRunning) {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [timerRunning]);
  
  const totalProgress = Math.min((timeElapsed / totalDuration) * 100, 100);
  const currentStepProgress = Math.min(
    ((timeElapsed - step * stepDuration) / stepDuration) * 100, 
    100
  );
  
  const formattedTimeRemaining = () => {
    const remaining = totalDuration - timeElapsed;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const formattedTotalTime = () => {
    const minutes = Math.floor(tool.duration);
    const seconds = Math.round((tool.duration - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const toggleTimer = () => {
    setTimerRunning(!timerRunning);
  };
  
  const resetExercise = () => {
    setTimerRunning(false);
    setStep(0);
    setTimeElapsed(0);
    setExerciseComplete(false);
  };
  
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };
  
  const goToNextStep = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };
  
  const goToPreviousStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Determina o áudio de fundo baseado na categoria
  let backgroundAudio = "";
  switch (tool.category.toLowerCase()) {
    case "meditação":
    case "meditation":
      backgroundAudio = "https://cdn.pixabay.com/download/audio/2022/03/24/audio_42c2134887.mp3?filename=calm-meditation-music-110807.mp3";
      break;
    case "respiração":
    case "breathing":
      backgroundAudio = "https://cdn.pixabay.com/download/audio/2022/02/07/audio_42775b09d0.mp3?filename=breathing-meditation-99623.mp3";
      break;
    case "relaxamento":
    case "relaxation":
      backgroundAudio = "https://cdn.pixabay.com/download/audio/2021/04/08/audio_975a210f1a.mp3?filename=relaxing-yoga-music-8128.mp3";
      break;
    case "grounding":
    case "ancoragem":
      backgroundAudio = "https://cdn.pixabay.com/download/audio/2022/04/27/audio_7eff81e95d.mp3?filename=enlightenment-114389.mp3";
      break;
    default:
      backgroundAudio = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_b825eb8a55.mp3?filename=ambient-piano-ampamp-strings-10711.mp3";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Áudio de fundo */}
      <audio 
        ref={audioRef} 
        src={backgroundAudio} 
        loop 
        preload="auto"
        muted={muted}
      />
      
      {/* Cabeçalho */}
      <header className="bg-white border-b border-gray-200 shadow-sm py-4 px-6 sticky top-0 z-10">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-3" 
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{tool.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                <Clock className="h-3 w-3 mr-1" />
                {formattedTotalTime()}
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary-dark border-primary/20">
                {tool.category}
              </Badge>
            </div>
          </div>
        </div>
      </header>
      
      {/* Container principal */}
      <div className="px-4 md:px-6 pt-6 pb-32 max-w-3xl mx-auto">
        {/* Progresso do exercício */}
        {!exerciseComplete ? (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">{step + 1}</span>
                </div>
                <span className="text-base font-medium text-gray-800">
                  Passo {step + 1} de {totalSteps}
                </span>
              </div>
              
              <div className="flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                <Timer className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-gray-800">
                  {formattedTimeRemaining()}
                </span>
              </div>
            </div>
            
            {/* Progresso geral */}
            <div className="mb-2 bg-gray-100 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            
            {/* Progresso do passo atual */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${currentStepProgress}%` }}
              />
            </div>
            
            {/* Conteúdo do passo atual */}
            <motion.div 
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6"
            >
              <div className="prose prose-lg max-w-none text-gray-800">
                <div 
                  className="font-medium leading-relaxed text-base md:text-lg"
                  dangerouslySetInnerHTML={{ 
                    __html: steps[step]
                      .replace(/\n/g, '<br />')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary-dark">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  }} 
                />
              </div>
            </motion.div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-10 px-4 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Exercício Concluído!</h2>
            <p className="text-gray-700 mb-6 max-w-md">
              Parabéns por completar o exercício "{tool.name}". Continue essa prática regularmente para obter os melhores resultados.
            </p>
            <Button 
              variant="outline" 
              className="border-primary text-primary font-medium hover:bg-primary/5"
              onClick={resetExercise}
            >
              Reiniciar Exercício
            </Button>
          </motion.div>
        )}
      </div>
      
      {/* Controles fixos */}
      {!exerciseComplete && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] border-t border-gray-200 py-4 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-center space-x-8 items-center mb-3">
              <Button
                variant="outline" 
                size="icon"
                className="h-12 w-12 rounded-full border-gray-200"
                onClick={goToPreviousStep}
                disabled={step === 0}
              >
                <SkipBack className="h-5 w-5 text-gray-700" />
              </Button>
              
              <Button 
                className="w-16 h-16 rounded-full bg-primary hover:bg-primary-dark shadow-md" 
                onClick={toggleTimer}
              >
                {timerRunning ? (
                  <Pause className="h-7 w-7 text-white" />
                ) : (
                  <Play className="h-7 w-7 text-white ml-1" />
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="icon"
                className="h-12 w-12 rounded-full border-gray-200"
                onClick={goToNextStep}
                disabled={step === totalSteps - 1}
              >
                <SkipForward className="h-5 w-5 text-gray-700" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleMute}
                className="text-gray-700 text-sm"
              >
                {muted ? (
                  <>
                    <VolumeX className="h-4 w-4 mr-1.5 text-gray-500" />
                    Sem áudio
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-1.5 text-primary" />
                    Áudio ativado
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetExercise}
                className="border-gray-200 text-gray-700 text-sm"
              >
                Reiniciar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}