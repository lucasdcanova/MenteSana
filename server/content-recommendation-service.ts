import OpenAI from 'openai';
import { JournalEntry, ContentRecommendation, InsertContentRecommendation } from '@shared/schema';
import { storage } from './storage';
import { cacheService } from './cache-service';

// Inicializar o cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

interface GeneratedRecommendation {
  title: string;
  description: string;
  type: string;
  category: string;
  content?: string;
  priority: number;
  tags: string[];
}

/**
 * Gera recomendações personalizadas com base em entradas de diário recentes
 * @param userId ID do usuário
 * @param limit Limite de recomendações a serem geradas
 * @returns Array de recomendações personalizadas
 */
export async function generateRecommendationsForUser(userId: number, limit: number = 3): Promise<ContentRecommendation[]> {
  try {
    // Obter o estado emocional atual do usuário, se disponível
    let emotionalState;
    try {
      // Tentar obter do cache usando o padrão de chave padronizado
      const cachedState = cacheService.get<any>(`emotional_state:${userId}`);
      
      if (cachedState) {
        emotionalState = cachedState;
        console.log(`[ContentRecommendation] Usando estado emocional em cache para usuário ${userId}: ${emotionalState.currentState}`);
      } else {
        // Se não encontrado com a nova nomenclatura, verifique a antiga para compatibilidade
        const legacyState = cacheService.get<any>(`emotional_state_user_${userId}`);
        
        if (legacyState) {
          emotionalState = legacyState;
          console.log(`[ContentRecommendation] Usando estado emocional em cache legado para usuário ${userId}: ${emotionalState.currentState}`);
          
          // Migrar dados para o novo formato de chave de cache
          cacheService.set(`emotional_state:${userId}`, legacyState, { ttl: 2 * 60 * 60 * 1000 }); // 2 horas TTL
          console.log(`[ContentRecommendation] Estado emocional migrado para novo formato de chave`);
        }
      }
    } catch (error) {
      console.warn(`[ContentRecommendation] Erro ao buscar estado emocional: ${error}`);
    }
    
    // Obter as entradas de diário mais recentes do usuário
    const journalEntries = await storage.getJournalEntriesByUser(userId);
    
    if (!journalEntries.length) {
      return [];
    }
    
    // Limitar a 5 entradas mais recentes para análise
    const recentEntries = journalEntries.slice(0, 5);
    
    // Extrair conteúdo, humor, tags e categorias para análise
    const entriesData = recentEntries.map(entry => ({
      id: entry.id,
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags || [],
      category: entry.category,
      emotionalTone: entry.emotionalTone
    }));
    
    // Gerar recomendações baseadas nas entradas e no estado emocional
    const recommendations = await generateRecommendationsFromEntries(entriesData, limit, emotionalState);
    
    // Inserir recomendações no banco de dados
    const savedRecommendations: ContentRecommendation[] = [];
    
    for (const rec of recommendations) {
      const insertRec: InsertContentRecommendation = {
        userId,
        title: rec.title,
        description: rec.description,
        type: rec.type,
        category: rec.category,
        content: rec.content,
        tags: rec.tags,
        priority: rec.priority,
        relatedJournalIds: recentEntries.map(entry => entry.id),
        aiGenerated: true
      };
      
      const savedRec = await storage.createContentRecommendation(insertRec);
      savedRecommendations.push(savedRec);
    }
    
    return savedRecommendations;
  } catch (error) {
    console.error('Erro ao gerar recomendações:', error);
    return [];
  }
}

/**
 * Gera recomendações de conteúdo com base nas entradas de diário
 * @param entries Dados extraídos das entradas de diário
 * @param limit Limite de recomendações
 * @param emotionalState Estado emocional do usuário (opcional)
 * @returns Array de recomendações geradas
 */
