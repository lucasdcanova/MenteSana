import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { m, MotionProps } from 'framer-motion';

interface IosCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  elevation?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'simple' | 'transparent' | 'glass';
  interactive?: boolean;
  mobileFullWidth?: boolean;
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  footerContent?: ReactNode;
  style?: React.CSSProperties;
  dividers?: boolean;
  animation?: boolean;
  // Transição específica para iOS
  animationType?: 'scale' | 'slide' | 'fade' | 'none';
}

// Componente de Card que segue as diretrizes de design do iOS
export function IosCard({
  children,
  className,
  elevation = 'sm',
  variant = 'default',
  interactive = false,
  mobileFullWidth = false,
  icon,
  title,
  subtitle,
  headerAction,
  footerContent,
  style,
  dividers = false,
  animation = true,
  animationType = 'scale',
  ...props
}: IosCardProps) {
  // Configura o estilo de elevação (sombra) com valores específicos do iOS
  const getElevationClass = () => {
    switch (elevation) {
      case 'none': 
        return '';
      case 'xs': 
        // Sombra muito leve típica de cards secundários no iOS
        return 'shadow-[0_1px_2px_rgba(0,0,0,0.03)]';
      case 'md': 
        // Sombra média típica de cards primários no iOS
        return 'shadow-[0_2px_6px_rgba(0,0,0,0.04)]';
      case 'lg': 
        // Sombra de elementos elevados no iOS (como modais)
        return 'shadow-[0_4px_12px_rgba(0,0,0,0.05)]';
      default: 
        // O padrão do iOS são sombras muito sutis
        return 'shadow-[0_1px_3px_rgba(0,0,0,0.03)]';
    }
  };

  // Configura a aparência do card com estilos específicos do iOS
  const getVariantClass = () => {
    switch (variant) {
      case 'simple':
        // O iOS usa bordas muito sutis, quase imperceptíveis
        return 'bg-white border border-gray-100/70';
      case 'transparent':
        return 'bg-transparent';
      case 'glass':
        // Efeito de vidro (glassmorphism) característico do iOS
        return 'bg-white/75 backdrop-blur-lg border border-white/40';
      default:
        // Cartões padrão do iOS com borda muito sutil
        return 'bg-white border border-gray-100/60';
    }
  };

  // Configurações de animação para componentes interativos com estilo iOS nativo
  const getAnimationProps = (): MotionProps => {
    if (!animation) return {};

    // O iOS usa tempos precisos e curvas de easing específicas para diferentes tipos de animação
    switch (animationType) {
      case 'scale':
        return {
          // No iOS, o hover é sutilmente mais suave que o padrão web
          whileHover: { scale: interactive ? 1.01 : 1 },
          // O feedback de toque no iOS é mais sutil e rápido
          whileTap: { scale: interactive ? 0.98 : 1, opacity: interactive ? 0.95 : 1 },
          // Animação inicial com valores típicos de iOS
          initial: { opacity: 0, y: 8, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          // Usando a curva de aceleração padrão do iOS (aproximação da curva CAMediaTimingFunction)
          transition: { 
            type: "tween", 
            duration: 0.2,
            ease: [0.25, 0.1, 0.25, 1.0] // cubic-bezier equivalente à curva padrão do iOS
          }
        };
      case 'slide':
        return {
          // Movimento lateral mais limitado, como no iOS
          initial: { opacity: 0, x: 15 },
          animate: { opacity: 1, x: 0 },
          // O iOS usa um timing de 0.2-0.25s para a maioria das animações de UI
          transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }
        };
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          // O iOS usa fade curto para mudanças de opacidade
          transition: { duration: 0.15, ease: "easeOut" }
        };
      default:
        return {};
    }
  };

  const CardComponent = animation ? m.div : 'div';

  return (
    <CardComponent
      className={cn(
        'ios-card rounded-xl overflow-hidden',
        getElevationClass(),
        getVariantClass(),
        interactive && 'cursor-pointer',
        mobileFullWidth && 'mx-0 sm:mx-2',
        className
      )}
      style={{
        ...style,
        WebkitTouchCallout: 'none' as const,
        WebkitTapHighlightColor: 'transparent' as const,
        transform: 'translateZ(0)' as const,
        backfaceVisibility: 'hidden' as const
      }}
      {...getAnimationProps()}
      {...props}
    >
      {/* Cabeçalho do card */}
      {(title || icon || headerAction) && (
        <div className={`flex items-center justify-between p-4 ${dividers ? 'border-b border-gray-100/80' : ''}`}>
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo principal */}
      <div className={cn(
        !title && !icon && !headerAction ? 'p-4' : '',
        dividers && footerContent ? 'border-b border-gray-100/80' : ''
      )}>
        {children}
      </div>

      {/* Rodapé do card */}
      {footerContent && (
        <div className="p-3 bg-gray-50/50">
          {footerContent}
        </div>
      )}
    </CardComponent>
  );
}