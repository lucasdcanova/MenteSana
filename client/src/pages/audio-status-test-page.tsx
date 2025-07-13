import React, { useState, useEffect } from 'react';
import { AudioProcessingStatus } from '@/components/ui/audio-processing-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

export default function AudioStatusTestPage() {
  const [audioId, setAudioId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('tester');
  const [endpoints, setEndpoints] = useState<{url: string, status: number, data: any}[]>([]);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollResult, setPollResult] = useState<any>(null);
  
  // Função para gerar um ID de teste aleatório
  const generateTestId = () => {
    const randomId = `test_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    setAudioId(randomId);
    return randomId;
  };
  
  // Função para verificar os endpoints de status
  const checkEndpoints = async () => {
    if (!audioId) {
      toast({
        title: "ID de áudio necessário",
        description: "Por favor, informe um ID de áudio para testar",
        variant: "destructive"
      });
      return;
    }
    
    setEndpoints([]);
    
    // Lista de endpoints a testar
    const endpointsToCheck = [
      `/api/audio/processing-status/${audioId}`,
      `/api/processing-status/${audioId}`
    ];
    
    // Testar cada endpoint
    for (const url of endpointsToCheck) {
      try {
        const response = await fetch(url);
        const status = response.status;
        let data = null;
        
        try {
          data = await response.json();
        } catch (e) {
          // Ignora erro de parse JSON
        }
        
        setEndpoints(prev => [...prev, { url, status, data }]);
      } catch (error) {
        setEndpoints(prev => [...prev, { 
          url, 
          status: 0, 
          data: { error: error instanceof Error ? error.message : String(error) } 
        }]);
      }
    }
  };
  
  // Função para iniciar um processamento de teste
  const startTestProcessing = async () => {
    const id = audioId || generateTestId();
    
    try {
      const response = await fetch(`/api/create-test-processing/${id}`);
      const data = await response.json();
      
      toast({
        title: "Processamento iniciado",
        description: `ID: ${id}. Status: ${data.status}, Progresso: ${data.progress}%`,
      });
      
      // Atualizar a lista de endpoints após iniciar o processamento
      checkEndpoints();
    } catch (error) {
      toast({
        title: "Erro ao iniciar processamento",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };
  
  // Função para iniciar/parar o polling
  const togglePolling = () => {
    if (isPolling) {
      setIsPolling(false);
    } else {
      if (!audioId) {
        toast({
          title: "ID de áudio necessário",
          description: "Por favor, informe um ID de áudio para iniciar o polling",
          variant: "destructive"
        });
        return;
      }
      setIsPolling(true);
    }
  };
  
  // Efeito para gerenciar o polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPolling && audioId) {
      interval = setInterval(async () => {
        try {
          // Use o componente AudioProcessingStatus para verificar o status
          const result = await fetch(`/api/audio/processing-status/${audioId}`);
          const data = await result.json();
          setPollResult(data);
          
          // Se o status for "complete" ou "error", pare o polling
          if (data.status === 'complete' || data.status === 'error') {
            setIsPolling(false);
          }
        } catch (error) {
          console.error("Erro no polling:", error);
          setPollResult({ error: error instanceof Error ? error.message : String(error) });
        }
      }, 1000); // Verificar a cada segundo
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, audioId]);
  
  return (
    <div className="container py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Teste de Status de Processamento de Áudio</h1>
        <p className="text-muted-foreground">
          Esta página permite testar o componente AudioProcessingStatus e seus endpoints relacionados.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Identificador de Áudio</CardTitle>
          <CardDescription>Informe ou gere um ID para testar o status de processamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              value={audioId} 
              onChange={e => setAudioId(e.target.value)} 
              placeholder="ID do áudio (ex: audio_123456789)"
              className="flex-1"
            />
            <Button onClick={generateTestId}>Gerar ID de Teste</Button>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={checkEndpoints} variant="outline" className="flex-1">
              Testar Endpoints de Status
            </Button>
            <Button onClick={startTestProcessing} className="flex-1">
              Iniciar Processamento de Teste
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="tester">Testador de Componente</TabsTrigger>
          <TabsTrigger value="endpoints">Resultados de Endpoints</TabsTrigger>
        </TabsList>
        <TabsContent value="tester" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teste do Componente AudioProcessingStatus</CardTitle>
              <CardDescription>
                Visualize o componente em ação com polling automático
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Status para: <code className="bg-muted rounded p-1">{audioId || 'Nenhum ID informado'}</code>
                </span>
                <Button 
                  onClick={togglePolling} 
                  variant={isPolling ? "destructive" : "outline"}
                  size="sm"
                >
                  {isPolling ? "Parar Polling" : "Iniciar Polling"}
                </Button>
              </div>
              
              <div className="border rounded-md p-4">
                {audioId ? (
                  <AudioProcessingStatus 
                    audioId={audioId} 
                    autoRefresh={false} // Estamos controlando o polling manualmente 
                    manualData={pollResult}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Informe um ID de áudio para visualizar o status
                  </p>
                )}
              </div>
              
              {pollResult && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Dados do polling:</h4>
                  <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">
                    {JSON.stringify(pollResult, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Componente com Status Fixos</CardTitle>
              <CardDescription>
                Visualize o componente com valores estáticos para cada estado
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-semibold mb-2">Em Fila (0%)</h4>
                <AudioProcessingStatus 
                  audioId="static-queued" 
                  autoRefresh={false}
                  manualData={{
                    status: 'queued',
                    progress: 0,
                    audioId: 'static-queued'
                  }} 
                />
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-semibold mb-2">Transcrevendo (30%)</h4>
                <AudioProcessingStatus 
                  audioId="static-transcribing" 
                  autoRefresh={false}
                  manualData={{
                    status: 'transcribing',
                    progress: 30,
                    audioId: 'static-transcribing'
                  }} 
                />
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-semibold mb-2">Analisando (60%)</h4>
                <AudioProcessingStatus 
                  audioId="static-analyzing" 
                  autoRefresh={false}
                  manualData={{
                    status: 'analyzing',
                    progress: 60,
                    audioId: 'static-analyzing'
                  }} 
                />
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-semibold mb-2">Gerando Título (80%)</h4>
                <AudioProcessingStatus 
                  audioId="static-title" 
                  autoRefresh={false}
                  manualData={{
                    status: 'generating-title',
                    progress: 80,
                    audioId: 'static-title'
                  }} 
                />
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-semibold mb-2">Completo (100%)</h4>
                <AudioProcessingStatus 
                  audioId="static-complete" 
                  autoRefresh={false}
                  manualData={{
                    status: 'complete',
                    progress: 100,
                    audioId: 'static-complete'
                  }} 
                />
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-semibold mb-2">Erro (10%)</h4>
                <AudioProcessingStatus 
                  audioId="static-error" 
                  autoRefresh={false}
                  manualData={{
                    status: 'error',
                    progress: 10,
                    audioId: 'static-error',
                    error: 'Erro de exemplo para visualização'
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>Resultados dos Endpoints</CardTitle>
              <CardDescription>
                Visualize as respostas de diferentes endpoints de status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {endpoints.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Clique em "Testar Endpoints de Status" para ver os resultados
                </p>
              ) : (
                <div className="space-y-4">
                  {endpoints.map((endpoint, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm">{endpoint.url}</span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          endpoint.status >= 200 && endpoint.status < 300 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {endpoint.status || 'Erro'}
                        </span>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <pre className="bg-muted p-2 rounded-md text-xs overflow-auto mt-2">
                        {JSON.stringify(endpoint.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={checkEndpoints} variant="outline" className="w-full">
                Verificar Endpoints Novamente
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}