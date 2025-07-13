import React from "react";
import { Header } from "./header-new"; // Usando o novo header otimizado para iOS
import { BottomNavigation } from "./bottom-navigation";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useMediaQuery } from "@/hooks/use-media-query";

export interface PageLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
  hideNavigation?: boolean;
  title?: string;
  pageTitle?: string;       // Para compatibilidade com componentes existentes
  pageDescription?: string; // Para compatibilidade com componentes existentes
  backLink?: string;
  maxWidth?: "full" | "lg" | "md" | "sm";
  mobileFullHeight?: boolean; // Para telas que precisam ocupar toda a altura no mobile
  className?: string;        // Para estilos adicionais
  headerClassName?: string;  // Estilo adicional para o cabeçalho
  contentClassName?: string; // Estilo adicional para o container de conteúdo
}

export function PageLayout({
  children,
  hideHeader = false,
  hideNavigation = false,
  title,
  pageTitle = "",
  pageDescription = "",
  backLink,
  maxWidth = "md",
  mobileFullHeight = false,
  className = "",
  headerClassName = "",
  contentClassName = ""
}: PageLayoutProps) {
  const [, navigate] = useLocation();
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Determina a largura máxima com base no parâmetro
  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case "sm": return "max-w-md";
      case "md": return "max-w-lg";
      case "lg": return "max-w-4xl";
      case "full": return "w-full"; 
      default: return "max-w-lg";
    }
  };
  
  // Página com layout específico iOS nativo
  return (
    <div className={`app-container ${className} ios-device`}>
      {/* Header baseado no iOS nativo */}
      {!hideHeader && <Header />}
      
      {/* Conteúdo principal */}
      <main 
        className={`page-content overflow-auto ios-scroll-fix ${contentClassName} ${mobileFullHeight ? 'mobile-fullscreen' : ''}`}
        style={{
          paddingTop: hideHeader ? "env(safe-area-inset-top, 0px)" : "calc(env(safe-area-inset-top, 0px) + 64px)",
          paddingBottom: hideNavigation ? "env(safe-area-inset-bottom, 0px)" : "calc(env(safe-area-inset-bottom, 0px) + 64px)",
          WebkitOverflowScrolling: "touch",
          minHeight: "100vh",
          height: "100%"
        }}
      >
        {/* Cabeçalho secundário de página (para retornar ou título da página) */}
        {(backLink || title) && (
          <div 
            className={`px-4 py-3 mb-2 ${headerClassName}`}
            style={{
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              background: "rgba(255, 255, 255, 0.75)",
              transform: "translateZ(0)"
            }}
          >
            <div className={`flex items-center ${getMaxWidthClass()} mx-auto`}>
              {backLink && (
                <button 
                  onClick={() => navigate(backLink)}
                  className="p-2 -ml-2 mr-1 rounded-full text-slate-700 active:bg-slate-100/70 active:scale-95 transition-transform"
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    transform: "translateZ(0)"
                  }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              
              {title && (
                <h1 
                  className="text-xl font-semibold text-slate-800 flex-1 truncate"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
                    letterSpacing: "-0.01em"
                  }}
                >
                  {title}
                </h1>
              )}
            </div>
          </div>
        )}
        
        {/* Conteúdo da página */}
        <div 
          className={`${getMaxWidthClass()} mx-auto px-4 ${title || backLink ? 'pt-0' : 'pt-2'}`}
          style={{
            transition: "padding 0.2s var(--ios-ease)",
          }}
        >
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation ao estilo iOS nativo */}
      {!hideNavigation && (
        <BottomNavigation />
      )}
    </div>
  );
}