import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { lazyLoad, DefaultLoadingFallback } from "./lib/lazy-loader";
import { setupWebApp, isIOS } from "./lib/pwa-utils-simple";
import { LanguageProvider } from "./hooks/use-language";

// Importando páginas comuns de forma síncrona - estas são críticas para carregamento inicial
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";

// Importando componentes de layout
import AppLayout from "@/components/layout/app-layout";
import { PageTransition } from "@/components/layout/page-transition";

// Lazy loading para páginas menos críticas para o carregamento inicial
const JournalPage = lazyLoad(() => import("@/pages/journal-page-new"));
const JournalHistoryPage = lazyLoad(() => import("@/pages/journal-history-new"));
const VoiceJournalPage = lazyLoad(() => import("@/pages/voice-journal-page"));
const SelfHelpPage = lazyLoad(() => import("@/pages/self-help-page"));
const ProfilePage = lazyLoad(() => import("@/pages/profile-page"));
const VideoCallPage = lazyLoad(() => import("@/pages/video-call-page"));
const TherapistDetailsPage = lazyLoad(() => import("@/pages/therapist-details-page"));
const TherapistDashboardPage = lazyLoad(() => import("@/pages/therapist-dashboard-page"));
const TherapistProfilePage = lazyLoad(() => import("@/pages/therapist-profile-page"));
const TherapistAvailabilityPage = lazyLoad(() => import("@/pages/therapist-availability-page"));
const TherapistAnalyticsPage = lazyLoad(() => import("@/pages/therapist-analytics-page"));
const TherapistPatientsPage = lazyLoad(() => import("@/pages/therapist-patients-page"));
const AssistantPage = lazyLoad(() => import("@/pages/assistant-page"));
// Página de teste para o componente de status de processamento de áudio
const AudioStatusTestPage = lazyLoad(() => import("@/pages/audio-status-test-page"));
// Página unificada para dicas do dia (funciona tanto para /daily-tip quanto para /daily-tips)
const DailyTipPage = lazyLoad(() => import("@/pages/daily-tip-page"));
const EmotionalStatePage = lazyLoad(() => import("@/pages/emotional-state-page"));
const SchedulePage = lazyLoad(() => import("@/pages/schedule-page"));
const VoiceCheckinPage = lazyLoad(() => import("@/pages/voice-checkin-page"));
const LGPDConsentPage = lazyLoad(() => import("@/pages/lgpd-consent-page"));
const CheckoutPage = lazyLoad(() => import("@/pages/checkout-page"));
const PaymentSuccessPage = lazyLoad(() => import("@/pages/payment-success-page"));
const SettingsPage = lazyLoad(() => import("@/pages/settings-page"));
// Usando as novas versões das páginas de grupos de apoio que foram reconstruídas para evitar bugs de navegação
const SupportGroupsPage = lazyLoad(() => import("@/pages/support-groups-page-new"));
const SupportGroupDetailsPage = lazyLoad(() => import("@/pages/support-group-details-page-new"));
const EmergencyPage = lazyLoad(() => import("@/pages/emergency-page"));
const BreathingExercisePage = lazyLoad(() => import("@/pages/breathing-exercise-page"));
const TermsPage = lazyLoad(() => import("@/pages/terms-page-new"));
const PrivacyPolicyPage = lazyLoad(() => import("@/pages/privacy-page-new"));

// Imports necessários para o sistema de rotas e autenticação
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { LazyMotion, domAnimation } from "framer-motion";

// Componente para envolver rotas protegidas com o layout
const ProtectedRouteWithLayout = ({ 
  component: Component, 
  ...rest 
}: {
  component: React.ComponentType;
  path: string;
}) => {
  // Obter o título da página com base no caminho
  const getPageTitle = (path: string) => {
    switch (path) {
      case "/":
        return "Início";
      case "/journal":
        return "Diário Pessoal";
      case "/journal-history":
        return "Histórico do Diário";
      case "/assistant":
        return "Assistente Virtual";
      case "/profile":
        return "Meu Perfil";
      case "/support-groups":
        return "Grupos de Apoio";
      case "/schedule":
        return "Agenda";
      case "/emergency":
        return "Emergência";
      case "/daily-tips":
        return "Dicas Diárias";
      case "/daily-tip":
        return "Dica do Dia";
      case "/emotional-state":
        return "Estado Emocional";
      case "/settings":
        return "Configurações";
      default:
        if (path.includes("/therapist")) {
          return "Terapeutas";
        }
        if (path.includes("/support-groups/")) {
          return "Grupo de Apoio";
        }
        return "";
    }
  };

  // Verificar se o caminho precisa de um botão voltar
  const needsBackButton = (path: string) => {
    return path !== "/" && 
           path !== "/journal" && 
           path !== "/journal-history" && 
           path !== "/assistant" && 
           path !== "/profile" &&
           path !== "/support-groups" &&
           path !== "/schedule" &&
           path !== "/daily-tip" &&
           path !== "/daily-tips" &&
           path !== "/emotional-state";
  };

  return (
    <ProtectedRoute
      {...rest}
      component={() => (
        <AppLayout 
          title={getPageTitle(rest.path)} 
          showBackButton={needsBackButton(rest.path)}
        >
          <PageTransition mode="none">
            <Component />
          </PageTransition>
        </AppLayout>
      )}
    />
  );
};

