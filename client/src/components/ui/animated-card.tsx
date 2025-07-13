import * as React from "react";
import { m as motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  optimizedMotionProps, 
  ANIMATION_DURATIONS, 
  EASINGS, 
  pressAnimation
} from "@/lib/animation-utils";

// Definição de animação de escala com spring
const scaleSpring = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring",
      stiffness: 400,
      damping: 25,
      mass: 1
    }
  },
  exit: { 
    scale: 0.95, 
    opacity: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.fast,
      ease: EASINGS.exit
    }
  }
};

// Animated Card component with iOS-style spring animations
const AnimatedCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    delay?: number;
    index?: number;
    whileHover?: boolean;
    whileTap?: boolean;
  }
>(({ className, delay = 0, index = 0, whileHover = true, whileTap = true, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    variants={scaleSpring}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{
      delay: delay + (index * 0.05), // Staggered delay based on index
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 1
    }}
    {...(whileHover && {
      whileHover: { 
        scale: 1.02, 
        y: -3,
        transition: { 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }
      }
    })}
    {...(whileTap && pressAnimation.whileTap)}
    {...optimizedMotionProps}
    {...props}
  />
));
AnimatedCard.displayName = "AnimatedCard";

// Animated variants of other card components
const AnimatedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ 
      duration: ANIMATION_DURATIONS.fast,
      ease: EASINGS.emphasis,
      delay: 0.1
    }}
    {...optimizedMotionProps}
    {...props}
  />
));
AnimatedCardHeader.displayName = "AnimatedCardHeader";

const AnimatedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <motion.h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ 
      duration: ANIMATION_DURATIONS.fast,
      ease: EASINGS.emphasis,
      delay: 0.2 
    }}
    {...optimizedMotionProps}
    {...props}
  />
));
AnimatedCardTitle.displayName = "AnimatedCardTitle";

const AnimatedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <motion.p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ 
      duration: ANIMATION_DURATIONS.fast,
      ease: EASINGS.emphasis,
      delay: 0.3 
    }}
    {...optimizedMotionProps}
    {...props}
  />
));
AnimatedCardDescription.displayName = "AnimatedCardDescription";

const AnimatedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <motion.div 
    ref={ref} 
    className={cn("p-6 pt-0", className)} 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ 
      duration: ANIMATION_DURATIONS.fast,
      ease: EASINGS.emphasis,
      delay: 0.2 
    }}
    {...optimizedMotionProps}
    {...props} 
  />
));
AnimatedCardContent.displayName = "AnimatedCardContent";

const AnimatedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ 
      duration: ANIMATION_DURATIONS.fast,
      ease: EASINGS.emphasis,
      delay: 0.3 
    }}
    {...optimizedMotionProps}
    {...props}
  />
));
AnimatedCardFooter.displayName = "AnimatedCardFooter";

export { 
  AnimatedCard, 
  AnimatedCardHeader, 
  AnimatedCardFooter, 
  AnimatedCardTitle, 
  AnimatedCardDescription, 
  AnimatedCardContent 
};