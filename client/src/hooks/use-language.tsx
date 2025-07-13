import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

type Language = 'pt-BR' | 'en-US';

interface LanguageContextType {
  currentLanguage: Language;
  changeLanguage: (lang: Language) => void;
  isReady: boolean;
}

const defaultContext: LanguageContextType = {
  currentLanguage: 'pt-BR',
  changeLanguage: () => {},
  isReady: false
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n: i18nInstance } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<Language>('pt-BR');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Detecta o idioma atual quando o componente é montado
    const detectedLanguage = i18nInstance.language;
    if (detectedLanguage) {
      // Verifica se o idioma detectado é um dos suportados
      const supportedLang = detectedLanguage.startsWith('en') ? 'en-US' : 'pt-BR';
      setCurrentLanguage(supportedLang as Language);
    }
    setIsReady(true);
  }, [i18nInstance.language]);

  const changeLanguage = (lang: Language) => {
    i18nInstance.changeLanguage(lang).then(() => {
      setCurrentLanguage(lang);
      // Salva a preferência de idioma no localStorage
      localStorage.setItem('i18nextLng', lang);
    }).catch(err => {
      console.error('Erro ao mudar idioma:', err);
    });
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Função auxiliar para traduzir texto em componentes não-React
export const translate = (key: string, options?: any) => {
  return i18n.t(key, options);
};