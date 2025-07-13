import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { pressAnimation, optimizedMotionProps, ANIMATION_DURATIONS, EASINGS } from "@/lib/animation-utils";
import { Button, ButtonProps } from "@/components/ui/button";

interface AnimatedButtonProps extends Omit<ButtonProps, "asChild"> {
  whileTap?: boolean;
  whileHover?: boolean;
  animateOnAppear?: boolean;
  delay?: number;
  children: React.ReactNode;
}

/**
 * Componente de botão com animações fluidas otimizadas para dispositivos iOS
 * Incorpora efeitos de toque e tap haptic similares aos nativos do iOS
 */
const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    whileTap = true, 
    whileHover = true, 
    animateOnAppear = false,
    delay = 0,
    children, 
    ...props 
  }, ref) => {
    return (
      <motion.div
        initial={animateOnAppear ? { opacity: 0, y: 10 } : { opacity: 1 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          transition: { 
            duration: ANIMATION_DURATIONS.fast,
            ease: EASINGS.emphasis,
            delay 
          }
        }}
        {...(whileHover && {
          whileHover: { 
            scale: 1.02,
            transition: { 
              type: "spring", 
              stiffness: 400, 
              damping: 17 
            }
          }
        })}
        {...(whileTap && pressAnimation.whileTap)}
        {...optimizedMotionProps}
      >
        <Button
          ref={ref}
          className={cn(
            "hardware-accelerated tap-highlight", 
            className
          )}
          variant={variant}
          size={size}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );
  }
);
AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton };