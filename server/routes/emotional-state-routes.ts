import { Router } from 'express';
import { createTokenAuthMiddleware } from '../auth';
import { db } from '../db';
import { desc, eq, and, sql, gt } from 'drizzle-orm';
import { journalEntries, chatMessages, sessions, contentRecommendations } from '@shared/schema';
import { cacheService } from '../cache-service';
import { OpenAI } from 'openai';

// Inicializando OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const router = Router();

interface EmotionalState {
  currentState: string;
  intensity: number; // 0-100
  dominantEmotion: string;
  secondaryEmotions: string[];
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
  recentTriggers?: string[];
  suggestedActions?: string[];
}

// Criando o middleware de autenticação por token
const tokenAuth = createTokenAuthMiddleware();

// Enpoint para obter o estado emocional atual do usuário
router.get('/', tokenAuth, async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  const userId = req.user.id;

  try {
    // Tentamos obter do cache primeiro (verificando ambas as chaves para compatibilidade)
    let cachedState = await cacheService.get<EmotionalState>(`emotional_state:${userId}`);
    
    // Se não encontrar no novo formato, tenta o formato antigo
    if (!cachedState) {
      cachedState = await cacheService.get<EmotionalState>(`emotional_state_user_${userId}`);
    }
    
    if (cachedState) {
      console.log(`[EmotionalState] Usando dados em cache para usuário ${userId}`);
      return res.json(cachedState);
    }

    // Se não estiver em cache, primeiro tentar sincronizar componentes de IA
    try {
      console.log(`[EmotionalState] Sincronizando componentes de IA para usuário ${userId}`);
      // Importar dinamicamente para evitar dependência circular
      const { updateAllAIComponents } = await import('../ai-integration-service');
      await updateAllAIComponents(userId, 'journal');
      console.log(`[EmotionalState] Sincronização de IA concluída para usuário ${userId}`);
    } catch (syncError) {
      console.error(`[EmotionalState] Erro na sincronização de IA para usuário ${userId}:`, syncError);
      // Continuar mesmo que a sincronização falhe
    }
    
    // Calcula o estado emocional
    const emotionalState = await calculateEmotionalState(userId);
    
    // Armazena em cache (ambas versões para compatibilidade)
    cacheService.set(`emotional_state:${userId}`, emotionalState, { ttl: 2 * 60 * 60 * 1000 }); // Novo formato
    cacheService.set(`emotional_state_user_${userId}`, emotionalState, { ttl: 2 * 60 * 60 * 1000 }); // Formato antigo
    
    return res.json(emotionalState);
  } catch (error) {
    console.error('[EmotionalState] Erro ao processar estado emocional:', error);
    return res.status(500).json({ 
      message: 'Erro ao processar estado emocional', 
      error: error.message 
    });
  }
});

// Endpoint para forçar recalculamento do estado emocional
router.post('/recalculate', tokenAuth, async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  const userId = req.user.id;

  try {
    // Limpa ambas as versões do cache
    cacheService.delete(`emotional_state:${userId}`);
    cacheService.delete(`emotional_state_user_${userId}`);
    
    // Tentar sincronizar componentes de IA antes de recalcular o estado emocional
    try {
      console.log(`[EmotionalState] Sincronizando componentes de IA para recálculo para usuário ${userId}`);
      // Importar dinamicamente para evitar dependência circular
      const { updateAllAIComponents } = await import('../ai-integration-service');
      await updateAllAIComponents(userId, 'journal');
      console.log(`[EmotionalState] Sincronização de IA concluída para usuário ${userId}`);
    } catch (syncError) {
      console.error(`[EmotionalState] Erro na sincronização de IA para usuário ${userId}:`, syncError);
      // Continuar mesmo que a sincronização falhe
    }
    
    // Recalcula o estado emocional
    const emotionalState = await calculateEmotionalState(userId);
    
    // Armazena o novo estado em cache (ambas versões para compatibilidade)
    cacheService.set(`emotional_state:${userId}`, emotionalState, { ttl: 2 * 60 * 60 * 1000 }); // Novo formato
    cacheService.set(`emotional_state_user_${userId}`, emotionalState, { ttl: 2 * 60 * 60 * 1000 }); // Formato antigo
    
    return res.json(emotionalState);
  } catch (error) {
    console.error('[EmotionalState] Erro ao recalcular estado emocional:', error);
    return res.status(500).json({ 
      message: 'Erro ao recalcular estado emocional', 
      error: error.message 
    });
  }
});