async function generateRecommendationsFromEntries(
  entries: Array<{
    id: number;
    content: string;
    mood: string;
    tags: string[];
    category: string | null;
    emotionalTone: string | null;
  }>,
  limit: number,
  emotionalState?: any
): Promise<GeneratedRecommendation[]> {
  // Criar um resumo dos dados para enviar para a API
  const entriesSummary = entries.map(entry => ({
    content: entry.content.substring(0, 200) + '...',
    mood: entry.mood,
    tags: entry.tags,
    category: entry.category,
    emotionalTone: entry.emotionalTone
  }));
  
  // Construir a instrução do prompt
  let prompt = `
  Com base nas seguintes entradas de diário recentes:
  
  ${JSON.stringify(entriesSummary, null, 2)}
  `;
  
  // Adicionar informações do estado emocional se disponível
  if (emotionalState) {
    prompt += `
  
  Informações adicionais sobre o estado emocional atual:
  - Estado: ${emotionalState.currentState}
  - Emoção dominante: ${emotionalState.dominantEmotion}
  - Tendência: ${emotionalState.trend === 'improving' ? 'Melhorando' : emotionalState.trend === 'declining' ? 'Declinando' : 'Estável'}
  - Intensidade: ${emotionalState.intensity}/100
  `;
    
    if (emotionalState.recentTriggers && emotionalState.recentTriggers.length > 0) {
      prompt += `- Gatilhos recentes: ${emotionalState.recentTriggers.join(', ')}\n`;
    }
  }
  
  prompt += `
  
  Gere ${limit} recomendações personalizadas de conteúdo para ajudar o usuário em sua jornada de saúde mental.
  
  As recomendações devem ser relevantes para os temas, emoções e desafios expressos nas entradas do diário.
  
  Cada recomendação deve ter o seguinte formato:
  
  {
    "title": "Título claro e conciso",
    "description": "Breve descrição explicando como isso ajudará",
    "type": "article | exercise | video | meditation | tip",
    "category": "Categoria principal do conteúdo",
    "content": "Conteúdo textual completo quando for um exercício ou dica prática",
    "priority": número de 1 a 100 indicando a relevância (maior = mais relevante),
    "tags": ["tag1", "tag2"]
  }
  
  Responda exclusivamente com um array JSON contendo as recomendações geradas.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Você é um assistente especializado em saúde mental que gera recomendações personalizadas." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Resposta vazia da API');
    }
    
    const parsedResponse = JSON.parse(content);
    
    if (Array.isArray(parsedResponse.recommendations)) {
      return parsedResponse.recommendations;
    } else if (Array.isArray(parsedResponse)) {
      return parsedResponse;
    } else {
      console.error('Formato de resposta inesperado:', parsedResponse);
      return [];
    }
  } catch (error) {
    console.error('Erro ao gerar recomendações com OpenAI:', error);
    return [];
  }
}

/**
 * Gera uma recomendação específica com base em uma entrada de diário
 * @param entry Entrada de diário 
 * @returns Recomendação gerada
 */
export async function generateRecommendationFromEntry(entry: JournalEntry): Promise<ContentRecommendation | null> {
  try {
    const prompt = `
    Com base na seguinte entrada de diário:
    
    Conteúdo: "${entry.content}"
    Humor: "${entry.mood}"
    Categoria: "${entry.category || 'Não especificada'}"
    Tom emocional: "${entry.emotionalTone || 'Não especificado'}"
    Emoções dominantes: ${JSON.stringify(entry.dominantEmotions || [])}
    
    Gere UMA recomendação personalizada de conteúdo ou exercício para ajudar esta pessoa.
    
    A recomendação deve:
    1. Abordar diretamente os sentimentos ou desafios expressos
    2. Oferecer uma solução prática ou perspectiva útil
    3. Ser concisa e acionável
    
    Responda no seguinte formato JSON:
    {
      "title": "Título claro e conciso",
      "description": "Breve descrição explicando como isso ajudará",
      "type": "article | exercise | video | meditation | tip",
      "category": "Categoria principal do conteúdo",
      "content": "Conteúdo textual completo quando for um exercício ou dica prática",
      "priority": número de 1 a 100 indicando a relevância (maior = mais relevante),
      "tags": ["tag1", "tag2"]
    }
    `;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Você é um assistente especializado em saúde mental que gera recomendações personalizadas." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Resposta vazia da API');
    }
    
    const recommendation: GeneratedRecommendation = JSON.parse(content);
    
    // Criar a recomendação no banco de dados
    const insertRec: InsertContentRecommendation = {
      userId: entry.userId,
      title: recommendation.title,
      description: recommendation.description,
      type: recommendation.type,
      category: recommendation.category,
      content: recommendation.content,
      tags: recommendation.tags,
      priority: recommendation.priority,
      relatedJournalIds: [entry.id],
      aiGenerated: true
    };
    
    return await storage.createContentRecommendation(insertRec);
  } catch (error) {
    console.error('Erro ao gerar recomendação para entrada de diário:', error);
    return null;
  }
}