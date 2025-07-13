import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Text, useTexture, Sphere } from "@react-three/drei";
import { JournalEntry as JournalEntryType } from "@shared/schema";
import { mapSentimentToPosition, tagToParticleProps, categoryColors } from "@/lib/visualization-utils";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";

// Função simples para gerar ruído pseudo-aleatório
function simpleNoise(x: number, y: number, z: number) {
  // Combinar os valores com uma função trigonométrica para criar um padrão semi-aleatório
  return Math.sin(x * 0.7 + y * 0.3 + z * 0.2) * 0.5 + 
         Math.cos(x * 0.2 + y * 0.8 + z * 0.5) * 0.5;
}

// Componente de partícula que representa uma tag
const TagParticle = ({ 
  position, 
  tag, 
  size, 
  color 
}: { 
  position: [number, number, number], 
  tag: string, 
  size: number, 
  color: string 
}) => {
  // Referência ao mesh para manipulação direta
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Animação de escala para entrada
  const { scale } = useSpring({
    from: { scale: 0 },
    to: { scale: 1 },
    config: { mass: 2, tension: 170, friction: 20 },
    delay: Math.random() * 1000,
  });
  
  // Animação para movimento orgânico
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Movimento orgânico suave usando ruído simples
      meshRef.current.position.x += simpleNoise(position[0] * 0.1, position[1] * 0.1, state.clock.elapsedTime * 0.05) * delta * 0.05;
      meshRef.current.position.y += simpleNoise(position[1] * 0.1, position[2] * 0.1, state.clock.elapsedTime * 0.05) * delta * 0.05;
      meshRef.current.position.z += simpleNoise(position[2] * 0.1, position[0] * 0.1, state.clock.elapsedTime * 0.05) * delta * 0.05;
      
      // Rotação lenta
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.15;
    }
  });
  
  return (
    <animated.mesh 
      ref={meshRef} 
      position={position} 
      scale={scale}
    >
      <Sphere args={[size, 16, 16]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.5} 
          roughness={0.2} 
          metalness={0.8} 
        />
      </Sphere>
      <Text
        position={[0, size + 0.05, 0]}
        fontSize={0.05}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="black"
      >
        {tag}
      </Text>
    </animated.mesh>
  );
};

// Componente de pensamento que representa uma entrada de diário
const ThoughtBubble = ({ entry }: { entry: JournalEntryType }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Obter posição para visualização baseada no humor e posição sugerida pela IA
  const sentiment = entry.position ? (entry.position as { x: number, y: number, z: number }) : { x: 0, y: 0, z: 0 };
  const { position, color } = mapSentimentToPosition(sentiment, entry.mood);
  
  // Descompactar tags do entry (se existirem)
  const tags = entry.tags || [];
  
  // Efeito de flutuação
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Movimento de flutuação suave
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5) * delta * 0.05;
      // Rotação lenta
      meshRef.current.rotation.y += delta * 0.1;
    }
  });
  
  // Cor da categoria (se existir)
  const categoryColor = entry.category 
    ? categoryColors[entry.category.toLowerCase() as keyof typeof categoryColors] || "#a8a8a8" 
    : "#a8a8a8";
  
  // Calcular tamanho baseado no conteúdo
  const size = Math.min(0.3, Math.max(0.1, entry.content.length / 2000));
  
  return (
    <group position={position}>
      {/* Bolha principal que representa o pensamento */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshPhysicalMaterial 
          color={color} 
          transmission={0.6} 
          roughness={0.2} 
          thickness={0.5}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Anel que representa a categoria */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size + 0.05, 0.01, 16, 100]} />
        <meshStandardMaterial color={categoryColor} emissive={categoryColor} emissiveIntensity={0.5} />
      </mesh>
      
      {/* Partículas que representam as tags */}
      {tags.map((tag, index) => {
        const { size: particleSize, color: particleColor } = tagToParticleProps(tag);
        // Posicionar partículas em volta da esfera principal
        const angle = (index / tags.length) * Math.PI * 2;
        const radius = size + 0.2;
        const tagPosition: [number, number, number] = [
          Math.cos(angle) * radius,
          Math.sin(index / tags.length * Math.PI) * 0.2,
          Math.sin(angle) * radius
        ];
        
        return (
          <TagParticle 
            key={`${entry.id}-${index}`} 
            position={tagPosition} 
            tag={tag} 
            size={particleSize} 
            color={particleColor} 
          />
        );
      })}
    </group>
  );
};

// Componente principal de cena
export function VisualizationScene({ entries = [] }: { entries?: JournalEntryType[] }) {
  return (
    <>
      {/* Controles de câmera */}
      <OrbitControls 
        enableZoom={true} 
        enablePan={true} 
        enableRotate={true}
        minDistance={1}
        maxDistance={10}
        target={[0, 0, 0]}
      />
      
      {/* Luz ambiente geral */}
      <ambientLight intensity={0.4} />
      
      {/* Luz principal direcional */}
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      
      {/* Luzes coloridas para dar atmosfera */}
      <pointLight position={[-5, 2, -5]} color="#0077ff" intensity={1} />
      <pointLight position={[5, -2, 5]} color="#ff5500" intensity={0.8} />
      
      {/* Renderizar todas as entradas de diário como bolhas de pensamento */}
      {entries.map((entry) => (
        <ThoughtBubble key={entry.id} entry={entry} />
      ))}
    </>
  );
}

// Componente wrapper com canvas
export function JournalVisualization({ entries = [] }: { entries?: JournalEntryType[] }) {
  return (
    <div className="journal-visualization h-full w-full">
      <VisualizationScene entries={entries} />
    </div>
  );
}