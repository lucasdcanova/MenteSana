import { useState, useEffect, useRef } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { cacheResource, getResourceFromCache } from '@/lib/caching-utils';
import { Button } from "@/components/ui/button";

interface OptimizedAudioProps {
  src: string;
  className?: string;
  cacheKey?: string;
  minimal?: boolean; // Modo compacto
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente de áudio otimizado com:
 * - Cache
 * - Controles personalizados
 * - Indicadores de carregamento
 * - Modo compacto opcional
 */
export function OptimizedAudio({
  src,
  className = '',
  cacheKey,
  minimal = false,
  onLoad,
  onError,
}: OptimizedAudioProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const key = cacheKey || src;
  
  // Carregar e configurar o áudio
  useEffect(() => {
    // Verificar se o áudio já está em cache
    const cachedSrc = getResourceFromCache(key);
    
    if (cachedSrc) {
      setAudioSrc(cachedSrc);
      setLoading(false);
    } else {
      setAudioSrc(src);
    }
    
    return () => {
      // Limpar quando o componente for desmontado
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [src, key]);
  
  // Configurar o elemento de áudio
  useEffect(() => {
    if (!audioSrc) return;
    
    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    
    const handleCanPlay = () => {
      setLoading(false);
      setDuration(audio.duration);
      cacheResource(key, audioSrc, 'audio');
      onLoad?.();
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    
    const handleError = () => {
      setError(true);
      setLoading(false);
      onError?.();
    };
    
    // Configurar listeners
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    return () => {
      // Limpar listeners
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      
      audio.pause();
      audio.src = '';
    };
  }, [audioSrc, key, onLoad, onError]);
  
  // Controlar reprodução
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error("Erro ao reproduzir áudio:", err);
        setError(true);
      });
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Controlar mudo
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };
  
  // Mudar a posição no áudio
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const seekTime = value[0];
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };
  
  // Formatar tempo em MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Versão minimalista do player
  if (minimal) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {loading ? (
          <Skeleton className="h-8 w-8 rounded-full" />
        ) : error ? (
          <div className="text-xs text-red-500">Erro</div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        )}
        
        {!loading && !error && (
          <div className="text-xs">{formatTime(currentTime)} / {formatTime(duration)}</div>
        )}
      </div>
    );
  }
  
  // Versão completa do player
  return (
    <div className={`p-2 rounded-md border ${className}`}>
      {loading ? (
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-500 p-2">
          Erro ao carregar áudio. Tente novamente mais tarde.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <div className="flex-1">
              <Slider 
                value={[currentTime]} 
                max={duration || 1} 
                step={0.1}
                onValueChange={handleSeek}
              />
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}