function App() {
  // Inicializar as configurações de PWA e otimizações para iOS
  // Chamada feita fora de um useEffect para garantir que as configurações
  // sejam aplicadas o mais cedo possível durante o carregamento da página
  typeof document !== "undefined" && setupWebApp();
  
  // Adicionar classe no <html> para estilização específica de iOS
  typeof document !== "undefined" && isIOS() && 
    document.documentElement.classList.add('ios-device');
    
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          {/* Carregamento preguiçoso das animações - melhor performance em dispositivos iOS */}
          <LazyMotion features={domAnimation} strict>
            <Switch>
              <ProtectedRouteWithLayout path="/" component={HomePage} />
              <ProtectedRouteWithLayout path="/journal-voice" component={VoiceJournalPage} />
              <ProtectedRouteWithLayout path="/journal" component={JournalPage} />
              <ProtectedRouteWithLayout path="/journal-history" component={JournalHistoryPage} />
              <ProtectedRouteWithLayout path="/self-help" component={SelfHelpPage} />
              <ProtectedRouteWithLayout path="/profile" component={ProfilePage} />
              <ProtectedRouteWithLayout path="/video-call/:id" component={VideoCallPage} />
              <ProtectedRouteWithLayout path="/therapist/:id" component={TherapistDetailsPage} />
              <ProtectedRouteWithLayout path="/therapist-dashboard" component={TherapistDashboardPage} />
              <ProtectedRouteWithLayout path="/therapist-profile" component={TherapistProfilePage} />
              <ProtectedRouteWithLayout path="/therapist-availability" component={TherapistAvailabilityPage} />
              <ProtectedRouteWithLayout path="/therapist-analytics" component={TherapistAnalyticsPage} />
              <ProtectedRouteWithLayout path="/therapist-patients" component={TherapistPatientsPage} />
              <ProtectedRouteWithLayout path="/assistant" component={AssistantPage} />
              {/* Ambos caminhos usam a mesma página unificada de dicas diárias */}
              <ProtectedRouteWithLayout path="/daily-tips" component={DailyTipPage} />
              <ProtectedRouteWithLayout path="/daily-tip" component={DailyTipPage} />
              <ProtectedRouteWithLayout path="/emotional-state" component={EmotionalStatePage} />
              <ProtectedRouteWithLayout path="/schedule/new" component={SchedulePage} />
              <ProtectedRouteWithLayout path="/schedule/:therapistId" component={SchedulePage} />
              <ProtectedRouteWithLayout path="/schedule" component={SchedulePage} />
              <ProtectedRouteWithLayout path="/voice-checkin" component={VoiceCheckinPage} />
              <ProtectedRouteWithLayout path="/lgpd-consent" component={LGPDConsentPage} />
              <ProtectedRouteWithLayout path="/checkout" component={CheckoutPage} />
              <ProtectedRouteWithLayout path="/pagamento-concluido" component={PaymentSuccessPage} />
              <ProtectedRouteWithLayout path="/support-groups" component={SupportGroupsPage} />
              <ProtectedRouteWithLayout path="/support-groups/:id" component={SupportGroupDetailsPage} />
              <ProtectedRouteWithLayout path="/emergency" component={EmergencyPage} />
              <ProtectedRouteWithLayout path="/breathing-exercise" component={BreathingExercisePage} />
              <ProtectedRouteWithLayout path="/settings" component={SettingsPage} />
              
              {/* Página de teste para o status de processamento de áudio - acessível sem autenticação */}
              <Route path="/audio-status-test" component={() => (
                <PageTransition mode="fade">
                  <AudioStatusTestPage />
                </PageTransition>
              )} />
              
              {/* Rotas para páginas legais - Totalmente independentes do sistema de rotas */}
              <Route path="/terms" component={() => {
                window.location.href = '/static/terms.html';
                return null;
              }} />
              
              <Route path="/privacy" component={() => {
                window.location.href = '/static/privacy.html';
                return null;
              }} />
              
              {/* Rotas sem layout ou com layout personalizado */}
              <Route path="/auth" component={() => (
                <PageTransition mode="fade">
                  <AuthPage />
                </PageTransition>
              )} />
              <Route component={() => (
                <PageTransition mode="fade">
                  <NotFound />
                </PageTransition>
              )} />
            </Switch>
          </LazyMotion>
          <Toaster />
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
