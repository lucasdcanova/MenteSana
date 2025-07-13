import { useLocation } from "wouter";
import { Home, MessageCircle, Calendar, BookOpen, User, Users, Clock, BarChart, Layout } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export function BottomNavigation() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const isTherapist = user?.isTherapist || false;
  const [isVisible, setIsVisible] = useState(true);
  
  // Detecta quando o usuário está rolando para baixo para ocultar a barra
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollingDown = currentScrollY > lastScrollY;
          
          // Para evitar problemas com detecção próxima ao fim da página,
          // vamos apenas considerar a direção da rolagem
          if (scrollingDown && currentScrollY > 100) {
            setIsVisible(false);
          } else {
            setIsVisible(true);
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        
        ticking = true;
      }
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Verifica se o caminho atual corresponde ao item de navegação
  const isActive = (path: string) => {
    // Casos especiais com subcaminhos
    if (path === '/journal' && (location === '/journal' || location.startsWith('/journal'))) return true;
    if (path === '/schedule' && location.startsWith('/schedule')) return true;
    if (path === '/assistant' && location.startsWith('/assistant')) return true;
    if (path === '/support-groups' && location.startsWith('/support-groups')) return true;
    if (path === '/therapist-dashboard' && (location === '/therapist-dashboard' || location.includes('dashboard'))) return true;
    if (path === '/therapist-patients' && (location === '/therapist-patients' || location.includes('patient'))) return true;
    if (path === '/therapist-analytics' && location.startsWith('/therapist-analytics')) return true;
    if (path === '/therapist-availability' && location.startsWith('/therapist-availability')) return true;
    if (path === '/profile' && (location === '/profile' || location.startsWith('/profile'))) return true;
    // Correspondência exata para caminhos raiz
    return location === path;
  };

  // Função para navegar
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // Rotas onde a navegação deve ficar oculta
  const hiddenRoutes = ['/auth', '/video-call', '/lgpd-consent', '/payment-success'];
  if (hiddenRoutes.some(route => location.startsWith(route))) {
    return null;
  }

  // Componente de navegação individual para reutilização no estilo iOS
  const NavItem = ({ path, label, icon: Icon }: { path: string; label: string; icon: React.ElementType }) => {
    const active = path === '/' ? location === '/' : isActive(path);
    
    return (
      <div
        onClick={() => handleNavigate(path)}
        className="flex flex-col items-center justify-center relative h-full cursor-pointer prevent-ghost-tap ios-tab-button"
        style={{
          flex: 1,
          WebkitTapHighlightColor: "transparent",
          transition: "all 0.2s var(--ios-ease)",
          transform: "translateZ(0)",
          willChange: "opacity",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          touchAction: "manipulation",
        }}
      >
        {/* Efeito de toque - Estilo iOS */}
        <div 
          className="absolute inset-0 rounded-full opacity-0 bg-gray-100"
          style={{
            transform: "scale(0.7)",
            transition: "all 0.3s var(--ios-spring)",
          }}
        />
        
        <div 
          className="relative flex flex-col items-center justify-center pt-1"
          style={{ transition: "transform 0.2s var(--ios-ease)" }}
        >
          <Icon 
            className={`h-6 w-6 mb-1 transition-all duration-200`}
            style={{ 
              color: active ? 'hsl(var(--primary))' : '#64748B',
              filter: active ? 'drop-shadow(0 1px 1px rgba(0, 172, 138, 0.1))' : 'none',
              transform: active ? 'scale(1.05)' : 'scale(1)',
              transition: "all 0.2s var(--ios-spring)"
            }} 
          />
          <span 
            className={`text-[10px] font-medium transition-all duration-200`}
            style={{ 
              color: active ? 'hsl(var(--primary))' : '#64748B',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              transform: active ? 'translateY(-1px)' : 'translateY(0)',
              fontWeight: active ? 600 : 500,
              letterSpacing: "-0.01em"
            }}
          >
            {label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 w-full z-[100] transition-all duration-300 ios-tab-bar hardware-accelerated ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 -0.5px 0 rgba(0, 0, 0, 0.15)",
        // Adicionar variável CSS para altura da barra inferior
        "--bottom-nav-height": "calc(56px + env(safe-area-inset-bottom, 0px))"
      } as React.CSSProperties}
    >
      <div 
        className="flex justify-around items-center h-14" 
        style={{
          maxWidth: "100%",
          paddingLeft: "env(safe-area-inset-left, 0)",
          paddingRight: "env(safe-area-inset-right, 0)"
        }}
      >
        {isTherapist ? (
          // Navegação para terapeuta
          <>
            <NavItem path="/" label="Início" icon={Home} />
            <NavItem path="/therapist-dashboard" label="Dashboard" icon={Layout} />
            <NavItem path="/therapist-patients" label="Pacientes" icon={Users} />
            <NavItem path="/therapist-availability" label="Horários" icon={Clock} />
            <NavItem path="/profile" label="Perfil" icon={User} />
          </>
        ) : (
          // Navegação para paciente
          <>
            <NavItem path="/" label="Início" icon={Home} />
            <NavItem path="/schedule" label="Agendar" icon={Calendar} />
            <NavItem path="/assistant" label="Assistente" icon={MessageCircle} />
            <NavItem path="/journal" label="Diário" icon={BookOpen} />
            <NavItem path="/profile" label="Perfil" icon={User} />
          </>
        )}
      </div>
    </div>
  );
}
