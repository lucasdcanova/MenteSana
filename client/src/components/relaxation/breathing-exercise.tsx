import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { m, LazyMotion, domAnimation, useAnimationControls, AnimatePresence } from "framer-motion";

type BreathingTechnique = {
  id: string;
  name: string;
  description: string;
  inhaleTime: number;
  holdInTime: number;
  exhaleTime: number;
  holdOutTime: number;
  cycles: number;
  color: string;
};

const breathingTechniques: BreathingTechnique[] = [
  {
    id: "box",
    name: "Respiração Quadrada",
    description: "Técnica clássica para reduzir ansiedade, equilibrando o sistema nervoso.",
    inhaleTime: 4,
    holdInTime: 4,
    exhaleTime: 4,
    holdOutTime: 4,
    cycles: 4,
    color: "hsl(var(--primary))"
  },
  {
    id: "relax",
    name: "Relaxamento Profundo",
    description: "Ideal para antes de dormir, reduzindo gradualmente a excitação do sistema nervoso.",
    inhaleTime: 4,
    holdInTime: 7,
    exhaleTime: 8,
    holdOutTime: 0,
    cycles: 5,
    color: "hsl(var(--primary))"
  },
  {
    id: "energize",
    name: "Energizante",
    description: "Para momentos de baixa energia, estimulando o foco e a concentração.",
    inhaleTime: 6,
    holdInTime: 2,
    exhaleTime: 4,
    holdOutTime: 0,
    cycles: 6,
    color: "hsl(var(--primary))"
  },
  {
    id: "calm",
    name: "Calmante",
    description: "Para momentos de estresse agudo, com foco na exalação mais longa.",
    inhaleTime: 4,
    holdInTime: 0,
    exhaleTime: 6,
    holdOutTime: 2,
    cycles: 6,
    color: "hsl(var(--primary))"
  }
];

type BreathState = "inhale" | "holdIn" | "exhale" | "holdOut" | "idle";

interface BreathingExerciseProps {
  onClose?: () => void;
  minimal?: boolean;
  fullScreenToggle?: boolean;
  defaultTechnique?: string;
}

