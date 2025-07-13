import React from "react";
import { Header } from "./header";
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
  hideBackgroundColor?: boolean; // Opção para páginas que preferem definir seu próprio fundo
}

export function PageLayout({ 
  children,
  hideHeader = false,
  hideNavigation = false,
  title,
  pageTitle,       // Para compatibilidade com códigos existentes
  pageDescription, // Para compatibilidade com códigos existentes
  backLink,
  maxWidth = "full",
  mobileFullHeight = false,
  className = "",
  headerClassName = "",
  contentClassName = "",
  hideBackgroundColor = false
}: PageLayoutProps) {
  // Usar pageTitle como fallback para title
  const displayTitle = title || pageTitle;
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [location, navigate] = useLocation();
  
  const maxWidthClasses = {
    full: "",
    lg: "max-w-7xl mx-auto",
    md: "max-w-3xl mx-auto",
    sm: "max-w-xl mx-auto"
  };
  
  // Classes extras para mobile em tela cheia quando necessário
  const mobileHeightClass = mobileFullHeight && isMobile ? "min-h-[100dvh]" : "";
  
  // Background color class dependendo da opção hideBackgroundColor
  const bgColorClass = hideBackgroundColor ? "" : "bg-slate-50";
  
  // Função para voltar para o link anterior
  const handleBackClick = () => {
    if (backLink) {
      navigate(backLink);
    }
  };
  
  // Rotas onde não exibimos o cabeçalho e navegação
  const hiddenRoutes = ['/auth', '/video-call', '/lgpd-consent', '/payment-success'];
  if (hiddenRoutes.some(route => location.startsWith(route))) {
    return (
      <div className={`h-screen overflow-hidden ${bgColorClass} ${className}`}>
        <div className="h-full overflow-y-auto ios-scroll-fix ios-scroll scrollable-content" style={{ WebkitOverflowScrolling: 'touch' }}>
          <main className={`${mobileHeightClass} page-content ${contentClassName}`}>
            <div className="w-full h-full px-4 pb-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  // Calculando as alturas dos elementos fixos para o espaço de conteúdo
  const headerHeight = !hideHeader ? "64px" : "0px";
  const titleBarHeight = (displayTitle || pageDescription || backLink) ? "56px" : "0px";
  const bottomNavHeight = !hideNavigation ? "calc(64px + env(safe-area-inset-bottom, 0px))" : "0px";
  
  return (
    <div className={`h-screen overflow-hidden ${bgColorClass} ${className}`}>
      {/* Cabeçalho fixo */}
      {!hideHeader && <Header />}
      
      {/* Barra de título no estilo de navegação iOS nativo */}
      {(displayTitle || pageDescription || backLink) && (
        <div 
          className={`fixed left-0 right-0 z-10 backdrop-blur-md ${headerClassName}`}
          style={{ 
            top: hideHeader ? 0 : "64px", // Posiciona abaixo do header se ele estiver visível
            height: titleBarHeight,
            paddingTop: hideHeader ? "env(safe-area-inset-top, 0px)" : "0px",
            background: "rgba(255, 255, 255, 0.85)",
            boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
            WebkitBackdropFilter: "blur(10px)"
          }}
        >
          <div className={`px-4 py-3 flex flex-col h-full justify-center ${maxWidthClasses[maxWidth]}`}>
            <div className="flex items-center justify-center relative">
              {backLink && (
                <button 
                  className="absolute left-0 flex items-center rounded-full p-1 mr-2 
                          text-primary active:bg-primary/5 transition-all hardware-accelerated"
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    transform: "translateZ(0)",
                    willChange: "transform"
                  }}
                  onClick={handleBackClick}
                >
                  <ArrowLeft className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Voltar</span>
                </button>
              )}
              {displayTitle && (
                <h1 
                  className="text-[17px] font-semibold text-center truncate mx-auto"
                  style={{
                    letterSpacing: "-0.01em",
                    color: "#111827",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                    maxWidth: backLink ? "50%" : "70%"
                  }}
                >
                  {displayTitle}
                </h1>
              )}
            </div>
            
            {pageDescription && (
              <p 
                className="text-sm text-muted-foreground mt-1 text-center"
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                  color: "#6B7280"
                }}
              >
                {pageDescription}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Área de conteúdo rolável com estilo iOS */}
      <div 
        className="overflow-y-auto ios-scroll-fix ios-scroll scrollable-content"
        style={{ 
          height: `calc(100% - ${headerHeight} - ${titleBarHeight} - ${bottomNavHeight})`,
          marginTop: `calc(${headerHeight} + ${titleBarHeight})`,
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain',
          background: hideBackgroundColor ? 'transparent' : 'rgba(249, 250, 251, 0.8)'
        }}
      >
        <main 
          className={`${isMobile ? "pt-3" : "pt-5"} ${maxWidthClasses[maxWidth]} ${contentClassName} ios-content-container`}
          style={{
            paddingBottom: `calc(${bottomNavHeight} + 16px)`
          }}
        >
          <div 
            className={`w-full px-4 ${!isMobile ? "pb-8" : ""}`}
            style={{
              scrollbarWidth: 'none', // Esconde scrollbar no Firefox
              msOverflowStyle: 'none' // Esconde scrollbar no IE/Edge
            }}
          >
            {/* Aplica o wrapper dos componentes filhos para animação do iOS */}
            <div className="ios-fade ios-slide-up">
              {children}
            </div>
          </div>
        </main>
      </div>
      
      {/* Navegação inferior fixa */}
      {!hideNavigation && <BottomNavigation />}
    </div>
  );
}