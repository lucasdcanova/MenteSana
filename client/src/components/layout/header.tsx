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
import { useState, useEffect } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Monitora o scroll da página para adicionar sombra ao header quando rolar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Impede a rolagem do body quando o menu mobile está aberto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Fecha o menu mobile ao navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Função para obter as iniciais do nome do usuário
  const getUserInitials = () => {
    if (!user) return "U";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  // Função para lidar com o logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Função para navegar
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 w-full z-[100] transition-all duration-200 backdrop-blur-md hardware-accelerated ${
        scrolled ? "ios-header-scrolled" : ""
      }`}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        height: "calc(64px + env(safe-area-inset-top, 0px))",
        background: scrolled ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.95)",
        boxShadow: scrolled ? "0 1px 3px rgba(0, 0, 0, 0.05)" : "0 1px 0 rgba(0, 0, 0, 0.05)",
        WebkitBackdropFilter: "blur(10px)",
        transform: "translateZ(0)",
        willChange: "transform, backdrop-filter, background"
      }}
    >
      <div 
        className="flex items-center justify-between px-4 h-16 max-w-7xl mx-auto"
      >
        {/* Logo / Título */}
        <div 
          className="flex items-center" 
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <div 
            className="font-bold flex items-center cursor-pointer hardware-accelerated"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              fontSize: "20px",
              letterSpacing: "-0.01em",
              transform: "translateZ(0)",
              textAlign: "center",
              color: "#111827"
            }}
            onClick={() => handleNavigate("/")}
          >
            <span style={{ color: "hsl(var(--primary))" }} className="mr-1">Mind</span>
            <span>Well</span>
          </div>
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

        {/* Ações do usuário */}
        <div className="flex items-center space-x-3">
          {/* Avatar do usuário com menu dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="rounded-full p-0 h-9 w-9 overflow-hidden hardware-accelerated" 
                aria-label="Perfil"
                style={{
                  boxShadow: user?.profilePicture ? "0 0 0 1px rgba(0, 0, 0, 0.06)" : "none",
                  WebkitTapHighlightColor: "transparent",
                  transform: "translateZ(0)",
                  willChange: "transform",
                  transition: "transform 0.2s var(--ios-ease)"
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
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 z-[101] rounded-xl shadow-lg"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 5px 10px -5px rgba(0, 0, 0, 0.05)"
              }}
            >
              <div className="flex items-center justify-start gap-2 p-3 border-b border-slate-100">
                <div className="flex flex-col space-y-0.5">
                  <p 
                    className="text-[15px] font-medium leading-none"
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                      color: "#1F2937"
                    }}
                  >
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p 
                    className="text-xs leading-none text-muted-foreground"
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                      color: "#6B7280"
                    }}
                  >
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="py-1">
                <DropdownMenuItem 
                  onClick={() => handleNavigate("/profile")} 
                  className="cursor-pointer ios-menu-item py-2.5"
                >
                  <User className="mr-2.5 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleNavigate("/daily-tips")} 
                  className="cursor-pointer ios-menu-item py-2.5"
                >
                  <LightbulbIcon className="mr-2.5 h-4 w-4" />
                  <span>Dicas Diárias</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleNavigate("/support-groups")} 
                  className="cursor-pointer ios-menu-item py-2.5"
                >
                  <MessageSquare className="mr-2.5 h-4 w-4" />
                  <span>Grupos de Apoio</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleNavigate("/lgpd-consent")} 
                  className="cursor-pointer ios-menu-item py-2.5"
                >
                  <Shield className="mr-2.5 h-4 w-4" />
                  <span>Centro de Privacidade</span>
                </DropdownMenuItem>
                {user?.isTherapist && (
                  <DropdownMenuItem 
                    onClick={() => handleNavigate("/therapist-profile")} 
                    className="cursor-pointer ios-menu-item py-2.5"
                  >
                    <Calendar className="mr-2.5 h-4 w-4" />
                    <span>Perfil de Terapeuta</span>
                  </DropdownMenuItem>
                )}
              </div>
              <div className="py-1 border-t border-slate-100">
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer ios-menu-item py-2.5"
                  style={{ color: "hsl(var(--destructive))" }}
                >
                  <LogOut className="mr-2.5 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menu Mobile - Botão com estilo iOS */}
          <div 
            className="md:hidden hardware-accelerated ios-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu mobile"
            role="button"
            tabIndex={0}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
              transform: "translateZ(0)",
              willChange: "transform",
              transition: "all 0.2s var(--ios-ease)"
            }}
          >
            <Menu className="h-5 w-5 text-slate-800" />
          </div>
        </div>
      </div>

      {/* Menu móvel - Overlay no estilo iOS */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 backdrop-blur-md bg-black/30 z-[9999] md:hidden ios-fade"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            WebkitBackdropFilter: "blur(8px)",
            transform: "translateZ(0)"
          }}
        >
          {/* Menu móvel - Painel deslizante com estilo iOS */}
          <div 
            className="fixed right-0 top-0 h-full w-[300px] max-w-[85vw] z-[10000] overflow-y-auto ios-scroll"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              background: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "-5px 0 25px rgba(0, 0, 0, 0.1)",
              borderLeft: "1px solid rgba(0, 0, 0, 0.03)",
              WebkitOverflowScrolling: "touch",
              animation: "ios-slide-in-right 0.35s var(--ios-spring) forwards"
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full ios-menu-button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                style={{
                  width: "32px",
                  height: "32px",
                  WebkitTapHighlightColor: "transparent"
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Links de navegação com estilo iOS */}
            <div className="py-3 px-3 space-y-0.5">
              <div 
                onClick={() => handleNavigate("/")}
                className={`flex items-center mx-1 p-3.5 rounded-xl cursor-pointer prevent-ghost-tap ${
                  location === '/' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  transform: "translateZ(0)"
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
              </div>
              
              {!user?.isTherapist && (
                <>
                  <div 
                    onClick={() => handleNavigate("/journal")}
                    className={`flex items-center mx-1 p-3.5 rounded-xl cursor-pointer prevent-ghost-tap ${
                      location.startsWith('/journal') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-700 active:bg-slate-50'
                    }`}
                    style={{
                      transition: "all 0.15s var(--ios-ease)",
                      WebkitTapHighlightColor: "transparent",
                      transform: "translateZ(0)"
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
                  </div>
                  <div 
                    onClick={() => handleNavigate("/self-help")}
                    className={`flex items-center mx-1 p-3.5 rounded-xl cursor-pointer prevent-ghost-tap ${
                      location.startsWith('/self-help') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-700 active:bg-slate-50'
                    }`}
                    style={{
                      transition: "all 0.15s var(--ios-ease)",
                      WebkitTapHighlightColor: "transparent",
                      transform: "translateZ(0)"
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
                  </div>
                  <div 
                    onClick={() => handleNavigate("/assistant")}
                    className={`flex items-center mx-1 p-3.5 rounded-xl cursor-pointer prevent-ghost-tap ${
                      location.startsWith('/assistant') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-700 active:bg-slate-50'
                    }`}
                    style={{
                      transition: "all 0.15s var(--ios-ease)",
                      WebkitTapHighlightColor: "transparent",
                      transform: "translateZ(0)"
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
                  </div>
                </>
              )}
              
              <div 
                onClick={() => handleNavigate("/daily-tips")}
                className={`flex items-center mx-1 p-3.5 rounded-xl cursor-pointer prevent-ghost-tap ${
                  location.startsWith('/daily-tips') 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  transform: "translateZ(0)"
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
              </div>
              <div 
                onClick={() => handleNavigate("/support-groups")}
                className={`flex items-center mx-1 p-3.5 rounded-xl cursor-pointer prevent-ghost-tap ${
                  location.startsWith('/support-groups') 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  transform: "translateZ(0)"
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
              </div>
              {user?.isTherapist && (
                <div 
                  onClick={() => handleNavigate("/therapist-dashboard")}
                  className={`flex items-center mx-1 p-3.5 rounded-xl cursor-pointer prevent-ghost-tap ${
                    location.startsWith('/therapist') 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-slate-700 active:bg-slate-50'
                  }`}
                  style={{
                    transition: "all 0.15s var(--ios-ease)",
                    WebkitTapHighlightColor: "transparent",
                    transform: "translateZ(0)"
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
                </div>
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
              <div 
                onClick={() => handleNavigate("/profile")}
                className={`flex items-center mx-1 p-3.5 rounded-xl cursor-pointer prevent-ghost-tap ${
                  location === '/profile' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  transform: "translateZ(0)"
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
              </div>
              <div 
                onClick={() => handleNavigate("/lgpd-consent")}
                className={`flex items-center mx-1 p-3.5 rounded-xl cursor-pointer prevent-ghost-tap ${
                  location === '/lgpd-consent' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-700 active:bg-slate-50'
                }`}
                style={{
                  transition: "all 0.15s var(--ios-ease)",
                  WebkitTapHighlightColor: "transparent",
                  transform: "translateZ(0)"
                }}
              >
                <Shield className="h-5 w-5 mr-3" />
                <span 
                  className="font-medium text-[15px]"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  }}
                >
                  Centro de Privacidade
                </span>
              </div>
              <div
                className="mx-1 mt-3"
              >
                <button 
                  className="w-full flex items-center justify-center p-3.5 rounded-xl text-white font-medium text-[15px] prevent-ghost-tap"
                  onClick={handleLogout}
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                    background: "linear-gradient(145deg, hsl(var(--destructive)), hsl(var(--destructive)/0.9))",
                    boxShadow: "0 2px 8px rgba(var(--destructive), 0.2)",
                    WebkitTapHighlightColor: "transparent",
                    transform: "translateZ(0)",
                    transition: "all 0.15s var(--ios-ease)"
                  }}
                >
                  <LogOut className="h-5 w-5 mr-2.5" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}