export function BreathingExercise({ 
  onClose,
  minimal = false,
  fullScreenToggle = true,
  defaultTechnique = "box"
}: BreathingExerciseProps) {
  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique>(
    breathingTechniques.find(t => t.id === defaultTechnique) || breathingTechniques[0]
  );
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [breathState, setBreathState] = useState<BreathState>("idle");
  const [progress, setProgress] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const circleControls = useAnimationControls();
  const textControls = useAnimationControls();
  
  // Efeitos de áudio
  const inhaleSound = useRef<HTMLAudioElement | null>(null);
  const exhaleSound = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Criar elementos de áudio apenas uma vez
    if (!inhaleSound.current) {
      inhaleSound.current = new Audio("/assets/inhale-sound.mp3");
      inhaleSound.current.volume = 0.7;
    }
    
    if (!exhaleSound.current) {
      exhaleSound.current = new Audio("/assets/exhale-sound.mp3");
      exhaleSound.current.volume = 0.7;
    }
    
    return () => {
      // Limpar áudios quando o componente for desmontado
      if (inhaleSound.current) {
        inhaleSound.current.pause();
        inhaleSound.current = null;
      }
      
      if (exhaleSound.current) {
        exhaleSound.current.pause();
        exhaleSound.current = null;
      }
    };
  }, []);
  
  // Gerenciar ciclos de respiração
  useEffect(() => {
    if (!isPlaying) return;
    
    let duration = 0;
    let delayBeforeNextState = 0;
    let newBreathState: BreathState = "idle";
    
    // Determinar a próxima etapa e duração baseado no estado atual
    switch (breathState) {
      case "idle":
        newBreathState = "inhale";
        duration = selectedTechnique.inhaleTime;
        
        // Expandir o círculo durante a inspiração
        circleControls.start({ 
          scale: 2, 
          transition: { duration: duration, ease: "easeInOut" } 
        });
        
        textControls.start({
          opacity: 1,
          transition: { duration: 0.5 }
        });
        
        // Tocar som de inspiração
        if (!isMuted && inhaleSound.current) {
          inhaleSound.current.currentTime = 0;
          inhaleSound.current.play().catch(e => console.error("Erro ao tocar áudio:", e));
        }
        
        break;
        
      case "inhale":
        if (selectedTechnique.holdInTime > 0) {
          newBreathState = "holdIn";
          duration = selectedTechnique.holdInTime;
          
          // Manter o círculo expandido durante a retenção
          circleControls.start({
            scale: 2,
            transition: { duration: duration, ease: "linear" }
          });
        } else {
          newBreathState = "exhale";
          duration = selectedTechnique.exhaleTime;
          
          // Contrair o círculo durante a expiração
          circleControls.start({
            scale: 1,
            transition: { duration: duration, ease: "easeInOut" }
          });
          
          // Tocar som de expiração
          if (!isMuted && exhaleSound.current) {
            exhaleSound.current.currentTime = 0;
            exhaleSound.current.play().catch(e => console.error("Erro ao tocar áudio:", e));
          }
        }
        break;
        
      case "holdIn":
        newBreathState = "exhale";
        duration = selectedTechnique.exhaleTime;
        
        // Contrair o círculo durante a expiração
        circleControls.start({
          scale: 1,
          transition: { duration: duration, ease: "easeInOut" }
        });
        
        // Tocar som de expiração
        if (!isMuted && exhaleSound.current) {
          exhaleSound.current.currentTime = 0;
          exhaleSound.current.play().catch(e => console.error("Erro ao tocar áudio:", e));
        }
        
        break;
        
      case "exhale":
        if (selectedTechnique.holdOutTime > 0) {
          newBreathState = "holdOut";
          duration = selectedTechnique.holdOutTime;
          
          // Manter o círculo contraído durante a retenção
          circleControls.start({
            scale: 1,
            transition: { duration: duration, ease: "linear" }
          });
        } else {
          newBreathState = "inhale";
          duration = selectedTechnique.inhaleTime;
          
          // Expandir o círculo durante a inspiração
          circleControls.start({
            scale: 2,
            transition: { duration: duration, ease: "easeInOut" }
          });
          
          // Tocar som de inspiração
          if (!isMuted && inhaleSound.current) {
            inhaleSound.current.currentTime = 0;
            inhaleSound.current.play().catch(e => console.error("Erro ao tocar áudio:", e));
          }
          
          // Incrementar o ciclo se voltarmos para "inhale"
          if (currentCycle < selectedTechnique.cycles) {
            setCurrentCycle(prev => prev + 1);
          } else {
            // Se atingimos o número total de ciclos, termine após a expiração final
            delayBeforeNextState = duration * 1000;
            
            setTimeout(() => {
              setIsPlaying(false);
              setBreathState("idle");
              setCurrentCycle(1);
              setProgress(0);
              
              // Retornar suavemente para o tamanho original
              circleControls.start({
                scale: 1,
                transition: { duration: 1, ease: "easeOut" }
              });
              
              textControls.start({
                opacity: 0,
                transition: { duration: 0.5 }
              });
            }, delayBeforeNextState);
            
            // Sair para evitar a configuração do próximo timer
            break;
          }
        }
        break;
        
      case "holdOut":
        newBreathState = "inhale";
        duration = selectedTechnique.inhaleTime;
        
        // Expandir o círculo durante a inspiração
        circleControls.start({
          scale: 2,
          transition: { duration: duration, ease: "easeInOut" }
        });
        
        // Tocar som de inspiração
        if (!isMuted && inhaleSound.current) {
          inhaleSound.current.currentTime = 0;
          inhaleSound.current.play().catch(e => console.error("Erro ao tocar áudio:", e));
        }
        
        // Incrementar o ciclo se voltarmos para "inhale"
        if (currentCycle < selectedTechnique.cycles) {
          setCurrentCycle(prev => prev + 1);
        } else {
          // Se atingimos o número total de ciclos, termine após a inspiração final
          delayBeforeNextState = duration * 1000;
          
          setTimeout(() => {
            setIsPlaying(false);
            setBreathState("idle");
            setCurrentCycle(1);
            setProgress(0);
            
            // Retornar suavemente para o tamanho original
            circleControls.start({
              scale: 1,
              transition: { duration: 1, ease: "easeOut" }
            });
            
            textControls.start({
              opacity: 0,
              transition: { duration: 0.5 }
            });
          }, delayBeforeNextState);
          
          // Sair para evitar a configuração do próximo timer
          break;
        }
        break;
    }
    
    // Configurar o timer para a próxima transição de estado
    if (duration > 0 && delayBeforeNextState === 0) {
      const totalTime = duration * 1000;
      let startTime = Date.now();
      let interval = 16; // Aproximadamente 60fps
      
      // Limpar timer anterior se existir
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      
      // Iniciar um novo timer que atualizará o progresso
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / totalTime, 1);
        setProgress(newProgress);
        
        if (elapsed >= totalTime) {
          window.clearInterval(timerRef.current!);
          timerRef.current = null;
          setBreathState(newBreathState);
          setProgress(0); // Reiniciar o progresso para a próxima etapa
        }
      }, interval);
    }
    
    // Limpar o timer quando o componente for desmontado
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, breathState, selectedTechnique, currentCycle, isMuted, circleControls, textControls]);
  
  // Função para iniciar ou pausar o exercício
  const togglePlayPause = () => {
    if (isPlaying) {
      // Pausar
      setIsPlaying(false);
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // Iniciar
      setIsPlaying(true);
      setBreathState("idle"); // Começamos com "idle" para ir para "inhale" no primeiro ciclo
      setCurrentCycle(1);
    }
  };
  
  // Função para redefinir o exercício
  const resetExercise = () => {
    setIsPlaying(false);
    setBreathState("idle");
    setCurrentCycle(1);
    setProgress(0);
    
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Retornar suavemente para o tamanho original
    circleControls.start({
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    });
    
    textControls.start({
      opacity: 0,
      transition: { duration: 0.3 }
    });
  };
  
  // Manipular entrada/saída de tela cheia
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };
  
  // Monitorar alterações no estado de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Determinar o texto de instrução com base no estado de respiração
  const getInstructionText = () => {
    switch (breathState) {
      case "inhale":
        return "Inspire...";
      case "holdIn":
        return "Segure...";
      case "exhale":
        return "Expire...";
      case "holdOut":
        return "Segure...";
      case "idle":
        return isPlaying ? "Prepare-se..." : "Pressione Iniciar";
    }
  };
  
  // Calcular o ciclo total de tempo
  const getTotalCycleTime = () => {
    return selectedTechnique.inhaleTime + selectedTechnique.holdInTime + 
           selectedTechnique.exhaleTime + selectedTechnique.holdOutTime;
  };
  
  return (
    <LazyMotion features={domAnimation}>
      <div 
        ref={containerRef}
        className={cn(
          "w-full overflow-hidden bg-white transition-all duration-300",
          isFullScreen ? "h-screen p-6" : minimal ? "rounded-lg" : "rounded-xl mb-4"
        )}
      >
        {/* Cabeçalho - Visível apenas quando não estiver no modo mínimo */}
        {!minimal && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Exercício de Respiração</h2>
            
            <div className="flex space-x-2">
              {fullScreenToggle && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={toggleFullScreen}
                >
                  {isFullScreen ? 
                    <Minimize className="h-4 w-4 text-gray-600" /> : 
                    <Maximize className="h-4 w-4 text-gray-600" />
                  }
                </Button>
              )}
              
              {onClose && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={onClose}
                >
                  <X className="h-4 w-4 text-gray-600" />
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Círculo de animação - A parte central do exercício */}
        <div className={cn(
          "flex flex-col items-center justify-center",
          minimal ? "py-6" : "py-8 px-4"
        )}>
          <div className="relative w-full flex flex-col items-center mb-8">
            {/* Contador de ciclos */}
            <div className="mb-4 text-center">
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary font-medium rounded-full text-sm">
                Ciclo {currentCycle} de {selectedTechnique.cycles}
              </span>
            </div>
            
            {/* Círculo animado */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Círculo de progresso */}
              <div 
                className="absolute w-full h-full rounded-full"
                style={{
                  background: `conic-gradient(${selectedTechnique.color} ${progress * 100}%, transparent ${progress * 100}%)`,
                  opacity: 0.15
                }}
              />
              
              {/* Círculo principal que se expande/contrai */}
              <m.div 
                animate={circleControls}
                initial={{ scale: 1 }}
                className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary/80 to-primary/40 shadow-lg flex items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-inner">
                  <m.span 
                    animate={textControls}
                    initial={{ opacity: 0 }}
                    className="text-gray-800 text-lg font-medium"
                  >
                    {getInstructionText()}
                  </m.span>
                </div>
              </m.div>
            </div>
            
            {/* Botão de reprodução/pausa */}
            <div className="mt-8 space-y-4 w-full max-w-md">
              <Button 
                onClick={togglePlayPause}
                className={cn(
                  "w-full py-6 text-base font-medium rounded-xl",
                  isPlaying ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : "bg-primary hover:bg-primary/90 text-white"
                )}
              >
                {isPlaying ? "Pausar" : "Iniciar"}
              </Button>
              
              {isPlaying && (
                <Button 
                  variant="outline"
                  onClick={resetExercise}
                  className="w-full py-2 border-gray-200"
                >
                  Reiniciar
                </Button>
              )}
            </div>
          </div>
          
          {/* Controles de som */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            className="mt-2 text-gray-500 hover:text-gray-700"
          >
            {isMuted ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
            <span className="text-xs">{isMuted ? "Ativar som" : "Desativar som"}</span>
          </Button>
          
          {/* Seleção de técnica - Visível apenas em modo não mínimo e quando não estiver jogando */}
          {!minimal && !isPlaying && (
            <div className="mt-6 w-full max-w-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selecione uma técnica:</h3>
              <Tabs 
                defaultValue={selectedTechnique.id} 
                className="w-full"
                onValueChange={(value) => {
                  const technique = breathingTechniques.find(t => t.id === value);
                  if (technique) {
                    setSelectedTechnique(technique);
                  }
                }}
              >
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-4">
                  {breathingTechniques.map((technique) => (
                    <TabsTrigger key={technique.id} value={technique.id}>
                      {technique.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value={selectedTechnique.id} className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-3">{selectedTechnique.description}</p>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div>Inspirar: {selectedTechnique.inhaleTime}s</div>
                    {selectedTechnique.holdInTime > 0 && <div>Segurar: {selectedTechnique.holdInTime}s</div>}
                    <div>Expirar: {selectedTechnique.exhaleTime}s</div>
                    {selectedTechnique.holdOutTime > 0 && <div>Segurar: {selectedTechnique.holdOutTime}s</div>}
                    <div className="pt-1">Duração total: {getTotalCycleTime() * selectedTechnique.cycles}s</div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}