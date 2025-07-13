import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wind } from "lucide-react";
import { BreathingExercise } from "./breathing-exercise";

interface QuickBreathingButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function QuickBreathingButton({
  variant = "outline",
  size = "default",
  className = ""
}: QuickBreathingButtonProps) {
  const [showExercise, setShowExercise] = useState(false);
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowExercise(true)}
        className={`${className}`}
      >
        <Wind className="h-4 w-4 mr-2" />
        <span>Respirar</span>
      </Button>
      
      <Dialog open={showExercise} onOpenChange={setShowExercise}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exercício de Respiração</DialogTitle>
            <DialogDescription>
              Tire um momento para respirar e relaxar
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <BreathingExercise
              minimal={true}
              onClose={() => setShowExercise(false)}
              fullScreenToggle={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}