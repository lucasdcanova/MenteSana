import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/use-language';
import { Languages } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();

  return (
    <div className={`${className} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Languages className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">{t('settings.language_region')}</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {t('settings.select_language')}
      </p>
      
      <div className="space-y-3">
        <div 
          className={`p-3 rounded-lg flex items-center cursor-pointer ${currentLanguage === 'pt-BR' ? 'bg-primary/10 border border-primary/30' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => changeLanguage('pt-BR')}
        >
          <div className={`w-4 h-4 rounded-full mr-3 ${currentLanguage === 'pt-BR' ? 'bg-primary' : 'border border-gray-400'}`}>
            {currentLanguage === 'pt-BR' && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            )}
          </div>
          <span className="font-medium">{t('settings.portuguese')} (Português)</span>
        </div>
        
        <div 
          className={`p-3 rounded-lg flex items-center cursor-pointer ${currentLanguage === 'en-US' ? 'bg-primary/10 border border-primary/30' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => changeLanguage('en-US')}
        >
          <div className={`w-4 h-4 rounded-full mr-3 ${currentLanguage === 'en-US' ? 'bg-primary' : 'border border-gray-400'}`}>
            {currentLanguage === 'en-US' && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            )}
          </div>
          <span className="font-medium">{t('settings.english')} (English)</span>
        </div>
      </div>
    </div>
  );
};

export default LanguageSwitcher;