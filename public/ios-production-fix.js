/**
 * iOS Production Fix - Correções específicas para dispositivos Apple em produção
 * Este script é carregado o mais cedo possível para garantir compatibilidade total
 * Versão 1.0.2
 */

(function() {
  // Detecta se estamos em um dispositivo iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    // Adiciona classe ao HTML para estilos específicos de iOS
    document.documentElement.classList.add('ios');
    
    // Previne comportamentos indesejados de scroll/bounce em iOS
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // Força altura completa em iOS para evitar problemas com barra de endereço
    function fixIOSHeight() {
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      
      // Um pequeno atraso para garantir que a altura seja aplicada após a renderização
      setTimeout(function() {
        window.scrollTo(0, 0);
      }, 300);
    }
    
    // Aplica imediatamente e em cada mudança de orientação
    fixIOSHeight();
    window.addEventListener('orientationchange', fixIOSHeight);
    
    // Verifica se está em modo standalone (PWA instalado)
    if (window.navigator.standalone === true) {
      document.documentElement.classList.add('ios-standalone');
      
      // Configurações adicionais para modo standalone
      const links = document.getElementsByTagName('a');
      for (let i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function(e) {
          e.preventDefault();
          window.location.href = this.href;
        });
      }
    }
    
    // Força viewport específica para iOS
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui';
    }
    
    console.log('[iOS] Otimizações aplicadas para melhorar a experiência em dispositivos Apple');
  }
})();