import React, { useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft } from 'lucide-react';
import { isIOS } from '@/lib/pwa-utils-simple';
import { IOSMenuButton } from '@/components/ui/ios-menu-button';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onMenuClick?: () => void;
}

/**
 * Componente de cabeçalho que aparece em todas as páginas
 * Otimizado para iOS com suporte a safe areas e design nativo
 * Com correções avançadas para interação touchscreen em iOS
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBackButton = false,
  onMenuClick
}) => {
  const [, setLocation] = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isIOSDevice = isIOS();
  
  // Manipulador de evento para o botão voltar
  const handleBack = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Prevenir comportamento padrão e propagação
    e.preventDefault();
    e.stopPropagation();
    
    window.history.back();
  }, []);
  
  // Manipulador de evento de clique para o botão menu
  const handleMenuClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Parar a propagação do evento e prevenir comportamento padrão
    e.preventDefault();
    e.stopPropagation();
    
    // Adicionar um log para debug
    console.log('Botão de menu clicado');
    
    // Certificar que o manipulador existe
    if (typeof onMenuClick === 'function') {
      onMenuClick();
    } else {
      console.error('Manipulador de clique do menu não foi fornecido');
    }
  }, [onMenuClick]);
  
  // Manipulador específico para toque em iOS
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    // Não previne comportamento padrão para permitir efeitos visuais de toque
  }, []);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (typeof onMenuClick === 'function') {
      onMenuClick();
    }
  }, [onMenuClick]);
  
  // Configuração especial para iOS para garantir que o botão de menu funcione
  useEffect(() => {
    if (!isIOSDevice || !menuButtonRef.current) return;
    
    const menuButton = menuButtonRef.current;
    
    // Remover eventos padrão para evitar duplicação
    menuButton.removeEventListener('touchstart', handleTouchStart as any);
    menuButton.removeEventListener('touchend', handleTouchEnd as any);
    
    // Adicionar listeners de eventos de toque personalizados
    menuButton.addEventListener('touchstart', handleTouchStart as any, { passive: false });
    menuButton.addEventListener('touchend', handleTouchEnd as any, { passive: false });
    
    // Adicionar atributos extras para melhorar a acessibilidade e interação
    menuButton.style.cursor = 'pointer';
    // Aplicar estilos webkit usando setAttribute para evitar erros de tipagem
    menuButton.setAttribute(
      'style', 
      `${menuButton.getAttribute('style') || ''}; 
      -webkit-tap-highlight-color: rgba(0,0,0,0); 
      -webkit-touch-callout: none; 
      -webkit-user-select: none; 
      touch-action: manipulation;`
    );
    
    return () => {
      // Remover todos os listeners ao desmontar
      menuButton.removeEventListener('touchstart', handleTouchStart as any);
      menuButton.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [isIOSDevice, handleTouchStart, handleTouchEnd]);
  
  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 pt-safe-top bg-white/95 backdrop-blur-md border-b border-gray-100 h-16 flex items-center px-4 shadow-sm hardware-accelerated"
      style={{
        WebkitBackdropFilter: 'blur(12px)',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        willChange: 'transform',
        isolation: 'isolate',
        zIndex: 1000
      }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          {showBackButton ? (
            <button 
              onClick={handleBack}
              aria-label="Voltar"
              className="w-10 h-10 mr-2 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:bg-gray-200 ios-touch-fix"
              type="button"
              // O estilo inline é aplicado com um atributo style personalizado para funcionar com webkit
              style={{
                touchAction: 'manipulation',
                cursor: 'pointer'
              } as React.CSSProperties}
              data-touch-enabled="true"
            >
              <ChevronLeft className="w-6 h-6 text-slate-800" />
            </button>
          ) : (
            // Usando o componente especializado para garantir que o menu funcione em todas as situações
            <IOSMenuButton onMenuClick={onMenuClick!} />
          )}
        </div>
        
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 ios-title-medium text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[60%]">
          {title || 'MindWell'}
        </div>
        
        <div className="w-10 h-10">
          {/* Espaço reservado para ações adicionais no lado direito */}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;