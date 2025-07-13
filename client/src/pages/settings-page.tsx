import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Bell, 
  Moon, 
  Sun,
  Volume2, 
  Eye, 
  Lock, 
  Vibrate, 
  Globe, 
  Monitor, 
  Type, 
  Clock,
  Languages,
  FileText,
  ChevronRight,
  Smartphone,
  Palette,
  Shield,
  CircleHelp,
  NotebookPen,
  LogOut,
  Brain,
  User,
  UserCog,
  Share2,
  Settings,
  AlarmCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IosCard } from "@/components/ui/ios-card";
import { IosButton } from "@/components/ui/ios-button";
import { IosBackdrop } from "@/components/ui/ios-elements";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [settings, setSettings] = useState({
    notifications: true,
    sounds: true,
    vibration: true,
    darkMode: false,
    fontSize: "medium",
    language: "pt_BR",
    autoBackup: true,
    dataSharing: false,
    biometricAuth: false,
    therapistNotifications: true,
    offlineMode: false,
    diagnosticData: false,
    shareWithAI: true,
    shareWithTherapist: true,
    shareMoodData: true,
    shareJournalEntries: true,
    shareVoiceData: false
  });
  
  // Carregar configurações salvas no localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('mindwell_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
        
        // Aplicar modo escuro se estiver ativado
        if (parsedSettings.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        // Aplicar tamanho da fonte
        if (parsedSettings.fontSize) {
          document.documentElement.setAttribute('data-font-size', parsedSettings.fontSize);
        }
      } catch (e) {
        console.error('Erro ao carregar configurações:', e);
      }
    }
  }, []);
  
  // Estado para o modal de informações de tamanho da fonte
  const [showFontSizeInfo, setShowFontSizeInfo] = useState(false);

  // Função para lidar com mudanças em toggles/switches
  const handleToggleChange = (setting: string) => {
    setSettings(prev => {
      const newSettings = { ...prev, [setting]: !prev[setting as keyof typeof prev] };
      
      // Salvar configurações no localStorage
      localStorage.setItem('mindwell_settings', JSON.stringify(newSettings));
      
      // Aplicar configurações imediatamente
      if (setting === 'darkMode') {
        if (newSettings.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      toast({
        title: "Configuração atualizada",
        description: `${getSettingLabel(setting)} ${newSettings[setting as keyof typeof newSettings] ? "ativado" : "desativado"}.`,
      });
      
      return newSettings;
    });
  };

  // Função para lidar com mudanças em selects
  const handleSelectChange = (setting: string, value: string) => {
    setSettings(prev => {
      const newSettings = { ...prev, [setting]: value };
      
      // Salvar configurações no localStorage
      localStorage.setItem('mindwell_settings', JSON.stringify(newSettings));
      
      // Aplicar configurações imediatamente
      if (setting === 'fontSize') {
        document.documentElement.setAttribute('data-font-size', value);
      }
      
      toast({
        title: "Configuração atualizada",
        description: `${getSettingLabel(setting)} configurado para ${getReadableValue(setting, value)}.`,
      });
      
      return newSettings;
    });
  };

  // Função para obter o rótulo legível de uma configuração
  const getSettingLabel = (setting: string): string => {
    const labels: Record<string, string> = {
      notifications: "Notificações",
      sounds: "Sons",
      vibration: "Vibração",
      darkMode: "Modo escuro",
      fontSize: "Tamanho da fonte",
      language: "Idioma",
      autoBackup: "Backup automático",
      dataSharing: "Compartilhamento de dados",
      biometricAuth: "Autenticação biométrica",
      therapistNotifications: "Notificações do terapeuta",
      offlineMode: "Modo offline",
      diagnosticData: "Dados de diagnóstico",
      shareWithAI: "Compartilhar com IA",
      shareWithTherapist: "Compartilhar com terapeuta",
      shareMoodData: "Compartilhar dados de humor",
      shareJournalEntries: "Compartilhar diário",
      shareVoiceData: "Compartilhar gravações de voz"
    };
    
    return labels[setting] || setting;
  };

  // Função para obter o valor legível de uma configuração
  const getReadableValue = (setting: string, value: string): string => {
    if (setting === "fontSize") {
      const sizes: Record<string, string> = {
        small: "Pequeno",
        medium: "Médio",
        large: "Grande",
        extraLarge: "Extra grande"
      };
      return sizes[value] || value;
    }
    
    if (setting === "language") {
      const languages: Record<string, string> = {
        pt_BR: "Português (Brasil)",
        en_US: "Inglês (EUA)",
        es_ES: "Espanhol"
      };
      return languages[value] || value;
    }
    
    return value;
  };

  // Renderiza uma opção de configuração com toggle no estilo iOS
  const renderToggleSetting = (
    key: string, 
    label: string, 
    icon: React.ReactNode, 
    description?: string
  ) => {
    const isEnabled = settings[key as keyof typeof settings] as boolean;
    
    return (
      <div className="py-3.5 border-b border-gray-100/80 last:border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-primary p-2 bg-primary/10 rounded-full flex-shrink-0">
              {icon}
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-900">{label}</h3>
              {description && (
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => handleToggleChange(key)}
            className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-all duration-300 ${
              isEnabled 
                ? "bg-primary justify-end" 
                : "bg-gray-200 justify-start"
            }`}
            aria-label={isEnabled ? `Desativar ${label}` : `Ativar ${label}`}
            style={{
              WebkitTapHighlightColor: "transparent"
            }}
          >
            <div 
              className="w-6 h-6 bg-white rounded-full shadow-sm" 
              style={{
                transition: "transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
                transform: isEnabled ? 'translateX(4px)' : 'translateX(0px)'
              }}
            ></div>
          </button>
        </div>
      </div>
    );
  };

  // Renderiza um item de configuração que abre uma subpágina
  const renderNavigationSetting = (
    label: string,
    icon: React.ReactNode,
    href: string,
    description?: string,
    badge?: string
  ) => {
    return (
      <a 
        href={href}
        className="py-3.5 border-b border-gray-100/80 last:border-b-0 flex items-center justify-between active:bg-gray-50 transition-colors"
        style={{
          WebkitTapHighlightColor: "transparent",
          textDecoration: "none"
        }}
      >
        <div className="flex items-center gap-3">
          <div className="text-primary p-2 bg-primary/10 rounded-full flex-shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-medium text-gray-900">{label}</h3>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center">
          {badge && (
            <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              {badge}
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </a>
    );
  };

  // Renderiza uma opção de configuração com select
  const renderSelectSetting = (
    key: string,
    label: string,
    icon: React.ReactNode,
    options: { value: string; label: string }[],
    description?: string,
    showInfoButton?: boolean
  ) => {
    const currentValue = settings[key as keyof typeof settings] as string;
    
    return (
      <div className="py-3.5 border-b border-gray-100/80 last:border-b-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="text-primary p-2 bg-primary/10 rounded-full flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-gray-900">{label}</h3>
                {showInfoButton && (
                  <button 
                    onClick={() => setShowFontSizeInfo(true)} 
                    className="text-gray-400 hover:text-primary p-1 rounded-full"
                  >
                    <CircleHelp className="w-4 h-4" />
                  </button>
                )}
              </div>
              {description && (
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <select
            value={currentValue}
            onChange={(e) => handleSelectChange(key, e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{
              WebkitAppearance: "none",
              fontFamily: "var(--ios-system-font)",
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="pb-10 space-y-6">
        {/* Área do perfil do usuário */}
        {user && (
          <IosCard 
            className="mb-6" 
            variant="glass" 
            elevation="md"
            animationType="fade"
          >
            <div className="p-4 flex items-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mr-4">
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{user.firstName} {user.lastName}</h2>
                <p className="text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {user.isTherapist ? "Conta de Terapeuta" : "Conta de Paciente"}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </IosCard>
        )}

        {/* Seção de aparência */}
        <IosCard title="Aparência e Interface" icon={<Palette className="w-5 h-5 text-primary" />} dividers>
          {renderToggleSetting(
            "darkMode", 
            "Modo Escuro", 
            <Moon className="w-5 h-5" />, 
            "Interface com cores escuras para uso noturno"
          )}
          
          {renderSelectSetting(
            "fontSize",
            "Tamanho da Fonte",
            <Type className="w-5 h-5" />,
            [
              { value: "small", label: "Pequeno" },
              { value: "medium", label: "Médio" },
              { value: "large", label: "Grande" },
              { value: "extraLarge", label: "Extra Grande" }
            ],
            "Ajuste o tamanho do texto em todo o aplicativo",
            true
          )}
          
          {renderNavigationSetting(
            "Personalização",
            <Palette className="w-5 h-5" />,
            "/appearance",
            "Cores, temas e layout do aplicativo",
            "Novo"
          )}
        </IosCard>
        
        {/* Seção de notificações */}
        <IosCard title="Notificações e Sons" icon={<Bell className="w-5 h-5 text-primary" />} dividers>
          {renderToggleSetting(
            "notifications", 
            "Notificações", 
            <Bell className="w-5 h-5" />, 
            "Receba lembretes e atualizações importantes"
          )}
          
          {renderToggleSetting(
            "sounds", 
            "Sons", 
            <Volume2 className="w-5 h-5" />, 
            "Sons de notificações e efeitos no aplicativo"
          )}
          
          {renderToggleSetting(
            "vibration", 
            "Vibração", 
            <Vibrate className="w-5 h-5" />, 
            "Feedback tátil ao interagir com o aplicativo"
          )}
          
          {user && !user.isTherapist && renderToggleSetting(
            "therapistNotifications", 
            "Notificações do Terapeuta", 
            <Languages className="w-5 h-5" />, 
            "Receba notificações de mensagens do seu terapeuta"
          )}
        </IosCard>
        
        {/* Seção de idioma */}
        <IosCard title={t('settings.language_region')} icon={<Globe className="w-5 h-5 text-primary" />} dividers>
          <LanguageSwitcher />
        </IosCard>
        
        {/* Seção de privacidade */}
        <IosCard title="Privacidade e Segurança" icon={<Shield className="w-5 h-5 text-primary" />} dividers>
          {renderToggleSetting(
            "biometricAuth", 
            "Autenticação Biométrica", 
            <Lock className="w-5 h-5" />, 
            "Use Face ID ou Touch ID para entrar no aplicativo"
          )}
          
          {renderToggleSetting(
            "dataSharing", 
            "Compartilhamento de Dados", 
            <FileText className="w-5 h-5" />, 
            "Compartilhar dados anônimos para melhorar o aplicativo"
          )}
        </IosCard>
        
        {/* Seção de controle de compartilhamento */}
        <IosCard title="Controle de Privacidade" icon={<UserCog className="w-5 h-5 text-primary" />} dividers>
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm text-gray-600 mb-2">
              Controle quais tipos de dados são compartilhados com a inteligência artificial e seu terapeuta.
              Desativar o compartilhamento pode limitar algumas funcionalidades do aplicativo.
            </p>
          </div>
          
          {renderToggleSetting(
            "shareWithAI", 
            "Compartilhar com IA", 
            <Brain className="w-5 h-5" />, 
            "Permitir análise de dados pela Inteligência Artificial"
          )}
          
          {renderToggleSetting(
            "shareWithTherapist", 
            "Compartilhar com Terapeuta", 
            <User className="w-5 h-5" />, 
            "Permitir que seu terapeuta veja seus dados"
          )}
          
          {renderToggleSetting(
            "shareMoodData", 
            "Compartilhar Dados de Humor", 
            <AlarmCheck className="w-5 h-5" />, 
            "Compartilhar seu estado emocional e tendências"
          )}
          
          {renderToggleSetting(
            "shareJournalEntries", 
            "Compartilhar Diário", 
            <NotebookPen className="w-5 h-5" />, 
            "Compartilhar suas anotações do diário"
          )}
          
          {renderToggleSetting(
            "shareVoiceData", 
            "Compartilhar Gravações de Voz", 
            <Volume2 className="w-5 h-5" />, 
            "Compartilhar gravações de áudio do diário"
          )}
        </IosCard>
        
        {/* Seção de dados e armazenamento */}
        <IosCard title="Dados e Armazenamento" icon={<NotebookPen className="w-5 h-5 text-primary" />} dividers>
          {renderToggleSetting(
            "autoBackup", 
            "Backup Automático", 
            <Clock className="w-5 h-5" />, 
            "Backup dos seus dados na nuvem diariamente"
          )}
          
          {renderToggleSetting(
            "offlineMode", 
            "Modo Offline", 
            <Monitor className="w-5 h-5" />, 
            "Use o aplicativo sem conexão com a internet"
          )}
          
          {renderToggleSetting(
            "diagnosticData", 
            "Dados de Diagnóstico", 
            <Eye className="w-5 h-5" />, 
            "Envio de relatórios para ajudar a melhorar o aplicativo"
          )}
        </IosCard>
        
        {/* Seção sobre o aplicativo */}
        <IosCard title="Sobre o Aplicativo" icon={<Smartphone className="w-5 h-5 text-primary" />} dividers>
          <div className="p-4 text-center">
            <h3 className="font-semibold text-xl text-gray-900">MindWell</h3>
            <p className="text-gray-500 mt-1">Versão 2.0.0</p>
            <p className="text-sm text-gray-400 mt-4">© 2025 MindWell App</p>
            <p className="text-xs text-gray-400 mt-1">Todos os direitos reservados</p>
            
            <div className="mt-6 flex justify-center gap-3">
              <IosButton 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  const url = "/static/terms.html";
                  console.log("Navegando para:", url);
                  window.location.href = url;
                }}
                className="shadow-sm font-medium"
              >
                Termos de Uso
              </IosButton>
              
              <IosButton 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  const url = "/static/privacy.html";
                  console.log("Navegando para:", url);
                  window.location.href = url;
                }}
                className="shadow-sm font-medium"
              >
                Política de Privacidade
              </IosButton>
            </div>
          </div>
        </IosCard>
        
        {/* Botão de logout */}
        {user && (
          <div className="my-8">
            <IosButton 
              variant="danger" 
              fullWidth 
              onClick={() => {
                logoutMutation.mutate(undefined, {
                  onSuccess: () => {
                    toast({
                      title: "Logout",
                      description: "Você saiu da sua conta."
                    });
                    setLocation('/auth');
                  },
                  onError: (error) => {
                    toast({
                      title: "Erro ao sair",
                      description: error.message,
                      variant: "destructive"
                    });
                  }
                });
              }}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <>
                  <div className="mr-2 animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Saindo...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da Conta
                </>
              )}
            </IosButton>
          </div>
        )}
      </div>
      
      {/* Modal de informações sobre tamanho da fonte */}
      <IosBackdrop
        show={showFontSizeInfo}
        onClick={() => setShowFontSizeInfo(false)}
        zIndex={50}
      >
        <div 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-md bg-white rounded-xl shadow-xl p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold mb-3">Sobre o Tamanho da Fonte</h3>
          <p className="text-sm text-gray-600 mb-4">
            Escolha o tamanho de fonte que seja mais confortável para você. 
            Essa configuração afeta todo o texto do aplicativo, desde menus até o conteúdo das páginas.
          </p>
          
          <div className="space-y-3 mb-5">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-medium text-gray-700">Pequeno</h4>
              <p className="text-xs text-gray-600">Mais conteúdo por tela, ideal para quem prefere textos compactos.</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700">Médio (Padrão)</h4>
              <p className="text-sm text-gray-600">Tamanho equilibrado para a maioria dos usuários.</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-base font-medium text-gray-700">Grande</h4>
              <p className="text-base text-gray-600">Melhor legibilidade para quem prefere textos maiores.</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-medium text-gray-700">Extra Grande</h4>
              <p className="text-lg text-gray-600">Máxima legibilidade, ideal para acessibilidade.</p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <IosButton onClick={() => setShowFontSizeInfo(false)}>
              Entendi
            </IosButton>
          </div>
        </div>
      </IosBackdrop>
    </>
  );
}