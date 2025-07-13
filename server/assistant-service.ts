import OpenAI from "openai";
import { storage } from './storage';
import { cacheService } from './cache-service';
import { cleanAIResponseText } from './utils/text-formatter';

// O modelo mais recente da OpenAI é "gpt-4o", lançado em 13 de maio de 2024. Não altere a menos que seja explicitamente solicitado pelo usuário
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AssistantResponse {
  message: string;
  emotionalTone?: string;
  suggestedResources?: string[];
  followUpQuestions?: string[];
}

interface EmotionalState {
  currentState: string;
  intensity: number;
  dominantEmotion: string;
  secondaryEmotions: string[];
  trend: 'improving' | 'stable' | 'declining';
  recentTriggers: string[];
  suggestedActions: string[];
  lastUpdated?: string;
}

// Sistema de prompt base para o assistente
const BASE_SYSTEM_PROMPT = `Você é um assistente terapêutico compassivo e atencioso especializado em saúde mental.
Sua função é fornecer um espaço seguro, empático e útil para os usuários expressarem suas preocupações, 
sentimentos e desafios relacionados à saúde mental.

Diretrizes importantes:
1. Seja empático e compreensivo, validando os sentimentos do usuário
2. Ofereça perspectivas construtivas e técnicas baseadas em terapia cognitivo-comportamental
3. Sugira estratégias práticas para lidar com desafios emocionais
4. Nunca substitua aconselhamento médico profissional
5. Comunique-se em português do Brasil com um tom acolhedor
6. Responda em primeira pessoa, como um assistente compassivo
7. Mantenha suas respostas concisas mas úteis (máximo 3 parágrafos)
8. Priorize apoio emocional e escuta ativa
9. Não seja excessivamente técnico

Se o usuário apresentar sinais de crise ou risco, gentilmente incentive-os a buscar ajuda profissional 
imediatamente através de serviços como o CVV (Centro de Valorização da Vida) pelo telefone 188.`;

/**
 * Processa uma mensagem de usuário e gera uma resposta do assistente
 * com personalidade consistente e contexto de conversa
 * 
 * @param userId ID do usuário
 * @param message Mensagem do usuário
 * @param historyLimit Número de mensagens anteriores a incluir como contexto (padrão: 10)
 * @returns Resposta do assistente com mensagem e metadados
 */
