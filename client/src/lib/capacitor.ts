/**
 * Capacitor API Wrapper
 * 
 * Este arquivo fornece uma camada de abstração para as APIs do Capacitor, permitindo:
 * 1. Detecção do ambiente (nativo vs. web)
 * 2. APIs alternativas para quando o app está rodando na web
 * 3. Uma interface unificada para ambos ambientes
 */

import { App as CapApp } from '@capacitor/app';
import { Preferences as CapPreferences } from '@capacitor/preferences';

// Detecta se o app está rodando em ambiente capacitor nativo
export const isNativeApp = () => {
  const isCapacitorDefined = typeof (window as any).Capacitor !== 'undefined';
  return isCapacitorDefined && (window as any).Capacitor.isNative;
};

// Detecta se o app está rodando em dispositivo iOS
export const isIOS = () => {
  if (!isNativeApp()) return false;
  return (window as any).Capacitor.getPlatform() === 'ios';
};

// Serviço de Armazenamento de Dados
export const Storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isNativeApp()) {
      await CapPreferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (isNativeApp()) {
      const { value } = await CapPreferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isNativeApp()) {
      await CapPreferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  async clear(): Promise<void> {
    if (isNativeApp()) {
      await CapPreferences.clear();
    } else {
      localStorage.clear();
    }
  }
};

// Serviço de Aplicativo
export const App = {
  addListener(eventName: string, callback: Function): void {
    if (isNativeApp()) {
      if (eventName === 'backButton') {
        CapApp.addListener('backButton', () => {
          callback();
        });
      } else if (eventName === 'appStateChange') {
        CapApp.addListener('appStateChange', (state) => {
          callback(state);
        });
      }
    } else {
      // Implementação web para eventos do app
      if (eventName === 'backButton') {
        window.addEventListener('popstate', () => {
          callback();
        });
      }
      // Implementação web para appStateChange
      if (eventName === 'appStateChange') {
        document.addEventListener('visibilitychange', () => {
          callback({
            isActive: !document.hidden
          });
        });
      }
    }
  },

  // Gerencia configurações específicas para iOS
  applyIOSSettings(): void {
    if (isIOS()) {
      // Evitar zoom em inputs em iOS
      const viewportMetaTag = document.querySelector('meta[name="viewport"]');
      if (viewportMetaTag) {
        viewportMetaTag.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }

      // Adicionar classe ios ao body para estilos específicos
      document.body.classList.add('ios-app');
    }
  },

  // Configurações para o app ser executado em tela cheia
  setupFullscreenApp(): void {
    if (isIOS()) {
      // Ocultar statusbar em iOS
      try {
        if ((window as any).StatusBar) {
          (window as any).StatusBar.hide();
        }
      } catch (e) {
        console.log('Erro ao ocultar statusbar:', e);
      }

      // Evitar que o teclado empurre o viewport para cima
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          // Ajustar scroll quando o teclado aparecer
          setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
          }, 300);
        });
      });
    }
  }
};

// Inicializar configurações do app nativo
export function initializeCapacitorApp() {
  if (isNativeApp()) {
    App.applyIOSSettings();
    App.setupFullscreenApp();
    
    // Adicionar ouvintes para eventos do app
    App.addListener('appStateChange', (state: { isActive: boolean }) => {
      console.log('App state changed:', state.isActive ? 'foreground' : 'background');
    });
  }
}