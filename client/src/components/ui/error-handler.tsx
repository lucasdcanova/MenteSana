import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IosCard } from '@/components/ui/ios-card';

export type ErrorType = 'network' | 'api' | 'authentication' | 'authorization' | 'ai' | 'unknown';

interface ErrorHandlerProps {
  error: Error | null;
  errorType?: ErrorType;
  isLoading?: boolean;
  retry?: () => void;
  hideRetry?: boolean;
  customMessage?: string;
  customAction?: {
    label: string;
    onClick: () => void;
  }
}

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  errorType = 'unknown',
  isLoading = false,
  retry,
  hideRetry = false,
  customMessage,
  customAction
}) => {
  if (!error && !customMessage) return null;
  
  const getErrorMessage = (): string => {
    if (customMessage) return customMessage;
    
    if (error?.message) return error.message;
    
    switch (errorType) {
      case 'network':
        return 'Não foi possível conectar ao servidor. Verifique sua conexão de internet.';
      case 'api':
        return 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.';
      case 'authentication':
        return 'Sua sessão expirou. Por favor, faça login novamente.';
      case 'authorization':
        return 'Você não tem permissão para acessar este recurso.';
      case 'ai':
        return 'Não foi possível processar com IA no momento. Estamos utilizando análises alternativas.';
      default:
        return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
    }
  };
  
  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return <WifiOff className="w-12 h-12 text-destructive" />;
      case 'authentication':
      case 'authorization':
        return <AlertCircle className="w-12 h-12 text-destructive" />;
      case 'ai':
        return <Wifi className="w-12 h-12 text-amber-500" />;
      default:
        return <AlertCircle className="w-12 h-12 text-destructive" />;
    }
  };
  
  return (
    <IosCard variant="glass" className="my-4 border-destructive/50 bg-destructive/5">
      <div className="flex flex-col items-center p-6 text-center">
        {getErrorIcon()}
        <h3 className="text-lg font-semibold mt-4 mb-2">Ops!</h3>
        <p className="text-sm text-gray-600 mb-4">{getErrorMessage()}</p>
        
        <div className="flex gap-3">
          {!hideRetry && retry && (
            <Button 
              variant="outline" 
              onClick={retry} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Tentando novamente...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Tentar novamente</span>
                </>
              )}
            </Button>
          )}
          
          {customAction && (
            <Button 
              variant="default" 
              onClick={customAction.onClick}
              className="flex items-center gap-2"
            >
              {customAction.label}
            </Button>
          )}
        </div>
      </div>
    </IosCard>
  );
};

// Wrapper para componentes com tratamento de erro
interface WithErrorHandlingProps {
  isLoading: boolean;
  error: Error | null;
  retry?: () => void;
  errorType?: ErrorType;
  children: React.ReactNode;
}

export const WithErrorHandling: React.FC<WithErrorHandlingProps> = ({
  isLoading,
  error,
  retry,
  errorType,
  children
}) => {
  if (error) {
    return <ErrorHandler error={error} retry={retry} errorType={errorType} />;
  }
  
  return <>{children}</>;
};

// Hook para detectar erros de rede
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline };
}

// Fallback para serviços de IA
export function useFallbackAI<T>(
  primaryFunction: () => Promise<T>,
  fallbackFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [error, setError] = React.useState<Error | null>(null);
  
  const execute = React.useCallback(async () => {
    try {
      setError(null);
      return await primaryFunction();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      console.warn('Erro no serviço principal de IA, usando fallback:', err);
      try {
        return await fallbackFunction();
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
  }, [primaryFunction, fallbackFunction, ...dependencies]);
  
  return { execute, error };
}