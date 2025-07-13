import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";

interface PageTransitionProps {
  children: ReactNode;
  mode?: 'fade' | 'slide' | 'push' | 'reveal' | 'ios-modal' | 'none';
}

export function PageTransition({ children, mode = 'slide' }: PageTransitionProps) {
  const [location] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  
  // Se o usuário preferir movimento reduzido, use animação mínima ou nenhuma
  const effectiveMode = prefersReducedMotion ? 'fade' : mode;

  // Se o modo for 'none', retorna os filhos sem animação para transição imediata
  if (effectiveMode === 'none') {
    return <div className="w-full h-full flex-grow ios-page-container hardware-accelerated">{children}</div>;
  }

  // Reduz o jank de layout definindo uma política de scroll preemptiva
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Adiciona classe de otimização
      document.documentElement.classList.add('smooth-transitions');
      
      // Limpa depois
      return () => {
        document.documentElement.classList.remove('smooth-transitions');
      };
    }
  }, [location]);

  // Diferentes animações com base no modo - Padrões de animação típicos do iOS (ultra-otimizados)
  const getAnimationProps = () => {
    // Ajuste para dispositivos de baixo desempenho ou preferência por movimento reduzido
    if (prefersReducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.1 }
      };
    }
    
    // Otimiza cada tipo de transição para corresponder às animações nativas do iOS com tempo reduzido
    switch (effectiveMode) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: {
            duration: 0.12, 
            ease: [0.2, 0, 0.38, 1] // Curva de aceleração iOS
          }
        };
        
      case 'push':
        return {
          initial: { x: 15, opacity: 0.8 }, 
          animate: { x: 0, opacity: 1 },
          exit: { x: -10, opacity: 0.6 },
          transition: {
            duration: 0.16,
            ease: [0.32, 0.72, 0, 1] // Curva do iOS para push navigation
          }
        };
        
      case 'reveal':
        return {
          initial: { opacity: 0, y: 8, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -4, scale: 0.98 },
          transition: {
            duration: 0.12,
            ease: [0.3, 0.1, 0.3, 1.0]
          }
        };
        
      case 'ios-modal':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 10 },
          transition: {
            type: "tween",
            duration: 0.18,
            ease: [0.3, 0.0, 0.2, 1.0] // Curva de modal iOS
          }
        };
        
      default: // 'slide' - padrão de navegação do iOS
        return {
          initial: { opacity: 0.8, x: 5 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0.8, x: -5 },
          transition: {
            type: "tween",
            duration: 0.15,
            ease: [0.25, 0.1, 0.25, 1.0] // Curva iOS padrão
          }
        };
    }
  };
  
  const animationProps = getAnimationProps();
  
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={location}
        initial={animationProps.initial}
        animate={animationProps.animate}
        exit={animationProps.exit}
        transition={animationProps.transition}
        className="w-full h-full flex-grow ios-page-container hardware-accelerated"
        style={{
          willChange: "transform, opacity",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          WebkitFontSmoothing: "antialiased",
          transformStyle: "preserve-3d",
          perspective: "1000px",
          isolation: "isolate",
          transformOrigin: "center"
        }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}