import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { IOSTouchWrapper, IOSButton } from '@/components/ui/ios-touch-wrapper';
import { EventCaptureLayer } from '@/components/ui/event-capture-layer';
import { 
  AlertCircle, Activity, TrendingDown, TrendingUp, 
  Heart, Lightbulb, ThumbsUp, BarChart4, Calendar, 
  LineChart, ArrowUpRight, Info
} from 'lucide-react';

interface EmotionalState {
  currentState: string;
  intensity: number; // 0-100
  dominantEmotion: string;
  secondaryEmotions: string[];
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
  recentTriggers?: string[];
  suggestedActions?: string[];
  hasSufficientData?: boolean;
  message?: string;
  dataConfidence?: number;
}

// Mapeamento de emoções para cores
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

export default function EmotionalStatePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/emotional-state'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/emotional-state');
      return await response.json() as EmotionalState;
    },
  });

  // Estado para determinar a cor baseada na emoção dominante
  const [emotionStyle, setEmotionStyle] = useState(defaultEmotionColors);

  useEffect(() => {
    if (data?.dominantEmotion) {
      const emotion = data.dominantEmotion.toLowerCase();
      // Encontre a emoção mais próxima no nosso dicionário
      const matchedEmotion = Object.keys(emotionColors).find(key => 
        emotion.includes(key) || key.includes(emotion)
      );
      
      setEmotionStyle(matchedEmotion ? emotionColors[matchedEmotion] : defaultEmotionColors);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Estado Emocional</h1>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex space-x-3 mt-4">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Estado Emocional</h1>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">Não foi possível carregar seu estado emocional. Tente novamente mais tarde.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EventCaptureLayer>
      <IOSTouchWrapper 
        className="scroll-container-absolute hardware-accelerated-extreme ios-native-scroll-container ios-touch-fix"
        forceEnable={true}
        enableScrollFix={true}
        debug={false}
      >
        <div className="p-4 space-y-5 emotional-state-page ios-momentum-scroll ios-scroll-wrapper ios-events-contained ios-touch-fix">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 shadow-lg border border-primary/30">
            <div className="flex items-center mb-4">
              <div className="bg-primary rounded-full p-3 mr-3 shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <h1 className="font-bold text-xl text-gray-900">Estado Emocional</h1>
              <div className="ml-auto">
                <div 
                  className="px-3 py-1 rounded-full text-xs font-medium border flex items-center"
                  style={{ 
                    backgroundColor: data.trend === 'improving' ? '#dcfce7' : data.trend === 'declining' ? '#fee2e2' : '#f3f4f6',
                    color: data.trend === 'improving' ? '#166534' : data.trend === 'declining' ? '#991b1b' : '#374151',
                    borderColor: data.trend === 'improving' ? '#86efac' : data.trend === 'declining' ? '#fca5a5' : '#e5e7eb',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'rgba(0,0,0,0)'
                  }}
                >
                  {data.trend === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
                  {data.trend === 'declining' && <TrendingDown className="h-3 w-3 mr-1" />}
                  {data.trend === 'improving' ? 'Melhorando' : data.trend === 'declining' ? 'Atenção' : 'Estável'}
                </div>
              </div>
            </div>
          
            {/* Card principal com informações */}
            <div 
              className="rounded-xl overflow-hidden border shadow-sm mb-3" 
              style={{ borderLeftWidth: '4px', borderLeftColor: emotionStyle.color }}
            >
              {/* Cabeçalho com estado emocional atual */}
              <div 
                className="px-4 py-3 font-medium text-[15px]"
                style={{ backgroundColor: `${emotionStyle.bgColor}30` }}
              >
                {data.currentState}
              </div>
              
              {/* Conteúdo do card */}
              <div className="p-4 bg-white space-y-4">
                {/* Intensidade emocional com barra de progresso */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700">Intensidade</span>
                    <div className="flex items-center">
                      {data.trend === 'improving' && (
                        <TrendingUp className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                      )}
                      {data.trend === 'declining' && (
                        <TrendingDown className="h-3.5 w-3.5 mr-1 text-rose-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {data.intensity}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={data.intensity} 
                    className="h-2.5 rounded-full bg-gray-100" 
                    indicatorClassName="bg-primary"
                  />
                </div>
                
                {/* Emoções identificadas */}
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Emoções identificadas:</p>
                  <div className="flex flex-wrap gap-2">
                    <div 
                      className="text-xs px-3 py-1.5 rounded-full border flex items-center font-medium"
                      style={{ 
                        backgroundColor: emotionStyle.bgColor,
                        color: emotionStyle.textColor,
                        borderColor: `${emotionStyle.color}40`
                      }}
                    >
                      <span>{data.dominantEmotion}</span>
                    </div>
                    
                    {data.secondaryEmotions && data.secondaryEmotions.map((emotion, idx) => {
                      const matchedEmotion = Object.keys(emotionColors).find(key => 
                        emotion.toLowerCase().includes(key) || key.includes(emotion.toLowerCase())
                      );
                      const style = matchedEmotion ? emotionColors[matchedEmotion] : defaultEmotionColors;
                      
                      return (
                        <div 
                          key={idx}
                          className="text-xs px-3 py-1.5 rounded-full border flex items-center font-medium opacity-80"
                          style={{ 
                            backgroundColor: style.bgColor,
                            color: style.textColor,
                            borderColor: `${style.color}30`
                          }}
                        >
                          <span>{emotion}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Possíveis gatilhos - somente se houver */}
                {data.recentTriggers && data.recentTriggers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Possíveis gatilhos:</p>
                    <div className="space-y-1">
                      {data.recentTriggers.map((trigger, idx) => (
                        <div 
                          key={idx} 
                          className="text-xs text-gray-700 py-1.5 px-3 rounded-lg bg-gray-50 border border-gray-100 flex items-center"
                        >
                          <span className="mr-1">•</span>
                          <span>{trigger}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Ações sugeridas */}
          {data.suggestedActions && data.suggestedActions.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-md">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Ações Sugeridas</h2>
              <div className="space-y-3">
                {data.suggestedActions.map((action, idx) => (
                  <div key={idx} className="flex items-start">
                    <div className="bg-primary/10 p-2 rounded-full mt-0.5 mr-3">
                      <Lightbulb className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm text-gray-700 flex-1 leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Análise detalhada - Seção adicional para a página completa */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-md">
            <h2 className="text-lg font-bold mb-3 text-gray-900">Análise Detalhada</h2>
            
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center">
                    <LineChart className="h-4 w-4 text-primary mr-2" />
                    <h3 className="font-medium text-gray-800 text-sm">Tendências de Humor</h3>
                  </div>
                  <div className="text-xs text-gray-500">Últimos 7 dias</div>
                </div>
                <div className="p-4">
                  <div className="h-40 w-full bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart4 className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Gráfico de tendências de humor</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                  <Calendar className="h-4 w-4 text-primary mr-2" />
                  <h3 className="font-medium text-gray-800 text-sm">Padrões Identificados</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <ArrowUpRight className="h-4 w-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Mais energia pela manhã</p>
                        <p className="text-xs text-gray-500">Melhor período para atividades que exigem foco</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <TrendingDown className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Maior tranquilidade à noite</p>
                        <p className="text-xs text-gray-500">Ideal para atividades relaxantes e reflexão</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Info className="h-4 w-4 text-purple-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Impacto do sono na estabilidade emocional</p>
                        <p className="text-xs text-gray-500">Dias com melhor sono apresentam menor variação emocional</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recursos de apoio */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-md">
            <h2 className="text-lg font-bold mb-3 text-gray-900">Recursos de Apoio</h2>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h3 className="font-medium text-primary-dark text-sm mb-1">Exercícios de Respiração</h3>
                <p className="text-xs text-gray-700 mb-2">
                  Técnicas de respiração para ajudar a reduzir ansiedade e promover calma.
                </p>
                <IOSButton 
                  className="text-xs font-medium"
                  iosStyle="outline"
                >
                  Acessar Exercícios
                </IOSButton>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h3 className="font-medium text-primary-dark text-sm mb-1">Meditação Guiada</h3>
                <p className="text-xs text-gray-700 mb-2">
                  Áudios curtos para prática diária de mindfulness e foco no momento presente.
                </p>
                <IOSButton 
                  className="text-xs font-medium"
                  iosStyle="outline"
                >
                  Iniciar Meditação
                </IOSButton>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h3 className="font-medium text-primary-dark text-sm mb-1">Falar com Especialista</h3>
                <p className="text-xs text-gray-700 mb-2">
                  Conecte-se com um terapeuta para discutir seu estado emocional.
                </p>
                <IOSButton 
                  className="text-xs font-medium"
                  iosStyle="filled"
                >
                  Ver Terapeutas
                </IOSButton>
              </div>
            </div>
          </div>
        </div>
      </IOSTouchWrapper>
    </EventCaptureLayer>
  );
}