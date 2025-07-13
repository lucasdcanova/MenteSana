import React, { Suspense, lazy, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Fallback genérico para usar durante o carregamento
export const DefaultLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[200px] w-full">
    <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
  </div>
);

// Fallback de página para carregamento
export const PageLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-[100dvh] w-full">
    <div className="text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary/70 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  errorComponent?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error) => void;
}

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
      <h3 className="font-semibold mb-2">Erro ao carregar componente</h3>
      <p className="text-sm">Ocorreu um erro ao carregar este componente. Por favor, recarregue a página.</p>
      <button 
        onClick={reset} 
        className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md text-sm font-medium hover:bg-red-200"
      >
        Tentar novamente
      </button>
    </div>
  );
}

/**
 * Wrapper para lazy loading de componentes com tratamento de erro integrado
 * @param factory Função que importa o componente usando dynamic import
 * @param options Opções de configuração (fallback, errorComponent, onError)
 * @returns Componente carregado de forma lazy
 */
export function lazyLoad<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const { 
    fallback = <DefaultLoadingFallback />,
    errorComponent: ErrorComponent = DefaultErrorComponent,
    onError 
  } = options;

  const LazyComponent = lazy(() => factory());

  return function LazyLoadWrapper(props: React.ComponentProps<T>): JSX.Element {
    const [error, setError] = React.useState<Error | null>(null);

    if (error) {
      return (
        <ErrorComponent 
          error={error} 
          reset={() => {
            setError(null);
            
            // Forçar uma nova tentativa de carregamento
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `data:text/css;base64,${Math.random()}`;
            document.head.appendChild(link);
            setTimeout(() => document.head.removeChild(link), 10);
          }} 
        />
      );
    }

    return (
      <ErrorBoundary onError={(e) => {
        if (onError) onError(e);
        setError(e);
      }}>
        <Suspense fallback={fallback}>
          <LazyComponent {...props as any} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

// Classe de limite de erro para capturar erros em componentes filhos
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // O erro será tratado pelo componente pai
    }

    return this.props.children;
  }
}

/**
 * HOC para transformar um componente normal em um componente lazy-loaded
 * @param Component Componente a ser carregado de forma lazy
 * @param options Opções de configuração (fallback, errorComponent, onError)
 * @returns Componente lazy-loaded
 */
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options: LazyLoadOptions = {}
) {
  const LazyWrapper = lazyLoad(() => Promise.resolve({ default: Component }), options);
  return LazyWrapper;
}

/**
 * Hook para lazy loading de dados
 * @param fetchFn Função que carrega os dados
 * @param options Opções de configuração
 * @returns { data, isLoading, error, refetch }
 */
export function useLazyData<T>(
  fetchFn: () => Promise<T>,
  options: {
    initialData?: T;
    deps?: React.DependencyList;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { initialData, deps = [], onSuccess, onError } = options;
  const [data, setData] = React.useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      setData(result);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      setError(error);
      if (onError) onError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, onSuccess, onError, ...deps]);

  React.useEffect(() => {
    fetchData().catch(e => console.error('Erro ao carregar dados:', e));
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}