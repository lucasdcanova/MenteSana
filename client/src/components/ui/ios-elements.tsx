import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Componente para backdrop de blur no estilo iOS
interface IosBackdropProps {
  show: boolean;
  intensity?: 'light' | 'medium' | 'strong';
  onClick?: () => void;
  zIndex?: number;
  children?: React.ReactNode;
}

export const IosBackdrop: React.FC<IosBackdropProps> = ({
  show,
  intensity = 'medium',
  onClick,
  zIndex = 40,
  children
}) => {
  const getBlurValue = () => {
    switch (intensity) {
      case 'light': return '5px';
      case 'strong': return '20px';
      default: return '10px';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.42, 0, 0.58, 1] }}
          className="fixed inset-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: `blur(${getBlurValue()})`,
            WebkitBackdropFilter: `blur(${getBlurValue()})`,
            zIndex
          }}
          onClick={onClick}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
};

// Componente para ações de deslizar no estilo iOS
interface IosSwipeActionProps {
  children: React.ReactNode;
  actions: {
    label: string;
    icon?: React.ReactNode;
    color: string;
    onClick: () => void;
  }[];
  direction?: 'left' | 'right';
}

export const IosSwipeAction: React.FC<IosSwipeActionProps> = ({
  children,
  actions,
  direction = 'left'
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <div 
      className="relative overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Ações que ficam escondidas atrás do item */}
      <div 
        className={`absolute top-0 bottom-0 flex ${direction === 'left' ? 'right-0' : 'left-0'}`}
        style={{ zIndex: 1 }}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="h-full flex items-center justify-center px-4"
            style={{ backgroundColor: action.color }}
          >
            {action.icon && <span className="mr-1">{action.icon}</span>}
            <span className="text-white">{action.label}</span>
          </button>
        ))}
      </div>
      
      {/* Conteúdo arrastável */}
      <m.div
        drag="x"
        dragConstraints={{ left: direction === 'left' ? -150 : 0, right: direction === 'right' ? 150 : 0 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        className="bg-white relative z-10"
        style={{ zIndex: 2, touchAction: 'pan-y' }}
      >
        {children}
      </m.div>
    </div>
  );
};

// Componente de pull-to-refresh no estilo iOS
interface IosPullToRefreshProps {
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

export const IosPullToRefresh: React.FC<IosPullToRefreshProps> = ({
  onRefresh,
  isRefreshing: externalIsRefreshing,
  children
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef(0);
  const threshold = 80; // Distância necessária para acionar o refresh

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (
      containerRef.current && 
      containerRef.current.scrollTop <= 0 && 
      !isRefreshing && 
      e.touches[0].clientY > startY.current
    ) {
      const distance = Math.min(e.touches[0].clientY - startY.current, threshold);
      setPullDistance(distance);
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  // Sincronizar state interno com props externas
  React.useEffect(() => {
    if (externalIsRefreshing !== undefined) {
      setIsRefreshing(externalIsRefreshing);
    }
  }, [externalIsRefreshing]);

  return (
    <div 
      ref={containerRef}
      className="overflow-auto h-full w-full ios-scroll"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Indicador de pull-to-refresh */}
      <div
        className="flex justify-center items-center overflow-hidden"
        style={{ 
          height: `${pullDistance}px`,
          marginTop: '-1px',
          transition: isRefreshing ? 'none' : 'height 0.2s ease'
        }}
      >
        <div 
          className={cn(
            "w-8 h-8 rounded-full border-2 border-t-transparent border-primary animate-spin",
            { "opacity-0": pullDistance < 20 }
          )}
          style={{ 
            opacity: Math.min(pullDistance / threshold, 1),
            transform: `rotate(${pullDistance * 2}deg)`
          }}
        />
      </div>
      
      {children}
    </div>
  );
};

// Bottom Sheet no estilo iOS
interface IosBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnapPoint?: number;
}

export const IosBottomSheet: React.FC<IosBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  snapPoints = [300, 600],
  initialSnapPoint = 0
}) => {
  const [currentSnapPoint, setCurrentSnapPoint] = React.useState(initialSnapPoint);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <IosBackdrop show={isOpen} onClick={onClose} />
          
          <m.div
            initial={{ y: '100%' }}
            animate={{ y: snapPoints[currentSnapPoint] ? `calc(100% - ${snapPoints[currentSnapPoint]}px)` : 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 300 
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            dragMomentum={false}
            onDragEnd={(e, info) => {
              // Detecta se deve fechar ou ajustar para um snap point
              if (info.offset.y > 100) {
                onClose();
              } else {
                // Encontra o snap point mais próximo com base na velocidade e posição
                const nextSnapPoint = info.velocity.y > 500 ? 
                  Math.min(currentSnapPoint + 1, snapPoints.length - 1) : 
                  currentSnapPoint;
                
                setCurrentSnapPoint(nextSnapPoint);
              }
            }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg z-50"
            style={{ 
              maxHeight: '90vh',
              touchAction: 'none',
              zIndex: 50
            }}
          >
            {/* Indicador de arrasto */}
            <div className="w-full flex justify-center pt-2 pb-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            
            <div className="overflow-auto px-4 pb-8" style={{ maxHeight: 'calc(90vh - 20px)' }}>
              {children}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Botão de ação flutuante no estilo iOS
interface IosFloatingButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
}

export const IosFloatingButton: React.FC<IosFloatingButtonProps> = ({
  icon,
  onClick,
  color = 'var(--color-primary)',
  size = 'medium',
  position = 'bottom-right'
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'w-12 h-12';
      case 'large': return 'w-16 h-16';
      default: return 'w-14 h-14';
    }
  };
  
  const getPositionClass = () => {
    switch (position) {
      case 'bottom-center': return 'bottom-8 left-1/2 transform -translate-x-1/2';
      case 'bottom-left': return 'bottom-8 left-6';
      default: return 'bottom-8 right-6';
    }
  };
  
  return (
    <m.button
      className={`fixed rounded-full flex items-center justify-center shadow-lg ios-floating-button ${getSizeClass()} ${getPositionClass()}`}
      style={{ 
        backgroundColor: color,
        zIndex: 40,
      }}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {icon}
    </m.button>
  );
};

// Loader no estilo iOS
interface IosLoaderProps {
  color?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

export const IosLoader: React.FC<IosLoaderProps> = ({
  color = 'var(--color-primary)',
  size = 'medium',
  fullScreen = false
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'w-5 h-5 border-2';
      case 'large': return 'w-10 h-10 border-3';
      default: return 'w-8 h-8 border-2';
    }
  };
  
  return (
    <div className={cn(
      "flex items-center justify-center",
      { "fixed inset-0 bg-white/80 backdrop-blur-sm z-50": fullScreen }
    )}>
      <div 
        className={`${getSizeClass()} rounded-full animate-spin border-t-transparent`}
        style={{ borderColor: `${color}`, borderTopColor: 'transparent' }}
      />
    </div>
  );
};

// Indicador de segmentação de página (Page Control) no estilo iOS
interface IosPageControlProps {
  total: number;
  current: number;
  onChange?: (index: number) => void;
  color?: string;
  activeColor?: string;
}

export const IosPageControl: React.FC<IosPageControlProps> = ({
  total,
  current,
  onChange,
  color = 'rgba(0, 0, 0, 0.2)',
  activeColor = 'var(--color-primary)'
}) => {
  return (
    <div className="flex items-center justify-center space-x-2 py-2">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          className={`rounded-full transition-all duration-200 ${index === current ? 'w-2.5 h-2.5' : 'w-2 h-2 opacity-60'}`}
          style={{ 
            backgroundColor: index === current ? activeColor : color,
          }}
          onClick={() => onChange && onChange(index)}
          aria-label={`Go to page ${index + 1}`}
        />
      ))}
    </div>
  );
};

