import React, { ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import { isIOS } from '@/lib/pwa-utils-simple';

interface IOSTouchWrapperProps {
  children: ReactNode;
  className?: string;
  // Flag opcional para forçar a aplicação das correções mesmo em dispositivos não-iOS
  forceEnable?: boolean;
  // Flag para habilitar o modo de depuração
  debug?: boolean;
  // Flag para a correção de scroll
  enableScrollFix?: boolean;
  // Função de callback opcional quando um toque é detectado
  onTouchDetected?: () => void;
}

/**
 * Componente avançado para solucionar problemas de interação touch no iOS.
 * Deve ser usado para envolver componentes que precisam de interação touch
 * nas páginas de Estado Emocional e Ajuda do Dia ou outras páginas com interação especial.
 * 
 * Implementa técnicas específicas para iOS para prevenir eventos fantasmas (ghost clicks),
 * melhorar a detecção de toques, garantir propagação de eventos e corrigir problemas de scroll.
 */
export const IOSTouchWrapper: React.FC<IOSTouchWrapperProps> = ({ 
  children, 
  className = '',
  forceEnable = false,
  debug = false,
  enableScrollFix = true,
  onTouchDetected
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const touchTimeoutRef = useRef<number | null>(null);
  const [isApplied, setIsApplied] = useState(false);
  const [touchCount, setTouchCount] = useState(0);
  
  // Log de depuração condicional
  const debugLog = useCallback((message: string) => {
    if (debug) {
      console.log(`[IOSTouchWrapper] ${message}`);
    }
  }, [debug]);
  
  useEffect(() => {
    // Aplicar correções em dispositivos iOS ou quando forceEnable=true
    const isIOSDevice = isIOS();
    const shouldApply = isIOSDevice || forceEnable;
    
    if (!shouldApply) return;
    
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    // Debug info - apenas para desenvolvimento
    debugLog(`Inicializando correções touch (iOS: ${isIOSDevice}, ForceEnabled: ${forceEnable})`);
    setIsApplied(true);
    
    // Adicionar classe para permitir estilos CSS específicos
    wrapper.classList.add('ios-touch-enabled');
    if (isIOSDevice) {
      wrapper.classList.add('ios-device-detected');
    }
    
    // Adicionar eventos específicos para iOS com diferentes fases
    const addTouchEvents = () => {
      // Buscamos não apenas botões e links, mas qualquer elemento com atributos
      // aria-* ou com classes específicas que indicam interatividade
      const elements = wrapper.querySelectorAll(
        'button, a, [role="button"], [role="tab"], [role="switch"], ' +
        '[aria-checked], [aria-pressed], [aria-selected], ' +
        '.ios-touch-fix, .ios-button, .clickable, .touchable, [data-interactive]'
      );
      
      debugLog(`Adicionando eventos a ${elements.length} elementos interativos`);
      
      elements.forEach((element, idx) => {
        // Atribui um data-ios-touch-id para depuração
        (element as HTMLElement).dataset.iosTouchId = `touch-element-${idx}`;
        
        // Remover eventos existentes para evitar duplicação
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchend', handleTouchEnd);
        element.removeEventListener('touchcancel', handleTouchCancel);
        element.removeEventListener('click', handleClick);
        
        // Adicionar eventos aprimorados
        element.addEventListener('touchstart', handleTouchStart, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: false });
        element.addEventListener('touchcancel', handleTouchCancel, { passive: false });
        element.addEventListener('click', handleClick, { passive: false });
        
        // Adiciona atributos para melhorar a acessibilidade e interação
        if (!(element as HTMLElement).style.cursor) {
          (element as HTMLElement).style.cursor = 'pointer';
        }
        
        // Força o hardware-acceleration para evitar problemas de renderização
        (element as HTMLElement).style.transform = 'translateZ(0)';
        (element as HTMLElement).style.backfaceVisibility = 'hidden';
        // Aplicar estilo de backface com prefixo webkit usando setAttribute para evitar erro de tipagem TypeScript
        element.setAttribute('style', `${(element as HTMLElement).getAttribute('style') || ''}; -webkit-backface-visibility: hidden;`);
      });
    };
    
    // Handlers de eventos aprimorados com registro de estado
    const handleTouchStart = (e: Event) => {
      const target = e.target as HTMLElement;
      debugLog(`Touch iniciado em ${target.tagName}${target.id ? '#'+target.id : ''}`);
      
      // Marca o elemento como tendo um toque ativo
      target.dataset.iosTouchActive = 'true';
      
      // Limpar qualquer timeout pendente para evitar problemas de sincronização
      if (touchTimeoutRef.current) {
        window.clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = null;
      }
      
      // Registra contador de toques para análise
      setTouchCount(prev => prev + 1);
      
      // Callback para código externo se necessário
      onTouchDetected?.();
      
      // Para eventos em elementos scrollables, não prevenimos o comportamento padrão
      if (target.closest('.ios-scroll-fix, .ios-scroll, .scrollable, [data-scrollable]')) {
        debugLog('Permitindo comportamento padrão de scroll');
        return;
      }
      
      // Para outros elementos interativos, paramos a propagação
      e.stopPropagation();
    };
    
    const handleTouchEnd = (e: Event) => {
      const target = e.target as HTMLElement;
      debugLog(`Touch finalizado em ${target.tagName}${target.id ? '#'+target.id : ''}`);
      
      // Remove a marcação de toque ativo
      target.dataset.iosTouchActive = 'false';
      
      // Para elementos interativos, garantimos que o clique seja registrado
      // mesmo se o evento original falhar
      if (target.matches('button, a, [role="button"], .ios-button, .clickable, [data-interactive]')) {
        e.stopPropagation();
        
        // Garantimos que o clique seja acionado com um pequeno delay
        touchTimeoutRef.current = window.setTimeout(() => {
          debugLog('Forçando clique após touchend');
          simulateClick(target);
        }, 10);
      }
    };
    
    const handleTouchCancel = (e: Event) => {
      const target = e.target as HTMLElement;
      debugLog(`Touch cancelado em ${target.tagName}${target.id ? '#'+target.id : ''}`);
      
      // Remove a marcação de toque ativo
      target.dataset.iosTouchActive = 'false';
      
      // Limpar qualquer timeout pendente
      if (touchTimeoutRef.current) {
        window.clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = null;
      }
    };
    
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      debugLog(`Clique detectado em ${target.tagName}${target.id ? '#'+target.id : ''}`);
      
      // Se estivermos em um elemento interativo, garantimos que o evento
      // de clique não seja propagado incorretamente
      if (target.matches('button, a, [role="button"], .ios-button, .clickable, [data-interactive]')) {
        e.stopPropagation();
      }
    };
    
    // Função para simular clique diretamente no elemento
    const simulateClick = (element: HTMLElement) => {
      try {
        // Cria um evento de clique e dispara diretamente no elemento
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        element.dispatchEvent(event);
      } catch (err) {
        debugLog(`Erro ao simular clique: ${err}`);
        // Fallback para o método tradicional se MouseEvent não for suportado
        element.click();
      }
    };
    
    // Configura um corretor de scroll específico para iOS se necessário
    if (enableScrollFix) {
      const setupScrollFix = () => {
        // Impede comportamento de bounce em iOS para o wrapper inteiro
        wrapper.style.overscrollBehavior = 'none';
        // Aplicar webkit-overflow-scrolling usando setAttribute para evitar erro de tipagem
        wrapper.setAttribute('style', `${wrapper.getAttribute('style') || ''}; -webkit-overflow-scrolling: touch;`);
        
        // Encontra elementos scrolláveis para aplicar tratamento especial
        const scrollElements = wrapper.querySelectorAll('.scrollable, [data-scrollable], .ios-scroll, .ios-scroll-fix');
        
        debugLog(`Aplicando correções de scroll em ${scrollElements.length} elementos`);
        
        scrollElements.forEach(element => {
          // Aplicar webkit-overflow-scrolling usando setAttribute
          (element as HTMLElement).setAttribute('style', 
            `${(element as HTMLElement).getAttribute('style') || ''}; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;`
          );
          (element as HTMLElement).classList.add('ios-scroll-enabled');
        });
      };
      
      setupScrollFix();
    }
    
    // Adicionar eventos inicialmente
    addTouchEvents();
    
    // Configurar um observador para detectar mudanças no DOM
    // e aplicar os eventos de touch nos novos elementos que forem adicionados
    const observer = new MutationObserver((mutations) => {
      debugLog(`Detectadas ${mutations.length} mutações no DOM`);
      addTouchEvents();
      
      if (enableScrollFix) {
        // Reaplicar correções de scroll a novos elementos
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            const scrollableNodes = Array.from(mutation.addedNodes)
              .filter(node => 
                node.nodeType === Node.ELEMENT_NODE && 
                ((node as Element).classList?.contains('scrollable') || 
                 (node as Element).hasAttribute('data-scrollable'))
              );
            
            if (scrollableNodes.length) {
              debugLog(`Aplicando correções de scroll a ${scrollableNodes.length} novos elementos`);
              scrollableNodes.forEach(node => {
                // Aplicar webkit-overflow-scrolling usando setAttribute
                (node as HTMLElement).setAttribute('style', 
                  `${(node as HTMLElement).getAttribute('style') || ''}; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;`
                );
                (node as HTMLElement).classList.add('ios-scroll-enabled');
              });
            }
          }
        });
      }
    });
    
    // Iniciar observação de mudanças com configuração mais granular
    observer.observe(wrapper, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['class', 'role', 'data-interactive'] 
    });
    
    // Limpeza ao desmontar
    return () => {
      debugLog('Desmontando e limpando eventos');
      observer.disconnect();
      
      if (touchTimeoutRef.current) {
        window.clearTimeout(touchTimeoutRef.current);
      }
      
      // Remover eventos de todos os elementos para evitar vazamentos de memória
      const elements = wrapper.querySelectorAll('[data-ios-touch-id]');
      elements.forEach(element => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchend', handleTouchEnd);
        element.removeEventListener('touchcancel', handleTouchCancel);
        element.removeEventListener('click', handleClick);
      });
    };
  }, [forceEnable, debug, enableScrollFix, onTouchDetected, debugLog]);
  
  return (
    <div 
      ref={wrapperRef} 
      className={`ios-touch-wrapper ${isApplied ? 'ios-touch-applied' : ''} ${className}`}
      data-ios-wrapper={true}
      data-touch-count={touchCount}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'rgba(0,0,0,0)',
        touchAction: 'manipulation',
        position: 'relative',
        width: '100%',
        height: '100%',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

/**
 * Componente para um botão com área de toque aumentada e feedback tátil otimizado para iOS
 */
export const IOSButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
  iosStyle?: 'default' | 'filled' | 'outline';
}> = ({ 
  children, 
  className = '',
  iosStyle = 'default',
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  // Verifica se estamos em um dispositivo iOS
  const isIOSDevice = isIOS();
  
  // Estilos de acordo com o tipo de botão
  const getIosStyles = () => {
    switch(iosStyle) {
      case 'filled':
        return {
          background: isPressed ? 'var(--primary-600, #2563eb)' : 'var(--primary, #3b82f6)',
          color: '#ffffff',
          border: 'none',
          boxShadow: isPressed ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
          transform: isPressed ? 'scale(0.98) translateY(1px)' : 'scale(1) translateY(0)',
        };
      case 'outline':
        return {
          background: isPressed ? 'rgba(0,0,0,0.05)' : '#ffffff',
          color: 'var(--primary, #3b82f6)',
          border: '1.5px solid var(--primary, #3b82f6)',
          boxShadow: isPressed ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
          transform: isPressed ? 'scale(0.98) translateY(1px)' : 'scale(1) translateY(0)',
        };
      default:
        return {
          background: isPressed ? 'rgba(0,0,0,0.05)' : '#ffffff',
          color: 'inherit',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: isPressed ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
          transform: isPressed ? 'scale(0.98) translateY(1px)' : 'scale(1) translateY(0)',
        };
    }
  };
  
  const iosStyles = getIosStyles();
  
  return (
    <button
      className={`ios-button ios-touch-fix ${className}`}
      style={{
        minHeight: '44px',
        padding: '10px 16px',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'rgba(0,0,0,0)',
        touchAction: 'manipulation',
        position: 'relative',
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        transition: 'all 0.15s ease',
        fontWeight: 500,
        ...iosStyles
      }}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      onMouseDown={() => !isIOSDevice && setIsPressed(true)}
      onMouseUp={() => !isIOSDevice && setIsPressed(false)}
      onMouseLeave={() => !isIOSDevice && setIsPressed(false)}
      {...props}
    >
      {children}
    </button>
  );
};

export default IOSTouchWrapper;