// Função para calcular o estado emocional do usuário
async function calculateEmotionalState(userId: number): Promise<EmotionalState> {
  console.log(`[EmotionalState] Calculando estado emocional para usuário ${userId}`);
  
  try {
    // 1. Coletar os dados das últimas 2 semanas
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    // Obter entradas de diário recentes
    const recentJournalEntries = await db
      .select({
        date: journalEntries.date,
        content: journalEntries.content,
        mood: journalEntries.mood,
        dominantEmotions: journalEntries.dominantEmotions,
        category: journalEntries.category,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, userId),
          gt(journalEntries.date, twoWeeksAgo)
        )
      )
      .orderBy(desc(journalEntries.date))
      .limit(10);
    
    // Obter interações recentes com o assistente
    const recentAssistantMessages = await db
      .select({
        timestamp: chatMessages.timestamp,
        content: chatMessages.content,
        role: chatMessages.role,
        metadata: chatMessages.metadata,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          gt(chatMessages.timestamp, twoWeeksAgo)
        )
      )
      .orderBy(desc(chatMessages.timestamp))
      .limit(20);
    
    // Obter sessões de terapia recentes
    const recentSessions = await db
      .select({
        scheduledFor: sessions.scheduledFor,
        status: sessions.status,
        notes: sessions.notes,
        therapistName: sessions.therapistName,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          gt(sessions.scheduledFor, twoWeeksAgo)
        )
      )
      .orderBy(desc(sessions.scheduledFor))
      .limit(5);
    
    // Obter recomendações de conteúdo recentes (podem conter insights sobre o estado do usuário)
    const recentRecommendations = await db
      .select({
        title: contentRecommendations.title,
        category: contentRecommendations.category,
        description: contentRecommendations.description,
        priority: contentRecommendations.priority,
      })
      .from(contentRecommendations)
      .where(
        and(
          eq(contentRecommendations.userId, userId),
          gt(contentRecommendations.createdAt, twoWeeksAgo)
        )
      )
      .orderBy(desc(contentRecommendations.createdAt))
      .limit(5);
    
    // 2. Se não houver dados suficientes, retornar um estado padrão
    if (recentJournalEntries.length === 0 && recentAssistantMessages.length === 0) {
      console.log(`[EmotionalState] Dados insuficientes para usuário ${userId}`);
      return {
        currentState: "Dados insuficientes",
        intensity: 50,
        dominantEmotion: "Neutro",
        secondaryEmotions: [],
        trend: "stable",
        lastUpdated: new Date().toISOString(),
      };
    }
    
    // 3. Usar IA para analisar os dados coletados
    return await analyzeEmotionalStateWithAI(
      userId,
      recentJournalEntries,
      recentAssistantMessages,
      recentSessions,
      recentRecommendations
    );
  } catch (error) {
    console.error('[EmotionalState] Erro ao coletar dados:', error);
    throw new Error(`Falha ao calcular estado emocional: ${error.message}`);
  }
}

