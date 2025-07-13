import { useState, useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { apiRequest } from '@/lib/queryClient';
import { Check, AlertCircle, Clock, Loader } from "lucide-react";

interface AudioProcessingStatusProps {
  audioId: string | number;
  onComplete?: (entryId: number) => void;
  className?: string;
  autoRefresh?: boolean; // Controla se o componente deve fazer polling automático
  refreshInterval?: number; // Intervalo em milissegundos para atualização do status
  manualData?: any; // Dados de status passados manualmente para testes
}

export function AudioProcessingStatus({ 
  audioId, 
  onComplete,
  className = "",
  autoRefresh = true,
  refreshInterval = 2000,
  manualData = null
}: AudioProcessingStatusProps) {
  const [status, setStatus] = useState<'pending' | 'transcribing' | 'analyzing' | 'completed' | 'error'>('pending');
  const [progress, setProgress] = useState(0);
  const [entryId, setEntryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  // Função auxiliar para processar dados de status
  const processStatusData = (data: any) => {
    console.log("Processando dados de status:", data);
    
    // Mapear o status do backend para os estados do componente
    let mappedStatus = 'pending';
    if (data.processingStatus === 'transcribing' || data.status === 'transcribing') {
      mappedStatus = 'transcribing';
    } else if (data.processingStatus === 'analyzing' || data.status === 'analyzing' || 
              data.processingStatus === 'categorizing' || data.status === 'categorizing' ||
              data.processingStatus === 'generating-title' || data.status === 'generating-title') {
      mappedStatus = 'analyzing';
    } else if (data.processingStatus === 'completed' || data.processingStatus === 'complete' || 
              data.status === 'complete' || data.isComplete) {
      mappedStatus = 'completed';
    } else if (data.processingStatus === 'error' || data.status === 'error') {
      mappedStatus = 'error';
    }
    
    setStatus(mappedStatus as any);
    setProgress(data.processingProgress || data.progress || 0);
    
    if (data.id && !entryId) {
      setEntryId(data.id);
    }
    
    // Se estiver completo ou tiver erro, parar de fazer polling
    if (mappedStatus === 'completed' || mappedStatus === 'error') {
      setPolling(false);
      
      if (mappedStatus === 'completed' && onComplete && data.id) {
        onComplete(data.id);
      }
      
      if (mappedStatus === 'error') {
        setError(data.errorMessage || data.error || 'Ocorreu um erro ao processar o áudio');
      }
    }
  };

  // Efeito para processar dados manuais
  useEffect(() => {
    if (manualData) {
      processStatusData(manualData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualData]);

  // Efeito para realizar o polling automático
  useEffect(() => {
    // Se temos dados manuais ou o polling automático está desativado, não iniciar o polling
    if (!audioId || !polling || !autoRefresh || manualData) return;

    const checkStatus = async () => {
      try {
        // Tentar primeiro a rota principal, depois a compatível com versões anteriores
        const response = await fetch(`/api/audio/processing-status/${audioId}`);
        
        if (!response.ok) {
          // Se receber 404 ou outro erro, tentar a rota alternativa
          console.warn(`Erro ao buscar status de processamento (rota principal): ${response.status}`);
          
          // Tentar rota alternativa
          const altResponse = await fetch(`/api/processing-status/${audioId}`);
          
          if (!altResponse.ok) {
            console.warn(`Erro ao buscar status de processamento (rota alternativa): ${altResponse.status}`);
            return;
          }
          
          // Se a alternativa funcionou, usar essa resposta
          const data = await altResponse.json();
          console.log("Status de processamento (rota alternativa):", data);
          processStatusData(data);
          return;
        }
        
        const data = await response.json();
        console.log("Status de processamento:", data);
        processStatusData(data);
      } catch (err) {
        console.error('Erro ao verificar status de processamento:', err);
        // Não parar o polling por erros de rede, apenas continuar tentando
      }
    };

    // Fazer a verificação imediatamente e depois a cada X segundos
    checkStatus();
    const interval = setInterval(checkStatus, refreshInterval);
    
    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioId, polling, entryId, onComplete, autoRefresh, refreshInterval, manualData]);

  // Função para mostrar mensagem de status
  const getStatusMessage = () => {
    switch (status) {
      case 'pending':
        return 'Preparando áudio...';
      case 'transcribing':
        return 'Transcrevendo áudio...';
      case 'analyzing':
        return 'Analisando conteúdo...';
      case 'completed':
        return 'Processamento concluído!';
      case 'error':
        return error || 'Erro no processamento';
      default:
        return 'Processando...';
    }
  };

  // Função para mostrar ícone de status
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'transcribing':
      case 'analyzing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader className="h-5 w-5 animate-spin" />;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusMessage()}</span>
      </div>
      
      <Progress 
        value={progress} 
        className="h-2" 
        indicatorClassName={
          status === 'completed' 
            ? "bg-green-500" 
            : status === 'error' 
              ? "bg-red-500" 
              : undefined
        } 
      />
      
      <div className="text-xs text-muted-foreground text-right">
        {progress}%
      </div>
    </div>
  );
}