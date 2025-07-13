import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

/**
 * Interface de propriedades para o componente OptimizedImage
 */
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * URL da imagem a ser carregada
   */
  src: string;
  
  /**
   * URL da imagem de placeholder (opcional)
   */
  placeholderSrc?: string;
  
  /**
   * Tamanho do blur da imagem durante o carregamento (0-20)
   */
  blurAmount?: number;
  
  /**
   * Callback chamado quando a imagem é carregada com sucesso
   */
  onLoad?: () => void;
  
  /**
   * Callback chamado quando ocorre um erro no carregamento da imagem
   */
  onError?: () => void;
  
  /**
   * Indicador de prioridade (images acima da dobra devem ter prioridade true)
   */
  priority?: boolean;
  
  /**
   * Strategy para lazy loading das imagens
   * - 'eager': carrega imediatamente (bom para imagens críticas acima da dobra)
   * - 'lazy': carrega quando se aproxima do viewport (padrão)
   */
  loading?: 'eager' | 'lazy';
}

/**
 * Componente que otimiza o carregamento de imagens com efeito de blur e lazy loading
 */
export function OptimizedImage({
  src,
  alt = "",
  placeholderSrc,
  className,
  blurAmount = 10,
  onLoad,
  onError,
  priority = false,
  loading: loadingProp,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  // Define a estratégia de loading
  const loading = priority ? 'eager' : (loadingProp || 'lazy');
  
  // Reseta o estado quando a fonte da imagem muda
  useEffect(() => {
    setIsLoaded(false);
    setError(false);
  }, [src]);
  
  // Gerencia o evento de carregamento da imagem
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  // Gerencia o evento de erro da imagem
  const handleError = () => {
    setError(true);
    onError?.();
  };
  
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Fallback para o placeholder ou o blur durante o carregamento */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 w-full h-full">
          {placeholderSrc ? (
            <img
              src={placeholderSrc}
              alt={`Carregando ${alt}`}
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
          ) : (
            <div 
              className={`w-full h-full bg-muted animate-pulse`}
              style={{ backdropFilter: `blur(${blurAmount}px)` }}
              aria-hidden="true"
            />
          )}
        </div>
      )}
      
      {/* Imagem principal */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={cn(
          "w-full h-full transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {/* Fallback para erro */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center p-4">
            <span className="text-muted-foreground text-sm">
              Não foi possível carregar a imagem
            </span>
          </div>
        </div>
      )}
    </div>
  );
}