// Função auxiliar que usa a API do OpenAI para analisar o estado emocional
async function analyzeEmotionalStateWithAI(
  userId: number,
  journalEntries: any[],
  assistantMessages: any[],
  sessions: any[],
  recommendations: any[]
): Promise<EmotionalState> {
  try {
    // Preparar os dados para enviar para a OpenAI
    const journalData = journalEntries.map(entry => ({
      data: entry.date,
      conteudo: entry.content,
      humor: entry.mood,
      tags_emocionais: entry.dominantEmotions || [],
      categoria: entry.category || 'não categorizado'
    }));
    
    const messageData = assistantMessages.map(msg => ({
      timestamp: msg.timestamp,
      conteudo: msg.content,
      papel: msg.role,
      tom_emocional: msg.metadata?.emotionalTone || 'neutro'
    }));
    
    const sessionData = sessions.map(session => ({
      data: session.scheduledFor,
      status: session.status,
      notes: session.notes || null,
      therapistName: session.therapistName || null
    }));
    
    const recommendationData = recommendations.map(rec => ({
      titulo: rec.title,
      categoria: rec.category,
      descricao: rec.description || null,
      prioridade: rec.priority
    }));
    
    // Extraia os estados emocionais mencionados nos dados
    const emotions = journalEntries
      .map(entry => entry.mood)
      .filter(mood => !!mood)
      .concat(
        (journalEntries
          .flatMap(entry => entry.dominantEmotions || [])
          .filter(tag => !!tag) as string[])
      );
    
    // Se não houver dados suficientes, use um estado padrão mais informativo
    if (journalEntries.length === 0 && assistantMessages.length < 3) {
      const baseState: EmotionalState = {
        currentState: assistantMessages.length > 0 ? "Possivelmente Neutro" : "Dados insuficientes",
        intensity: 50,
        dominantEmotion: assistantMessages.length > 0 ? 
          (assistantMessages[0].metadata?.emotionalTone || "Neutro") : "Desconhecido",
        secondaryEmotions: [],
        trend: "stable",
        lastUpdated: new Date().toISOString(),
      };
      
      // Se tivermos algumas mensagens, tente extrair emoções básicas
      if (assistantMessages.length > 0) {
        const recentEmotionalTones = assistantMessages
          .filter(msg => msg.metadata?.emotionalTone)
          .map(msg => msg.metadata?.emotionalTone)
          .filter(tone => tone !== undefined) as string[];
          
        if (recentEmotionalTones.length > 0) {
          baseState.secondaryEmotions = Array.from(new Set(recentEmotionalTones)).slice(0, 3);
        }
      }
      
      return baseState;
    }
    
    // Se tivermos dados significativos, use a OpenAI para análise
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um sistema de análise emocional especializado em saúde mental.
          Sua tarefa é analisar os dados recentes de um usuário de uma plataforma de saúde mental
          para determinar seu estado emocional atual. Forneça uma análise completa
          de acordo com as melhores práticas de psicologia e saúde mental.
          
          Retorne seu resultado em formato JSON seguindo exatamente a estrutura abaixo:
          {
            "currentState": "String descrevendo o estado emocional atual (ex: 'Ansiedade Moderada')",
            "intensity": "Número de 0-100 indicando a intensidade do estado emocional",
            "dominantEmotion": "A emoção predominante identificada",
            "secondaryEmotions": ["Lista de emoções secundárias identificadas"],
            "trend": "improving | stable | declining (tendência com base nos dados históricos)",
            "recentTriggers": ["Possíveis gatilhos identificados"],
            "suggestedActions": ["Ações sugeridas baseadas no estado emocional"]
          }`
        },
        {
          role: "user",
          content: `Por favor, analise os seguintes dados para determinar o estado emocional atual:
          
          ENTRADAS DE DIÁRIO (${journalData.length}):
          ${JSON.stringify(journalData, null, 2)}
          
          INTERAÇÕES COM ASSISTENTE (${messageData.length}):
          ${JSON.stringify(messageData, null, 2)}
          
          SESSÕES DE TERAPIA (${sessionData.length}):
          ${JSON.stringify(sessionData, null, 2)}
          
          RECOMENDAÇÕES DE CONTEÚDO (${recommendationData.length}):
          ${JSON.stringify(recommendationData, null, 2)}
          
          EMOÇÕES MENCIONADAS:
          ${JSON.stringify(Array.from(new Set(emotions)), null, 2)}
          
          Com base nesses dados, determine o estado emocional atual do usuário, a emoção predominante,
          emoções secundárias, a tendência (melhorando, estável ou piorando), possíveis gatilhos e ações sugeridas.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Processar e retornar a resposta da OpenAI
    const content = response.choices[0].message.content;
    console.log(`[EmotionalState] Resposta da IA:`, content);
    
    try {
      const emotionalState = JSON.parse(content) as EmotionalState;
      // Garantir que todos os campos necessários estejam presentes
      return {
        ...emotionalState,
        lastUpdated: new Date().toISOString() // Adicionar timestamp atual
      };
    } catch (parseError) {
      console.error('[EmotionalState] Erro ao analisar resposta da IA:', parseError);
      // Em caso de erro, retornar um estado padrão baseado nos dados disponíveis
      return {
        currentState: journalEntries.length > 0 ? 
          journalEntries[0].mood || "Estado emocional indefinido" : 
          "Estado emocional indefinido",
        intensity: 50,
        dominantEmotion: journalEntries.length > 0 ? 
          journalEntries[0].mood || "Neutro" : "Neutro",
        secondaryEmotions: Array.from(new Set(emotions)).slice(0, 3) || [],
        trend: "stable",
        lastUpdated: new Date().toISOString(),
        suggestedActions: ["Continue registrando seus pensamentos no diário", 
                          "Converse com seu terapeuta sobre como se sente"]
      };
    }
  } catch (error) {
    console.error('[EmotionalState] Erro na análise com IA:', error);
    
    // Em caso de falha na API, use um método de fallback baseado nos dados brutos
    const fallbackState: EmotionalState = createFallbackEmotionalState(
      journalEntries, 
      assistantMessages
    );
    
    return fallbackState;
  }
}