export async function processAssistantMessage(
  userId: number, 
  message: string,
  historyLimit: number = 10
): Promise<AssistantResponse> {
  try {
    // Recuperar histórico de conversas do usuário
    const chatHistory = await storage.getChatMessagesByUser(userId, historyLimit);
    
    // Obter o estado emocional atual do usuário
    let emotionalState: EmotionalState | undefined;
    try {
      // Tentar obter do cache usando o padrão de chave padronizado
      const cachedState = cacheService.get<EmotionalState>(`emotional_state:${userId}`);
      
      if (cachedState) {
        emotionalState = cachedState;
        console.log(`[Assistant] Usando estado emocional em cache para usuário ${userId}: ${emotionalState.currentState}`);
      } else {
        // Se não encontrado com a nova nomenclatura, verifique a antiga para compatibilidade
        const legacyState = cacheService.get<EmotionalState>(`emotional_state_user_${userId}`);
        
        if (legacyState) {
          emotionalState = legacyState;
          console.log(`[Assistant] Usando estado emocional em cache legado para usuário ${userId}: ${emotionalState.currentState}`);
          
          // Migrar dados para o novo formato de chave de cache
          cacheService.set(`emotional_state:${userId}`, legacyState, { ttl: 2 * 60 * 60 * 1000 }); // 2 horas TTL
          console.log(`[Assistant] Estado emocional migrado para novo formato de chave`);
        } else {
          console.log(`[Assistant] Estado emocional não encontrado em cache para usuário ${userId}`);
          
          // Criar um estado neutro encorajador padrão se não houver nada em cache
          emotionalState = {
            currentState: "Neutro",
            intensity: 50,
            dominantEmotion: "Neutro",
            secondaryEmotions: ["Calma"],
            trend: "stable",
            recentTriggers: [],
            suggestedActions: ["Registrar mais entradas no diário", "Interagir com o assistente", "Explorar ferramentas de autoajuda"],
            lastUpdated: new Date().toISOString()
          };
          
          // Adicionar uma mensagem encorajadora que será usada pela UI
          // @ts-ignore - adicionamos essa propriedade à interface, mas a tipagem não foi atualizada
          emotionalState.message = "Continue registrando seus pensamentos e emoções. Isso me ajudará a oferecer um suporte mais personalizado.";
          
          // Guardar em cache, mas com TTL reduzido para incentivar atualizações frequentes
          cacheService.set(`emotional_state:${userId}`, emotionalState, { ttl: 1 * 60 * 60 * 1000 }); // 1 hora TTL
        }
      }
    } catch (error) {
      console.warn(`[Assistant] Erro ao buscar estado emocional do usuário ${userId}:`, error);
      
      // Criar um estado neutro com mensagem de erro em caso de falha
      emotionalState = {
        currentState: "Neutro",
        intensity: 50,
        dominantEmotion: "Neutro",
        secondaryEmotions: ["Calma"],
        trend: "stable",
        recentTriggers: [],
        suggestedActions: ["Verificar conexão", "Tentar novamente mais tarde"],
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Construir mensagens para a API
    const messages: ChatMessage[] = [
      { role: 'system', content: BASE_SYSTEM_PROMPT },
    ];
    
    // Adicionar contexto do estado emocional se disponível
    if (emotionalState) {
      messages.push({
        role: 'system',
        content: `Informação importante sobre o estado emocional atual do usuário:
- Estado emocional: ${emotionalState.currentState}
- Emoção dominante: ${emotionalState.dominantEmotion}
- Emoções secundárias: ${emotionalState.secondaryEmotions ? emotionalState.secondaryEmotions.join(', ') : 'não disponível'}
- Tendência: ${emotionalState.trend === 'improving' ? 'melhorando' : emotionalState.trend === 'declining' ? 'piorando' : 'estável'}
- Intensidade: ${emotionalState.intensity}/100
- Possíveis gatilhos: ${emotionalState.recentTriggers ? emotionalState.recentTriggers.join(', ') : 'desconhecidos'}

Ajuste seu tom e suas sugestões baseado neste estado emocional, mas não mencione explicitamente que você tem acesso a estas informações. Seja empático e considere esta informação ao elaborar sua resposta.`
      });
    }
    
    // Adicionar histórico de mensagens, se existir
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach(msg => {
        messages.push({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        });
      });
    }
    
    // Adicionar a mensagem atual do usuário
    messages.push({ role: 'user', content: message });
    
    // Solicitar instruções para gerar metadados de análise
    messages.push({ 
      role: 'system', 
      content: `Após analisar a mensagem do usuário, forneça uma resposta empática e útil.
Por favor formule sua resposta como JSON com os seguintes campos:
{
  "message": "Sua resposta principal em texto, empática e útil",
  "emotionalTone": "Uma palavra descrevendo o tom emocional detectado na mensagem do usuário",
  "suggestedResources": ["Lista de 0-3 recursos relevantes, ferramentas ou técnicas para recomendar"],
  "followUpQuestions": ["Lista de 1-2 perguntas reflexivas para manter a conversa fluindo"]
}`
    });
    
    // Fazer a chamada para a API da OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any[],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });
    
    // Processar a resposta
    const responseContent = completion.choices[0].message.content;
    console.log("Resposta bruta do assistente:", responseContent);
    
    let parsedResponse: AssistantResponse;
    
    try {
      parsedResponse = JSON.parse(responseContent || '{}');
      
      // Limpar formatações Markdown indesejadas
      if (parsedResponse.message) {
        parsedResponse.message = cleanAIResponseText(parsedResponse.message);
      }
      
      if (parsedResponse.emotionalTone) {
        parsedResponse.emotionalTone = cleanAIResponseText(parsedResponse.emotionalTone);
      }
      
      if (Array.isArray(parsedResponse.suggestedResources)) {
        parsedResponse.suggestedResources = parsedResponse.suggestedResources.map(
          (resource: string) => cleanAIResponseText(resource)
        );
      }
      
      if (Array.isArray(parsedResponse.followUpQuestions)) {
        parsedResponse.followUpQuestions = parsedResponse.followUpQuestions.map(
          (question: string) => cleanAIResponseText(question)
        );
      }
    } catch (parseError) {
      console.error("Erro ao analisar resposta JSON:", parseError);
      // Fallback para resposta simples se o parsing falhar
      parsedResponse = {
        message: responseContent || "Desculpe, tive dificuldade em processar sua mensagem. Poderia tentar novamente?"
      };
    }
    
    // Salvar a mensagem do usuário no histórico
    await storage.createChatMessage({
      userId,
      content: message,
      role: 'user',
      timestamp: new Date(),
      metadata: {}
    });
    
    // Salvar a resposta do assistente no histórico
    await storage.createChatMessage({
      userId,
      content: parsedResponse.message,
      role: 'assistant',
      timestamp: new Date(),
      metadata: {
        emotionalTone: parsedResponse.emotionalTone,
        suggestedResources: parsedResponse.suggestedResources,
        followUpQuestions: parsedResponse.followUpQuestions
      }
    });
    
    return parsedResponse;
  } catch (error) {
    console.error("Erro ao processar mensagem do assistente:", error);
    throw error;
  }
}

/**
 * Gera uma saudação personalizada com base no histórico de conversas
 * e dados do perfil do usuário
 * 
 * @param userId ID do usuário
 * @returns Mensagem de saudação personalizada
 */
export async function generatePersonalizedGreeting(userId: number): Promise<string> {
  try {
    // Obter dados do perfil do usuário
    const user = await storage.getUser(userId);
    if (!user) {
      return "Olá! Como posso ajudar você hoje?";
    }
    
    // Verificar se é a primeira conversa
    const chatHistory = await storage.getChatMessagesByUser(userId, 1);
    const isFirstConversation = !chatHistory || chatHistory.length === 0;
    
    // Obter a última entrada do diário para contexto, se existir
    const journalEntries = await storage.getJournalEntriesByUser(userId);
    const latestEntry = journalEntries && journalEntries.length > 0 
      ? journalEntries[0] 
      : null;
      
    // Obter o estado emocional atual do usuário
    let emotionalState: EmotionalState | undefined;
    try {
      // Tentar obter do cache usando o padrão de chave padronizado
      const cachedState = cacheService.get<EmotionalState>(`emotional_state:${userId}`);
      
      if (cachedState) {
        emotionalState = cachedState;
        console.log(`[Assistant:Greeting] Usando estado emocional em cache para usuário ${userId}: ${emotionalState.currentState}`);
      } else {
        // Se não encontrado com a nova nomenclatura, verifique a antiga para compatibilidade
        const legacyState = cacheService.get<EmotionalState>(`emotional_state_user_${userId}`);
        
        if (legacyState) {
          emotionalState = legacyState;
          console.log(`[Assistant:Greeting] Usando estado emocional em cache legado para usuário ${userId}: ${emotionalState.currentState}`);
          
          // Migrar dados para o novo formato de chave de cache
          cacheService.set(`emotional_state:${userId}`, legacyState, { ttl: 2 * 60 * 60 * 1000 }); // 2 horas TTL
        }
      }
    } catch (error) {
      console.warn(`[Assistant:Greeting] Erro ao buscar estado emocional do usuário ${userId}:`, error);
    }
    
    // Criar prompt para gerar saudação personalizada
    const prompt = `
Por favor, gere uma saudação personalizada para um usuário de uma plataforma de saúde mental.
${isFirstConversation ? 'Esta é a primeira conversa do usuário com o assistente.' : 'O usuário já conversou com o assistente anteriormente.'}

Informações do usuário:
- Nome: ${user.firstName}
- Idade: ${user.dateOfBirth ? Math.floor((new Date().getTime() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'desconhecida'}
${latestEntry ? `- Última entrada de diário: estado de humor "${latestEntry.mood}" com categoria "${latestEntry.category || 'não categorizada'}"` : ''}
${emotionalState ? `
- Estado emocional atual: ${emotionalState.currentState}
- Emoção dominante: ${emotionalState.dominantEmotion}
- Tendência emocional: ${emotionalState.trend === 'improving' ? 'melhorando' : emotionalState.trend === 'declining' ? 'piorando' : 'estável'}
` : ''}

Crie uma saudação breve, amigável e personalizada em português que:
1. Use o nome do usuário
2. Faça referência ao período do dia (manhã/tarde/noite)
3. Demonstre empatia e abertura para conversar
4. Considere e seja sensível ao estado emocional atual do usuário (se disponível)
5. Incentive o usuário a compartilhar como está se sentindo
6. Se for a primeira conversa, explique brevemente como o assistente pode ajudar

Responda apenas com a saudação, sem explicações adicionais.`;

    // Chamada para a API da OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um assistente especializado em saúde mental que fala português do Brasil." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200
    });
    
    let greeting = completion.choices[0].message.content?.trim() || 
      `Olá ${user.firstName}! Como posso ajudar você hoje?`;
      
    // Limpar formatações Markdown indesejadas
    greeting = cleanAIResponseText(greeting);
    
    return greeting;
  } catch (error) {
    console.error("Erro ao gerar saudação personalizada:", error);
    return "Olá! Como posso ajudar você hoje?";
  }
}