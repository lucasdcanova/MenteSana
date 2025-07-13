import React, { ReactNode, useState, useEffect, Suspense } from 'react';
import { AppHeader } from './app-header';
import { useAuth } from '@/hooks/use-auth';

// Importação manual adaptada do sidebar
import { Link } from 'wouter';
import { 
  Home, Settings, Calendar, FileText, 
  Heart, Activity, MessageCircle, 
  LogOut, HelpCircle, UserCircle,
  ClipboardList, Users, BarChart, ClipboardCheck
} from 'lucide-react';

function SimpleAppSidebar({ isOpen, onClose, currentPath }: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentPath: string; 
}) {
  const { logoutMutation, user } = useAuth();
  
  if (!isOpen) return null;

  // Certificar-se de que o body tem overflow:hidden quando o menu está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }

    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [isOpen]);

  // Menu para terapeutas
  const therapistMenuItems = [
    { name: 'Início', icon: <Home size={20} />, path: '/' },
    { name: 'Minha Agenda', icon: <ClipboardCheck size={20} />, path: '/schedule' },
    { name: 'Gerenciar Disponibilidade', icon: <Calendar size={20} />, path: '/therapist-availability' },
    { name: 'Meus Pacientes', icon: <Users size={20} />, path: '/therapist-patients' },
    { name: 'Relatórios', icon: <BarChart size={20} />, path: '/therapist-analytics' },
    { name: 'Grupos de Apoio', icon: <Heart size={20} />, path: '/support-groups' },
    { name: 'Perfil', icon: <UserCircle size={20} />, path: '/therapist-profile' },
    { name: 'Configurações', icon: <Settings size={20} />, path: '/settings' },
  ];

  // Menu para pacientes (usuários normais)
  const patientMenuItems = [
    { name: 'Início', icon: <Home size={20} />, path: '/' },
    { name: 'Diário', icon: <FileText size={20} />, path: '/journal' },
    { name: 'Histórico do Diário', icon: <ClipboardList size={20} />, path: '/journal-history' },
    { name: 'Assistente', icon: <MessageCircle size={20} />, path: '/assistant' },
    { name: 'Estado Emocional', icon: <Activity size={20} />, path: '/emotional-state' },
    { name: 'Ajuda do Dia', icon: <HelpCircle size={20} />, path: '/daily-tip' },
    { name: 'Grupos de Apoio', icon: <Heart size={20} />, path: '/support-groups' },
    { name: 'Agendamentos', icon: <Calendar size={20} />, path: '/schedule' },
    { name: 'Perfil', icon: <UserCircle size={20} />, path: '/profile' },
    { name: 'Configurações', icon: <Settings size={20} />, path: '/settings' },
  ];
  
  // Seleciona qual menu mostrar com base no tipo de usuário
  const menuItems = user?.isTherapist ? therapistMenuItems : patientMenuItems;

  // Manipulador para fechar o menu com prevenção de propagação de eventos
  const handleClose = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/20 animate-fade-in ios-events-contained" 
      onClick={handleClose} 
      style={{pointerEvents: 'auto'}}
    >
      <div 
        className="fixed top-0 left-0 bottom-0 w-72 bg-white shadow-lg pt-safe-top overflow-y-auto hardware-accelerated ios-side-menu ios-scroll-fix"
        onClick={e => e.stopPropagation()}
        style={{ 
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'auto'
        }}
      >
        <div className="p-4 flex justify-between items-center border-b">
          <span className="font-semibold text-lg">MindWell</span>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>
        
        <div className="py-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                onClose();
                // Usar o Link do wouter em vez de manipular window.location diretamente
                // para evitar recarga completa da página
                window.history.pushState(null, '', item.path);
                // Disparar um evento de popstate para notificar o router sobre a mudança
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className={`flex items-center w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left
                ${currentPath === item.path ? 'text-primary font-medium bg-primary/5' : 'text-gray-700'}`}
            >
              <span className="mr-3">
                {item.icon}
              </span>
              {item.name}
              {item.path === '/emotional-state' && (
                <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-red-500"></span>
              )}
              {item.path === '/daily-tip' && (
                <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              )}
            </button>
          ))}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 border-t py-2 px-4 pb-safe-bottom bg-white">
          <button 
            className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors"
            onClick={() => {
              // Executar o logout
              logoutMutation.mutate(undefined, {
                onSuccess: () => {
                  // Fechar o menu
                  onClose();
                  // Redirecionar para a página de login
                  window.location.href = '/auth';
                }
              });
            }}
          >
            <LogOut size={20} className="mr-3" />
            {logoutMutation.isPending ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </div>
    </div>
  );
}
import { IOSTouchWrapper } from '../ui/ios-touch-wrapper';
import { useLocation } from 'wouter';
import { isIOS } from '@/lib/pwa-utils-simple';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  className?: string;
  fullHeight?: boolean;
  enableTouchFix?: boolean;
}

