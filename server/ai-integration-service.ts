/**
 * Serviço de Integração de IA
 * 
 * Este serviço funciona como uma camada de integração entre diferentes componentes de IA do sistema:
 * - Análise de entradas de diário
 * - Processamento de mensagens do assistente virtual
 * - Geração de estados emocionais
 * - Criação de dicas personalizadas
 * - Recomendações de conteúdo
 * 
 * O objetivo é garantir que todos os componentes de IA trabalhem de forma coesa,
 * compartilhando dados e insights entre si para proporcionar uma experiência
 * personalizada e eficaz para o usuário.
 */

import OpenAI from "openai";
import { storage } from "./storage";
import { cacheService } from "./cache-service";
import { generateDailyTip } from "./daily-tips-service";
import { encrypt } from "./crypto-utils";
import { cleanAIResponseText } from "./utils/text-formatter";

// Para LGPD, iremos apenas registrar no log por enquanto
// A implementação completa de LGPD será feita posteriormente
const lgpdComplianceService = {
  logDataProcessing: async (data: any) => {
    console.log(`[LGPD] Processamento de dados: ${JSON.stringify(data)}`);
    return true;
  }
};

// Inicializar OpenAI com validação da chave API
if (!process.env.OPENAI_API_KEY) {
  console.warn("AVISO: OPENAI_API_KEY não está definida. Os recursos de IA não funcionarão corretamente.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Estrutura para armazenar insights derivados de diferentes fontes
interface UserInsights {
  emotionalPatterns: {
    dominantMood: string;
    secondaryMoods: string[];
    recentTrend: 'improving' | 'stable' | 'declining';
    commonTriggers: string[];
  };
  cognitivePatterns: {
    recurrentThoughts: string[];
    cognitiveDistortions: string[];
    selfTalk: string[];
  };
  behavioralPatterns: {
    copingStrategies: string[];
    avoidanceBehaviors: string[];
    positiveActivities: string[];
  };
  treatmentContext: {
    therapyGoals: string[];
    effectiveInterventions: string[];
    challengingAreas: string[];
  };
  metadata: {
    lastUpdated: Date;
    dataSourcesUsed: string[];
    confidenceScore: number;
  };
}

/**
 * Coordena a atualização de todos os componentes de IA quando novas informações são adicionadas
 * Função principal que deve ser chamada sempre que houver uma nova entrada de informação significativa
 * 
 * @param userId ID do usuário cujos dados de IA serão atualizados
 * @param sourceType Tipo de fonte que originou a atualização (diário, assistente, perfil, etc)
 * @returns Status da operação
 */
export async function updateAllAIComponents(
  userId: number, 
  sourceType: 'journal' | 'assistant' | 'profile' | 'therapy' | 'selfHelp' | 'daily-tips'
): Promise<boolean> {
  try {
    console.log(`[AIIntegration] Iniciando atualização de componentes de IA para usuário ${userId} a partir de fonte ${sourceType}`);
    
    // 1. Registrar atividade de processamento (LGPD)
    await lgpdComplianceService.logDataProcessing({
      userId,
      activityType: 'ai_processing',
      dataCategories: ['user_generated_content', 'behavioral_data', 'derived_insights'],
      processingPurpose: 'personalization',
      legalBasis: 'legitimate_interest',
      description: `Atualização integrada de componentes de IA a partir de ${sourceType}`,
      retention: '90 days'
    });
    
    // 2. Limpar cache para forçar recálculo de dados derivados
    invalidateUserDataCache(userId);
    
    // 3. Gerar insights integrados do usuário
    const userInsights = await generateIntegratedUserInsights(userId);
    
    // 4. Atualizar estado emocional com dados recém-gerados
    const emotionalStateUpdated = await updateEmotionalState(userId, userInsights);
    
    // 5. Gerar nova dica diária baseada nos insights integrados
    const dailyTipUpdated = await updateDailyTip(userId, userInsights);
    
    // 6. Atualizar contexto do assistente para refletir novos insights
    const assistantContextUpdated = await updateAssistantContext(userId, userInsights);
    
    // 7. Gerar recomendações de conteúdo personalizadas
    const recommendationsUpdated = await updateContentRecommendations(userId, userInsights);
    
    console.log(`[AIIntegration] Atualização de componentes de IA concluída para usuário ${userId}`);
    console.log(`Estado emocional: ${emotionalStateUpdated ? 'Atualizado' : 'Falha'}`);
    console.log(`Dica diária: ${dailyTipUpdated ? 'Atualizada' : 'Falha'}`);
    console.log(`Contexto do assistente: ${assistantContextUpdated ? 'Atualizado' : 'Falha'}`);
    console.log(`Recomendações: ${recommendationsUpdated ? 'Atualizadas' : 'Falha'}`);
    
    return emotionalStateUpdated || dailyTipUpdated || assistantContextUpdated || recommendationsUpdated;
  } catch (error) {
    console.error(`[AIIntegration] Erro ao atualizar componentes de IA:`, error);
    return false;
  }
}

/**
 * Invalida todas as entradas de cache relacionadas aos dados de IA do usuário
 * 
 * @param userId ID do usuário
 */
function invalidateUserDataCache(userId: number): void {
  // Invalidar cache do estado emocional (usando a chave padronizada)
  cacheService.delete(`emotional_state:${userId}`);
  
  // Invalidar cache de dicas diárias (seguindo mesmo padrão de nomenclatura)
  cacheService.delete(`daily_tip:${userId}`);
  
  // Invalidar outros caches relacionados (também padronizados)
  cacheService.delete(`user_insights:${userId}`);
  cacheService.delete(`content_recommendations:${userId}`);
  
  // Para compatibilidade durante a transição, remover também as chaves antigas
  cacheService.delete(`emotional_state_user_${userId}`);
  cacheService.delete(`daily_tip_user_${userId}`);
  cacheService.delete(`assistant_context_${userId}`);
  
  console.log(`[AIIntegration] Cache do usuário ${userId} invalidado com sucesso`);
}

/**
 * Gera insights integrados do usuário com base em todas as fontes de dados disponíveis
 * 
 * @param userId ID do usuário
 * @returns Objeto com insights estruturados
 */
async function generateIntegratedUserInsights(userId: number): Promise<UserInsights> {
  try {
    // Verificar se há insights em cache e se ainda são válidos (usando formato de chave padronizado)
    const cachedInsights = await cacheService.get<UserInsights>(`user_insights:${userId}`);
    if (cachedInsights) {
      // Verificar se os insights ainda são recentes (menos de 4 horas - reduzindo de 6 para maior frequência de atualização)
      const now = new Date();
      const lastUpdated = new Date(cachedInsights.metadata.lastUpdated);
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 4) {
        console.log(`[AIIntegration] Usando insights em cache para usuário ${userId} (atualizados há ${hoursSinceUpdate.toFixed(1)} horas)`);
        return cachedInsights;
      }
    }
    
    console.log(`[AIIntegration] Gerando novos insights integrados para usuário ${userId}`);
    
    // Coletar dados de todas as fontes
    const [
      journalEntries,
      assistantMessages,
      userProfile,
      therapySessions,
      selfHelpActivities
    ] = await Promise.all([
      storage.getJournalEntriesByUser(userId),
      storage.getChatMessagesByUser ? storage.getChatMessagesByUser(userId, 50) : [], // Últimas 50 mensagens
      storage.getUser(userId),
      storage.getSessionsByUser ? storage.getSessionsByUser(userId) : [],
      [] // Auto-ajuda não implementada ainda
    ]);
    
    // Log para ajudar a depurar
    console.log(`[AIIntegration] Dados coletados para análise: ${journalEntries.length} entradas de diário, ${assistantMessages.length} mensagens do assistente, ${therapySessions.length} sessões de terapia`);
    
    // Verificar se temos dados suficientes para análise significativa
    if (journalEntries.length === 0 && assistantMessages.length === 0 && therapySessions.length === 0) {
      console.log(`[AIIntegration] Dados insuficientes para análise significativa para o usuário ${userId}`);
      return createNeutralInsightsWithGuidance();
    }
    
    // Preparar os dados para análise integrada
    const journalData = journalEntries.map((entry: any) => ({
      date: new Date(entry.date).toISOString(),
      content: entry.content,
      title: entry.title || null,
      mood: entry.mood,
      emotionalTags: entry.dominantEmotions || [],
      category: entry.category,
      summary: entry.summary || null
    }));
    
    const messagesData = assistantMessages.map((msg: any) => ({
      timestamp: new Date(msg.timestamp || new Date()).toISOString(),
      content: msg.content,
      role: msg.role,
      emotionalTone: msg.metadata?.emotionalTone
    }));
    
    const sessionsData = therapySessions.map((session: any) => ({
      date: new Date(session.scheduledFor).toISOString(),
      status: session.status,
      notes: session.notes || null,
      duration: session.duration || 50
    }));
    
    // Extração de dados relevantes do perfil 
    // Trata campos que podem não existir ainda no esquema do usuário
    const profileData = {
      fears: [],
      anxieties: [],
      goals: [],
      strengths: [],
      interests: [],
      occupation: userProfile?.occupation || null,
      age: userProfile?.dateOfBirth ? Math.floor((new Date().getTime() - new Date(userProfile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
    };
    
    // Usar IA para analisar todos os dados em conjunto
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    let analyzedData: any = {
      emotionalPatterns: {
        dominantMood: "Neutro",
        secondaryMoods: [],
        recentTrend: "stable",
        commonTriggers: []
      },
      cognitivePatterns: {
        recurrentThoughts: [],
        cognitiveDistortions: [],
        selfTalk: []
      },
      behavioralPatterns: {
        copingStrategies: [],
        avoidanceBehaviors: [],
        positiveActivities: []
      },
      treatmentContext: {
        therapyGoals: [],
        effectiveInterventions: [],
        challengingAreas: []
      },
      metadata: {
        confidenceScore: 0
      }
    };
    
    try {
      if (process.env.OPENAI_API_KEY) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Você é um sistema avançado de análise psicológica que integra dados de múltiplas fontes
              para criar um perfil completo e compreensivo de padrões emocionais, cognitivos e comportamentais 
              de um usuário de plataforma de saúde mental. Sua análise deve ser profunda, baseada em evidências
              e orientada para insights acionáveis.`
            },
            {
              role: "user",
              content: `Analise os seguintes dados de um usuário e gere insights psicológicos integrados em formato json:
              
              ENTRADAS DE DIÁRIO (${journalData.length}):
              ${JSON.stringify(journalData, null, 2)}
              
              INTERAÇÕES COM ASSISTENTE (${messagesData.length}):
              ${JSON.stringify(messagesData, null, 2)}
              
              SESSÕES DE TERAPIA (${sessionsData.length}):
              ${JSON.stringify(sessionsData, null, 2)}
              
              DADOS DO PERFIL:
              ${JSON.stringify(profileData, null, 2)}
              
              Gere insights estruturados em json conforme o formato abaixo:
              {
                "emotionalPatterns": {
                  "dominantMood": "string - humor predominante",
                  "secondaryMoods": ["array de humores secundários"],
                  "recentTrend": "improving/stable/declining - tendência recente",
                  "commonTriggers": ["gatilhos comuns identificados"]
                },
                "cognitivePatterns": {
                  "recurrentThoughts": ["pensamentos recorrentes"],
                  "cognitiveDistortions": ["distorções cognitivas identificadas"],
                  "selfTalk": ["padrões de diálogo interno"]
                },
                "behavioralPatterns": {
                  "copingStrategies": ["estratégias de enfrentamento utilizadas"],
                  "avoidanceBehaviors": ["comportamentos de evitação"],
                  "positiveActivities": ["atividades que promovem bem-estar"]
                },
                "treatmentContext": {
                  "therapyGoals": ["objetivos terapêuticos sugeridos"],
                  "effectiveInterventions": ["intervenções que parecem efetivas"],
                  "challengingAreas": ["áreas que precisam de mais atenção"]
                },
                "metadata": {
                  "confidenceScore": número entre 0 e 1 indicando confiança na análise
                }
              }
              
              Certifique-se de que sua resposta seja um objeto json válido.`
            }
          ],
          response_format: { type: "json_object" }
        });
        
        if (response.choices[0].message.content) {
          analyzedData = JSON.parse(response.choices[0].message.content);
          
          // Limpar formatações markdown indesejadas
          if (analyzedData.emotionalPatterns) {
            if (analyzedData.emotionalPatterns.dominantMood) {
              analyzedData.emotionalPatterns.dominantMood = cleanAIResponseText(analyzedData.emotionalPatterns.dominantMood);
            }
            if (Array.isArray(analyzedData.emotionalPatterns.secondaryMoods)) {
              analyzedData.emotionalPatterns.secondaryMoods = analyzedData.emotionalPatterns.secondaryMoods.map(
                (mood: string) => cleanAIResponseText(mood)
              );
            }
            if (Array.isArray(analyzedData.emotionalPatterns.commonTriggers)) {
              analyzedData.emotionalPatterns.commonTriggers = analyzedData.emotionalPatterns.commonTriggers.map(
                (trigger: string) => cleanAIResponseText(trigger)
              );
            }
          }
          
          // Limpar outros campos com conteúdo textual
          if (analyzedData.cognitivePatterns) {
            ['recurrentThoughts', 'cognitiveDistortions', 'selfTalk'].forEach(field => {
              if (Array.isArray(analyzedData.cognitivePatterns[field])) {
                analyzedData.cognitivePatterns[field] = analyzedData.cognitivePatterns[field].map(
                  (item: string) => cleanAIResponseText(item)
                );
              }
            });
          }
          
          if (analyzedData.behavioralPatterns) {
            ['copingStrategies', 'avoidanceBehaviors', 'positiveActivities'].forEach(field => {
              if (Array.isArray(analyzedData.behavioralPatterns[field])) {
                analyzedData.behavioralPatterns[field] = analyzedData.behavioralPatterns[field].map(
                  (item: string) => cleanAIResponseText(item)
                );
              }
            });
          }
          
          if (analyzedData.treatmentContext) {
            ['therapyGoals', 'effectiveInterventions', 'challengingAreas'].forEach(field => {
              if (Array.isArray(analyzedData.treatmentContext[field])) {
                analyzedData.treatmentContext[field] = analyzedData.treatmentContext[field].map(
                  (item: string) => cleanAIResponseText(item)
                );
              }
            });
          }
        }
      } else {
        console.log("[AIIntegration] OPENAI_API_KEY não está definido");
      }
    } catch (err) {
      console.error(`[AIIntegration] Erro na análise de IA:`, err);
      // Dados básicos já foram definidos acima
    }
    
    // Estruturar os insights no formato esperado
    const insights: UserInsights = {
      ...analyzedData,
      metadata: {
        ...analyzedData.metadata,
        lastUpdated: new Date(),
        dataSourcesUsed: [
          journalData.length > 0 ? 'journal_entries' : null,
          messagesData.length > 0 ? 'assistant_interactions' : null,
          sessionsData.length > 0 ? 'therapy_sessions' : null,
          Object.values(profileData).some(val => val && (Array.isArray(val) ? val.length > 0 : true)) ? 'user_profile' : null
        ].filter(Boolean) as string[]
      }
    };
    
    // Armazenar em cache por 6 horas usando nomenclatura padronizada
    cacheService.set(`user_insights:${userId}`, insights, { ttl: 6 * 60 * 60 * 1000 }); // 6 horas TTL
    
    return insights;
  } catch (error) {
    console.error(`[AIIntegration] Erro ao gerar insights integrados:`, error);
    
    // Retornar uma estrutura básica em caso de erro
    return {
      emotionalPatterns: {
        dominantMood: "Neutro",
        secondaryMoods: [],
        recentTrend: 'stable',
        commonTriggers: []
      },
      cognitivePatterns: {
        recurrentThoughts: [],
        cognitiveDistortions: [],
        selfTalk: []
      },
      behavioralPatterns: {
        copingStrategies: [],
        avoidanceBehaviors: [],
        positiveActivities: []
      },
      treatmentContext: {
        therapyGoals: [],
        effectiveInterventions: [],
        challengingAreas: []
      },
      metadata: {
        lastUpdated: new Date(),
        dataSourcesUsed: ['error_fallback'],
        confidenceScore: 0
      }
    };
  }
}

/**
 * Atualiza o estado emocional do usuário com base nos insights integrados
 * 
 * @param userId ID do usuário
 * @param insights Insights integrados do usuário
 * @returns Status da operação
 */
async function updateEmotionalState(userId: number, insights: UserInsights): Promise<boolean> {
  try {
    // Verificar se temos dados suficientes para uma análise precisa
    const hasSufficientData = 
      insights.metadata.dataSourcesUsed.length > 1 || 
      insights.metadata.confidenceScore > 0.5;
    
    // Mapear insights para o formato do estado emocional
    const emotionalState = {
      currentState: hasSufficientData 
        ? mapDominantMoodToState(insights.emotionalPatterns.dominantMood)
        : "Neutro - Dados insuficientes",
      intensity: hasSufficientData 
        ? calculateEmotionalIntensity(insights)
        : 50, // valor neutro
      dominantEmotion: hasSufficientData 
        ? insights.emotionalPatterns.dominantMood
        : "Neutro",
      secondaryEmotions: hasSufficientData 
        ? insights.emotionalPatterns.secondaryMoods
        : ["Calma"],
      trend: hasSufficientData 
        ? insights.emotionalPatterns.recentTrend
        : "stable",
      recentTriggers: hasSufficientData 
        ? insights.emotionalPatterns.commonTriggers
        : [],
      suggestedActions: hasSufficientData 
        ? generateSuggestedActions(insights)
        : ["Registrar mais entradas no diário", "Interagir com o assistente", "Explorar ferramentas de autoajuda"],
      lastUpdated: new Date().toISOString(),
      dataConfidence: insights.metadata.confidenceScore,
      hasSufficientData: hasSufficientData
    };
    
    // Adicionar mensagem encorajadora se não houver dados suficientes
    if (!hasSufficientData) {
      // @ts-ignore - adicionamos essa propriedade à interface, mas a tipagem não foi atualizada
      emotionalState.message = "Continue registrando seus pensamentos e emoções. Isso nos ajudará a oferecer insights mais personalizados sobre seu bem-estar emocional.";
    }
    
    console.log(`[AIIntegration] Estado emocional gerado para usuário ${userId}: ${emotionalState.currentState} (Confiança: ${insights.metadata.confidenceScore})`);
    
    // Armazenar em cache com chave padronizada
    cacheService.set(`emotional_state:${userId}`, emotionalState, { ttl: 2 * 60 * 60 * 1000 }); // 2 horas TTL
    
    // Para compatibilidade com componentes mais antigos, também armazenar no formato antigo de chave
    // Isso pode ser removido depois de garantir que todos os componentes usam o novo formato
    cacheService.set(`emotional_state_user_${userId}`, emotionalState, { ttl: 2 * 60 * 60 * 1000 });
    
    return true;
  } catch (error) {
    console.error(`[AIIntegration] Erro ao atualizar estado emocional:`, error);
    return false;
  }
}

/**
 * Atualiza a dica diária do usuário com base nos insights integrados
 * 
 * @param userId ID do usuário
 * @param insights Insights integrados do usuário
 * @returns Status da operação
 */
async function updateDailyTip(userId: number, insights: UserInsights): Promise<boolean> {
  try {
    // Usar o serviço existente de dicas diárias, que já possui lógica para analisar dados do usuário
    const dailyTip = await generateDailyTip(userId);
    
    // Se conseguimos gerar uma nova dica, foi um sucesso
    return dailyTip !== null;
  } catch (error) {
    console.error(`[AIIntegration] Erro ao atualizar dica diária:`, error);
    return false;
  }
}

/**
 * Atualiza o contexto do assistente virtual com os insights integrados
 * 
 * @param userId ID do usuário
 * @param insights Insights integrados do usuário
 * @returns Status da operação
 */
async function updateAssistantContext(userId: number, insights: UserInsights): Promise<boolean> {
  try {
    // Obter o usuário
    const user = await storage.getUser(userId);
    if (!user) {
      return false;
    }
    
    // Criar um contexto enriquecido para o assistente
    const enhancedContext = {
      userProfile: {
        firstName: user.firstName,
        age: user.dateOfBirth ? Math.floor((new Date().getTime() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        occupation: user.occupation || null
      },
      emotionalState: {
        dominantMood: insights.emotionalPatterns.dominantMood,
        trend: insights.emotionalPatterns.recentTrend,
        triggers: insights.emotionalPatterns.commonTriggers
      },
      therapeuticFocus: {
        recurrentThemes: insights.cognitivePatterns.recurrentThoughts.slice(0, 3),
        possibleDistortions: insights.cognitivePatterns.cognitiveDistortions.slice(0, 3),
        effectiveStrategies: insights.behavioralPatterns.copingStrategies.slice(0, 3)
      }
    };
    
    // Criptografar o contexto por razões de privacidade
    const encryptedContext = encrypt(JSON.stringify(enhancedContext));
    
    // Armazenar em cache usando a nomenclatura padronizada
    cacheService.set(`assistant_context:${userId}`, enhancedContext, { ttl: 24 * 60 * 60 * 1000 }); // 24 horas TTL
    console.log(`[AIIntegration] Contexto do assistente atualizado em cache para usuário ${userId}`);
    
    return true;
  } catch (error) {
    console.error(`[AIIntegration] Erro ao atualizar contexto do assistente:`, error);
    return false;
  }
}

/**
 * Atualiza as recomendações de conteúdo personalizadas para o usuário
 * 
 * @param userId ID do usuário
 * @param insights Insights integrados do usuário
 * @returns Status da operação
 */
async function updateContentRecommendations(userId: number, insights: UserInsights): Promise<boolean> {
  try {
    // Usar createContentRecommendation que é a função disponível no storage
    
    // Gerar recomendações baseadas nos insights
    const recommendations = [
      {
        title: `Lidando com ${insights.emotionalPatterns.dominantMood}`,
        description: `Estratégias para gerenciar momentos de ${insights.emotionalPatterns.dominantMood.toLowerCase()} e transformá-los em oportunidades de crescimento.`,
        type: "article",
        category: "gerenciamento_emocional",
        priority: calculatePriority(insights, "emotional"),
        tags: [insights.emotionalPatterns.dominantMood.toLowerCase(), "bem-estar", "autogerenciamento"]
      },
      {
        title: `Exercícios para ${insights.treatmentContext.challengingAreas[0] || "desenvolvimento pessoal"}`,
        description: `Técnicas práticas para trabalhar ${insights.treatmentContext.challengingAreas[0]?.toLowerCase() || "questões emocionais"} e fortalecer seu bem-estar.`,
        type: "exercise",
        category: "autoajuda",
        priority: calculatePriority(insights, "behavioral"),
        tags: ["exercícios", "prática", "desenvolvimento"]
      },
      {
        title: `Entendendo padrões de ${insights.cognitivePatterns.cognitiveDistortions[0] || "pensamento"}`,
        description: `Como identificar e transformar padrões de ${insights.cognitivePatterns.cognitiveDistortions[0]?.toLowerCase() || "pensamento"} que afetam seu bem-estar.`,
        type: "video",
        category: "terapia_cognitiva",
        priority: calculatePriority(insights, "cognitive"),
        tags: ["insights", "padrões", "consciência"]
      }
    ];
    
    // Criar recomendações uma a uma
    const creationPromises = recommendations.map(async (rec) => {
      try {
        await storage.createContentRecommendation({
          userId,
          ...rec,
          content: null
        });
        return true;
      } catch (err) {
        console.error(`[AIIntegration] Erro ao criar recomendação individual:`, err);
        return false;
      }
    });
    
    const results = await Promise.all(creationPromises);
    const success = results.some(result => result);
    
    return success;
  } catch (error) {
    console.error(`[AIIntegration] Erro ao atualizar recomendações de conteúdo:`, error);
    return false;
  }
}

/**
 * Mapeia o humor dominante para um estado emocional
 * 
 * @param dominantMood Humor dominante do usuário
 * @returns Estado emocional correspondente
 */
function mapDominantMoodToState(dominantMood: string): string {
  const moodMap: Record<string, string> = {
    "alegria": "Estado Positivo - Felicidade",
    "calma": "Estado Equilibrado - Serenidade",
    "esperança": "Estado Positivo - Esperança",
    "gratidão": "Estado Positivo - Gratidão",
    "entusiasmo": "Estado Positivo - Entusiasmo",
    "satisfação": "Estado Positivo - Contentamento",
    "neutro": "Estado Equilibrado",
    "confusão": "Estado de Transição - Confusão",
    "ansiedade": "Estado de Alerta - Ansiedade",
    "preocupação": "Estado de Alerta - Preocupação",
    "tristeza": "Estado Desafiador - Tristeza",
    "frustração": "Estado Desafiador - Frustração",
    "raiva": "Estado Intenso - Raiva",
    "medo": "Estado de Alerta - Medo",
    "desânimo": "Estado Desafiador - Desânimo"
  };
  
  // Tentar encontrar correspondência exata
  if (moodMap[dominantMood.toLowerCase()]) {
    return moodMap[dominantMood.toLowerCase()];
  }
  
  // Tentar encontrar correspondência parcial
  const matchedKey = Object.keys(moodMap).find(key => 
    dominantMood.toLowerCase().includes(key) || key.includes(dominantMood.toLowerCase())
  );
  
  return matchedKey ? moodMap[matchedKey] : "Estado Emocional Atual";
}

/**
 * Calcula a intensidade emocional com base nos insights
 * 
 * @param insights Insights integrados do usuário
 * @returns Valor de intensidade (0-100)
 */
function calculateEmotionalIntensity(insights: UserInsights): number {
  // Mapeamento de humores para intensidades base
  const intensityMap: Record<string, number> = {
    "alegria": 70,
    "calma": 30,
    "esperança": 60,
    "gratidão": 65,
    "entusiasmo": 80,
    "satisfação": 60,
    "neutro": 50,
    "confusão": 65,
    "ansiedade": 75,
    "preocupação": 70,
    "tristeza": 65,
    "frustração": 75,
    "raiva": 85,
    "medo": 80,
    "desânimo": 60
  };
  
  // Intensidade base do humor dominante
  const baseIntensity = intensityMap[insights.emotionalPatterns.dominantMood.toLowerCase()] || 50;
  
  // Ajustar com base na tendência
  const trendAdjustment = 
    insights.emotionalPatterns.recentTrend === 'improving' ? -5 :
    insights.emotionalPatterns.recentTrend === 'declining' ? 10 : 0;
  
  // Ajustar com base no número de gatilhos identificados
  const triggerAdjustment = Math.min(insights.emotionalPatterns.commonTriggers.length * 5, 15);
  
  // Calcular intensidade final
  const finalIntensity = Math.max(10, Math.min(95, baseIntensity + trendAdjustment + triggerAdjustment));
  
  return finalIntensity;
}

/**
 * Gera ações sugeridas com base nos insights
 * 
 * @param insights Insights integrados do usuário
 * @returns Lista de ações sugeridas
 */
function generateSuggestedActions(insights: UserInsights): string[] {
  // Ações básicas sempre presentes
  const baseActions = [
    "Continue registrando seus pensamentos e sentimentos no diário"
  ];
  
  // Adicionar estratégias de enfrentamento eficazes
  const copingActions = insights.behavioralPatterns.copingStrategies.map(strategy => 
    `Pratique ${strategy.toLowerCase()}`
  );
  
  // Adicionar ações para emoções específicas
  let emotionSpecificActions: string[] = [];
  
  switch (insights.emotionalPatterns.dominantMood.toLowerCase()) {
    case 'ansiedade':
    case 'preocupação':
    case 'medo':
      emotionSpecificActions = [
        "Experimente exercícios de respiração profunda por 5 minutos",
        "Anote suas preocupações e classifique-as por probabilidade real"
      ];
      break;
    case 'tristeza':
    case 'desânimo':
      emotionSpecificActions = [
        "Comprometa-se com uma pequena atividade prazerosa hoje",
        "Conecte-se com uma pessoa de confiança"
      ];
      break;
    case 'raiva':
    case 'frustração':
      emotionSpecificActions = [
        "Permita-se um momento de pausa antes de reagir",
        "Pratique expressar suas necessidades de forma assertiva"
      ];
      break;
    case 'neutro':
    case 'calma':
      emotionSpecificActions = [
        "Aproveite para estabelecer uma nova rotina positiva",
        "Reflita sobre seus objetivos pessoais"
      ];
      break;
    default:
      emotionSpecificActions = [
        "Observe quais atividades melhoram seu bem-estar",
        "Reserve um momento para autocuidado hoje"
      ];
  }
  
  // Adicionar ações para desafios cognitivos
  const cognitiveActions = insights.cognitivePatterns.cognitiveDistortions.length > 0 
    ? [`Pratique identificar quando está tendo pensamentos de ${insights.cognitivePatterns.cognitiveDistortions[0].toLowerCase()}`]
    : [];
  
  // Combinar e limitar a 4 ações no máximo
  return [...baseActions, ...emotionSpecificActions, ...copingActions, ...cognitiveActions].slice(0, 4);
}

/**
 * Cria insights neutros com orientações quando o usuário tem dados insuficientes
 * Esta função é chamada quando não temos dados suficientes para análise significativa
 * 
 * @returns Objeto com insights neutros e mensagens encorajadoras
 */
function createNeutralInsightsWithGuidance(): UserInsights {
  return {
    emotionalPatterns: {
      dominantMood: "Neutro",
      secondaryMoods: ["Calma"],
      recentTrend: 'stable',
      commonTriggers: []
    },
    cognitivePatterns: {
      recurrentThoughts: ["Iniciando sua jornada de autoconhecimento"],
      cognitiveDistortions: [],
      selfTalk: ["Aprendendo a monitorar meus pensamentos e emoções", "Continue registrando suas experiências para obter insights mais personalizados"]
    },
    behavioralPatterns: {
      copingStrategies: ["Registrar pensamentos e emoções", "Conversar com o assistente virtual", "Praticar autocuidado", "Explorar ferramentas do aplicativo"],
      avoidanceBehaviors: [],
      positiveActivities: ["Usar o diário regularmente", "Explorar ferramentas de autoajuda", "Você está dando os primeiros passos para seu bem-estar!"]
    },
    treatmentContext: {
      therapyGoals: ["Estabelecer uma rotina de automonitoramento", "Desenvolver consciência emocional", "Construir hábitos positivos de saúde mental"],
      effectiveInterventions: ["Diário emocional", "Assistente virtual para suporte", "Técnicas de mindfulness", "Dicas diárias personalizadas"],
      challengingAreas: ["Dados insuficientes para análise completa"]
    },
    metadata: {
      lastUpdated: new Date(),
      dataSourcesUsed: ['limited_data'],
      confidenceScore: 0.3
    }
  };
}

/**
 * Calcula a prioridade para recomendações de conteúdo
 * 
 * @param insights Insights integrados do usuário
 * @param type Tipo de recomendação (emotional, cognitive, behavioral)
 * @returns Valor de prioridade (1-10)
 */
function calculatePriority(insights: UserInsights, type: 'emotional' | 'cognitive' | 'behavioral'): number {
  switch (type) {
    case 'emotional':
      // Prioridade mais alta para estados emocionais desafiadores
      if (['ansiedade', 'tristeza', 'raiva', 'medo', 'desânimo'].includes(insights.emotionalPatterns.dominantMood.toLowerCase())) {
        return 9;
      }
      return 7;
    
    case 'cognitive':
      // Prioridade baseada no número de distorções cognitivas
      return Math.min(9, 5 + insights.cognitivePatterns.cognitiveDistortions.length);
    
    case 'behavioral':
      // Prioridade baseada na tendência emocional
      return insights.emotionalPatterns.recentTrend === 'declining' ? 10 : 
             insights.emotionalPatterns.recentTrend === 'stable' ? 7 : 5;
    
    default:
      return 5;
  }
}