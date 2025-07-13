import React from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { AvailabilityScheduler } from '@/components/therapist/availability-scheduler';
import { UrgencyToggle } from '@/components/therapist/urgency-toggle';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Redirect } from 'wouter';

export default function TherapistAvailabilityPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Verificar se o usuário é um terapeuta
  if (!user || !user.isTherapist) {
    return <Redirect to="/" />;
  }
  
  const therapistId = user.therapistId || user.id;
  
  return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Gerenciar Disponibilidade</h1>
        
        <div className="space-y-8">
          <UrgencyToggle therapistId={therapistId} />
          
          <Tabs defaultValue="regular" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="regular">Disponibilidade Regular</TabsTrigger>
              <TabsTrigger value="info">Informações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="regular">
              <AvailabilityScheduler therapistId={therapistId} />
            </TabsContent>
            
            <TabsContent value="info">
              <div className="space-y-4 bg-card p-6 rounded-lg border">
                <h3 className="text-xl font-semibold mb-2">Como funciona a disponibilidade</h3>
                <p>
                  Configure seus horários de disponibilidade para que pacientes possam 
                  agendar consultas apenas nos horários que você definir.
                </p>
                
                <div className="mt-4 space-y-3">
                  <div className="flex items-start">
                    <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">1</div>
                    <div>
                      <h4 className="font-medium">Disponibilidade Recorrente</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure dias e horários semanais em que você está disponível regularmente.
                        Por exemplo: todas as segundas-feiras das 13h às 17h.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">2</div>
                    <div>
                      <h4 className="font-medium">Data Específica</h4>
                      <p className="text-sm text-muted-foreground">
                        Defina disponibilidade para datas específicas quando sua agenda variar.
                        Por exemplo: disponível em 25/08/2023 das 10h às 12h.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">3</div>
                    <div>
                      <h4 className="font-medium">Atendimentos de Urgência</h4>
                      <p className="text-sm text-muted-foreground">
                        Ative a disponibilidade para urgências quando puder atender pacientes 
                        imediatamente. Desative quando não estiver disponível para chamadas de emergência.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
  );
}