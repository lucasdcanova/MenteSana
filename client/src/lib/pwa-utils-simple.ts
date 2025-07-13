/**
 * Utilitários simplificados para PWA (Progressive Web App)
 * Versão sem JSX para evitar erros de tipagem com TypeScript
 */

/**
 * Verifica se o navegador está rodando em um dispositivo iOS
 * Implementação avançada que detecta mesmo os dispositivos Apple mais recentes
 * @returns true se o navegador está rodando em iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Método 1: Verificação tradicional de User-Agent
  const userAgent = window.navigator.userAgent.toLowerCase();
  const uaCheck = /iphone|ipad|ipod|mac/.test(userAgent);
  
  // Método 2: Verificação de plataforma (inclui iPadOS disfarçado como desktop)
  const platformCheck = /iphone|ipad|ipod/.test(navigator.platform) || 
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Método 3: Verificação baseada em recursos específicos do iOS
  const cssCheck = 'WebkitAppearance' in document.documentElement.style && 
                   /apple/i.test(navigator.vendor);
  
  // Método 4: Verificação específica para PWA em iOS
  // @ts-ignore - Propriedade standalone existe em iOS
  const standaloneCheck = window.navigator.standalone !== undefined;
  
  // Método 5: Verificação do comportamento do touch
  const touchCheck = 'ontouchstart' in window && 
                     cssCheck && 
                     navigator.maxTouchPoints > 0;
                     
  // Log para depuração (remover em produção)
  console.debug('[isIOS] Detecção: UA:', uaCheck, 
                'Platform:', platformCheck, 
                'CSS:', cssCheck, 
                'Standalone:', standaloneCheck, 
                'Touch:', touchCheck);
                
  // Combinação dos resultados
  return uaCheck || platformCheck || (cssCheck && touchCheck) || standaloneCheck;
}

/**
 * Verifica se o app está rodando como um app instalado (modo standalone)
 * @returns true se estiver rodando como aplicativo instalado
 */
export function isRunningAsInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore - Propriedade standalone existe em navegadores iOS
    (window.navigator.standalone === true) ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Verifica se o navegador suporta recursos de PWA
 * @returns true se o navegador suporta PWA
 */
export function supportsServiceWorker(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Verifica o modo de exibição atual e atualiza classes no documento
 */
function checkDisplayMode(): void {
  if (isRunningAsInstalledApp()) {
    document.documentElement.classList.add('standalone-mode');
    document.documentElement.classList.remove('browser-mode');
    console.log('Aplicativo rodando em modo standalone (instalado)');
  } else {
    document.documentElement.classList.add('browser-mode');
    document.documentElement.classList.remove('standalone-mode');
    console.log('Aplicativo rodando em navegador normal');
  }
}

/**
 * Configura detector de mudanças no modo de exibição
 * Para identificar quando o aplicativo é aberto como PWA
 */
function setupDisplayModeDetection(): void {
  // Verifica estado inicial
  checkDisplayMode();
  
  // Monitora mudanças no modo de exibição
  window.matchMedia('(display-mode: standalone)').addEventListener('change', () => {
    checkDisplayMode();
  });
}

/**
 * Aplica otimizações específicas para iOS
 * Inclui melhorias para scroll, touch e interações
 */
function setupIOSOptimizations(): void {
  // Impede o comportamento de "bouncing" em iOS para elementos sem scroll
  document.addEventListener('touchmove', function (event: TouchEvent) {
    // Permite scroll em elementos com classe ios-scroll-fix
    const target = event.target as Element;
    if (target && !target.closest?.('.ios-scroll-fix') && !target.closest?.('.ios-touch-wrapper')) {
      event.preventDefault();
    }
  }, { passive: false });
  
  // Impede zoom em duplo-toque
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  // Impede atraso de 300ms no clique em iOS
  document.addEventListener('touchstart', function() {}, { passive: true });

  // Corrige problemas com elementos clicáveis em iOS
  const clickables = document.querySelectorAll('a, button, [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  clickables.forEach(element => {
    element.addEventListener('touchstart', function(e) {
      // Adiciona interatividade imediata
    }, { passive: true });
    
    // Adiciona cursor pointer para elementos clicáveis
    (element as HTMLElement).style.cursor = 'pointer';
  });

  // Detecta e corrige problemas com eventos de toque
  function fixTouchEvents() {
    document.querySelectorAll('.ios-touch-fix').forEach(el => {
      if (!(el as HTMLElement).dataset.iosTouchFixed) {
        el.addEventListener('touchstart', e => e.stopPropagation(), { passive: false });
        el.addEventListener('touchend', e => e.stopPropagation(), { passive: false });
        (el as HTMLElement).dataset.iosTouchFixed = 'true';
      }
    });
  }
  
  // Executa a correção periodicamente para capturar novos elementos
  fixTouchEvents();
  setInterval(fixTouchEvents, 2000);
  
  // Observa mudanças no DOM para aplicar correções em novos elementos
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        fixTouchEvents();
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Otimizações para barra de status e insets seguros em iOS
  // @ts-ignore - Ignorando erro de tipagem para navigator.standalone que existe em iOS
  if (window.navigator.standalone) {
    document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
    document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
    
    // Adiciona classe para controle via CSS
    document.documentElement.classList.add('ios-standalone');
  }
  
  // Desativa o comportamento de scroll de tela inteira
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  // Adiciona classe para reconhecer que as otimizações foram aplicadas
  document.documentElement.classList.add('ios-optimized');
  
  console.log('[iOS] Otimizações aplicadas para melhorar a experiência em dispositivos Apple');
}

