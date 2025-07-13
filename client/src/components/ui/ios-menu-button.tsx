import React, { useCallback, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { isIOS } from '@/lib/pwa-utils-simple';

interface IOSMenuButtonProps {
  onMenuClick: () => void;
}

/**
 * Componente específico para o botão de menu, otimizado para dispositivos iOS
 * com tratamento avançado de eventos touch para garantir que funcione em todas as páginas
 */
export const IOSMenuButton: React.FC<IOSMenuButtonProps> = ({ onMenuClick }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isIOSDevice = isIOS();
  
  // Manipulador para clique do botão
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('IOSMenuButton: Botão de menu clicado via onClick');
    
    if (typeof onMenuClick === 'function') {
      onMenuClick();
    }
  }, [onMenuClick]);
  
  // Manipuladores específicos para eventos touch
  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    e.stopPropagation();
    console.log('IOSMenuButton: touchstart detectado');
  }, []);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('IOSMenuButton: touchend detectado');
    
    if (typeof onMenuClick === 'function') {
      onMenuClick();
    }
  }, [onMenuClick]);
  
  // Configuração direta de eventos DOM para maior compatibilidade
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    
    // Remover eventos existentes para evitar duplicação
    button.removeEventListener('touchstart', handleTouchStart as any);
    button.removeEventListener('touchend', handleTouchEnd as any);
    
    // Adicionar eventos diretamente ao DOM
    button.addEventListener('touchstart', handleTouchStart as any, { passive: false });
    button.addEventListener('touchend', handleTouchEnd as any, { passive: false });
    
    // Adicionar atributos especiais via DOM para garantir funcionamento em iOS
    button.setAttribute('data-menu-button', 'true');
    button.setAttribute('data-interactive', 'true');
    button.setAttribute('aria-label', 'Menu');
    
    // Aplicar estilos diretamente no DOM para máxima compatibilidade
    button.setAttribute(
      'style',
      `touch-action: manipulation;
       cursor: pointer;
       pointer-events: auto;
       position: relative;
       z-index: 9999 !important;
       -webkit-tap-highlight-color: rgba(0,0,0,0);
       -webkit-touch-callout: none;
       -webkit-user-select: none;
       transform: translateZ(0);
       backface-visibility: hidden;
       -webkit-backface-visibility: hidden;
       will-change: transform;
       isolation: isolate;`
    );
    
    // Cleanup ao desmontar
    return () => {
      button.removeEventListener('touchstart', handleTouchStart as any);
      button.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchEnd]);
  
  return (
    <button 
      ref={buttonRef}
      onClick={handleClick}
      type="button"
      className="w-10 h-10 mr-2 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:bg-gray-200 ios-touch-fix ios-events-contained ios-menu-button"
      data-testid="menu-button"
    >
      <Menu className="w-6 h-6 text-slate-800" />
    </button>
  );
};

export default IOSMenuButton;