// Feedback Haptico simulado para iOS
interface HapticFeedbackOptions {
  style?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  intensity?: number;
}

export const useIosHaptic = () => {
  const trigger = React.useCallback((options: HapticFeedbackOptions = {}) => {
    // Verifica se o navegador suporta a API de vibração
    if ('vibrate' in navigator) {
      const { style = 'medium', intensity = 1 } = options;
      
      // Define padrões de vibração para simular diferentes estilos de feedback haptico
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 30, 10],
        warning: [30, 50, 30],
        error: [50, 30, 50, 30]
      };
      
      // Ajusta a intensidade
      const pattern = patterns[style].map(ms => ms * intensity);
      
      // Aciona a vibração
      navigator.vibrate(pattern);
    }
  }, []);
  
  return { trigger };
};

// Menu de contexto no estilo iOS
interface IosContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  items: {
    label: string;
    icon?: React.ReactNode;
    color?: string;
    destructive?: boolean;
    onClick: () => void;
  }[];
}

export const IosContextMenu: React.FC<IosContextMenuProps> = ({
  isOpen,
  onClose,
  x,
  y,
  items
}) => {
  // Ajusta a posição para garantir que o menu fique dentro da tela
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x, y });
  
  React.useEffect(() => {
    if (isOpen && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let adjustedX = x;
      let adjustedY = y;
      
      // Ajusta horizontalmente se necessário
      if (x + menuRect.width > windowWidth) {
        adjustedX = windowWidth - menuRect.width - 10;
      }
      
      // Ajusta verticalmente se necessário
      if (y + menuRect.height > windowHeight) {
        adjustedY = windowHeight - menuRect.height - 10;
      }
      
      setPosition({
        x: Math.max(10, adjustedX),
        y: Math.max(10, adjustedY)
      });
    }
  }, [isOpen, x, y]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-50"
            onClick={onClose}
          />
          
          <m.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bg-white rounded-xl shadow-xl overflow-hidden z-50"
            style={{ 
              left: position.x,
              top: position.y,
              minWidth: '160px',
              maxWidth: '220px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              background: 'rgba(255, 255, 255, 0.95)'
            }}
          >
            {items.map((item, index) => (
              <button
                key={index}
                className={`w-full text-left px-4 py-3 flex items-center text-sm 
                  ${index < items.length - 1 ? 'border-b border-gray-100' : ''}
                  ${item.destructive ? 'text-red-500' : 'text-gray-800'}`}
                style={{ color: item.color }}
                onClick={() => {
                  item.onClick();
                  onClose();
                }}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Efeito visual de destaque em card no estilo iOS (destaque quando clicado)
interface IosTapHighlightProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export const IosTapHighlight: React.FC<IosTapHighlightProps> = ({
  children,
  onClick,
  active = false,
  className = ''
}) => {
  return (
    <m.div
      className={cn(
        "transition-colors",
        { "bg-gray-100": active },
        className
      )}
      whileTap={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
      onClick={onClick}
    >
      {children}
    </m.div>
  );
};