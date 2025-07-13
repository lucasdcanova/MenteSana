import React from "react";
import { cn } from "@/lib/utils";

/**
 * Interface de propriedades para o componente SkeletonLoader
 */
interface SkeletonLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variante do esqueleto a ser exibido
   */
  variant?: "card" | "text" | "avatar" | "button" | "list" | "profile" | "form";
  
  /**
   * Número de itens a serem exibidos (para variantes list)
   */
  count?: number;
}

/**
 * Componente de esqueleto para indicar carregamento com UI melhorada
 */
export function SkeletonLoader({ 
  className, 
  variant = "text", 
  count = 1,
  ...props 
}: SkeletonLoaderProps) {
  // Classe base para todos os esqueletos
  const baseClass = "animate-pulse bg-muted rounded";
  
  // Renderiza um esqueleto individual com base na variante
  const renderSkeleton = (index: number) => {
    switch (variant) {
      case "card":
        return (
          <div key={index} className={cn("flex flex-col gap-3 w-full", className)} {...props}>
            <div className={`${baseClass} h-48 w-full rounded-t-lg`}></div>
            <div className={`${baseClass} h-5 w-2/3 mb-2`}></div>
            <div className={`${baseClass} h-4 w-full mb-1`}></div>
            <div className={`${baseClass} h-4 w-5/6`}></div>
            <div className="flex justify-between mt-4">
              <div className={`${baseClass} h-8 w-24 rounded-md`}></div>
              <div className={`${baseClass} h-8 w-8 rounded-full`}></div>
            </div>
          </div>
        );
      
      case "avatar":
        return (
          <div key={index} className={cn(`${baseClass} rounded-full h-12 w-12`, className)} {...props}></div>
        );
      
      case "button":
        return (
          <div key={index} className={cn(`${baseClass} h-10 w-24 rounded-md`, className)} {...props}></div>
        );
      
      case "list":
        return (
          <div key={index} className={cn("flex items-center gap-3 w-full p-3", className)} {...props}>
            <div className={`${baseClass} rounded-full h-10 w-10`}></div>
            <div className="flex-1">
              <div className={`${baseClass} h-4 w-3/4 mb-2`}></div>
              <div className={`${baseClass} h-3 w-1/2`}></div>
            </div>
            <div className={`${baseClass} h-6 w-6 rounded-sm`}></div>
          </div>
        );
      
      case "profile":
        return (
          <div key={index} className={cn("flex flex-col items-center gap-4", className)} {...props}>
            <div className={`${baseClass} rounded-full h-24 w-24`}></div>
            <div className={`${baseClass} h-6 w-40 mb-1`}></div>
            <div className={`${baseClass} h-4 w-60`}></div>
            <div className="flex gap-3 mt-3">
              <div className={`${baseClass} h-9 w-24 rounded-md`}></div>
              <div className={`${baseClass} h-9 w-24 rounded-md`}></div>
            </div>
          </div>
        );
      
      case "form":
        return (
          <div key={index} className={cn("flex flex-col gap-5 w-full", className)} {...props}>
            <div className="space-y-2">
              <div className={`${baseClass} h-4 w-24 mb-1`}></div>
              <div className={`${baseClass} h-10 w-full rounded-md`}></div>
            </div>
            <div className="space-y-2">
              <div className={`${baseClass} h-4 w-32 mb-1`}></div>
              <div className={`${baseClass} h-10 w-full rounded-md`}></div>
            </div>
            <div className="space-y-2">
              <div className={`${baseClass} h-4 w-28 mb-1`}></div>
              <div className={`${baseClass} h-28 w-full rounded-md`}></div>
            </div>
            <div className={`${baseClass} h-10 w-full mt-4 rounded-md`}></div>
          </div>
        );
      
      case "text":
      default:
        return (
          <div key={index} className={cn(`${baseClass} h-4 w-full`, className)} {...props}></div>
        );
    }
  };
  
  // Renderiza múltiplos esqueletos se count for maior que 1
  if (count > 1) {
    return (
      <div className="flex flex-col gap-3 w-full">
        {Array(count).fill(0).map((_, index) => renderSkeleton(index))}
      </div>
    );
  }
  
  // Renderiza um único esqueleto
  return renderSkeleton(0);
}