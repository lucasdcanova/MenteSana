import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Bell, 
  User, 
  Menu, 
  Home, 
  BookOpen, 
  Heart, 
  LogOut,
  MessageSquare,
  Calendar,
  LightbulbIcon,
  Shield,
  X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logoutMutation } = useAuth();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Função para navegação
  const handleNavigate = (path: string) => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    window.location.href = path;
  };

  // Função para lidar com o logout
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/auth";
      },
    });
  };

  // Obter iniciais do usuário para o avatar
  const getUserInitials = (): string => {
    if (!user) return "";
    return (
      (user.firstName?.charAt(0) || "") + (user.lastName?.charAt(0) || "")
    ).toUpperCase();
  };

  useEffect(() => {
    // Detectar scroll para aplicar estilo
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Fechar menu quando clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  useEffect(() => {
    // Bloquear scroll do body quando o menu estiver aberto
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 transition-all duration-200 ios-header-fix"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: scrolled ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.95)",
        boxShadow: scrolled ? "0 1px 3px rgba(0, 0, 0, 0.05)" : "none",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        transform: "translateZ(0)"
      }}
    >
      <div className="flex items-center justify-between px-4 h-16 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          {/* Espaço vazio para manter layout equilibrado (botão de menu removido) */}
          <div className="md:hidden w-5"></div>
        </div>

        {/* Menu de navegação - Desktop */}
        <nav className="hidden md:flex items-center space-x-6">
          <div 
            onClick={() => handleNavigate("/")}
            className={`text-sm font-medium cursor-pointer ios-nav-item ${location === '/' ? 'ios-nav-active' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Início
          </div>
          
          {!user?.isTherapist && (
            <>
              <div 
                onClick={() => handleNavigate("/journal")}
                className={`text-sm font-medium cursor-pointer ios-nav-item ${location.startsWith('/journal') ? 'ios-nav-active' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Diário
              </div>
              <div 
                onClick={() => handleNavigate("/self-help")}
                className={`text-sm font-medium cursor-pointer ios-nav-item ${location.startsWith('/self-help') ? 'ios-nav-active' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Autoajuda
              </div>
              <div 
                onClick={() => handleNavigate("/assistant")}
                className={`text-sm font-medium cursor-pointer ios-nav-item ${location.startsWith('/assistant') ? 'ios-nav-active' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Assistente
              </div>
            </>
          )}
          
          {user?.isTherapist && (
            <div 
              onClick={() => handleNavigate("/therapist-dashboard")}
              className={`text-sm font-medium cursor-pointer ios-nav-item ${location.startsWith('/therapist') ? 'ios-nav-active' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Dashboard
            </div>
          )}
          
          <div 
            onClick={() => handleNavigate("/support-groups")}
            className={`text-sm font-medium cursor-pointer ios-nav-item ${location.startsWith('/support-groups') ? 'ios-nav-active' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Grupos de Apoio
          </div>
        </nav>

        {/* Ações do usuário e Logo à DIREITA */}
        <div className="flex items-center space-x-3">
          {/* Logo / Título MOVIDO PARA A DIREITA */}
          <div 
            className="flex items-center" 
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div 
              className="font-bold flex items-center cursor-pointer"
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
                fontSize: "20px",
                letterSpacing: "-0.01em",
                textAlign: "center",
                color: "#111827"
              }}
              onClick={() => handleNavigate("/")}
            >
              <span style={{ color: "hsl(var(--primary))" }} className="mr-1">Mind</span>
              <span>Well</span>
            </div>
          </div>

          {/* Avatar do usuário - Toque leva ao perfil (apenas em desktop) */}
          <div 
            className="hidden md:flex items-center"
            onClick={() => handleNavigate("/profile")}
          >
            <div
              className="rounded-full p-0 h-9 w-9 overflow-hidden cursor-pointer"
              style={{
                boxShadow: user?.profilePicture ? "0 0 0 1px rgba(0, 0, 0, 0.06)" : "none",
                WebkitTapHighlightColor: "transparent",
                transform: "translateZ(0)",
                transition: "transform 0.15s var(--ios-ease)"
              }}
            >
              <Avatar 
                className="h-9 w-9 border border-slate-100"
                style={{
                  borderRadius: "50%",
                  overflow: "hidden"
                }}
              >
                <AvatarImage src={user?.profilePicture || ""} alt={user?.firstName || "Usuário"} />
                <AvatarFallback 
                  className="bg-primary/10 text-primary font-medium"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  }}
                >
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      {/* Menu móvel - Overlay no estilo iOS */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          {/* Menu móvel - Painel deslizante com estilo iOS */}
          <div 
            ref={menuRef}
            className="fixed left-0 top-0 h-full w-[300px] max-w-[85vw] z-[10000] overflow-y-auto"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "5px 0 25px rgba(0, 0, 0, 0.15)",
              borderRight: "1px solid rgba(0, 0, 0, 0.05)",
              WebkitOverflowScrolling: "touch",
              animation: "slideInLeft 0.3s forwards",
              transform: "translateZ(0)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do menu mobile estilo iOS */}
            <div 
              className="flex items-center justify-between px-5 py-4 border-b border-slate-100/60"
              style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(5px)",
                WebkitBackdropFilter: "blur(5px)",
                position: "sticky",
                top: 0,
                zIndex: 1
              }}
            >
              <div 
                className="font-semibold text-lg"
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
                  color: "#1F2937",
                  letterSpacing: "-0.01em"
                }}
              >
                Menu
              </div>
              <button 
                className="rounded-full flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen(false);
                }}
                aria-label="Fechar menu"
                style={{
                  width: "32px",
                  height: "32px",
                  WebkitTapHighlightColor: "transparent",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: 0,
                  appearance: "none"
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Links de navegação com estilo iOS */}
            <div className="py-3 px-3 space-y-0.5">
              <button 
                onClick={() => handleNavigate("/")}
                className={`flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer ${
                  location === '/' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  appearance: "none"
                }}
              >
                <Home className="h-5 w-5 mr-3" />
                <span 
                  className="font-medium text-[15px]"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  }}
                >
                  Início
                </span>
              </button>
              
              {!user?.isTherapist && (
                <>
                  <button 
                    onClick={() => handleNavigate("/journal")}
                    className={`flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer ${
                      location.startsWith('/journal') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-700 active:bg-slate-50'
                    }`}
                    style={{
                      transition: "all 0.15s var(--ios-ease)",
                      WebkitTapHighlightColor: "transparent",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      appearance: "none"
                    }}
                  >
                    <BookOpen className="h-5 w-5 mr-3" />
                    <span 
                      className="font-medium text-[15px]"
                      style={{
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                      }}
                    >
                      Diário
                    </span>
                  </button>
                  <button 
                    onClick={() => handleNavigate("/self-help")}
                    className={`flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer ${
                      location.startsWith('/self-help') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-700 active:bg-slate-50'
                    }`}
                    style={{
                      transition: "all 0.15s var(--ios-ease)",
                      WebkitTapHighlightColor: "transparent",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      appearance: "none"
                    }}
                  >
                    <Heart className="h-5 w-5 mr-3" />
                    <span 
                      className="font-medium text-[15px]"
                      style={{
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                      }}
                    >
                      Autoajuda
                    </span>
                  </button>
                  <button 
                    onClick={() => handleNavigate("/assistant")}
                    className={`flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer ${
                      location.startsWith('/assistant') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-700 active:bg-slate-50'
                    }`}
                    style={{
                      transition: "all 0.15s var(--ios-ease)",
                      WebkitTapHighlightColor: "transparent",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      appearance: "none"
                    }}
                  >
                    <MessageSquare className="h-5 w-5 mr-3" />
                    <span 
                      className="font-medium text-[15px]"
                      style={{
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                      }}
                    >
                      Assistente
                    </span>
                  </button>
                </>
              )}
              
              <button 
                onClick={() => handleNavigate("/daily-tips")}
                className={`flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer ${
                  location.startsWith('/daily-tips') 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  appearance: "none"
                }}
              >
                <LightbulbIcon className="h-5 w-5 mr-3" />
                <span 
                  className="font-medium text-[15px]"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  }}
                >
                  Dicas Diárias
                </span>
              </button>
              <button 
                onClick={() => handleNavigate("/support-groups")}
                className={`flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer ${
                  location.startsWith('/support-groups') 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  appearance: "none"
                }}
              >
                <MessageSquare className="h-5 w-5 mr-3" />
                <span 
                  className="font-medium text-[15px]"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  }}
                >
                  Grupos de Apoio
                </span>
              </button>
              {user?.isTherapist && (
                <button 
                  onClick={() => handleNavigate("/therapist-dashboard")}
                  className={`flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer ${
                    location.startsWith('/therapist') 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-slate-700 active:bg-slate-50'
                  }`}
                  style={{
                    transition: "all 0.15s var(--ios-ease)",
                    WebkitTapHighlightColor: "transparent",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    appearance: "none"
                  }}
                >
                  <Calendar className="h-5 w-5 mr-3" />
                  <span 
                    className="font-medium text-[15px]"
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                    }}
                  >
                    Dashboard
                  </span>
                </button>
              )}
            </div>

            {/* Links de conta com estilo iOS */}
            <div className="px-3 py-3 mt-1 border-t border-slate-100/60">
              <h3 
                className="text-xs font-medium text-slate-500 uppercase px-4 mb-2"
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                  letterSpacing: "0.02em"
                }}
              >
                Conta
              </h3>
              <button 
                onClick={() => handleNavigate("/profile")}
                className={`flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer ${
                  location === '/profile' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  appearance: "none"
                }}
              >
                <User className="h-5 w-5 mr-3" />
                <span 
                  className="font-medium text-[15px]"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  }}
                >
                  Meu Perfil
                </span>
              </button>
              <button 
                onClick={() => handleNavigate("/lgpd-consent")}
                className={`flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer ${
                  location === '/lgpd-consent' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  appearance: "none"
                }}
              >
                <Shield className="h-5 w-5 mr-3" />
                <span 
                  className="font-medium text-[15px]"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  }}
                >
                  Privacidade
                </span>
              </button>
              <button 
                onClick={handleLogout}
                className="flex w-full items-center mx-1 p-3.5 rounded-xl cursor-pointer text-red-500"
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  appearance: "none"
                }}
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span 
                  className="font-medium text-[15px]"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  }}
                >
                  Sair
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}