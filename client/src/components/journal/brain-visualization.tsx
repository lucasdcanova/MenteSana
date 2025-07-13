import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import { JournalEntry as JournalEntryType } from "@shared/schema";
import { VisualizationScene } from "./visualization-scene";

// Componente de carregamento
function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-dark"></div>
    </div>
  );
}

// Modelo 3D do cérebro (ambiente)
function BrainModel({ scale = 1.5 }) {
  // Nota: Este é um modelo conceitual, você precisará criar ou encontrar um modelo de cérebro 3D.
  // Como não temos um modelo real, este é apenas um placeholder para mostrar a estrutura
  return (
    <mesh scale={scale} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial 
        color="#262626" 
        transparent={true}
        opacity={0.1}
        wireframe={true}
      />
    </mesh>
  );
}

// Componente principal
export function BrainVisualization({ 
  entries = [], 
  height = "400px"
}: { 
  entries?: JournalEntryType[],
  height?: string
}) {
  return (
    <div style={{ height }} className="w-full rounded-lg overflow-hidden">
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        <color attach="background" args={["#0a0a0a"]} />
        
        <Suspense fallback={null}>
          {/* Ambiente */}
          <fog attach="fog" args={["#0a0a0a", 5, 15]} />
          <BrainModel />
          
          {/* Visualização de pensamentos */}
          <VisualizationScene entries={entries} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Componente expansível para visualização 3D
export function ExpandableBrainVisualization({ 
  entries = [], 
  initialHeight = "400px"
}: { 
  entries?: JournalEntryType[],
  initialHeight?: string
}) {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(initialHeight);
  
  useEffect(() => {
    setHeight(expanded ? "80vh" : initialHeight);
  }, [expanded, initialHeight]);
  
  return (
    <div className="relative">
      <BrainVisualization entries={entries} height={height} />
      
      {/* Botão para expandir/contrair */}
      <button 
        className="absolute bottom-3 right-3 bg-primary-dark text-white rounded-full p-2 shadow-lg z-10"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
}