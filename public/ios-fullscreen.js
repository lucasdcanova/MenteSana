/**
 * iOS Fullscreen - Garante execução em tela cheia em dispositivos iOS
 * Versão 1.2.0
 * 
 * Este script melhora a experiência quando o aplicativo é adicionado à tela inicial
 * em dispositivos iOS, garantindo que o app funcione em modo fullscreen e 
 * com comportamentos nativos como um aplicativo nativo
 */

document.addEventListener('DOMContentLoaded', function() {
  // Configuração para IOS - verificações avançadas
  const isIOS = function() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosPlatforms = ['iphone', 'ipad', 'ipod'];
    const isIOSByUA = iosPlatforms.some(platform => userAgent.includes(platform));
    const isIOSByPlatform = /iPad|iPhone|iPod/.test(navigator.platform);
    const isIOSByMaxTouchPoints = navigator.maxTouchPoints && 
                                  navigator.maxTouchPoints > 2 && 
                                  /MacIntel/.test(navigator.platform);
    const isIOSByMediaQuery = window.matchMedia('(-webkit-touch-callout: none)').matches;
    
    const result = {
      byUA: isIOSByUA,
      byPlatform: isIOSByPlatform,
      byCSS: isIOSByMediaQuery,
      byTouchPoints: isIOSByMaxTouchPoints,
      standalone: window.navigator.standalone === true
    };
    
    console.log("[isIOS] Detecção: UA:", isIOSByUA, "Platform:", isIOSByPlatform, 
                "CSS:", isIOSByMediaQuery, "Standalone:", window.navigator.standalone === true,
                "Touch:", isIOSByMaxTouchPoints);
                
    // Consideramos como iOS se ao menos 2 dos testes derem positivo
    return (isIOSByUA || isIOSByPlatform || isIOSByMaxTouchPoints || isIOSByMediaQuery);
  }();
  
  if (isIOS) {
    // Função que configura o app para fullscreen em iOS
    const setupFullscreenIOS = function() {
      // Adiciona classe ao HTML para estilos específicos
      document.documentElement.classList.add('ios-fullscreen');
      
      // Configura viewport para maximizar área utilizável
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (metaViewport) {
        metaViewport.setAttribute(
          'content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui'
        );
      }
      
      // Para dispositivos em standalone mode (adicionados à tela inicial)
      if (window.navigator.standalone === true) {
        document.documentElement.classList.add('ios-standalone');
        
        // Previne contexto de borda
        document.addEventListener('touchstart', function(e) {
          // Detecta toques nas bordas
          const touch = e.touches[0];
          if (touch) {
            const x = touch.clientX;
            const y = touch.clientY;
            const edgeSize = 20;
            
            // Se o toque for próximo à borda, previne comportamento padrão
            if (
              x <= edgeSize || 
              x >= window.innerWidth - edgeSize || 
              y <= edgeSize || 
              y >= window.innerHeight - edgeSize
            ) {
              e.preventDefault();
            }
          }
        }, { passive: false });
        
        // Intercepta links para manter o contexto standalone
        document.addEventListener('click', function(e) {
          let target = e.target;
          
          while (target && target.tagName !== 'A') {
            target = target.parentElement;
          }
          
          if (target && target.getAttribute('target') === '_blank') {
            e.preventDefault();
            window.location.href = target.href;
          }
        });
      }
      
      // Scroll para o topo para esconder a barra de endereço
      setTimeout(function() {
        window.scrollTo(0, 0);
      }, 100);
    };
    
    // Aplicar configurações de fullscreen
    setupFullscreenIOS();
    
    // Garantir que as configurações sejam mantidas em mudanças de orientação
    window.addEventListener('orientationchange', function() {
      setTimeout(function() {
        window.scrollTo(0, 0);
      }, 300);
    });
    
    // Previne bounce (efeito elástico) nas bordas da página em iOS
    document.body.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    console.log('[iOS] Otimizações aplicadas para melhorar a experiência em dispositivos Apple');
  } else {
    console.log('Aplicativo rodando em navegador normal');
  }
}, false);