import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmergencyTherapistsSection } from "@/components/therapists/emergency-therapists-section";
import { AlertCircle, Headphones, Phone } from "lucide-react";
import { useLocation } from "wouter";

export default function EmergencyPage() {
  const [, navigate] = useLocation();
  
  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 md:px-6">
      <PageHeader
        title="Atendimento de Emergência"
        description="Acesso rápido a profissionais disponíveis para suporte imediato em situações críticas."
        icon={<AlertCircle className="h-8 w-8 text-red-500" />}
      />
      
      <Alert className="mb-6 border-red-200 bg-red-50 w-full max-w-full shadow-sm">
        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <AlertTitle className="text-red-700 font-semibold">Está em crise?</AlertTitle>
        <AlertDescription className="text-red-600 text-center md:text-left">
          Se você estiver em uma emergência com risco de vida ou em uma situação que requer assistência imediata, por favor, entre em contato com os serviços de emergência locais.
        </AlertDescription>
        <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
          <Button
            size="sm"
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 rounded-full px-4"
            onClick={() => window.open('tel:188', '_blank')}
          >
            <Phone className="mr-2 h-4 w-4" />
            Ligar para 188 (CVV)
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-red-200 text-red-700 hover:bg-red-100 rounded-full px-4"
            onClick={() => window.open('tel:192', '_blank')}
          >
            <Phone className="mr-2 h-4 w-4" />
            SAMU (192)
          </Button>
        </div>
      </Alert>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <EmergencyTherapistsSection />
        </div>
        
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-center md:text-left">Recursos Adicionais</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Headphones className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Centro de Valorização da Vida</p>
                  <p className="text-sm text-gray-500">Apoio emocional gratuito 24h por dia</p>
                  <Button 
                    variant="link" 
                    className="px-0 h-auto py-0 text-primary"
                    onClick={() => window.open('https://www.cvv.org.br/', '_blank')}
                  >
                    Acessar site
                  </Button>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Primeiros Socorros Psicológicos</p>
                  <p className="text-sm text-gray-500">Guia para momentos de crise emocional</p>
                  <Button 
                    variant="link" 
                    className="px-0 h-auto py-0 text-primary"
                    onClick={() => navigate("/self-help/crisis")}
                  >
                    Ler guia
                  </Button>
                </div>
              </div>
              
              <Button 
                className="w-full rounded-full mt-2 shadow-sm" 
                onClick={() => navigate("/assistant")}
              >
                Falar com Assistente Virtual
              </Button>
            </div>
          </div>
          
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-center md:text-left">Sinais de Alerta</h3>
            <p className="text-sm text-gray-500 mb-4 text-center md:text-left">
              Reconheça os sinais que podem indicar necessidade de ajuda imediata:
            </p>
            <ul className="text-sm list-disc px-2 md:px-4 space-y-2 text-gray-600">
              <li>Pensamentos suicidas ou de autolesão</li>
              <li>Ansiedade extrema ou ataques de pânico</li>
              <li>Alterações drásticas de humor</li>
              <li>Comportamento impulsivo perigoso</li>
              <li>Sentimento de estar fora da realidade</li>
              <li>Crises traumáticas agudas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}