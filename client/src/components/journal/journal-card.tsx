import { useState } from "react";
import { JournalEntry } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, Pause, Edit, Trash2, ChevronDown, ChevronUp, Clock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface JournalCardProps {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}

export function JournalCard({ entry, onEdit, onDelete }: JournalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Determinar cores baseadas no humor
  const getMoodColors = (mood: string): { bg: string, text: string, border: string } => {
    switch (mood.toLowerCase()) {
      case 'feliz':
        return { bg: 'bg-[#e9fbf2]', text: 'text-[#4dbb8a]', border: 'border-[#a8e6c9]' };
      case 'triste':
        return { bg: 'bg-[#f0f7ff]', text: 'text-[#5b8ad0]', border: 'border-[#b8d4f7]' };
      case 'ansioso':
        return { bg: 'bg-[#fff7e6]', text: 'text-[#e6a700]', border: 'border-[#ffd780]' };
      case 'irritado':
        return { bg: 'bg-[#ffeeee]', text: 'text-[#e67777]', border: 'border-[#f7b8b8]' };
      case 'calmo':
        return { bg: 'bg-[#f0f7ff]', text: 'text-[#5b8ad0]', border: 'border-[#b8d4f7]' };
      default:
        return { bg: 'bg-[#e9fbf2]', text: 'text-[#4dbb8a]', border: 'border-[#a8e6c9]' };
    }
  };

  const colors = getMoodColors(entry.mood);

  // Formato das datas
  const formattedDate = formatDistanceToNow(new Date(entry.date), { 
    addSuffix: true,
    locale: ptBR
  });

  // Lidar com reprodução de áudio
  const toggleAudio = () => {
    if (!entry.audioUrl) return;
    
    if (!audio) {
      const newAudio = new Audio(entry.audioUrl);
      newAudio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      setAudio(newAudio);
      newAudio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Limpar áudio quando o componente for desmontado
  useState(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  });

  return (
    <div className={`mb-4 rounded-2xl border ${colors.border} overflow-hidden`}>
      {/* Cabeçalho */}
      <div className={`${colors.bg} p-4 flex justify-between items-center`}>
        <div className="flex items-center">
          {entry.audioUrl && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={`${colors.text} hover:${colors.bg} mr-2`}
              onClick={toggleAudio}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          )}
          <div>
            <h3 className="font-medium text-gray-900">{entry.title || entry.mood}</h3>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              {formattedDate}
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          {entry.audioUrl && (
            <Badge variant="outline" className={`text-xs ${colors.text} border-0 flex items-center mr-2`}>
              <Mic className="h-3 w-3 mr-1" />
              Áudio
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-gray-500"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Conteúdo (colapsável) */}
      {expanded && (
        <div className="p-4 bg-white">
          <p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>
          
          {/* Tags (se houver) */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {entry.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Botões de ação */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}