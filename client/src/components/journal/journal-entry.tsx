import { format } from "date-fns";
import { JournalEntry as JournalEntryType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ptBR } from "date-fns/locale";
import { Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface JournalEntryProps {
  entry: JournalEntryType;
  onEdit: () => void;
}

export function JournalEntry({ entry, onEdit }: JournalEntryProps) {
  const [showFullEntry, setShowFullEntry] = useState(false);
  
  const getMoodEmoji = (mood: string) => {
    switch (mood.toLowerCase()) {
      case "muito-feliz":
        return "😄";
      case "feliz":
        return "🙂";
      case "neutro":
        return "😐";
      case "triste":
        return "😔";
      case "muito-triste":
        return "😞";
      default:
        return "😐";
    }
  };
  
  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    
    const categoryColors: Record<string, string> = {
      "trabalho": "bg-blue-100 text-blue-800",
      "viagens": "bg-cyan-100 text-cyan-800",
      "família": "bg-orange-100 text-orange-800",
      "saúde": "bg-green-100 text-green-800",
      "lazer": "bg-purple-100 text-purple-800",
      "estudos": "bg-indigo-100 text-indigo-800",
    };
    
    const colorClass = categoryColors[category.toLowerCase()] || "bg-gray-100 text-gray-800";
    
    return (
      <span className={`${colorClass} px-2 py-1 rounded-full text-xs font-medium`}>
        {category}
      </span>
    );
  };
  
  return (
    <>
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
              <div>
                <h4 className="font-medium text-gray-800">
                  {entry.title || format(new Date(entry.date), "d 'de' MMMM", { locale: ptBR })}
                </h4>
                {entry.category && (
                  <div className="mt-1">
                    {getCategoryBadge(entry.category)}
                  </div>
                )}
              </div>
            </div>
            <button 
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200" 
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
          
          <p className="text-gray-600 line-clamp-3 mb-2">
            {entry.content}
          </p>
          
          {entry.content.length > 150 && (
            <button 
              className="text-sm text-gray-500 hover:text-gray-800 font-medium"
              onClick={() => setShowFullEntry(true)}
            >
              Ler mais...
            </button>
          )}
          
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {entry.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <Dialog open={showFullEntry} onOpenChange={setShowFullEntry}>
        <DialogContent className="bg-white max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
                <span>{entry.title || format(new Date(entry.date), "d 'de' MMMM, yyyy", { locale: ptBR })}</span>
              </div>
              {entry.category && getCategoryBadge(entry.category)}
            </DialogTitle>
            <DialogDescription>
              <div className="mt-4 text-gray-700 whitespace-pre-wrap">
                {entry.content}
              </div>
              
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {entry.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <Button 
                  className="bg-gray-800 hover:bg-gray-700 text-white rounded-full font-medium"
                  onClick={() => {
                    setShowFullEntry(false);
                    onEdit();
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar anotação
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
