/**
 * Utilitários para PWA (Progressive Web App)
 */

import { toast } from "@/hooks/use-toast";

/**
 * Interface para configuração da instação de PWA
 */
interface PWAInstallConfig {
  appName: string;
  promptTitle?: string;
  promptDescription?: string;
  installButtonText?: string;
  cancelButtonText?: string;
}

/**
 * Evento de instalação de PWA do navegador
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Variável para armazenar o evento de instalação
let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Inicializa o PWA e configura os eventos relacionados
 */
export function initPWA(config: PWAInstallConfig) {
  const {
    appName,
    promptTitle = "Instalar Aplicativo",
    promptDescription = "Instale nossa aplicação para acessar mais rápido e usar offline.",
    installButtonText = "Instalar Agora",
    cancelButtonText = "Mais Tarde"
  } = config;
  
  // Detecta quando o aplicativo pode ser instalado
  window.addEventListener('beforeinstallprompt', (e) => {
    // Impedir que o mini-infobar apareça no mobile
    e.preventDefault();
    // Armazenar o evento para ser usado posteriormente
    deferredPrompt = e as BeforeInstallPromptEvent;
    
    console.log("PWA: Aplicativo pode ser instalado");
    
    // Mostrar o tooltip personalizado após um pequeno delay
    setTimeout(() => {
      // Mostrar toast simples
      toast({
        title: promptTitle,
        description: promptDescription,
        duration: 10000, // 10 segundos
      });
      
      // Mostrar outro toast para a opção de instalação
      setTimeout(() => {
        toast({
          title: "Deseja instalar agora?",
          action: {
            label: installButtonText,
            onClick: () => promptPWAInstall(appName)
          },
          duration: 5000,
        });
      }, 500);
    }, 3000);
  });
  
  // Detecta quando o PWA é instalado
  window.addEventListener('appinstalled', () => {
    console.log("PWA: Aplicativo instalado com sucesso");
    deferredPrompt = null;
    
    toast({
      title: "Aplicativo Instalado",
      description: `${appName} foi instalado com sucesso. Obrigado!`,
    });
  });
  
  // Detecta quando o aplicativo é aberto a partir do ícone da tela inicial
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log("PWA: Aplicativo está em modo standalone");
    // Poderíamos fazer algo especial quando o app é aberto no modo standalone
  }
}

/**
 * Verifica se o aplicativo pode ser instalado como PWA
 * @returns true se o aplicativo pode ser instalado
 */
export function canInstallPWA(): boolean {
  return !!deferredPrompt;
}

/**
 * Solicita a instalação do PWA se disponível
 * @param appName Nome do aplicativo para mensagem de sucesso
 * @returns Promessa que resolve para true se instalado, false se cancelado
 */
export async function promptPWAInstall(appName: string): Promise<boolean> {
  if (!deferredPrompt) {
    console.log("PWA: Não é possível instalar no momento");
    return false;
  }
  
  try {
    // Mostrar o prompt de instalação do navegador
    await deferredPrompt.prompt();
    
    // Esperar pela escolha do usuário
    const choiceResult = await deferredPrompt.userChoice;
    
    // Resetar a variável deferredPrompt
    deferredPrompt = null;
    
    if (choiceResult.outcome === 'accepted') {
      console.log("PWA: Usuário aceitou a instalação");
      toast({
        title: "Instalando Aplicativo",
        description: `${appName} está sendo instalado no seu dispositivo.`,
      });
      return true;
    } else {
      console.log("PWA: Usuário recusou a instalação");
      return false;
    }
  } catch (error) {
    console.error("PWA: Erro ao tentar instalar", error);
    toast({
      title: "Erro na Instalação",
      description: "Não foi possível instalar o aplicativo. Tente novamente mais tarde.",
      variant: "destructive",
    });
    return false;
  }
}

/**
 * Verifica se o navegador está online ou offline
 * @returns true se o navegador estiver online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Configura eventos de detecção de estado online/offline
 * @param onOnline Callback para quando ficar online
 * @param onOffline Callback para quando ficar offline
 * @returns Função para remover os listeners
 */
export function setupConnectivityListeners(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  const handleOnline = () => {
    console.log("Conexão restaurada");
    toast({
      title: "Conexão Restaurada",
      description: "Você está online novamente.",
    });
    onOnline?.();
  };
  
  const handleOffline = () => {
    console.log("Sem conexão");
    toast({
      title: "Sem Conexão",
      description: "Você está offline. Algumas funcionalidades podem estar limitadas.",
      variant: "destructive",
      duration: 5000,
    });
    onOffline?.();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Retornar função para remover os listeners
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}