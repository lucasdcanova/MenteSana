import React, { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface IosButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'pill';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  animation?: boolean;
  disabled?: boolean;
  rounded?: boolean;
  glassmorphism?: boolean;
}

// Componente de botão que segue as diretrizes de design do iOS
export const IosButton = forwardRef<HTMLButtonElement, IosButtonProps>(
  ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    animation = true,
    disabled = false,
    rounded = false,
    glassmorphism = false,
    type = 'button',
    ...props
  }, ref) => {
    // Classes para variantes de botão com estilo iOS nativo
    const getVariantClasses = () => {
      switch (variant) {
        case 'primary':
          return 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80 shadow-sm';
        case 'secondary':
          // iOS usa um fundo branco com borda muito suave e texto cinza
          return 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 shadow-sm';
        case 'outline':
          // Estilo iOS típico para botões outline - com contraste aumentado
          return 'bg-transparent border border-gray-300 text-gray-800 hover:bg-gray-50/50 active:bg-gray-100/50';
        case 'ghost':
          // Botões ghost no iOS são totalmente transparentes
          return 'bg-transparent text-gray-700 hover:bg-gray-100/40 active:bg-gray-200/40';
        case 'link':
          // Links no iOS normalmente são apenas texto colorido sem sublinhado
          return 'bg-transparent text-primary hover:text-primary/90 p-0 shadow-none';
        case 'danger':
          // Vermelho mais suave típico do iOS para alertas
          return 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm';
        default:
          return 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80 shadow-sm';
      }
    };

    // Classes para tamanhos de botão com medidas específicas do iOS
    const getSizeClasses = () => {
      switch (size) {
        case 'xs':
          return 'text-xs py-1 px-2.5 font-medium leading-tight';
        case 'sm':
          return 'text-sm py-1.5 px-3.5 font-medium leading-tight';
        case 'lg':
          // iOS usa botões grandes mais espaçosos para facilitar o toque
          return 'text-base py-3 px-6 font-medium leading-tight';
        case 'icon':
          // No iOS, os botões de ícone são quadrados
          return 'p-2.5 aspect-square';
        case 'pill':
          // Pílulas no iOS são totalmente arredondadas
          return 'text-sm py-1.5 px-4.5 rounded-full font-medium leading-tight';
        default: // md - tamanho padrão iOS
          return 'text-sm py-2 px-4.5 font-medium leading-tight';
      }
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'ios-button relative inline-flex items-center justify-center',
          'font-medium transition-colors focus-visible:outline-none',
          'disabled:opacity-60 disabled:pointer-events-none',
          animation && 'active:scale-[0.97] active:opacity-90 transition-transform',
          getVariantClasses(),
          getSizeClasses(),
          rounded ? 'rounded-full' : 'rounded-xl',
          fullWidth ? 'w-full' : 'w-auto',
          glassmorphism && variant !== 'link' && 'backdrop-blur-md',
          'touch-manipulation',
          className
        )}
        style={{
          WebkitTapHighlightColor: 'transparent'
        }}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

IosButton.displayName = 'IosButton';