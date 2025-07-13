import { useState, useEffect } from 'react';
import { isIOS, isRunningAsInstalledApp } from '@/lib/pwa-utils-simple';
import { ShareIcon, XCircleIcon, PlusCircleIcon, ArrowRightCircleIcon } from 'lucide-react';

/**
 * Componente de banner que instrui usuários iOS sobre como instalar o PWA na tela inicial
 */
export function IOSInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    // Verifica se é iOS e não está rodando como aplicativo instalado
    const shouldShow = isIOS() && !isRunningAsInstalledApp();
    
    // Verifica se já ignoramos o banner antes
    const bannerDismissed = localStorage.getItem('ios-install-banner-dismissed');
    
    if (shouldShow && !bannerDismissed) {
      // Atrasa a exibição do banner para não atrapalhar o carregamento inicial
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Fecha o banner e registra para não mostrar novamente
  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('ios-install-banner-dismissed', 'true');
  };
  
  // Fecha o banner temporariamente (mostrará novamente na próxima visita)
  const closeBanner = () => {
    setShowBanner(false);
  };
  
  if (!showBanner) {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 animate-in fade-in slide-in-from-bottom">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-4 mx-auto max-w-md border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">Instale na Tela Inicial</h3>
          <button 
            onClick={closeBanner}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Fechar"
          >
            <XCircleIcon size={24} />
          </button>
        </div>
        
        <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">
          Instale este aplicativo na sua tela inicial para uma experiência completa:
        </p>
        
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 dark:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center">
              <div className="text-primary">1</div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm">Toque no ícone <ShareIcon size={18} className="inline text-primary" /></p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 dark:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center">
              <div className="text-primary">2</div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm">Role e toque em "Adicionar à Tela de Início" <PlusCircleIcon size={18} className="inline text-primary" /></p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 dark:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center">
              <div className="text-primary">3</div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm">Toque em "Adicionar" <ArrowRightCircleIcon size={18} className="inline text-primary" /></p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between gap-3">
          <button
            onClick={dismissBanner}
            className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Não mostrar novamente
          </button>
          <button
            onClick={closeBanner}
            className="flex-1 py-2 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}