import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR';
import enUS from './locales/en-US';

// Os recursos de tradução
const resources = {
  'pt-BR': {
    translation: ptBR
  },
  'en-US': {
    translation: enUS
  }
};

i18n
  // Detecta o idioma do navegador
  .use(LanguageDetector)
  // Passa o i18n para react-i18next
  .use(initReactI18next)
  // Inicializa i18next
  .init({
    resources,
    fallbackLng: 'pt-BR',
    debug: false,

    interpolation: {
      escapeValue: false // React já escapa os valores
    },

    // Opções de detecção de idioma
    detection: {
      // Ordem dos métodos de detecção
      order: ['localStorage', 'navigator'],
      // Chave de armazenamento local
      lookupLocalStorage: 'i18nextLng',
      // Permanência das escolhas de idioma
      caches: ['localStorage']
    }
  });

export default i18n;