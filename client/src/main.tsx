import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/ios-touch-fix.css"; // Importando nosso novo CSS com fixes para problemas de touch
import { setupWebApp, isRunningAsInstalledApp, isIOS as isPWAIOS } from "./lib/pwa-utils-simple";
import { isNativeApp, isIOS as isCapacitorIOS, initializeCapacitorApp } from "./lib/capacitor";
// Importa i18n (inicializa tradução)
import "./i18n";

// Função para calcular corretamente a altura da viewport em dispositivos móveis
function setVhVariable() {
  // Obtém a altura atual da viewport
  const vh = window.innerHeight * 0.01;
  // Define a propriedade personalizada --vh que pode ser usada em CSS
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Função para verificar se estamos em iOS (tanto nativo quanto web)
function isIOS() {
  return isCapacitorIOS() || isPWAIOS();
}

// Função para lidar com ajustes de tela específicos em iOS
function handleIOSSpecifics() {
  // Utiliza a função isIOS que verifica tanto Capacitor quanto PWA
  const isiOSDevice = isIOS();
  
  if (isiOSDevice) {
    // Adiciona classe específica para iOS no body
    document.body.classList.add('ios-device');
    
    // Detecta navegação de tela cheia em iOS para ajustar altura
    const isInStandaloneMode = isRunningAsInstalledApp();
    
    if (isInStandaloneMode) {
      document.body.classList.add('ios-standalone');
    }
    
    // Evita comportamento de sobrescroll em iOS
    document.body.style.overscrollBehavior = 'none';
    
    // Para dispositivos iOS: recalcula quando o teclado aparece/desaparece
    window.addEventListener('focusin', () => {
      // Um pequeno atraso para garantir que o navegador terminou de ajustar o viewport
      setTimeout(setVhVariable, 100);
    });
    
    window.addEventListener('focusout', () => {
      // Um pequeno atraso para garantir que o navegador terminou de ajustar o viewport
      setTimeout(setVhVariable, 100);
    });
    
    // Fix para o problema de viewport em iOS quando o teclado aparece
    window.addEventListener('keyboardDidShow', () => {
      document.body.classList.add('keyboard-visible');
      setTimeout(setVhVariable, 100);
    });
    
    window.addEventListener('keyboardDidHide', () => {
      document.body.classList.remove('keyboard-visible');
      setTimeout(setVhVariable, 100);
    });
  }
}

// Função para melhorar a experiência de rolagem em dispositivos móveis
function enhanceMobileScrolling() {
  // Observa elementos com a classe scrollable-content
  const scrollElements = document.querySelectorAll('.scrollable-content, .fixed-height-container, .mobile-scroll-container');
  
  scrollElements.forEach(element => {
    element.addEventListener('touchstart', () => {
      element.classList.add('active-scroll');
    }, { passive: true });
    
    element.addEventListener('touchend', () => {
      element.classList.remove('active-scroll');
    }, { passive: true });
  });
}

// Função para corrigir problemas específicos de toque nas páginas de Ajuda do Dia e Estado Emocional em iOS
function fixIOSTouchProblems() {
  // Identifica se estamos em uma das páginas problemáticas
  const isEmotionalStatePage = window.location.pathname.includes('emotional-state');
  const isDailyTipPage = window.location.pathname.includes('daily-tip');
  
  if ((isEmotionalStatePage || isDailyTipPage) && isIOS()) {
    // Adiciona classe ios-touch-fix globalmente
    document.body.classList.add('ios-touch-fix');
    
    // Aplica a classe em todos os elementos clicáveis dentro dessas páginas para garantir que respondam ao toque
    const clickableElements = document.querySelectorAll('button, a, [role="button"], [role="tab"], input, select, .rounded-full, .rounded-lg');
    clickableElements.forEach(element => {
      element.classList.add('ios-touch-fix');
      
      // Duplica eventos de toque para garantir que eles sejam capturados
      element.addEventListener('touchstart', (e) => {
        // Impede propagação para evitar conflitos
        e.stopPropagation();
      }, { passive: false });
      
      // Adiciona eventos de click como fallback
      element.addEventListener('click', (e) => {
        // Tenta garantir que o evento de clique seja processado
        e.stopPropagation();
      }, { passive: false });
    });
    
    // Corrigir containers de scroll
    const scrollContainers = document.querySelectorAll('.scroll-container-absolute, .ios-momentum-scroll, .ios-native-scroll-container');
    scrollContainers.forEach(container => {
      container.classList.add('ios-touch-fix');
    });
    
    console.log('Aplicadas correções de toque para iOS nas páginas de Ajuda do Dia e Estado Emocional');
  }
}

// Define a altura inicial
setVhVariable();
// Configuração iOS específica
setTimeout(handleIOSSpecifics, 0);

// Inicializar configurações específicas dependendo do ambiente
if (isNativeApp()) {
  // Inicializa o app nativo com Capacitor
  console.log("[Capacitor] Inicializando aplicativo nativo");
  document.body.classList.add('native-app');
  initializeCapacitorApp();
} else {
  // Configurar o aplicativo como web app standalone (PWA)
  console.log("[PWA] Inicializando aplicativo web");
  setupWebApp();
}

// Recalcula quando a janela for redimensionada ou a orientação mudar
window.addEventListener('resize', setVhVariable);
window.addEventListener('orientationchange', () => {
  // Delay para garantir que a orientação tenha sido completamente alterada
  setTimeout(setVhVariable, 100);
});

// Evento para melhorar scrolling após carregamento da página
window.addEventListener('DOMContentLoaded', () => {
  setVhVariable();
  enhanceMobileScrolling();
  // Aplicar correções de touch
  fixIOSTouchProblems();
});

window.addEventListener('load', () => {
  setVhVariable();
  enhanceMobileScrolling();
  // Aplicar correções de touch novamente após carregamento completo
  fixIOSTouchProblems();
});

// Observer para monitorar mudanças de URL e aplicar correções quando necessário
let lastUrl = window.location.href;
// Criar um observador para mudanças no corpo do documento (indicando navegação)
const observer = new MutationObserver(() => {
  if (lastUrl !== window.location.href) {
    lastUrl = window.location.href;
    // Aplicar correções quando a URL mudar (navegação entre páginas)
    setTimeout(fixIOSTouchProblems, 300);
  }
});

// Iniciar observação de mudanças no DOM que podem indicar navegação
observer.observe(document.body, { childList: true, subtree: true });

// Também verificar quando há mudanças no histórico (navegação)
window.addEventListener('popstate', () => {
  // Aplicar correções quando o usuário navegar pelo histórico
  setTimeout(fixIOSTouchProblems, 300);
});

createRoot(document.getElementById("root")!).render(
  <App />
);
