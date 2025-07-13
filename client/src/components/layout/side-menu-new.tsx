import { useEffect } from "react";
import { 
  Settings, 
  Users, 
  Home, 
  Calendar, 
  MessageSquare, 
  Moon, 
  LogOut, 
  BookOpen, 
  Activity, 
  User, 
  HelpCircle,
  Heart,
  Bell,
  X,
  Lightbulb,
  History,
  SmileIcon
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  // Bloqueia o scroll do body quando o menu está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Função para lidar com o logout
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      onClose();
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado da sua conta.",
      });
    } catch (error) {
      toast({
        title: "Erro ao realizar logout",
        description: "Ocorreu um erro ao tentar desconectar da sua conta.",
        variant: "destructive",
      });
    }
  };

  // Se o menu não estiver aberto, não renderize nada
  if (!isOpen) return null;

  const menuContainerStyle = {
    borderTopRightRadius: "20px",
    borderBottomRightRadius: "20px",
    WebkitBackfaceVisibility: "hidden" as const,
    WebkitTransform: "translateZ(0)" as const,
    transform: "translateZ(0)" as const,
    transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1.0)" as const,
    height: '100dvh' as const,
    WebkitOverflowScrolling: 'touch' as const,
    display: 'flex',
    flexDirection: 'column' as const
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay semi-transparente com estilo do iOS */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
        onClick={onClose}
        style={{
          WebkitBackdropFilter: "blur(8px)"
        }}
      />
      
      {/* Menu lateral com estilo iOS nativo */}
      <div
        className="ios-side-menu w-[85%] max-w-[320px] bg-white shadow-xl"
        style={{
          ...menuContainerStyle,
          position: "fixed",
          top: 0,
          left: 0,
          right: "auto",
          zIndex: 9999,
          transform: "translate3d(0, 0, 0)",
          WebkitTransform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          willChange: "transform",
          isolation: "isolate",
          contain: "layout style paint",
          touchAction: "manipulation",
          pointerEvents: "auto",
          overscrollBehavior: "contain"
        }}
      >
        {/* Conteúdo com rolagem independente */}
        <div className="ios-side-menu-content w-full h-full overflow-y-auto pb-safe-bottom">
      
        {/* Botão de fechar estilo iOS */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-gray-100/80 backdrop-blur-sm z-10 transition-all active:bg-gray-200/90 active:scale-95"
          aria-label="Fechar menu"
          style={{
            WebkitTapHighlightColor: "transparent",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            transition: "all 0.15s ease"
          }}
        >
          <X className="w-4 h-4 text-gray-600" strokeWidth={2.5} />
        </button>

        {/* Cabeçalho do menu estilo iOS */}
        <div 
          className="relative px-4 pt-12 pb-3 border-b border-gray-100/70 flex-shrink-0"
          style={{
            borderTopRightRadius: "20px",
            background: "linear-gradient(180deg, rgba(249,250,251,0.9) 0%, rgba(255,255,255,0.95) 100%)"
          }}
        >
          {user ? (
            <div className="flex items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary font-semibold"
                style={{
                  boxShadow: "0 2px 8px rgba(var(--ios-primary-rgb), 0.08)",
                  border: "2px solid rgba(var(--ios-primary-rgb), 0.15)",
                  WebkitBackdropFilter: "blur(4px)",
                  fontSize: "13px"
                }}
              >
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
              <div className="ml-2.5">
                <h3 
                  className="font-semibold text-sm text-slate-800"
                  style={{
                    fontFamily: "var(--ios-display-font)",
                    letterSpacing: "-0.01em",
                    fontWeight: 600
                  }}
                >
                  {user.firstName} {user.lastName}
                </h3>
                <p 
                  className="text-xs text-slate-500"
                  style={{
                    fontFamily: "var(--ios-system-font)",
                    fontSize: "11px",
                    fontWeight: 400
                  }}
                >
                  {user.isTherapist ? "Terapeuta" : "Paciente"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <h3 
                className="font-semibold text-base text-slate-800 mb-1.5"
                style={{
                  fontFamily: "var(--ios-display-font)",
                  letterSpacing: "-0.01em",
                  fontWeight: 600
                }}
              >
                MindWell
              </h3>
              <a href="/auth">
                <button 
                  className="ios-button py-1.5 px-5 rounded-full text-white text-sm font-medium active:scale-98 active:opacity-90 transition-all duration-150"
                  style={{
                    boxShadow: "0 2px 6px rgba(var(--ios-primary-rgb), 0.2)",
                    background: "linear-gradient(135deg, rgba(var(--ios-primary-rgb), 1), rgba(var(--ios-primary-rgb), 0.9))",
                    fontFamily: "var(--ios-system-font)",
                    WebkitTapHighlightColor: "transparent",
                    fontSize: "13px",
                    fontWeight: 500
                  }}
                  onClick={onClose}
                >
                  Entrar
                </button>
              </a>
            </div>
          )}
        </div>
        
        {/* Conteúdo do menu com rolagem aprimorada para iOS */}
        <div className="flex-grow overflow-y-auto ios-momentum-scroll" style={{
          WebkitOverflowScrolling: 'touch',
          overflow: 'auto',
          height: 'calc(100% - 80px)', // Altura automática menos a altura do cabeçalho
          position: 'relative',
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          willChange: "scroll-position",
          overscrollBehavior: "contain",
          touchAction: "pan-y"
        }}>
          {/* Itens do menu - agrupados em uma única coluna sem seções para economizar espaço */}
          <div className="py-2 px-3">
            {/* Principal */}
            <MenuSection label="Principal" />
            <MenuItem href="/" icon={<Home className="w-4.5 h-4.5" />} label="Início" onClick={onClose} />
            <MenuItem href="/journal" icon={<BookOpen className="w-4.5 h-4.5" />} label="Diário" onClick={onClose} />
            <MenuItem href="/journal-history" icon={<History className="w-4.5 h-4.5" />} label="Histórico de Diário" onClick={onClose} />
            <MenuItem href="/daily-tip" icon={<Lightbulb className="w-4.5 h-4.5" />} label="Ajuda do Dia" onClick={onClose} />
            <MenuItem href="/emotional-state" icon={<Activity className="w-4.5 h-4.5" />} label="Estado Emocional" onClick={onClose} />
            <MenuItem href="/self-help" icon={<SmileIcon className="w-4.5 h-4.5" />} label="Autoajuda" onClick={onClose} />
            <MenuItem href="/assistant" icon={<MessageSquare className="w-4.5 h-4.5" />} label="Assistente" onClick={onClose} />
            
            {/* Comunidade */}
            <MenuDivider />
            <MenuSection label="Comunidade" />
            <MenuItem href="/support-groups" icon={<Users className="w-4.5 h-4.5" />} label="Grupos de Apoio" onClick={onClose} />
            <MenuItem href="/schedule" icon={<Calendar className="w-4.5 h-4.5" />} label="Agenda" onClick={onClose} />
            {user && user.isTherapist && (
              <MenuItem href="/therapist-dashboard" icon={<Activity className="w-4.5 h-4.5" />} label="Dashboard" onClick={onClose} />
            )}
            
            {/* Configurações */}
            <MenuDivider />
            <MenuSection label="Configurações" />
            {user && (
              <MenuItem href="/profile" icon={<User className="w-4.5 h-4.5" />} label="Meu Perfil" onClick={onClose} />
            )}
            <MenuItem href="/notifications" icon={<Bell className="w-4.5 h-4.5" />} label="Notificações" onClick={onClose} />
            <MenuItem href="/settings" icon={<Settings className="w-4.5 h-4.5" />} label="Configurações" onClick={onClose} />
            <MenuItem href="/appearance" icon={<Moon className="w-4.5 h-4.5" />} label="Aparência" onClick={onClose} />
            
            {/* Suporte */}
            <MenuDivider />
            <MenuSection label="Suporte" />
            <MenuItem href="/help" icon={<HelpCircle className="w-4.5 h-4.5" />} label="Ajuda" onClick={onClose} />
            <MenuItem href="/emergency" icon={<Heart className="w-4.5 h-4.5" />} label="Emergência" onClick={onClose} />
            
            {/* Botão de logout estilo iOS */}
            {user && (
              <div className="mt-3 mb-5 px-2">
                <button
                  className="w-full flex items-center justify-center text-center px-3 py-2.5 rounded-xl bg-red-50 text-red-600 font-medium transition-all duration-200 active:scale-98 active:opacity-90"
                  onClick={handleLogout}
                  style={{
                    fontFamily: "var(--ios-system-font)",
                    WebkitTapHighlightColor: "transparent",
                    fontWeight: 500,
                    fontSize: "14px",
                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.08)"
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Sair da Conta</span>
                </button>
                <p className="text-center text-xs text-slate-400 mt-1.5" style={{ fontSize: "10px" }}>
                  Seus dados permanecerão seguros
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// Componente para título de seção do menu
function MenuSection({ label }: { label: string }) {
  return (
    <div 
      className="pt-1 pb-0.5 px-2 mb-0.5 text-xs font-medium text-slate-500/90"
      style={{
        fontFamily: "var(--ios-system-font)",
        letterSpacing: "0.01em",
        fontSize: "10.5px",
        textTransform: "none",
        fontWeight: 500
      }}
    >
      {label}
    </div>
  );
}

// Componente para divisor do menu
function MenuDivider() {
  return (
    <div 
      className="border-t border-gray-100 my-1" 
      style={{ height: "1px" }} 
    />
  );
}

// Componente para item do menu simplificado
interface MenuItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function MenuItem({ href, icon, label, onClick }: MenuItemProps) {
  return (
    <a 
      href={href}
      className="w-full flex items-center justify-between px-3 py-1 rounded-xl mb-0.5 text-slate-700 hover:bg-slate-50/60 active:bg-slate-100/80 transition-colors"
      onClick={onClick}
      style={{
        fontFamily: "var(--ios-system-font)",
        WebkitTapHighlightColor: "transparent",
        cursor: "pointer",
        textDecoration: "none",
        fontSize: "14px", // Tamanho reduzido para economizar espaço
        fontWeight: 400,
        transition: "all 0.15s ease-out",
        letterSpacing: "-0.01em"
      }}
    >
      <div className="flex items-center">
        <span 
          className="flex items-center justify-center w-5 h-5 mr-2.5 text-slate-600"
          style={{ opacity: 0.85 }}
        >
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {/* Seta para a direita estilo iOS - mais sutil */}
      <span className="text-slate-400" style={{ fontSize: '11px', opacity: 0.7 }}>
        <svg width="5" height="10" viewBox="0 0 6 11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5.5L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </a>
  );
}