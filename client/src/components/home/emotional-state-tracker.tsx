import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  AlertCircle, Activity, TrendingDown, TrendingUp, 
  Heart, Lightbulb, ThumbsUp
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

export function EmotionalStateTracker() {
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
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 mb-6 shadow-lg border border-primary/30">
        <div className="flex items-center mb-4">
          <div className="bg-primary rounded-full p-3 mr-3 shadow-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-bold text-xl text-gray-900">Estado Emocional</h2>
        </div>
        
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-md">
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex space-x-2 pt-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 mb-6 shadow-lg border border-primary/30">
        <div className="flex items-center mb-4">
          <div className="bg-primary rounded-full p-3 mr-3 shadow-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-bold text-xl text-gray-900">Estado Emocional</h2>
          <div className="ml-auto">
            <span className="text-xs whitespace-nowrap font-medium text-primary-dark bg-primary/10 px-2 py-1.5 rounded-full border border-primary/20">
              Atualizando
            </span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 border-l-4 border-l-primary-dark border-t border-r border-b border-gray-200 shadow-md">
          <h3 className="text-lg font-bold mb-3 text-gray-900 bg-gradient-to-r from-primary-dark/20 to-transparent px-3 py-2 rounded-lg">
            Momento de Reflexão
          </h3>
          
          <div className="space-y-4">
            <div className="px-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Processamento</span>
                <span className="text-xs whitespace-nowrap bg-primary/10 text-primary-dark px-2 py-1 rounded-full">
                  <ThumbsUp className="h-3 w-3 inline mr-1" />
                  Processando
                </span>
              </div>
              <Progress 
                value={30} 
                className="h-3 bg-slate-100" 
                indicatorClassName="bg-primary/40"
              />
            </div>
            
            <div className="rounded-lg p-4 mx-3 bg-gray-50 border border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed">
                Estamos atualizando seu perfil emocional. Enquanto isso, que tal aproveitar o momento para refletir sobre como você se sente agora? 
                Olhe para dentro e observe suas emoções atuais sem julgamento. Esta prática de atenção plena fortalece sua inteligência emocional.
              </p>
            </div>
            
            <div className="px-3 space-y-3">
              <div className="flex items-start space-x-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Exercício de Bem-estar</p>
                  <p className="text-xs text-gray-600">
                    Faça três respirações profundas e nomeie cinco emoções que você sentiu hoje. Depois, anote-as no seu diário.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Próximos Passos</p>
                  <p className="text-xs text-gray-600">
                    Visite novamente esta seção mais tarde para ver seu perfil emocional atualizado, ou converse com a Sana sobre como você está se sentindo agora.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se não houver dados suficientes
  if (!data || (data.hasSufficientData === false)) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 mb-6 shadow-lg border border-primary/30">
        <div className="flex items-center mb-4">
          <div className="bg-primary rounded-full p-3 mr-3 shadow-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-bold text-xl text-gray-900">Estado Emocional</h2>
          <div className="ml-auto">
            <span className="text-xs whitespace-nowrap font-medium text-primary-dark bg-primary/10 px-2 py-1.5 rounded-full border border-primary/20">
              {data ? "Dados Iniciais" : "Aguardando Dados"}
            </span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 border-l-4 border-l-primary-dark border-t border-r border-b border-gray-200 shadow-md">
          <h3 className="text-lg font-bold mb-3 text-gray-900 bg-gradient-to-r from-primary-dark/20 to-transparent px-3 py-2 rounded-lg">
            Conhecendo Você
          </h3>
          
          <div className="space-y-4">
            <div className="px-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Perfil Emocional</span>
                <span className="text-xs whitespace-nowrap bg-primary/10 text-primary-dark px-2 py-1 rounded-full">
                  <ThumbsUp className="h-3 w-3 inline mr-1" />
                  Aprendendo
                </span>
              </div>
              <Progress 
                value={15} 
                className="h-3 bg-slate-100" 
                indicatorClassName="bg-primary/40"
              />
            </div>
            
            <div className="rounded-lg p-4 mx-3 bg-gray-50 border border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed">
                {data?.message || 
                "Estamos começando a conhecer você! À medida que você utiliza mais recursos do aplicativo, nossa análise de seu perfil emocional ficará mais precisa e personalizada. Cada entrada no diário, interação com o assistente e atividade de bem-estar nos ajudam a compreender melhor suas emoções."}
              </p>
            </div>
            
            <div className="px-3 space-y-3">
              <div className="flex items-start space-x-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Dicas para Enriquecer seu Perfil</p>
                  <p className="text-xs text-gray-600">
                    Compartilhe seus pensamentos no diário, descrevendo como você se sente e o que causou essas emoções.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Próximos Passos</p>
                  <p className="text-xs text-gray-600">
                    {data?.suggestedActions && data.suggestedActions.length > 0 
                      ? data.suggestedActions[0] 
                      : "Experimente conversar com a Sana sobre suas emoções, participar de exercícios de auto-ajuda, e manter um registro regular do seu humor."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ios-card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="ios-section-title">
          <Activity className="h-5 w-5 mr-2 text-primary" />
          <span>Estado Emocional</span>
        </div>
        <div 
          className="px-3 py-1 rounded-full text-xs font-medium border flex items-center"
          style={{ 
            backgroundColor: data.trend === 'improving' ? '#dcfce7' : data.trend === 'declining' ? '#fee2e2' : '#f3f4f6',
            color: data.trend === 'improving' ? '#166534' : data.trend === 'declining' ? '#991b1b' : '#374151',
            borderColor: data.trend === 'improving' ? '#86efac' : data.trend === 'declining' ? '#fca5a5' : '#e5e7eb',
          }}
        >
          {data.trend === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
          {data.trend === 'declining' && <TrendingDown className="h-3 w-3 mr-1" />}
          {data.trend === 'improving' ? 'Melhorando' : data.trend === 'declining' ? 'Atenção' : 'Estável'}
        </div>
      </div>
      
      {/* Card principal com informações */}
      <div 
        className="rounded-xl overflow-hidden border shadow-sm mb-3 hardware-accelerated" 
        style={{ borderLeftWidth: '4px', borderLeftColor: emotionStyle.color }}
      >
        {/* Cabeçalho com estado emocional atual */}
        <div 
          className="px-4 py-3 font-medium text-[15px]"
          style={{ backgroundColor: `${emotionStyle.bgColor}20` }}
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
              
              {data.secondaryEmotions && data.secondaryEmotions.slice(0, 3).map((emotion, idx) => {
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
                {data.recentTriggers.slice(0, 2).map((trigger, idx) => (
                  <div key={idx} className="flex items-start text-xs text-gray-600">
                    <span className="mr-2 text-gray-400">•</span>
                    <span>{trigger}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Linha separadora */}
          <div className="border-t border-gray-100 my-1.5"></div>
          
          {/* Ações sugeridas */}
          {data.suggestedActions && data.suggestedActions.length > 0 && (
            <div>
              <div className="flex items-center mb-2">
                <Lightbulb className="h-3.5 w-3.5 mr-1.5 text-primary" />
                <p className="text-xs font-medium text-gray-700">Sugestões para você:</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs text-gray-600">
                {data.suggestedActions.slice(0, 2).map((action, idx) => (
                  <div key={idx} className="flex items-start">
                    <span className="text-primary mr-1.5 font-medium">{idx + 1}.</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Última atualização */}
          <div className="flex justify-end">
            <span className="text-[10px] text-gray-400">
              Atualizado em {new Date(data.lastUpdated).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}