import React, { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  X,
  Home,
  Calendar,
  Book,
  MessageCircle,
  Settings, 
  Clock,
  Heart,
  BarChart3,
  User,
  Lightbulb,
  Brain,
  HelpCircle
} from 'lucide-react';
import { isIOS } from '@/lib/pwa-utils-simple';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

/**
 * Sidebar no estilo iOS com transições fluidas e design nativo
 */
const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, onClose, currentPath }) => {
  const [, setLocation] = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lógica para evitar o scroll no body enquanto a sidebar estiver aberta
  useEffect(() => {
    const handleBodyScroll = () => {
      if (isOpen) {
        document.body.classList.add('overflow-hidden');
      } else {
        document.body.classList.remove('overflow-hidden');
      }
    };

    handleBodyScroll();

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  // Adiciona efeito de escape para fechar a sidebar com esc
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Anima a entrada e saída da sidebar com efeitos iOS nativos
  useEffect(() => {
    if (!sidebarRef.current || !overlayRef.current) return;

    const sidebar = sidebarRef.current;
    const overlay = overlayRef.current;

    if (isOpen) {
      // Anima a entrada
      overlay.style.opacity = '0';
      sidebar.style.transform = 'translateX(-100%)';
      
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.style.transition = 'opacity 0.35s cubic-bezier(0.28, 0.8, 0.34, 1)';
        
        sidebar.style.transform = 'translateX(0)';
        sidebar.style.transition = 'transform 0.35s cubic-bezier(0.28, 0.8, 0.34, 1)';
      });
    } else {
      // Anima a saída
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.35s cubic-bezier(0.28, 0.8, 0.34, 1)';
      
      sidebar.style.transform = 'translateX(-100%)';
      sidebar.style.transition = 'transform 0.35s cubic-bezier(0.28, 0.8, 0.34, 1)';
    }
  }, [isOpen]);

  // Navegação para uma rota e fecha a sidebar
  const navigateTo = (path: string) => {
    setLocation(path);
    onClose();
  };

  const menuItems = [
    { path: '/', icon: <Home size={22} />, label: 'Início' },
    { path: '/emotional-state', icon: <Brain size={22} />, label: 'Estado Emocional' },
    { path: '/daily-tip', icon: <Lightbulb size={22} />, label: 'Ajuda do Dia' },
    { path: '/journal', icon: <Book size={22} />, label: 'Diário' },
    { path: '/assistant', icon: <MessageCircle size={22} />, label: 'Sana' },
    { path: '/schedule', icon: <Calendar size={22} />, label: 'Agendamento' },
    { path: '/self-help', icon: <HelpCircle size={22} />, label: 'Autoajuda' },
    { path: '/profile', icon: <User size={22} />, label: 'Perfil' },
    { path: '/settings', icon: <Settings size={22} />, label: 'Configurações' }
  ];

  // Verifica se é um dispositivo iOS para otimizações específicas
  const isIOSDevice = isIOS();

  return (
    <>
      {/* Overlay semitransparente */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu lateral */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-[280px] bg-white z-50 shadow-xl overflow-y-auto ${isIOSDevice ? 'pb-safe-bottom' : ''} ${isOpen ? 'block' : 'hidden'}`}
        style={{
          transform: 'translateX(-100%)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          paddingTop: 'env(safe-area-inset-top, 0px)'
        }}
      >
        {/* Cabeçalho do menu */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-slate-800">Menu</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links de navegação */}
        <nav className="p-2">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => navigateTo(item.path)}
                  className={`flex items-center w-full p-3 rounded-xl transition-colors ${
                    currentPath === item.path
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span className="text-[15px] font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Rodapé do menu */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-safe-bottom border-t border-gray-100 bg-white">
          <div className="text-sm text-center text-slate-500">
            MindWell &copy; 2025
          </div>
        </div>
      </div>
    </>
  );
};

export default AppSidebar;