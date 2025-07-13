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
  AlertCircle,
  AlertTriangle
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
        className="fixed top-0 left-0 h-full w-[90%] max-w-[340px] bg-white shadow-xl overflow-y-auto"
        style={{
          borderTopRightRadius: "20px",
          borderBottomRightRadius: "20px",
          WebkitBackfaceVisibility: "hidden",
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
          transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1.0)",
          height: '100dvh', // Altura dinâmica para viewport móvel
          WebkitOverflowScrolling: 'touch' // Rolagem suave em iOS
        }}
      >
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
          <X className="w-4.5 h-4.5 text-gray-600" strokeWidth={2.5} />
        </button>

        {/* Cabeçalho do menu estilo iOS */}
        <div 
          className="relative px-5 pt-16 pb-5 border-b border-gray-100/70"
          style={{
            borderTopRightRadius: "20px",
            background: "linear-gradient(180deg, rgba(249,250,251,0.9) 0%, rgba(255,255,255,0.95) 100%)"
          }}
        >
          {user ? (
            <div className="flex items-center">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-lg"
                style={{
                  boxShadow: "0 2px 10px rgba(var(--ios-primary-rgb), 0.08)",
                  border: "2px solid rgba(var(--ios-primary-rgb), 0.15)",
                  WebkitBackdropFilter: "blur(4px)"
                }}
              >
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
              <div className="ml-3.5">
                <h3 
                  className="font-semibold text-[17px] text-slate-800"
                  style={{
                    fontFamily: "var(--ios-display-font)",
                    letterSpacing: "-0.01em",
                    fontWeight: 600
                  }}
                >
                  {user.firstName} {user.lastName}
                </h3>
                <p 
                  className="text-xs text-slate-500 mt-0.5"
                  style={{
                    fontFamily: "var(--ios-system-font)",
                    fontSize: "13px",
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
                className="font-semibold text-xl text-slate-800 mb-3"
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
                  className="ios-button py-2.5 px-7 rounded-full text-white text-sm font-medium active:scale-98 active:opacity-90 transition-all duration-150"
                  style={{
                    boxShadow: "0 2px 8px rgba(var(--ios-primary-rgb), 0.2)",
                    background: "linear-gradient(135deg, rgba(var(--ios-primary-rgb), 1), rgba(var(--ios-primary-rgb), 0.9))",
                    fontFamily: "var(--ios-system-font)",
                    WebkitTapHighlightColor: "transparent",
                    fontSize: "15px",
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
        
        {/* Itens do menu - sem rolagem, com altura automática */}
        <div className="py-2 overflow-visible">
          {/* Botão de Emergência removido daqui */}
        
          <div className="px-3">
            <div 
              className="pt-3 pb-2 px-2 mb-1 text-xs font-medium text-slate-500/90"
              style={{
                fontFamily: "var(--ios-system-font)",
                letterSpacing: "0.01em",
                fontSize: "12px",
                textTransform: "none",
                fontWeight: 500
              }}
            >
              Principal
            </div>
            
            <MenuItem 
              href="/" 
              icon={<Home className="w-5 h-5" />} 
              label="Início" 
              onClick={onClose}
            />
            
            <MenuItem 
              href="/journal" 
              icon={<BookOpen className="w-5 h-5" />} 
              label="Diário Pessoal" 
              onClick={onClose}
            />
            
            <MenuItem 
              href="/assistant" 
              icon={<MessageSquare className="w-5 h-5" />} 
              label="Assistente Virtual" 
              onClick={onClose}
            />
          </div>
          
          <div 
            className="border-t border-gray-100 my-2" 
            style={{ height: "1px" }} 
          />
          
          <div className="px-3">
            <div 
              className="pt-3 pb-2 px-2 mb-1 text-xs font-medium text-slate-500/90"
              style={{
                fontFamily: "var(--ios-system-font)",
                letterSpacing: "0.01em",
                fontSize: "12px",
                textTransform: "none",
                fontWeight: 500
              }}
            >
              Comunidade
            </div>
            
            <MenuItem 
              href="/support-groups" 
              icon={<Users className="w-5 h-5" />} 
              label="Grupos de Apoio" 
              onClick={onClose}
            />
            
            {user && !user.isTherapist && (
              <MenuItem 
                href="/therapists" 
                icon={<User className="w-5 h-5" />} 
                label="Terapeutas" 
                onClick={onClose}
              />
            )}
            
            <MenuItem 
              href="/schedule" 
              icon={<Calendar className="w-5 h-5" />} 
              label="Agenda" 
              onClick={onClose}
            />
            
            <MenuItem 
              href="/emergency" 
              icon={<AlertCircle className="w-5 h-5" />} 
              label="Emergência" 
              onClick={onClose}
            />
            
            {user && user.isTherapist && (
              <MenuItem 
                href="/therapist-dashboard" 
                icon={<Activity className="w-5 h-5" />} 
                label="Dashboard do Terapeuta" 
                onClick={onClose}
              />
            )}
          </div>
          
          <div 
            className="border-t border-gray-100 my-2" 
            style={{ height: "1px" }} 
          />
          
          <div className="px-3">
            <div 
              className="pt-3 pb-2 px-2 mb-1 text-xs font-medium text-slate-500/90"
              style={{
                fontFamily: "var(--ios-system-font)",
                letterSpacing: "0.01em",
                fontSize: "12px",
                textTransform: "none",
                fontWeight: 500
              }}
            >
              Configurações
            </div>
            
            {user && (
              <MenuItem 
                href="/profile" 
                icon={<User className="w-5 h-5" />} 
                label="Meu Perfil" 
                onClick={onClose}
              />
            )}
            
            <MenuItem 
              href="/notifications" 
              icon={<Bell className="w-5 h-5" />} 
              label="Notificações" 
              onClick={onClose}
            />
            
            <MenuItem 
              href="/settings" 
              icon={<Settings className="w-5 h-5" />} 
              label="Configurações" 
              onClick={onClose}
            />
            
            <MenuItem 
              href="/appearance" 
              icon={<Moon className="w-5 h-5" />} 
              label="Aparência" 
              onClick={onClose}
            />
          </div>
          
          <div 
            className="border-t border-gray-100 my-2" 
            style={{ height: "1px" }} 
          />
          
          <div className="px-3">
            <div 
              className="pt-3 pb-2 px-2 mb-1 text-xs font-medium text-slate-500/90"
              style={{
                fontFamily: "var(--ios-system-font)",
                letterSpacing: "0.01em",
                fontSize: "12px",
                textTransform: "none",
                fontWeight: 500
              }}
            >
              Suporte
            </div>
            
            <MenuItem 
              href="/help" 
              icon={<HelpCircle className="w-5 h-5" />} 
              label="Ajuda e Suporte" 
              onClick={onClose}
            />
            
            {/* Item presente apenas para navegação no menu de suporte, o botão principal está no topo */}
            <MenuItem 
              href="/emergency" 
              icon={<AlertTriangle className="w-5 h-5" />} 
              label="Emergência" 
              onClick={onClose}
            />
            
            {/* Botão de logout estilo iOS */}
            {user && (
              <div className="px-2 py-2 mt-6">
                <button
                  className="w-full flex items-center justify-center text-center px-4 py-3.5 rounded-xl bg-red-50 text-red-600 font-medium transition-all duration-200 active:scale-98 active:opacity-90"
                  onClick={handleLogout}
                  style={{
                    fontFamily: "var(--ios-system-font)",
                    WebkitTapHighlightColor: "transparent",
                    fontWeight: 500,
                    fontSize: "15px",
                    boxShadow: "0 2px 12px rgba(239, 68, 68, 0.12)"
                  }}
                >
                  <LogOut className="w-5 h-5 mr-2.5" />
                  <span>Sair da Conta</span>
                </button>
                {/* Dica típica do iOS abaixo de botões importantes */}
                <p className="text-center text-xs text-slate-400 mt-2.5" style={{ fontSize: "11px" }}>
                  Todos os seus dados permanecerão seguros
                </p>
              </div>
            )}
            
            {/* Espaço adicional no final para rolagem completa */}
            <div className="h-16"></div>
          </div>
        </div>
      </div>
    </div>
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
      className="w-full flex items-center justify-between px-3 py-2 rounded-xl mb-0.5 text-slate-700 hover:bg-slate-50/60 active:bg-slate-100/80 transition-colors"
      onClick={onClick}
      style={{
        fontFamily: "var(--ios-system-font)",
        WebkitTapHighlightColor: "transparent",
        cursor: "pointer",
        textDecoration: "none",
        fontSize: "15px", // Tamanho ajustado para economizar espaço
        fontWeight: 400,
        transition: "all 0.15s ease-out",
        letterSpacing: "-0.01em" // Leve ajuste no espaçamento de letras
      }}
    >
      <div className="flex items-center">
        <span 
          className="flex items-center justify-center w-7 h-7 mr-3.5 text-slate-600"
          style={{ opacity: 0.85 }} // Sutil ajuste de opacidade para ícones
        >
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {/* Seta para a direita estilo iOS - mais sutil */}
      <span className="text-slate-400" style={{ fontSize: '13px', opacity: 0.7 }}>
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </a>
  );
}