/**
 * Configura o aplicativo web com recursos de PWA
 */
export function setupWebApp(): void {
  // Melhora a experiência de toque
  document.documentElement.style.setProperty('touch-action', 'manipulation');
  
  // Configura meta-tag de viewport para móveis
  let viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    viewportMeta.setAttribute('name', 'viewport');
    document.head.appendChild(viewportMeta);
  }
  
  viewportMeta.setAttribute(
    'content',
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
  );
  
  // Registra service worker se disponível
  if (supportsServiceWorker()) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker registrado com sucesso:', registration);
          
          // Configura detecção de atualização
          setupUpdateDetection(registration);
        })
        .catch(error => {
          console.log('Falha ao registrar o Service Worker:', error);
        });
    });
  }
  
  // Configurações para prevenir comportamentos indesejados em iOS
  if (isIOS()) {
    // Desativar zoom de texto em duplo toque
    document.documentElement.style.setProperty('-webkit-text-size-adjust', '100%');
    
    // Evitar que o navegador interprete números de telefone como links
    let telephoneMeta = document.querySelector('meta[name="format-detection"]');
    if (!telephoneMeta) {
      telephoneMeta = document.createElement('meta');
      telephoneMeta.setAttribute('name', 'format-detection');
      document.head.appendChild(telephoneMeta);
    }
    telephoneMeta.setAttribute('content', 'telephone=no,email=no,address=no,date=no');
    
    // Aplicar otimizações adicionais para iOS
    setupIOSOptimizations();
  }
  
  // Configura a detecção de modo standalone (PWA instalado)
  setupDisplayModeDetection();
}

/**
 * Configura a detecção de atualizações do PWA
 * @param registration Registro do service worker
 */
function setupUpdateDetection(registration: ServiceWorkerRegistration): void {
  // Verifica se já tem uma atualização esperando
  if (registration.waiting) {
    notifyUserOfUpdate(registration);
    return;
  }

  // Ouve por novas atualizações
  registration.addEventListener('updatefound', () => {
    if (registration.installing) {
      const newWorker = registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        // Quando o novo service worker terminar de instalar e estiver esperando ativação
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          notifyUserOfUpdate(registration);
        }
      });
    }
  });
  
  // Atualiza a página quando o controle é assumido por um novo service worker
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

/**
 * Notifica o usuário sobre atualização disponível
 * @param registration Registro do service worker
 */
function notifyUserOfUpdate(registration: ServiceWorkerRegistration): void {
  // Cria um elemento de notificação simples (para não depender de componentes de UI)
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = '#2a6451';
  notification.style.color = 'white';
  notification.style.padding = '12px 24px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  notification.style.zIndex = '9999';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.justifyContent = 'space-between';
  notification.style.gap = '16px';
  notification.style.maxWidth = '90%';
  notification.style.width = '420px';

  // Texto da notificação
  const message = document.createElement('div');
  message.textContent = 'Nova versão disponível. Atualize para obter as últimas melhorias.';
  notification.appendChild(message);

  // Botão de atualização
  const updateButton = document.createElement('button');
  updateButton.textContent = 'Atualizar';
  updateButton.style.backgroundColor = 'white';
  updateButton.style.color = '#2a6451';
  updateButton.style.border = 'none';
  updateButton.style.padding = '8px 16px';
  updateButton.style.borderRadius = '4px';
  updateButton.style.fontWeight = 'bold';
  updateButton.style.cursor = 'pointer';
  
  // Ação do botão
  updateButton.addEventListener('click', () => {
    if (registration.waiting) {
      // Envia mensagem para ativar o novo service worker
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    notification.remove();
  });
  
  notification.appendChild(updateButton);
  document.body.appendChild(notification);
  
  // Remove a notificação após 30 segundos
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.remove();
    }
  }, 30000);
}
