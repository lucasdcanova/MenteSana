import { SelfHelpTool } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Clock, Bookmark, BookmarkCheck, Sparkles, Play, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DetailedToolView } from "./detailed-tool-view";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: SelfHelpTool;
  featured?: boolean;
}

export function ToolCard({ tool, featured = false }: ToolCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDetailedView, setIsDetailedView] = useState(false);
  
  // Tipo de evidência científica com badges coloridos
  const getEvidenceBadge = (category: string) => {
    const categories = {
      "Meditation": { level: "Alta", color: "bg-green-100 text-green-800 border-green-200" },
      "Meditação": { level: "Alta", color: "bg-green-100 text-green-800 border-green-200" },
      "Breathing": { level: "Alta", color: "bg-green-100 text-green-800 border-green-200" },
      "Respiração": { level: "Alta", color: "bg-green-100 text-green-800 border-green-200" },
      "Grounding": { level: "Moderada", color: "bg-blue-100 text-blue-800 border-blue-200" },
      "Ancoragem": { level: "Moderada", color: "bg-blue-100 text-blue-800 border-blue-200" },
      "Visualization": { level: "Moderada", color: "bg-blue-100 text-blue-800 border-blue-200" },
      "Visualização": { level: "Moderada", color: "bg-blue-100 text-blue-800 border-blue-200" },
      "Mindfulness": { level: "Alta", color: "bg-green-100 text-green-800 border-green-200" },
      "Relaxamento": { level: "Moderada", color: "bg-blue-100 text-blue-800 border-blue-200" },
    };
    
    const evidence = categories[category as keyof typeof categories] || 
      { level: "Emergente", color: "bg-purple-100 text-purple-800 border-purple-200" };
    
    return (
      <Badge className={cn("text-xs font-medium border", evidence.color)}>
        <Sparkles className="h-3 w-3 mr-1" />
        {evidence.level}
      </Badge>
    );
  };

  if (isDetailedView) {
    return <DetailedToolView tool={tool} onBack={() => setIsDetailedView(false)} />;
  }
  
  return (
    <>
      {featured ? (
        <div className="h-full cursor-pointer" onClick={() => setIsOpen(true)}>
          <div className="flex flex-col h-full">
            <div className="relative rounded-t-lg overflow-hidden h-56">
              {tool.imageUrl ? (
                <div className="w-full h-full absolute top-0 left-0 object-cover" style={{
                  backgroundImage: `url(${tool.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary-dark/40">
                  <Sparkles className="h-12 w-12 text-white/70" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/90 shadow-md flex items-center justify-center">
                  <Play className="h-8 w-8 text-primary-dark ml-1" />
                </div>
              </div>
              <div className="absolute top-3 right-3">
                <button 
                  className="p-2 rounded-full bg-white/80 shadow-md hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFavorite(!isFavorite);
                  }}
                >
                  {isFavorite ? (
                    <BookmarkCheck className="h-5 w-5 fill-primary text-primary" />
                  ) : (
                    <Bookmark className="h-5 w-5 text-gray-700" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-b-lg flex-grow flex flex-col">
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-grow">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{tool.name}</h3>
                </div>
                {getEvidenceBadge(tool.category)}
              </div>
              
              <p className="text-gray-800 mb-3 line-clamp-2">{tool.description}</p>
              
              <div className="mt-auto flex items-center">
                <div className="flex items-center text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                  <Clock className="h-4 w-4 mr-1.5 text-gray-500" />
                  <span className="text-sm font-medium">{tool.duration} min</span>
                </div>
                <span className="flex-grow"></span>
                <Button 
                  variant="link" 
                  className="text-primary font-semibold p-0 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(true);
                  }}
                >
                  Ver detalhes
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="cursor-pointer h-full" onClick={() => setIsOpen(true)}>
          <Card className="border border-gray-200 shadow-sm h-full flex flex-col">
            <div className="relative h-28 overflow-hidden rounded-t-lg">
              {tool.imageUrl ? (
                <div className="w-full h-full absolute top-0 left-0 object-cover" style={{
                  backgroundImage: `url(${tool.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary-dark/30">
                  <Sparkles className="h-8 w-8 text-white/70" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <button 
                  className="p-1.5 rounded-full bg-white/80 shadow-sm hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFavorite(!isFavorite);
                  }}
                >
                  {isFavorite ? (
                    <BookmarkCheck className="h-4 w-4 fill-primary text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4 text-gray-700" />
                  )}
                </button>
              </div>
            </div>
            
            <CardContent className="p-3 pb-2 flex-grow">
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight">{tool.name}</h4>
              </div>
              <p className="text-xs text-gray-700 mb-2 line-clamp-2">{tool.description}</p>
            </CardContent>
            
            <CardFooter className="p-3 pt-0 flex items-center justify-between">
              <div className="flex items-center bg-gray-100 px-2 py-1 rounded-full">
                <Clock className="h-3.5 w-3.5 mr-1 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">{tool.duration} min</span>
              </div>
              {getEvidenceBadge(tool.category)}
            </CardFooter>
          </Card>
        </div>
      )}
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white max-w-lg p-0 overflow-hidden">
          <div className="relative h-56">
            {tool.imageUrl ? (
              <div className="w-full h-full absolute top-0 left-0 object-cover" style={{
                backgroundImage: `url(${tool.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary-dark/40">
                <Sparkles className="h-12 w-12 text-white/70" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6">
              <DialogTitle className="text-2xl font-bold text-white mb-2">{tool.name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-0">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  {tool.duration} minutos
                </Badge>
                {getEvidenceBadge(tool.category)}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Sobre este exercício</h3>
            <p className="text-gray-800 mb-5">{tool.description}</p>
            
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Prévia
              </h4>
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="whitespace-pre-line line-clamp-4 text-gray-800">{tool.content.split('⸻')[0]}</p>
                {tool.content.includes('⸻') && (
                  <p className="text-xs text-primary font-medium mt-2">
                    + mais {tool.content.split('⸻').length - 1} passos neste exercício completo
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="bg-gray-50 border-t border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                setIsFavorite(!isFavorite);
              }}
            >
              {isFavorite ? (
                <>
                  <BookmarkCheck className="h-4 w-4 fill-primary text-primary" />
                  Salvo
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
            
            <Button 
              className="bg-primary hover:bg-primary-dark text-white gap-2 flex-grow"
              onClick={() => {
                setIsOpen(false);
                setIsDetailedView(true);
              }}
            >
              <Play className="h-4 w-4" />
              Iniciar exercício guiado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