// Cria um estado emocional fallback baseado apenas nos dados disponíveis (sem IA)
function createFallbackEmotionalState(
  journalEntries: any[],
  assistantMessages: any[]
): EmotionalState {
  // Extrai os estados de humor das entradas do diário
  const moods = journalEntries
    .map(entry => entry.mood)
    .filter(mood => !!mood);
  
  // Conta a frequência de cada estado de humor
  const moodCounts = moods.reduce((acc, mood) => {
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, {});
  
  // Encontra o humor dominante
  let dominantMood = "Neutro";
  let maxCount = 0;
  
  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > maxCount) {
      dominantMood = mood;
      maxCount = count as number;
    }
  });
  
  // Extrai os tons emocionais das mensagens do assistente
  const emotionalTones = assistantMessages
    .map(msg => msg.metadata?.emotionalTone)
    .filter(tone => !!tone) as string[];
  
  // Cria uma lista de emoções secundárias (únicas)
  const uniqueEmotions = Array.from(new Set([...moods, ...emotionalTones]));
  const secondaryEmotions = uniqueEmotions
    .filter(emotion => emotion !== dominantMood)
    .slice(0, 3);
  
  // Tenta determinar uma tendência com base nas timestamps das entradas do diário
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  
  if (journalEntries.length >= 3) {
    // Mapeamento simplificado de emoções para valores numéricos
    const emotionValues = {
      'alegria': 5,
      'calma': 4,
      'esperança': 4,
      'gratidão': 4,
      'entusiasmo': 4,
      'satisfação': 4,
      'neutro': 3,
      'confusão': 2,
      'ansiedade': 2,
      'preocupação': 2,
      'tristeza': 1,
      'frustração': 1,
      'raiva': 1,
      'medo': 1,
      'desânimo': 1
    };
    
    // Calcula valores para as entradas mais recentes e mais antigas
    const recentEntries = journalEntries.slice(0, 3);
    const olderEntries = journalEntries.slice(-3);
    
    const recentValue = recentEntries.reduce((sum, entry) => {
      const mood = entry.mood?.toLowerCase() || 'neutro';
      const matchedMood = Object.keys(emotionValues).find(key => 
        mood.includes(key) || key.includes(mood)
      );
      return sum + (matchedMood ? emotionValues[matchedMood] : 3);
    }, 0) / recentEntries.length;
    
    const olderValue = olderEntries.length > 0 ? olderEntries.reduce((sum, entry) => {
      const mood = entry.mood?.toLowerCase() || 'neutro';
      const matchedMood = Object.keys(emotionValues).find(key => 
        mood.includes(key) || key.includes(mood)
      );
      return sum + (matchedMood ? emotionValues[matchedMood] : 3);
    }, 0) / olderEntries.length : recentValue;
    
    // Determina a tendência
    if (recentValue > olderValue + 0.5) {
      trend = 'improving';
    } else if (recentValue < olderValue - 0.5) {
      trend = 'declining';
    }
  }
  
  // Calcula intensidade com base em dados disponíveis
  let intensity = 50; // Valor padrão
  
  if (dominantMood.toLowerCase().includes('alegria') || 
      dominantMood.toLowerCase().includes('feliz')) {
    intensity = 75;
  } else if (dominantMood.toLowerCase().includes('tristeza') ||
             dominantMood.toLowerCase().includes('raiva') ||
             dominantMood.toLowerCase().includes('medo')) {
    intensity = 70;
  } else if (dominantMood.toLowerCase().includes('ansiedade') ||
             dominantMood.toLowerCase().includes('preocupação')) {
    intensity = 65;
  } else if (dominantMood.toLowerCase().includes('neutro') ||
             dominantMood.toLowerCase().includes('calma')) {
    intensity = 40;
  }
  
  // Ajusta intensidade com base na tendência
  if (trend === 'improving') {
    intensity = Math.max(30, intensity - 10);
  } else if (trend === 'declining') {
    intensity = Math.min(90, intensity + 10);
  }
  
  return {
    currentState: `${dominantMood}`,
    intensity,
    dominantEmotion: dominantMood,
    secondaryEmotions,
    trend,
    lastUpdated: new Date().toISOString(),
    suggestedActions: [
      "Continue registrando seus pensamentos no diário",
      "Converse com seu terapeuta sobre como se sente"
    ]
  };
}

export default router;