/**
 * Utilitários para gerenciamento de animações otimizadas para melhor performance
 */

import { useEffect, useState, useRef } from "react";

/**
 * Verifica se o dispositivo é de baixa performance
 * @returns true se o dispositivo for considerado de baixa performance
 */
export function isLowPerformanceDevice(): boolean {
  // Verifica se o dispositivo tem um processador lento (menos de 4 cores)
  const hasWeakProcessor = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  
  // Verifica a memória do dispositivo (limite de 4GB)
  const hasLimitedMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
  
  // Verifica se está rodando em uma versão leve de navegador para dispositivos limitados
  const isLiteMode = navigator.userAgent.includes('Chrome Lite') || 
                     navigator.userAgent.includes('Opera Mini');
  
  // Verifica se o usuário ativou opções de acessibilidade para reduzir animações
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Se qualquer um dos critérios for verdadeiro, consideramos um dispositivo de baixa performance
  return hasWeakProcessor || hasLimitedMemory || isLiteMode || prefersReducedMotion;
}

/**
 * Configurações para animações
 */
export const AnimationConfig = {
  // Duração em ms para animações em diferentes contextos
  DURATION: {
    VERY_FAST: 150,        // Para micro-interações (hover, focus)
    FAST: 250,             // Para interações normais
    MEDIUM: 400,           // Para transições de páginas
    SLOW: 700,             // Para animações de ênfase
    VERY_SLOW: 1200        // Para animações complexas
  },
  
  // Timing functions para diferentes estilos de animações
  EASING: {
    DEFAULT: [0.25, 0.1, 0.25, 1],       // Padrão cubic-bezier
    LINEAR: [0, 0, 1, 1],                // Linear
    EASE_IN: [0.42, 0, 1, 1],            // Aceleração
    EASE_OUT: [0, 0, 0.58, 1],           // Desaceleração
    EASE_IN_OUT: [0.42, 0, 0.58, 1],     // Aceleração e desaceleração
    SPRING: [0.34, 1.56, 0.64, 1],       // Efeito de mola
    BOUNCE: [0.22, 1.2, 0.36, 1]         // Efeito de quique
  },
  
  // Factory para criar variante de animação
  createVariants(shouldReduce: boolean = isLowPerformanceDevice()) {
    return {
      // Fator de redução para dispositivos de baixa performance
      reduceFactor: shouldReduce ? 0.5 : 1,
      
      // Recupera a duração aplicando o fator de redução se necessário
      getDuration(type: keyof typeof AnimationConfig.DURATION): number {
        return AnimationConfig.DURATION[type] * (shouldReduce ? 0.5 : 1);
      },
      
      // Desativa completamente animações em dispositivos de muito baixa performance ou com preferências reduzidas
      shouldDisable: shouldReduce && navigator.userAgent.includes('Opera Mini'),
      
      // Prefere transformações em vez de animações de propriedades que causam reflow
      preferTransforms: true
    };
  }
};

/**
 * Hook para controlar se uma animação deve ser executada com base em interseção com viewport
 * 
 * @param options Opções de observação da interseção
 * @param triggerOnce Determina se a animação deve ser acionada apenas uma vez
 * @returns Referência para o elemento e flag indicando se é visível
 */
export function useAnimationInView(
  options: IntersectionObserverInit = { threshold: 0.1 },
  triggerOnce: boolean = true
) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  
  useEffect(() => {
    // Se deve ser desativado em dispositivos de baixa performance
    if (AnimationConfig.createVariants().shouldDisable) {
      setIsInView(true);
      return;
    }
    
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      const isVisible = entry.isIntersecting;
      
      if (isVisible || !triggerOnce) {
        setIsInView(isVisible);
      }
      
      // Se for triggerOnce e estiver visível, desconecta o observer
      if (isVisible && triggerOnce) {
        observer.disconnect();
      }
    }, options);
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [options, triggerOnce]);
  
  return { ref, isInView };
}

/**
 * Tipos de animações predefinidas para componentes
 */
export type AnimationType = 
  'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 
  'scale' | 'rotate' | 'pulse' | 'pop' | 'bounce' | 'shake' | 'none';

/**
 * Configuração Framer Motion para os tipos de animação predefinidos
 * 
 * @param type Tipo de animação
 * @param custom Personalização opcional (intensidade de 0 a 1)
 * @returns Configuração de variantes da animação
 */
export function getAnimationVariants(
  type: AnimationType = 'fade', 
  custom: number = 1
) {
  // Verifica se as animações devem ser desativadas
  if (type === 'none' || AnimationConfig.createVariants().shouldDisable) {
    return {
      initial: {},
      animate: {},
      exit: {}
    };
  }
  
  // Ajusta a intensidade com base na personalização
  const intensity = Math.max(0, Math.min(1, custom));
  
  // Configurações base para diferentes tipos de animação
  switch (type) {
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { 
          opacity: 1,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000,
            ease: AnimationConfig.EASING.EASE_OUT
          }
        },
        exit: { 
          opacity: 0,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000,
            ease: AnimationConfig.EASING.EASE_IN
          }
        }
      };
      
    case 'slide-up':
      return {
        initial: { opacity: 0, y: 30 * intensity },
        animate: { 
          opacity: 1, 
          y: 0,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('MEDIUM') / 1000,
            ease: AnimationConfig.EASING.EASE_OUT
          }
        },
        exit: { 
          opacity: 0, 
          y: 30 * intensity,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000,
            ease: AnimationConfig.EASING.EASE_IN
          }
        }
      };
      
    case 'slide-down':
      return {
        initial: { opacity: 0, y: -30 * intensity },
        animate: { 
          opacity: 1, 
          y: 0,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('MEDIUM') / 1000,
            ease: AnimationConfig.EASING.EASE_OUT
          }
        },
        exit: { 
          opacity: 0, 
          y: -30 * intensity,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000,
            ease: AnimationConfig.EASING.EASE_IN
          }
        }
      };
    
    case 'slide-left':
      return {
        initial: { opacity: 0, x: 30 * intensity },
        animate: { 
          opacity: 1, 
          x: 0,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('MEDIUM') / 1000,
            ease: AnimationConfig.EASING.EASE_OUT
          }
        },
        exit: { 
          opacity: 0, 
          x: -30 * intensity,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000,
            ease: AnimationConfig.EASING.EASE_IN
          }
        }
      };
      
    case 'slide-right':
      return {
        initial: { opacity: 0, x: -30 * intensity },
        animate: { 
          opacity: 1, 
          x: 0,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('MEDIUM') / 1000,
            ease: AnimationConfig.EASING.EASE_OUT
          }
        },
        exit: { 
          opacity: 0, 
          x: 30 * intensity,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000,
            ease: AnimationConfig.EASING.EASE_IN
          }
        }
      };
      
    case 'scale':
      return {
        initial: { opacity: 0, scale: 0.8 + (0.2 * (1 - intensity)) },
        animate: { 
          opacity: 1, 
          scale: 1,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('MEDIUM') / 1000,
            ease: AnimationConfig.EASING.SPRING
          }
        },
        exit: { 
          opacity: 0, 
          scale: 0.8 + (0.2 * (1 - intensity)),
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000,
            ease: AnimationConfig.EASING.EASE_IN
          }
        }
      };
      
    case 'rotate':
      return {
        initial: { opacity: 0, rotate: -10 * intensity },
        animate: { 
          opacity: 1, 
          rotate: 0,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('MEDIUM') / 1000,
            ease: AnimationConfig.EASING.SPRING
          }
        },
        exit: { 
          opacity: 0, 
          rotate: 10 * intensity,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000,
            ease: AnimationConfig.EASING.EASE_IN
          }
        }
      };
      
    case 'pulse':
      return {
        initial: { opacity: 0, scale: 1 },
        animate: { 
          opacity: 1,
          scale: [1, 1.05 * intensity, 1],
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('SLOW') / 1000,
            ease: AnimationConfig.EASING.EASE_IN_OUT,
            times: [0, 0.5, 1],
            repeat: Infinity,
            repeatDelay: 1
          }
        },
        exit: { 
          opacity: 0,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000
          }
        }
      };
      
    case 'pop':
      return {
        initial: { opacity: 0, scale: 0.3 },
        animate: { 
          opacity: 1, 
          scale: [0.3, 1.1 * intensity, 0.9 * intensity, 1.03 * intensity, 1],
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('SLOW') / 1000,
            ease: AnimationConfig.EASING.SPRING,
            times: [0, 0.4, 0.6, 0.8, 1]
          }
        },
        exit: { 
          opacity: 0, 
          scale: 0.3,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000,
            ease: AnimationConfig.EASING.EASE_IN
          }
        }
      };
      
    case 'bounce':
      return {
        initial: { opacity: 0, y: -20 },
        animate: { 
          opacity: 1, 
          y: [0, -15 * intensity, 0, -7 * intensity, 0],
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('SLOW') / 1000,
            ease: AnimationConfig.EASING.BOUNCE,
            times: [0, 0.4, 0.6, 0.8, 1]
          }
        },
        exit: { 
          opacity: 0, 
          y: -20,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000
          }
        }
      };
      
    case 'shake':
      return {
        initial: { opacity: 0 },
        animate: { 
          opacity: 1, 
          x: [0, -10 * intensity, 10 * intensity, -7 * intensity, 7 * intensity, 0],
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('MEDIUM') / 1000,
            ease: AnimationConfig.EASING.EASE_IN_OUT,
            times: [0, 0.2, 0.4, 0.6, 0.8, 1]
          }
        },
        exit: { 
          opacity: 0,
          transition: { 
            duration: AnimationConfig.createVariants().getDuration('FAST') / 1000
          }
        }
      };
      
    default:
      return {
        initial: {},
        animate: {},
        exit: {}
      };
  }
}

/**
 * Exportação de constantes de animação para uso em outros componentes
 */
export const ANIMATION_DURATIONS = {
  veryFast: 150,
  fast: 250,
  medium: 400,
  slow: 700,
  verySlow: 1200
};

export const EASINGS = {
  default: [0.25, 0.1, 0.25, 1],
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  spring: [0.34, 1.56, 0.64, 1],
  bounce: [0.22, 1.2, 0.36, 1],
  emphasis: [0.25, 0.46, 0.45, 0.94],
  exit: [0.42, 0, 1, 1]
};

/**
 * Efeito de animação quando um botão é pressionado
 */
export const pressAnimation = {
  tap: {
    scale: 0.95,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  },
  hover: {
    scale: 1.03,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  }
};

/**
 * Efeito de transição para listas com stagger
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

/**
 * Animação para itens de lista
 */
export const listItem = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30
    }
  }
};

/**
 * Propriedades otimizadas para componentes framer-motion
 * Melhora o desempenho de animações
 */
export const optimizedMotionProps = {
  initial: false,
  layoutId: undefined,
  layout: false,
  whileTap: { scale: 0.98 },
  whileHover: { scale: 1.02 },
  animate: {
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  },
  transition: {
    type: "spring",
    stiffness: 500,
    damping: 30
  }
};