/**
 * Layout principal do aplicativo que inclui cabeçalho e sidebar consistentes
 * Otimizado para iOS com animações de transição nativas
 */
const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  showBackButton = false,
  className = '',
  fullHeight = true,
  enableTouchFix = true
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const [previousLocation, setPreviousLocation] = useState('');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward' | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  
  // Efeito para detectar dispositivos iOS
  useEffect(() => {
    setIsIOSDevice(isIOS());
  }, []);
  
  // Efeito para detectar direção da transição com base na navegação
  useEffect(() => {
    if (previousLocation && location !== previousLocation) {
      const locationParts = location.split('/').filter(Boolean);
      const prevLocationParts = previousLocation.split('/').filter(Boolean);
      
      // Determina a direção com base na "profundidade" da navegação
      if (locationParts.length > prevLocationParts.length) {
        setTransitionDirection('forward');
      } else if (locationParts.length < prevLocationParts.length) {
        setTransitionDirection('backward');
      } else {
        // Se estiverem no mesmo nível, compara lexicograficamente
        setTransitionDirection('forward');
      }
      
      // Reseta a direção após um curto período para permitir a animação
      const resetTimer = setTimeout(() => {
        setTransitionDirection(null);
      }, 500);
      
      return () => clearTimeout(resetTimer);
    }
    
    setPreviousLocation(location);
    return undefined;
  }, [location, previousLocation]);
  
  // Função para manipular a abertura/fechamento da sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Função para fechar a sidebar
  const closeSidebar = () => {
    setSidebarOpen(false);
  };
  
  // Classes de animação baseadas na direção de transição
  const getAnimationClass = () => {
    if (!transitionDirection) return '';
    return transitionDirection === 'forward'
      ? 'animate-slide-in-right'
      : 'animate-slide-in-left';
  };
  
  const wrapWithTouchFix = (content: ReactNode) => {
    if (enableTouchFix && (isIOSDevice || enableTouchFix === true)) {
      return (
        <IOSTouchWrapper forceEnable={!isIOSDevice && enableTouchFix === true}>
          {content}
        </IOSTouchWrapper>
      );
    }
    return content;
  };

  return (
    <div 
      className={`app-layout w-full ${fullHeight ? 'min-h-screen' : ''} bg-background pb-safe-bottom`}
      data-ios={isIOSDevice ? 'true' : 'false'}
    >
      <AppHeader
        title={title}
        showBackButton={showBackButton}
        onMenuClick={toggleSidebar}
      />
      
      <SimpleAppSidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        currentPath={location}
      />
      
      <main 
        className={`page-container pt-16 ios-scroll ${getAnimationClass()} ${className}`}
        style={{
          minHeight: 'calc(100vh - 4rem)',
          willChange: transitionDirection ? 'transform' : 'auto',
          transition: 'transform 0.35s cubic-bezier(0.28, 0.8, 0.34, 1)'
        }}
      >
        {wrapWithTouchFix(children)}
      </main>
    </div>
  );
};

export default AppLayout;