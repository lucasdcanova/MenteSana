import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Info } from "lucide-react";
import { BreathingExercise } from "@/components/relaxation/breathing-exercise";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function BreathingExercisePage() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="min-h-[100dvh] h-full flex flex-col bg-gradient-to-b from-white to-primary/5">
      {/* Cabeçalho */}
      <header className="pt-[env(safe-area-inset-top,12px)] px-6 py-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Exercício de Respiração</h1>
          </div>
          
          <Sheet open={showInfo} onOpenChange={setShowInfo}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Info className="h-5 w-5 text-gray-600" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sobre os Exercícios de Respiração</SheetTitle>
                <SheetDescription>
                  Entenda os benefícios e como praticar corretamente
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-base font-medium text-gray-800 mb-1">Benefícios da respiração consciente</h3>
                  <p className="text-sm text-gray-600">
                    Os exercícios de respiração ajudam a reduzir o estresse, diminuir a ansiedade, 
                    melhorar o foco e concentração, baixar a pressão arterial e promover sensação 
                    de calma e bem-estar.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-base font-medium text-gray-800 mb-1">Técnica de Respiração Quadrada (Box)</h3>
                  <p className="text-sm text-gray-600">
                    Inspire por 4 segundos, segure por 4 segundos, expire por 4 segundos e segure novamente por 4 segundos.
                    Simples e eficaz para momentos de estresse e ansiedade.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-base font-medium text-gray-800 mb-1">Técnica 4-7-8</h3>
                  <p className="text-sm text-gray-600">
                    Desenvolvida pelo Dr. Andrew Weil, esta técnica consiste em inspirar por 4 segundos,
                    segurar a respiração por 7 segundos e expirar por 8 segundos. Excelente para induzir 
                    relaxamento e ajudar a adormecer.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-base font-medium text-gray-800 mb-1">Respiração Calmante</h3>
                  <p className="text-sm text-gray-600">
                    Uma técnica simples onde a expiração é mais longa que a inspiração. Ativa o sistema 
                    nervoso parassimpático, responsável pelo estado de relaxamento do corpo.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-base font-medium text-gray-800 mb-1">Respiração Energizante</h3>
                  <p className="text-sm text-gray-600">
                    Inspirações e expirações curtas e ritmadas que aumentam a oxigenação e proporcionam
                    mais energia e foco. Ideal para momentos de baixa energia ou quando precisar se 
                    concentrar.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-base font-medium text-gray-800 mb-1">Como praticar</h3>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                    <li>Encontre um local tranquilo e silencioso</li>
                    <li>Sente-se em uma posição confortável, mas com a coluna ereta</li>
                    <li>Relaxe os ombros e o maxilar</li>
                    <li>Concentre-se apenas na sua respiração</li>
                    <li>Respire pelo nariz, a menos que indicado o contrário</li>
                    <li>Pratique regularmente para melhores resultados</li>
                  </ul>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <BreathingExercise />
        </div>
        
        <div className="mt-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Respire e Relaxe</h2>
          <p className="text-gray-600">
            Reserve alguns minutos para se concentrar na sua respiração. 
            Este exercício simples pode reduzir o estresse e melhorar o seu bem-estar.
          </p>
        </div>
      </div>
    </div>
  );
}