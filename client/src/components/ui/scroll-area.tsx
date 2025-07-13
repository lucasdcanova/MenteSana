import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    enableMouseWheel?: boolean;
    hideScrollbar?: boolean;
  }
>(({ className, children, enableMouseWheel = true, hideScrollbar = false, ...props }, ref) => {
  // Adicionando manipulador de evento de roda do mouse para rolagem
  const viewportRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !enableMouseWheel) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        viewport.scrollTop += e.deltaY;
        e.preventDefault();
      }
      if (e.deltaX !== 0) {
        viewport.scrollLeft += e.deltaX;
        e.preventDefault();
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, [enableMouseWheel]);

  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport 
        ref={viewportRef}
        className="h-full w-full rounded-[inherit] overflow-auto"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {!hideScrollbar && (
        <>
          <ScrollBar />
          <ScrollBar orientation="horizontal" />
          <ScrollAreaPrimitive.Corner />
        </>
      )}
    </ScrollAreaPrimitive.Root>
  )
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border hover:bg-border/80" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
