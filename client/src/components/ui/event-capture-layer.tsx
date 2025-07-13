import React, { useEffect, useRef } from 'react';

interface EventCaptureLayerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  preventIOSPageScroll?: boolean;
}

/**
 * Componente que captura e interrompe eventos de maneira compatível com iOS
 * Usado para impedir que eventos se propaguem através de camadas em situações críticas
 */
export const EventCaptureLayer: React.FC<EventCaptureLayerProps> = ({
  children,
  className = '',
  style = {},
  preventIOSPageScroll = false
}) => {
  const layerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    
    // Manipuladores de eventos para impedir propagação
    const handleTouch = (e: TouchEvent) => {
      e.stopPropagation();
    };
    
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
    };
    
    // Adicionar listeners diretamente no DOM para máxima compatibilidade
    layer.addEventListener('touchstart', handleTouch, { passive: false });
    layer.addEventListener('touchmove', handleTouch, { passive: false });
    layer.addEventListener('touchend', handleTouch, { passive: false });
    layer.addEventListener('click', handleClick, { passive: false });
    
    // Cleanup ao desmontar
    return () => {
      layer.removeEventListener('touchstart', handleTouch);
      layer.removeEventListener('touchmove', handleTouch);
      layer.removeEventListener('touchend', handleTouch);
      layer.removeEventListener('click', handleClick);
    };
  }, []);
  
  // Efeito para bloquear o scroll da página quando necessário
  useEffect(() => {
    if (!preventIOSPageScroll) return;
    
    document.body.classList.add('overflow-hidden');
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [preventIOSPageScroll]);
  
  return (
    <div 
      ref={layerRef}
      className={`event-capture-layer ios-events-contained ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
        zIndex: 1,
        transform: 'translateZ(0)',
        WebkitTapHighlightColor: 'rgba(0,0,0,0)',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        ...style
      }}
      data-event-capture="true"
    >
      {children}
    </div>
  );
};

export default EventCaptureLayer;