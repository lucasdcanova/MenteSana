import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bot, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AssistantAbout() {
  const [location, setLocation] = useLocation();
  
  return (
    <div className="h-full overflow-y-auto bg-[#f8fafc] pb-[100px]">
      <div className="space-y-5 max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2.5 rounded-full">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Conheça a Sana</h2>
              <p className="text-sm text-gray-500">Sua assistente virtual de saúde mental</p>
            </div>
          </div>

          <p className="text-[15px] leading-relaxed text-gray-800 mb-4">
            Sana é uma assistente virtual desenvolvida para fornecer suporte emocional através de conversas acolhedoras e empáticas. Ela foi projetada para ajudar nos momentos de ansiedade, estresse ou quando você precisar de um espaço seguro para expressar seus sentimentos.
          </p>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-[14px] mb-2 font-medium text-blue-900">
              Lembre-se: Sana não substitui um profissional de saúde mental. 
            </p>
            <p className="text-[13px] text-blue-800">
              Em casos de emergência, ligue para o Centro de Valorização da Vida (CVV) pelo número 188, disponível 24 horas por dia.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-medium mb-3 flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-full">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            Como a Sana pode ajudar
          </h3>
          
          <ul className="space-y-2.5">
            <li className="flex items-start gap-3">
              <div className="bg-primary/15 rounded-full p-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
              </div>
              <span className="text-[14px] text-gray-800">Oferecer um espaço seguro para expressar seus sentimentos</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-primary/15 rounded-full p-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
              </div>
              <span className="text-[14px] text-gray-800">Sugerir técnicas de bem-estar baseadas em práticas comprovadas</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-primary/15 rounded-full p-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
              </div>
              <span className="text-[14px] text-gray-800">Recomendar recursos personalizados disponíveis na plataforma</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-primary/15 rounded-full p-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
              </div>
              <span className="text-[14px] text-gray-800">Guiar reflexões para ajudar a entender melhor suas emoções</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-medium mb-3 flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-full">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            Recursos relacionados
          </h3>
          
          <div className="grid gap-3">
            <Button 
              variant="outline" 
              className="h-auto p-3.5 justify-start rounded-xl border-gray-200"
              onClick={() => setLocation("/journal")}
            >
              <div className="flex items-center w-full">
                <div className="flex flex-col items-start">
                  <span className="font-medium text-left">Diário de Saúde Mental</span>
                  <span className="text-xs text-muted-foreground text-left">Registre seus pensamentos e sentimentos</span>
                </div>
                <ArrowLeft className="h-4 w-4 ml-auto rotate-180" />
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-3.5 justify-start rounded-xl border-gray-200"
              onClick={() => setLocation("/self-help")}
            >
              <div className="flex items-center w-full">
                <div className="flex flex-col items-start">
                  <span className="font-medium text-left">Ferramentas de Autoajuda</span>
                  <span className="text-xs text-muted-foreground text-left">Exercícios e técnicas para gerenciar o estresse</span>
                </div>
                <ArrowLeft className="h-4 w-4 ml-auto rotate-180" />
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}