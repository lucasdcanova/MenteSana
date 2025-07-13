import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { NotificationBell } from "@/components/layout/notification-bell";
import { DailyStreak } from "@/components/home/daily-streak";
import { EmergencyTherapistsSection } from "@/components/therapists/emergency-therapists-section";
import { useAuth } from "@/hooks/use-auth";
import { Therapist, DailyTip, Session, User } from "@shared/schema";
import { 
  MessageSquare, Lightbulb, BookOpen, SmileIcon, Search, 
  Users, Calendar, ClipboardList, Settings, Home, Bot, 
  Clock, PlusCircle, HeartPulse, Activity
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Mapeamento de emoções para cores (igual ao emotional-state-page.tsx)
const emotionColors: Record<string, { color: string, bgColor: string, textColor: string }> = {
  'alegria': { color: '#4ade80', bgColor: '#dcfce7', textColor: '#166534' },
  'calma': { color: '#60a5fa', bgColor: '#dbeafe', textColor: '#1e40af' },
  'esperança': { color: '#38bdf8', bgColor: '#e0f2fe', textColor: '#075985' },
  'gratidão': { color: '#2dd4bf', bgColor: '#ccfbf1', textColor: '#0f766e' },
  'entusiasmo': { color: '#fb923c', bgColor: '#ffedd5', textColor: '#9a3412' },
  'satisfação': { color: '#a78bfa', bgColor: '#f3e8ff', textColor: '#6d28d9' },
  'neutro': { color: '#94a3b8', bgColor: '#f1f5f9', textColor: '#334155' },
  'confusão': { color: '#d8b4fe', bgColor: '#f3e8ff', textColor: '#7e22ce' },
  'ansiedade': { color: '#fbbf24', bgColor: '#fef3c7', textColor: '#92400e' },
  'preocupação': { color: '#fcd34d', bgColor: '#fef9c3', textColor: '#a16207' },
  'tristeza': { color: '#38bdf8', bgColor: '#e0f2fe', textColor: '#0369a1' },
  'frustração': { color: '#f87171', bgColor: '#fee2e2', textColor: '#b91c1c' },
  'raiva': { color: '#ef4444', bgColor: '#fee2e2', textColor: '#991b1b' },
  'medo': { color: '#a855f7', bgColor: '#f3e8ff', textColor: '#7e22ce' },
  'desânimo': { color: '#94a3b8', bgColor: '#f1f5f9', textColor: '#334155' }
};

// Valores padrão para cores de emoções desconhecidas
const defaultEmotionColors = { color: '#94a3b8', bgColor: '#f1f5f9', textColor: '#334155' };

// Interface para o estado emocional
interface EmotionalState {
  currentState: string;
  intensity: number; // 0-100
  dominantEmotion: string;
  secondaryEmotions: string[];
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated?: string;
  recentTriggers?: string[];
  suggestedActions?: string[];
  hasSufficientData?: boolean;
  message?: string;
  dataConfidence?: number;
}

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const isTherapist = user?.isTherapist || false;
  
  // Fetch therapists
  const { data: therapists } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });
  
  // Fetch daily tip
  const { data: dailyTip } = useQuery<DailyTip>({
    queryKey: ["/api/daily-tips/random"],
  });
  
  // Verificar se há dicas não lidas
  const { data: unreadTipStatus } = useQuery<{ hasUnreadTip: boolean, tipId?: number }>({
    queryKey: ["/api/daily-tips/unread"],
  });
  
  // Fetch user emotional state
  const { data: emotionalState } = useQuery<EmotionalState>({
    queryKey: ["/api/emotional-state"],
  });
  
  // Fetch user sessions 
  const { data: sessionResponse } = useQuery<{data: Session[], pagination: any}>({
    queryKey: ["/api/sessions"],
  });
  
  // Fetch last journal entry
  const { data: lastJournalEntry } = useQuery<{
    lastEntry: any; 
    daysAgo: number | null; 
    message: string;
  }>({
    queryKey: ["/api/journal-last-entry"],
  });
  
  // Extract sessions safely, ensuring it's an array
  const sessions = Array.isArray(sessionResponse?.data) 
    ? sessionResponse?.data 
    : [];
  
  // Fetch patients (for therapists)
  const { data: patients } = useQuery<User[]>({
    queryKey: ["/api/patients"],
    enabled: isTherapist, // Only fetch if user is a therapist
  });

  // Daily Tip Section - Enhanced with high contrast design and dark accents
  const DailyTipSection = () => {
    if (!dailyTip) return null;
    
    // Estado para controlar se a dica está expandida ou recolhida
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Função para verificar se o conteúdo da dica é longo (mais que 5 frases)
    // Uma frase normalmente termina com ponto final, interrogação ou exclamação
    const isLongContent = () => {
      if (!dailyTip.content) return false;
      const sentences = dailyTip.content.split(/[.!?]+\s/);
      return sentences.filter(s => s.trim().length > 0).length > 5;
    };
    
    // Função para obter uma versão resumida do conteúdo (primeiras 3 frases)
    const getShortenedContent = () => {
      if (!dailyTip.content) return "";
      const sentences = dailyTip.content.split(/([.!?]+\s)/);
      let result = "";
      let sentenceCount = 0;
      
      for (let i = 0; i < sentences.length; i++) {
        result += sentences[i];
        if (sentences[i].match(/[.!?]+\s/)) {
          sentenceCount++;
          if (sentenceCount >= 3) break;
        }
      }
      
      return result.trim() + "...";
    };
    
    const isLong = isLongContent();
    const displayContent = isLong && !isExpanded ? getShortenedContent() : dailyTip.content;
    
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 mb-6 shadow-lg border border-primary/30">
        <div className="flex items-center mb-4">
          <div className="bg-primary rounded-full p-3 mr-3 shadow-lg">
            <Lightbulb className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-bold text-xl text-gray-900">Dica do Dia</h2>
          <div className="ml-auto">
            <span className="text-xs font-medium text-primary-dark bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              {dailyTip.category || "Bem-estar"}
            </span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 border-l-4 border-l-primary-dark border-t border-r border-b border-gray-200 shadow-md">
          <h3 className="text-lg font-bold mb-3 text-gray-900 bg-gradient-to-r from-primary-dark/20 to-transparent px-3 py-2 rounded-lg">
            {dailyTip.title}
          </h3>
          
          <div className="text-[15px] text-gray-800 leading-relaxed tracking-wide px-3">
            <p className="whitespace-pre-line">{displayContent}</p>
            
            {isLong && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-primary font-medium text-sm hover:text-primary-dark focus:outline-none flex items-center"
              >
                {isExpanded ? (
                  <>
                    <span>Mostrar menos</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Exibir dica inteira</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
          
          {dailyTip.tags && dailyTip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 px-3">
              {dailyTip.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="bg-primary-dark/20 text-primary-dark text-xs font-medium px-3 py-1.5 rounded-full shadow-sm border border-primary-dark/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {dailyTip.sources && dailyTip.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200 bg-gray-50 mx-3 px-3 py-2 rounded-b-lg">
              <p className="text-xs text-gray-600 font-medium flex items-center">
                <span className="mr-1">🔍</span>
                Fonte: {dailyTip.sources[0]}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Schedule Appointment Section
  const ScheduleAppointmentSection = () => {
    if (!therapists || therapists.length === 0) return null;

    return (
      <div className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Agendar Consulta</h2>
          <Link href="/schedule">
            <Button variant="outline" className="text-xs px-3 py-1 h-8 border-primary text-primary hover:bg-primary hover:text-white">
              Ver Todos
            </Button>
          </Link>
        </div>
        
        <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
          {therapists.slice(0, 3).map((therapist) => (
            <div key={therapist.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center">
                {therapist.imageUrl ? (
                  <img 
                    src={therapist.imageUrl} 
                    alt={`${therapist.firstName} ${therapist.lastName}`} 
                    className="w-10 h-10 rounded-full object-cover mr-3"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary bg-opacity-20 flex items-center justify-center mr-3">
                    <span className="text-primary-dark font-semibold">
                      {therapist.firstName.charAt(0)}{therapist.lastName.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-sm">Dr. {therapist.firstName} {therapist.lastName}</h3>
                  <p className="text-xs text-gray-500">{therapist.specialization?.split(',')[0] || "Terapia Geral"}</p>
                </div>
              </div>
              <Link href={`/schedule/${therapist.id}`}>
                <Button size="sm" className="bg-primary hover:bg-primary-dark">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Agendar</span>
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Patient UI
  const renderPatientHome = () => (
    <>
      {/* Welcome Message - Patient */}
      <h1 className="text-2xl font-bold">
        Olá{user?.firstName ? `, ${user.firstName}` : ''}
      </h1>
      <h2 className="text-lg text-gray-600 mb-4">
        Como está sua saúde mental hoje?
      </h2>
      
      {/* Main Action Cards - Patient */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Daily Tip Card */}
        <Link href="/daily-tip">
          <div className="mobile-card-button relative">
            {unreadTipStatus?.hasUnreadTip && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
            <div className="mb-2">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mobile-card-title">
              Ajuda do Dia
              {unreadTipStatus?.hasUnreadTip && (
                <span className="ml-1 text-xs font-normal text-red-500 animate-pulse">•</span>
              )}
            </h3>
            <p className="mobile-card-description">
              {unreadTipStatus?.hasUnreadTip ? "Nova dica disponível!" : "Dicas diárias"}
            </p>
          </div>
        </Link>
        
        {/* Emotional State Card */}
        <Link href="/emotional-state">
          {emotionalState ? (
            // Estilização dinâmica com base no estado emocional
            <div 
              className="mobile-card-button relative overflow-hidden"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: emotionalState.dominantEmotion && emotionColors[emotionalState.dominantEmotion.toLowerCase()]
                  ? emotionColors[emotionalState.dominantEmotion.toLowerCase()].color
                  : defaultEmotionColors.color
              }}
            >
              {/* Indicador de intensidade */}
              <div 
                className="absolute bottom-0 left-0 h-1.5" 
                style={{
                  width: `${emotionalState.intensity}%`,
                  backgroundColor: emotionalState.dominantEmotion && emotionColors[emotionalState.dominantEmotion.toLowerCase()]
                    ? emotionColors[emotionalState.dominantEmotion.toLowerCase()].color
                    : defaultEmotionColors.color
                }}
              ></div>
              
              <div className="mb-2 flex justify-between items-center">
                <Activity className="h-5 w-5 text-primary" />
                {emotionalState.trend && (
                  <span className="text-xs">
                    {emotionalState.trend === 'improving' && <span className="text-green-500">↗</span>}
                    {emotionalState.trend === 'declining' && <span className="text-red-500">↘</span>}
                    {emotionalState.trend === 'stable' && <span className="text-blue-500">→</span>}
                  </span>
                )}
              </div>
              
              <h3 className="mobile-card-title">Estado Emocional</h3>
              
              <p className="mobile-card-description text-xs">
                <span className="font-medium" style={{
                  color: emotionalState.dominantEmotion && emotionColors[emotionalState.dominantEmotion.toLowerCase()]
                    ? emotionColors[emotionalState.dominantEmotion.toLowerCase()].textColor
                    : defaultEmotionColors.textColor
                }}>
                  {emotionalState.currentState || "Neutro"}
                </span>
              </p>
            </div>
          ) : (
            // Versão padrão sem estado emocional
            <div className="mobile-card-button">
              <div className="mb-2">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mobile-card-title">Estado Emocional</h3>
              <p className="mobile-card-description">Acompanhe seu humor</p>
            </div>
          )}
        </Link>
        
        {/* Support Groups Card */}
        <Link href="/support-groups">
          <div className="mobile-card-button">
            <div className="mb-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mobile-card-title">Grupos de Apoio</h3>
            <p className="mobile-card-description">Compartilhe experiências</p>
          </div>
        </Link>
        
        {/* Journal Card - Versão melhorada com status dinâmico */}
        <Link href="/journal">
          <div className={`mobile-card-button relative ${lastJournalEntry && lastJournalEntry.daysAgo !== null && lastJournalEntry.daysAgo > 2 ? 'border-amber-400 border' : ''}`}>
            <div className="mb-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            {lastJournalEntry && lastJournalEntry.daysAgo === 0 && (
              <span className="absolute top-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 border border-green-200">
                Hoje
              </span>
            )}
            <h3 className="mobile-card-title">Diário</h3>
            <p className="mobile-card-description text-xs">
              {lastJournalEntry 
                ? lastJournalEntry.message
                : "Registre emoções"}
            </p>
            {lastJournalEntry && lastJournalEntry.daysAgo !== null && lastJournalEntry.daysAgo > 7 && (
              <div className="absolute bottom-1 right-1 h-2 w-2 bg-amber-400 rounded-full animate-pulse" />
            )}
          </div>
        </Link>
        
        {/* Assistant Card */}
        <Link href="/assistant">
          <div className="mobile-card-button">
            <div className="mb-2">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mobile-card-title">Assistente</h3>
            <p className="mobile-card-description">Ajuda virtual</p>
          </div>
        </Link>
        
        {/* Self-Help Card */}
        <Link href="/self-help">
          <div className="mobile-card-button">
            <div className="mb-2">
              <SmileIcon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mobile-card-title">Autoajuda</h3>
            <p className="mobile-card-description">Exercícios mentais</p>
          </div>
        </Link>
      </div>
      
      {/* Schedule Appointment Section */}
      <ScheduleAppointmentSection />
      
      {/* Upcoming Sessions */}
      {sessions && sessions.length > 0 && (
        <div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Próximas Consultas</h2>
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            {sessions.slice(0, 2).map((session: Session) => {
              const sessionDate = new Date(session.scheduledFor);
              const isToday = new Date().toDateString() === sessionDate.toDateString();
              const isPast = sessionDate < new Date();
              
              return (
                <div 
                  key={session.id} 
                  className="bg-gray-50 p-3 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm">
                        Dr. {session.therapistName || "Especialista"}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {sessionDate.toLocaleDateString('pt-BR')} {' '}
                        às {sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    <div>
                      {isToday && !isPast ? (
                        <Link href={`/video-call/${session.id}`}>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs px-3 h-8">
                            Entrar
                          </Button>
                        </Link>
                      ) : isPast ? (
                        <span className="text-gray-400 text-xs">Concluída</span>
                      ) : (
                        <span className="text-primary-dark text-xs font-medium">Agendada</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {sessions.length > 2 && (
              <Link href="/sessions" className="flex justify-center">
                <button className="text-primary text-sm font-medium hover:text-primary-dark">
                  Ver todas ({sessions.length})
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
      
      {/* Emergency Therapists Section */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 shadow-md">
        <div className="flex items-center mb-4">
          <div className="bg-red-500 rounded-full p-2.5 mr-3 shadow">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-bold text-xl text-red-700">Atendimento de Emergência</h2>
        </div>
        <p className="text-red-700 mb-4">
          Precisa de ajuda imediata? Temos terapeutas disponíveis para atendimento de emergência.
        </p>
        <Link href="/emergency">
          <Button className="w-full bg-red-600 hover:bg-red-700">
            Ver Terapeutas Disponíveis Agora
          </Button>
        </Link>
      </div>
      
      {/* Daily Streak */}
      <div className="mb-6">
        <DailyStreak />
      </div>
    </>
  );
  
  // Therapist UI
  const renderTherapistHome = () => (
    <>
      {/* Welcome Message - Therapist */}
      <h1 className="text-2xl font-bold mb-1">
        Olá, Dr(a). {user?.lastName || user?.firstName || ''}
      </h1>
      <h2 className="text-lg text-gray-600 mb-4">
        Painel de Terapeuta
      </h2>
      
      {/* Main Action Cards - Therapist */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Patients Card */}
        <Link href="/therapist-patients">
          <div className="mobile-card-button">
            <div className="mb-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mobile-card-title">Meus Pacientes</h3>
            <p className="mobile-card-description">Ver históricos</p>
          </div>
        </Link>
        
        {/* Calendar View Card */}
        <Link href="/schedule">
          <div className="mobile-card-button">
            <div className="mb-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mobile-card-title">Minha Agenda</h3>
            <p className="mobile-card-description">Ver consultas</p>
          </div>
        </Link>
        
        {/* Reports Card */}
        <Link href="/therapist-analytics">
          <div className="mobile-card-button">
            <div className="mb-2">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mobile-card-title">Relatórios</h3>
            <p className="mobile-card-description">Estatísticas</p>
          </div>
        </Link>
        
        {/* Settings Card */}
        <Link href="/profile">
          <div className="mobile-card-button">
            <div className="mb-2">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mobile-card-title">Perfil</h3>
            <p className="mobile-card-description">Configurações</p>
          </div>
        </Link>
      </div>
      
      {/* Today's Appointments */}
      {sessions && (
        <div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Consultas de Hoje</h2>
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            {sessions
              .filter((session: Session) => {
                const sessionDate = new Date(session.scheduledFor);
                return new Date().toDateString() === sessionDate.toDateString();
              })
              .slice(0, 3)
              .map((session: Session) => {
                const sessionDate = new Date(session.scheduledFor);
                const isPast = sessionDate < new Date();
                
                return (
                  <div 
                    key={session.id} 
                    className="bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-sm">
                          Paciente #{session.userId || "Anônimo"}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          Hoje às {sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      
                      <div>
                        {!isPast ? (
                          <Link href={`/video-call/${session.id}`}>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs px-3 h-8">
                              Iniciar
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-xs">Concluída</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            
            {sessions.filter((session: Session) => {
              const sessionDate = new Date(session.scheduledFor);
              return new Date().toDateString() === sessionDate.toDateString();
            }).length === 0 && (
              <div className="text-center py-3 text-gray-500 text-sm">
                Nenhuma consulta agendada para hoje
              </div>
            )}
            
            <Link href="/schedule" className="flex justify-center">
              <button 
                className="mt-2 text-primary text-sm font-medium flex items-center hover:text-primary-dark"
                onClick={() => {
                  // Forçar verificação de que é um terapeuta visualizando a agenda
                  sessionStorage.setItem('viewingAsTherapist', 'true');
                }}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Ver agenda completa
              </button>
            </Link>
          </div>
        </div>
      )}
      
      {/* Patients Overview (For Therapists) */}
      <div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Meus Pacientes</h2>
          <Link href="/therapist-patients">
            <Button variant="outline" className="text-xs px-3 py-1 h-8 border-primary text-primary hover:bg-primary hover:text-white">
              Ver Todos
            </Button>
          </Link>
        </div>
        
        {patients && patients.length > 0 ? (
          <div className="space-y-3">
            {patients.slice(0, 3).map(patient => (
              <Link key={patient.id} href={`/therapist-patients/${patient.id}`}>
                <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    {patient.profilePicture ? (
                      <img 
                        src={patient.profilePicture} 
                        alt={`${patient.firstName} ${patient.lastName}`}
                        className="w-10 h-10 rounded-full object-cover mr-3" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary bg-opacity-20 flex items-center justify-center mr-3">
                        <span className="text-primary-dark font-semibold">
                          {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-sm">{patient.firstName} {patient.lastName}</h3>
                      <p className="text-xs text-gray-500">
                        Próxima consulta: {new Date().toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-3 text-gray-500 text-sm">
            Nenhum paciente encontrado
          </div>
        )}
      </div>
    </>
  );
  
  return (
    <div className="app-container max-w-md mx-auto">
      <div className="p-4 pt-6 ios-scroll-fix">
        {/* Notification Bell */}
        <div className="flex justify-end mb-4">
          <NotificationBell />
        </div>
        
        {/* Conditional UI based on user role */}
        {isTherapist ? renderTherapistHome() : renderPatientHome()}
      </div>
      
      {/* Add some custom styles for mobile optimization */}
      <style>{`
        .app-container {
          max-width: 100%;
          min-height: 100vh;
          background-color: #f8f9fa;
          overflow-x: hidden;
        }
        
        .mobile-card-button {
          background-color: white;
          padding: 1rem;
          border-radius: 0.75rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          transition: all 0.2s;
          height: 100%;
          border: 1px solid rgba(229, 231, 235, 1);
        }
        
        .mobile-card-title {
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }
        
        .mobile-card-description {
          font-size: 0.7rem;
          color: #6b7280;
        }
        
        @media (max-width: 640px) {
          .app-container {
            padding-bottom: 4rem;
          }
        }
      `}</style>
    </div>
  );
}
