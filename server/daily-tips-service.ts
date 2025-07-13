import OpenAI from "openai";
import { InsertDailyTip } from "@shared/schema";
import { storage } from "./storage";
import { cacheService } from "./cache-service";
import { safeJsonParse, cleanArrayProperty } from "./utils/json-handler";
import { cleanAIResponseText } from "./utils/text-formatter";

// Initialize OpenAI with API key validation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Validate OpenAI API key on startup
if (!process.env.OPENAI_API_KEY) {
  console.warn("AVISO: OPENAI_API_KEY não está definida. Os recursos de IA não funcionarão corretamente.");
}

interface AnalyzedJournalContent {
  moodPatterns: string[];
  commonThemes: string[];
  challenges: string[];
  strengths: string[];
  possibleInterventions: string[];
}

interface UserProfileData {
  fears: string[];
  anxieties: string[];
  goals: string[];
  age?: number;
  occupation?: string;
  location?: string;
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

/**
 * Gera uma dica diária personalizada baseada nas entradas do diário do usuário,
 * informações do perfil e melhores práticas de saúde mental apoiadas por evidências científicas
 * 
 * @param userId ID do usuário para o qual gerar a dica (ou null para uma dica genérica)
 * @returns Objeto com a dica gerada ou null em caso de erro
 */
export async function generateDailyTip(userId: number | null): Promise<InsertDailyTip | null> {
  try {
    // Verificar se a API key está disponível
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY está faltando");
      return null;
    }

    // Buscar as entradas de diário mais recentes (últimos 7 dias ou até 10 entradas)
    const recentEntries = userId ? await storage.getJournalEntriesByUser(userId) : [];
    
    // Buscar dados do perfil do usuário
    const user = userId ? await storage.getUser(userId) : null;
    
    // Extrair dados relevantes do perfil
    const profileData: UserProfileData = {
      fears: user?.fears as string[] || [],
      anxieties: user?.anxieties as string[] || [],
      goals: user?.goals as string[] || [],
      occupation: user?.occupation || undefined,
      location: user?.location || undefined
    };
    
    // Adicionar idade se a data de nascimento estiver disponível
    if (user?.dateOfBirth) {
      const birthDate = new Date(user.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      profileData.age = age;
    }
    
    // Obter o estado emocional atual do usuário do cache
    let emotionalState: EmotionalState | undefined;
    
    // Se userId for nulo, criar um estado emocional neutro para dicas genéricas
    if (userId === null) {
      emotionalState = {
        currentState: "Neutro",
        intensity: 50,
        dominantEmotion: "Neutro",
        secondaryEmotions: ["Calma"],
        trend: "stable",
        recentTriggers: [],
        suggestedActions: ["Registrar pensamentos no diário", "Interagir com o assistente virtual", "Explorar ferramentas de autoajuda"],
        lastUpdated: new Date().toISOString()
      };
      console.log(`[DailyTips] Criando estado emocional neutro para geração de dica genérica`);
    } else {
      try {
        // Usando a chave de cache padronizada para estados emocionais
        emotionalState = cacheService.get<EmotionalState>(`emotional_state:${userId}`);
        
        if (emotionalState) {
          console.log(`[DailyTips] Usando estado emocional em cache para usuário ${userId}: ${emotionalState.currentState}, ${emotionalState.dominantEmotion}, tendência: ${emotionalState.trend}`);
        } else {
          // Verificar chave de cache antiga para compatibilidade
          const legacyState = cacheService.get<EmotionalState>(`emotional_state_user_${userId}`);
          
          if (legacyState) {
            emotionalState = legacyState;
            console.log(`[DailyTips] Usando estado emocional em cache legado para usuário ${userId}: ${emotionalState.currentState}`);
            
            // Migrar dados para o novo formato de chave de cache
            cacheService.set(`emotional_state:${userId}`, legacyState, { ttl: 2 * 60 * 60 * 1000 }); // 2 horas TTL
            console.log(`[DailyTips] Estado emocional migrado para novo formato de chave`);
          } else {
            console.log(`[DailyTips] Estado emocional não encontrado em cache para usuário ${userId}`);
            
            // Criar um estado neutro padrão se não houver nada em cache
            // Isso garante que sempre temos algum tipo de estado emocional para trabalhar
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
            emotionalState.message = "Continue registrando seus pensamentos e emoções. Isso ajudará a criar dicas mais personalizadas para seu bem-estar.";
            
            // Guardar em cache com TTL reduzido para incentivar atualizações frequentes
            cacheService.set(`emotional_state:${userId}`, emotionalState, { ttl: 1 * 60 * 60 * 1000 }); // 1 hora TTL
            
            // Também armazenar no formato legado para garantir compatibilidade
            cacheService.set(`emotional_state_user_${userId}`, emotionalState, { ttl: 1 * 60 * 60 * 1000 });
          }
        }
      } catch (error) {
        console.warn(`[DailyTips] Erro ao buscar estado emocional do usuário ${userId}:`, error);
      }
    }
    
    if (!recentEntries || recentEntries.length === 0) {
      // Se não houver entradas, criar uma dica baseada apenas no perfil ou genérica
      return profileData.fears.length > 0 || profileData.anxieties.length > 0 || profileData.goals.length > 0
        ? await generateProfileBasedTip(userId, profileData, emotionalState)
        : await generateGenericWellnessTip(userId, emotionalState);
    }
    
    // Analisar o conteúdo do diário para extrair padrões e temas relevantes
    const journalAnalysis = await analyzeJournalEntries(recentEntries);
    
    // Gerar uma dica personalizada baseada na análise das entradas, perfil e estado emocional
    return await createPersonalizedTip(userId, journalAnalysis, profileData, emotionalState);
    
  } catch (error) {
    console.error("Erro ao gerar dica diária:", error);
    return null;
  }
}

/**
 * Analisa as entradas do diário para identificar padrões de humor, temas comuns,
 * desafios e pontos fortes, usando OpenAI para processamento de linguagem natural
 */
async function analyzeJournalEntries(entries: any[]): Promise<AnalyzedJournalContent> {
  // Verificar se a API key está disponível
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY está faltando");
    return {
      moodPatterns: ["Variável"],
      commonThemes: ["Bem-estar geral"],
      challenges: ["Gerenciamento de estresse"],
      strengths: ["Resiliência"],
      possibleInterventions: ["Técnicas de mindfulness"]
    };
  }

  // Extrair conteúdo e informações relevantes das entradas
  const entriesContent = entries.map(entry => ({
    content: entry.content,
    date: new Date(entry.date).toISOString().split('T')[0],
    mood: entry.mood,
    emotionalTone: entry.emotionalTone,
    category: entry.category,
    tags: entry.tags,
  }));
  
  // Usar OpenAI para analisar os padrões nas entradas do diário
  const prompt = `
  Analise as seguintes entradas de diário de saúde mental e identifique:
  1. Padrões de humor recorrentes
  2. Temas comuns discutidos
  3. Desafios enfrentados pelo usuário
  4. Pontos fortes e recursos de enfrentamento demonstrados
  5. Possíveis intervenções ou técnicas benéficas baseadas em evidências científicas
  
  Estas são entradas de diário de um usuário de um aplicativo de saúde mental. Forneça apenas a análise sem incluir as entradas originais.
  
  Entradas do diário:
  ${JSON.stringify(entriesContent, null, 2)}
  
  Responda com um JSON estruturado contendo os campos: moodPatterns, commonThemes, challenges, strengths, possibleInterventions. 
  Cada campo deve ser um array de strings identificando no máximo 5 elementos mais relevantes.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "Você é um especialista em psicologia e saúde mental que analisa padrões em diários para identificar insights terapêuticos." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // menor temperatura para resultados mais determinísticos
    });

    try {
      // Parse do resultado JSON
      const analysis = JSON.parse(response.choices[0].message.content || "{}") as AnalyzedJournalContent;
      return analysis;
    } catch (error) {
      console.error("Erro ao analisar resposta da API:", error);
      // Retornar uma estrutura vazia em caso de erro
      return {
        moodPatterns: [],
        commonThemes: [],
        challenges: [],
        strengths: [],
        possibleInterventions: []
      };
    }
  } catch (error) {
    console.error("Erro ao analisar entradas do diário:", error);
    return {
      moodPatterns: [],
      commonThemes: [],
      challenges: [],
      strengths: [],
      possibleInterventions: []
    };
  }
}

/**
 * Cria uma dica personalizada baseada na análise das entradas do diário
 * e em evidências científicas de psicologia positiva e terapia cognitivo-comportamental
 * Também incorpora dados do perfil do usuário para maior personalização
 */
async function createPersonalizedTip(userId: number | null, analysis: AnalyzedJournalContent, profileData: UserProfileData, emotionalState?: EmotionalState): Promise<InsertDailyTip | null> {
  // Verificar se a API key está disponível
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY está faltando");
    return null;
  }
  
  // Preparar informações do perfil em formato legível
  const fears = profileData.fears && profileData.fears.length > 0 
    ? `Medos: ${profileData.fears.join(", ")}` 
    : "";
  
  const anxieties = profileData.anxieties && profileData.anxieties.length > 0 
    ? `Ansiedades: ${profileData.anxieties.join(", ")}` 
    : "";
  
  const goals = profileData.goals && profileData.goals.length > 0 
    ? `Objetivos: ${profileData.goals.join(", ")}` 
    : "";
  
  const occupation = profileData.occupation 
    ? `Ocupação: ${profileData.occupation}` 
    : "";
  
  const location = profileData.location 
    ? `Localização: ${profileData.location}` 
    : "";
  
  const age = profileData.age 
    ? `Idade: ${profileData.age} anos` 
    : "";
  
  // Construir seção de perfil se houver dados disponíveis
  const profileSection = [fears, anxieties, goals, occupation, location, age]
    .filter(item => item !== "")
    .join("\n");
    
  // Adicionar informações do estado emocional se disponíveis
  let emotionalStateSection = "";
  if (emotionalState) {
    const secondaryEmotions = emotionalState.secondaryEmotions && emotionalState.secondaryEmotions.length > 0
      ? emotionalState.secondaryEmotions.join(", ")
      : "Nenhuma identificada";
      
    const recentTriggers = emotionalState.recentTriggers && emotionalState.recentTriggers.length > 0
      ? emotionalState.recentTriggers.join(", ")
      : "Nenhum identificado";
    
    emotionalStateSection = `
=== ESTADO EMOCIONAL ATUAL ===
Estado: ${emotionalState.currentState}
Emoção dominante: ${emotionalState.dominantEmotion}
Emoções secundárias: ${secondaryEmotions}
Intensidade: ${emotionalState.intensity}/100
Tendência: ${emotionalState.trend === 'improving' ? 'melhorando' : emotionalState.trend === 'declining' ? 'piorando' : 'estável'}
Gatilhos recentes: ${recentTriggers}
`;
  }
  
  // Preparar instruções específicas com base no estado emocional
  let emotionalInstructions = "";
  if (emotionalState) {
    const emotion = emotionalState.dominantEmotion.toLowerCase();
    const trend = emotionalState.trend;
    const intensity = emotionalState.intensity;
    
    if (emotion.includes('ansiedade') || emotion.includes('preocupação')) {
      emotionalInstructions = `
Dê atenção especial à redução de ansiedade através de técnicas baseadas em evidências como respiração diafragmática, mindfulness e reestruturação cognitiva.
${intensity > 70 ? 'Esta pessoa está experimentando níveis muito altos de ansiedade, então inclua técnicas de emergência para acalmar o sistema nervoso rapidamente.' : ''}
${trend === 'improving' ? 'A pessoa está mostrando melhora em seu estado emocional, então reforce esse progresso e ofereça técnicas para continuar esse caminho positivo.' : 
  trend === 'declining' ? 'A pessoa está mostrando piora em seu estado emocional, então ofereça suporte compassivo e técnicas específicas para interromper esse ciclo negativo.' : 
  'A pessoa está com estado emocional estável, mas ainda precisa de ferramentas para gerenciar sua ansiedade.'}`;
    } else if (emotion.includes('tristeza') || emotion.includes('depressão')) {
      emotionalInstructions = `
Foque em técnicas para elevação do humor como ativação comportamental, gratidão, e exercícios de pensamento positivo.
${intensity > 70 ? 'Esta pessoa está experimentando níveis muito altos de tristeza, então enfatize a importância de buscar suporte profissional e ofereça técnicas gentis de autocuidado.' : ''}
${trend === 'improving' ? 'A pessoa está mostrando melhora em seu estado emocional, então celebre esse progresso e sugira maneiras de cultivar mais momentos positivos.' : 
  trend === 'declining' ? 'A pessoa está mostrando piora em seu estado emocional, então ofereça suporte compassivo e técnicas específicas para interromper esse ciclo negativo.' : 
  'A pessoa está com estado emocional estável, mas ainda precisa de ferramentas para elevar seu humor.'}`;
    } else if (emotion.includes('raiva') || emotion.includes('frustração')) {
      emotionalInstructions = `
Foque em técnicas de regulação emocional como pausas estratégicas, expressão construtiva da raiva e transformação de energia negativa.
${intensity > 70 ? 'Esta pessoa está experimentando níveis muito altos de raiva, então inclua técnicas imediatas para desescalação emocional antes de abordar questões subjacentes.' : ''}
${trend === 'improving' ? 'A pessoa está mostrando melhora em seu estado emocional, então reforce esse progresso e ofereça técnicas para continuar esse caminho positivo.' : 
  trend === 'declining' ? 'A pessoa está mostrando piora em seu estado emocional, então ofereça estratégias específicas para interromper a escalada de raiva.' : 
  'A pessoa está com estado emocional estável, mas ainda precisa de ferramentas para gerenciar sua raiva.'}`;
    } else if (emotion.includes('medo')) {
      emotionalInstructions = `
Foque em técnicas para gerenciar e superar medos como exposição gradual, desafio de pensamentos catastróficos e construção de autoconfiança.
${intensity > 70 ? 'Esta pessoa está experimentando níveis muito altos de medo, então inclua técnicas de estabilização e segurança antes de abordar exposições.' : ''}
${trend === 'improving' ? 'A pessoa está mostrando melhora em seu estado emocional, então reforce esse progresso e ofereça técnicas para continuar enfrentando seus medos gradualmente.' : 
  trend === 'declining' ? 'A pessoa está mostrando piora em seu estado emocional, então ofereça técnicas de autocuidado e estabilização antes de confrontar os medos.' : 
  'A pessoa está com estado emocional estável, mas ainda precisa de ferramentas para enfrentar seus medos.'}`;
    } else if (emotion.includes('alegria') || emotion.includes('positivo')) {
      emotionalInstructions = `
Foque em técnicas para manter e ampliar emoções positivas, como savoring, flow e cultivo de gratidão.
${trend === 'improving' ? 'A pessoa está numa trajetória positiva, então ofereça maneiras de consolidar esse estado positivo através de práticas regulares.' : 
  trend === 'declining' ? 'A pessoa está mostrando sinais de diminuição da positividade, então ofereça técnicas para preservar os ganhos emocionais e prevenir recaídas.' : 
  'A pessoa está num estado emocional positivo estável, ofereça técnicas para ampliar e aprofundar essa experiência.'}`;
    } else if (emotion.includes('neutro') || emotion.includes('calma')) {
      emotionalInstructions = `
Foque em técnicas para aumentar a consciência emocional, cultivo de experiências positivas e prevenção de estresse.
${trend === 'improving' ? 'A pessoa está numa trajetória positiva, então ofereça maneiras de construir resiliência para desafios futuros.' : 
  trend === 'declining' ? 'A pessoa está mostrando sinais de potencial diminuição do bem-estar, então ofereça técnicas preventivas e de autocuidado.' : 
  'A pessoa está num estado emocional neutro estável, ofereça técnicas para desenvolver maior riqueza emocional e bem-estar.'}`;
    }
  }

  // Construir um prompt que incorpore a análise do diário, dados do perfil, estado emocional e solicite recomendações baseadas em evidências
  const prompt = `
  Com base na seguinte análise de diário de saúde mental e informações do perfil do usuário, crie uma dica terapêutica personalizada e cientificamente fundamentada:
  
  === ANÁLISE DO DIÁRIO ===
  Padrões de humor: ${analysis.moodPatterns.join(", ")}
  Temas comuns: ${analysis.commonThemes.join(", ")}
  Desafios: ${analysis.challenges.join(", ")}
  Pontos fortes: ${analysis.strengths.join(", ")}
  Possíveis intervenções: ${analysis.possibleInterventions.join(", ")}
  
  ${profileSection ? `=== PERFIL DO USUÁRIO ===\n${profileSection}` : ''}
  
  ${emotionalStateSection ? emotionalStateSection : ''}
  
  ${emotionalInstructions}
  
  A dica deve:
  1. Ser personalizada para abordar os desafios específicos identificados no diário E as preocupações/objetivos do perfil
  2. Aproveitar os pontos fortes e recursos existentes do usuário
  3. Incluir uma técnica ou exercício prático específico que possa ser implementado imediatamente
  4. Ser baseada em evidências científicas (TCC, Mindfulness, Psicologia Positiva, etc.)
  5. Incluir uma breve explicação de por que esta abordagem é eficaz
  6. Considerar o contexto pessoal do usuário (idade, ocupação, localização, quando disponíveis)
  7. Ser apresentada em um tom encorajador e empático em português
  8. Incluir 1-3 fontes ou referências científicas que apoiam a intervenção
  
  ${profileData.fears.length > 0 || profileData.anxieties.length > 0 ? 
    'Dê atenção especial aos medos e ansiedades específicos mencionados no perfil e como eles podem estar relacionados aos padrões do diário.' : ''}
  
  ${profileData.goals.length > 0 ? 
    'Alinhe as recomendações com os objetivos pessoais do usuário mencionados no perfil.' : ''}
  
  Responda com um JSON estruturado contendo os seguintes campos:
  - title: Um título cativante para a dica (max 10 palavras)
  - content: O conteúdo principal da dica (250-400 palavras)
  - category: Uma categoria para a dica (Mindfulness, Autocuidado, Gerenciamento de Estresse, Regulação Emocional, Relações Sociais, etc.)
  - tags: Um array de 3-5 tags relevantes
  - evidenceLevel: O nível de evidência da intervenção (Alto, Moderado, Preliminar)
  - sources: Um array com 1-3 referências científicas (formato APA simplificado)
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: "Você é um especialista em psicologia clínica e terapias baseadas em evidências, com profundo conhecimento em saúde mental e intervenções terapêuticas validadas cientificamente. Suas recomendações são personalizadas, práticas e fundamentadas em pesquisas." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7, // maior temperatura para maior criatividade na dica
    });

    try {
      // Parse do resultado JSON
      const tipData = JSON.parse(response.choices[0].message.content || "{}");
      
      // Criar objeto de dica para salvar no banco de dados
      const dailyTip: InsertDailyTip = {
        title: tipData?.title || "Dica Personalizada",
        content: tipData?.content || "Conteúdo não disponível",
        category: tipData?.category || "Bem-estar",
        userId,
        createdAt: new Date(),
        tags: tipData?.tags || [],
        sources: tipData?.sources || [],
        evidenceLevel: tipData?.evidenceLevel || "Preliminar",
        imageUrl: null,
        aiGenerated: true
      };
      
      return dailyTip;
    } catch (error) {
      console.error("Erro ao processar resposta da API:", error);
      return null;
    }
  } catch (error) {
    console.error("Erro ao gerar dica personalizada:", error);
    return null;
  }
}

/**
 * Gera uma dica personalizada baseada apenas nos dados do perfil do usuário 
 * quando não há entradas de diário disponíveis
 */
async function generateProfileBasedTip(userId: number | null, profileData: UserProfileData, emotionalState?: EmotionalState): Promise<InsertDailyTip | null> {
  // Verificar se a API key está disponível
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY está faltando");
    return null;
  }
  
  // Preparar informações do perfil em formato legível
  const fears = profileData.fears && profileData.fears.length > 0 
    ? `Medos: ${profileData.fears.join(", ")}` 
    : "";
  
  const anxieties = profileData.anxieties && profileData.anxieties.length > 0 
    ? `Ansiedades: ${profileData.anxieties.join(", ")}` 
    : "";
  
  const goals = profileData.goals && profileData.goals.length > 0 
    ? `Objetivos: ${profileData.goals.join(", ")}` 
    : "";
  
  const occupation = profileData.occupation 
    ? `Ocupação: ${profileData.occupation}` 
    : "";
  
  const location = profileData.location 
    ? `Localização: ${profileData.location}` 
    : "";
  
  const age = profileData.age 
    ? `Idade: ${profileData.age} anos` 
    : "";
  
  // Construir seção de perfil
  const profileSection = [fears, anxieties, goals, occupation, location, age]
    .filter(item => item !== "")
    .join("\n");
    
  // Adicionar informações do estado emocional se disponíveis
  let emotionalStateSection = "";
  if (emotionalState) {
    const secondaryEmotions = emotionalState.secondaryEmotions && emotionalState.secondaryEmotions.length > 0
      ? emotionalState.secondaryEmotions.join(", ")
      : "Nenhuma identificada";
      
    const recentTriggers = emotionalState.recentTriggers && emotionalState.recentTriggers.length > 0
      ? emotionalState.recentTriggers.join(", ")
      : "Nenhum identificado";
    
    emotionalStateSection = `
=== ESTADO EMOCIONAL ATUAL ===
Estado: ${emotionalState.currentState}
Emoção dominante: ${emotionalState.dominantEmotion}
Emoções secundárias: ${secondaryEmotions}
Intensidade: ${emotionalState.intensity}/100
Tendência: ${emotionalState.trend === 'improving' ? 'melhorando' : emotionalState.trend === 'declining' ? 'piorando' : 'estável'}
Gatilhos recentes: ${recentTriggers}
`;
  }
  
  // Determinar categoria baseada no perfil e estado emocional
  let selectedCategory = "Gerenciamento de Estresse";
  
  if (emotionalState) {
    const emotion = emotionalState.dominantEmotion.toLowerCase();
    
    if (emotion.includes('ansiedade') || emotion.includes('preocupação')) {
      selectedCategory = "Controle de Ansiedade";
    } else if (emotion.includes('tristeza') || emotion.includes('depressão')) {
      selectedCategory = "Elevação do Humor";
    } else if (emotion.includes('raiva') || emotion.includes('frustração')) {
      selectedCategory = "Regulação Emocional";
    } else if (emotion.includes('medo')) {
      selectedCategory = "Superação de Medos";
    }
  } else {
    // Sem estado emocional, baseamos apenas no perfil
    if (profileData.fears.length > 0) {
      selectedCategory = "Superação de Medos";
    } else if (profileData.anxieties.length > 0) {
      selectedCategory = "Controle de Ansiedade";
    } else if (profileData.goals.length > 0) {
      selectedCategory = "Desenvolvimento Pessoal";
    }
  }
  
  const prompt = `
  Com base no perfil do usuário a seguir, crie uma dica terapêutica personalizada e cientificamente fundamentada:
  
  === PERFIL DO USUÁRIO ===
  ${profileSection}
  
  ${emotionalStateSection ? emotionalStateSection : ''}
  
  A dica deve:
  1. Ser personalizada para abordar as preocupações específicas, medos, ansiedades ou objetivos mencionados no perfil
  2. Incluir uma técnica ou exercício prático específico que possa ser implementado imediatamente
  3. Ser baseada em evidências científicas (TCC, Mindfulness, Psicologia Positiva, etc.)
  4. Incluir uma breve explicação de por que esta abordagem é eficaz
  5. Considerar o contexto pessoal do usuário (idade, ocupação, localização, quando disponíveis)
  6. Ser apresentada em um tom encorajador e empático em português
  7. Incluir 1-3 fontes ou referências científicas que apoiam a intervenção
  
  Esta dica será fornecida a alguém que ainda não tem entradas no diário, então concentre-se especificamente nas informações do perfil. 
  
  ${profileData.fears.length > 0 ? 'Dê atenção especial aos medos mencionados no perfil e técnicas para superá-los.' : ''}
  ${profileData.anxieties.length > 0 ? 'Foque em técnicas para reduzir a ansiedade relacionada aos tópicos mencionados no perfil.' : ''}
  ${profileData.goals.length > 0 ? 'Forneça estratégias específicas para ajudar o usuário a atingir os objetivos mencionados no perfil.' : ''}
  
  Responda com um JSON estruturado contendo os seguintes campos:
  - title: Um título cativante para a dica (max 10 palavras)
  - content: O conteúdo principal da dica (250-400 palavras)
  - category: "${selectedCategory}"
  - tags: Um array de 3-5 tags relevantes
  - evidenceLevel: O nível de evidência da intervenção (Alto, Moderado, Preliminar)
  - sources: Um array com 1-3 referências científicas (formato APA simplificado)
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: "Você é um especialista em psicologia clínica e coaching de desenvolvimento pessoal, com conhecimento aprofundado em intervenções baseadas em evidências. Você personaliza suas recomendações para atender às necessidades específicas dos usuários." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    try {
      // Parse do resultado JSON
      const tipData = JSON.parse(response.choices[0].message.content || "{}");
      
      // Limpar formatações Markdown indesejadas nos conteúdos
      const cleanedTitle = tipData?.title ? cleanAIResponseText(tipData.title) : "Dica Personalizada";
      const cleanedContent = tipData?.content ? cleanAIResponseText(tipData.content) : "Conteúdo não disponível";
      
      // Criar objeto de dica para salvar no banco de dados
      const dailyTip: InsertDailyTip = {
        title: cleanedTitle,
        content: cleanedContent,
        category: tipData?.category || selectedCategory,
        userId,
        createdAt: new Date(),
        tags: tipData?.tags || [],
        sources: tipData?.sources || [],
        evidenceLevel: tipData?.evidenceLevel || "Preliminar",
        imageUrl: null,
        aiGenerated: true
      };
      
      return dailyTip;
    } catch (error) {
      console.error("Erro ao processar resposta da API:", error);
      return null;
    }
  } catch (error) {
    console.error("Erro ao gerar dica baseada no perfil:", error);
    return null;
  }
}

/**
 * Gera uma dica genérica de bem-estar quando não há entradas suficientes no diário
 */
async function generateGenericWellnessTip(userId: number | null, emotionalState?: EmotionalState): Promise<InsertDailyTip | null> {
  // Verificar se a API key está disponível
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY está faltando");
    return null;
  }
  
  // Adicionar informações do estado emocional se disponíveis
  let emotionalStateSection = "";
  let selectedCategory = "";
  
  if (emotionalState) {
    const secondaryEmotions = emotionalState.secondaryEmotions && emotionalState.secondaryEmotions.length > 0
      ? emotionalState.secondaryEmotions.join(", ")
      : "Nenhuma identificada";
      
    const recentTriggers = emotionalState.recentTriggers && emotionalState.recentTriggers.length > 0
      ? emotionalState.recentTriggers.join(", ")
      : "Nenhum identificado";
    
    emotionalStateSection = `
=== ESTADO EMOCIONAL ATUAL ===
Estado: ${emotionalState.currentState}
Emoção dominante: ${emotionalState.dominantEmotion}
Emoções secundárias: ${secondaryEmotions}
Intensidade: ${emotionalState.intensity}/100
Tendência: ${emotionalState.trend === 'improving' ? 'melhorando' : emotionalState.trend === 'declining' ? 'piorando' : 'estável'}
Gatilhos recentes: ${recentTriggers}
`;

    // Determinar categoria baseada no estado emocional
    const emotion = emotionalState.dominantEmotion.toLowerCase();
    
    if (emotion.includes('ansiedade') || emotion.includes('preocupação')) {
      selectedCategory = "Controle de Ansiedade";
    } else if (emotion.includes('tristeza') || emotion.includes('depressão')) {
      selectedCategory = "Elevação do Humor";
    } else if (emotion.includes('raiva') || emotion.includes('frustração')) {
      selectedCategory = "Regulação Emocional";
    } else if (emotion.includes('medo')) {
      selectedCategory = "Superação de Medos";
    } else if (emotion.includes('alegria') || emotion.includes('positivo')) {
      selectedCategory = "Cultivo da Gratidão";
    } else if (emotion.includes('calma')) {
      selectedCategory = "Mindfulness";
    }
  }
  
  // Se não houver estado emocional ou não for possível determinar uma categoria, selecionar aleatoriamente
  if (!selectedCategory) {
    // Lista de categorias para dicas de bem-estar
    const categories = [
      "Mindfulness", 
      "Gerenciamento de Estresse", 
      "Autocuidado", 
      "Sono Saudável", 
      "Exercício Físico",
      "Nutrição para Saúde Mental", 
      "Conexão Social", 
      "Regulação Emocional"
    ];
    
    // Selecionar uma categoria aleatória
    selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  }
  
  let emotionalInstructions = "";
  if (emotionalState) {
    const emotion = emotionalState.dominantEmotion.toLowerCase();
    const trend = emotionalState.trend;
    const intensity = emotionalState.intensity;
    
    if (emotion.includes('ansiedade') || emotion.includes('preocupação')) {
      emotionalInstructions = `
Dê atenção especial à redução de ansiedade através de técnicas baseadas em evidências como respiração diafragmática, mindfulness e reestruturação cognitiva.
${intensity > 70 ? 'Esta pessoa está experimentando níveis muito altos de ansiedade, então inclua técnicas de emergência para acalmar o sistema nervoso rapidamente.' : ''}
${trend === 'improving' ? 'A pessoa está mostrando melhora em seu estado emocional, então reforce esse progresso e ofereça técnicas para continuar esse caminho positivo.' : 
  trend === 'declining' ? 'A pessoa está mostrando piora em seu estado emocional, então ofereça suporte compassivo e técnicas específicas para interromper esse ciclo negativo.' : 
  'A pessoa está com estado emocional estável, mas ainda precisa de ferramentas para gerenciar sua ansiedade.'}`;
    } else if (emotion.includes('tristeza') || emotion.includes('depressão')) {
      emotionalInstructions = `
Foque em técnicas para elevação do humor como ativação comportamental, gratidão, e exercícios de pensamento positivo.
${intensity > 70 ? 'Esta pessoa está experimentando níveis muito altos de tristeza, então enfatize a importância de buscar suporte profissional e ofereça técnicas gentis de autocuidado.' : ''}
${trend === 'improving' ? 'A pessoa está mostrando melhora em seu estado emocional, então celebre esse progresso e sugira maneiras de cultivar mais momentos positivos.' : 
  trend === 'declining' ? 'A pessoa está mostrando piora em seu estado emocional, então ofereça suporte compassivo e técnicas específicas para interromper esse ciclo negativo.' : 
  'A pessoa está com estado emocional estável, mas ainda precisa de ferramentas para elevar seu humor.'}`;
    } else if (emotion.includes('raiva') || emotion.includes('frustração')) {
      emotionalInstructions = `
Foque em técnicas de regulação emocional como pausas estratégicas, expressão construtiva da raiva e transformação de energia negativa.
${intensity > 70 ? 'Esta pessoa está experimentando níveis muito altos de raiva, então inclua técnicas imediatas para desescalação emocional antes de abordar questões subjacentes.' : ''}
${trend === 'improving' ? 'A pessoa está mostrando melhora em seu estado emocional, então reforce esse progresso e ofereça técnicas para continuar esse caminho positivo.' : 
  trend === 'declining' ? 'A pessoa está mostrando piora em seu estado emocional, então ofereça estratégias específicas para interromper a escalada de raiva.' : 
  'A pessoa está com estado emocional estável, mas ainda precisa de ferramentas para gerenciar sua raiva.'}`;
    } else if (emotion.includes('medo')) {
      emotionalInstructions = `
Foque em técnicas para gerenciar e superar medos como exposição gradual, desafio de pensamentos catastróficos e construção de autoconfiança.
${intensity > 70 ? 'Esta pessoa está experimentando níveis muito altos de medo, então inclua técnicas de estabilização e segurança antes de abordar exposições.' : ''}
${trend === 'improving' ? 'A pessoa está mostrando melhora em seu estado emocional, então reforce esse progresso e ofereça técnicas para continuar enfrentando seus medos gradualmente.' : 
  trend === 'declining' ? 'A pessoa está mostrando piora em seu estado emocional, então ofereça técnicas de autocuidado e estabilização antes de confrontar os medos.' : 
  'A pessoa está com estado emocional estável, mas ainda precisa de ferramentas para enfrentar seus medos.'}`;
    } else if (emotion.includes('alegria') || emotion.includes('positivo')) {
      emotionalInstructions = `
Foque em técnicas para manter e ampliar emoções positivas, como savoring, flow e cultivo de gratidão.
${trend === 'improving' ? 'A pessoa está numa trajetória positiva, então ofereça maneiras de consolidar esse estado positivo através de práticas regulares.' : 
  trend === 'declining' ? 'A pessoa está mostrando sinais de diminuição da positividade, então ofereça técnicas para preservar os ganhos emocionais e prevenir recaídas.' : 
  'A pessoa está num estado emocional positivo estável, ofereça técnicas para ampliar e aprofundar essa experiência.'}`;
    } else if (emotion.includes('neutro') || emotion.includes('calma')) {
      emotionalInstructions = `
Foque em técnicas para aumentar a consciência emocional, cultivo de experiências positivas e prevenção de estresse.
${trend === 'improving' ? 'A pessoa está numa trajetória positiva, então ofereça maneiras de construir resiliência para desafios futuros.' : 
  trend === 'declining' ? 'A pessoa está mostrando sinais de potencial diminuição do bem-estar, então ofereça técnicas preventivas e de autocuidado.' : 
  'A pessoa está num estado emocional neutro estável, ofereça técnicas para desenvolver maior riqueza emocional e bem-estar.'}`;
    }
  }

  const prompt = `
  Crie uma dica de bem-estar diária na categoria "${selectedCategory}" que seja:
  
  ${emotionalStateSection ? emotionalStateSection : ''}
  
  1. Baseada em evidências científicas atuais
  2. Prática e facilmente implementável
  3. Educativa e informativa
  4. Motivadora e encorajadora
  5. Em português brasileiro
  
  ${emotionalInstructions}
  
  Inclua:
  - Um título cativante
  - Uma explicação clara da importância desta prática
  - Instruções passo a passo para implementá-la
  - Uma breve menção dos benefícios cientificamente comprovados
  - 1-3 referências científicas que apoiam esta prática
  
  A dica deve ser escrita para alguém que está buscando melhorar sua saúde mental mas não tem registros de diário ainda.
  
  Responda com um JSON estruturado contendo os seguintes campos:
  - title: Um título cativante para a dica (max 10 palavras)
  - content: O conteúdo principal da dica (250-400 palavras)
  - category: "${selectedCategory}"
  - tags: Um array de 3-5 tags relevantes
  - evidenceLevel: O nível de evidência da intervenção (Alto, Moderado, Preliminar)
  - sources: Um array com 1-3 referências científicas (formato APA simplificado)
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: "Você é um especialista em psicologia da saúde e bem-estar, com conhecimento aprofundado em intervenções baseadas em evidências para promoção da saúde mental." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    try {
      // Parse do resultado JSON
      const tipData = JSON.parse(response.choices[0].message.content || "{}");
      
      // Criar objeto de dica para salvar no banco de dados
      const dailyTip: InsertDailyTip = {
        title: tipData?.title || "Dica Personalizada",
        content: tipData?.content || "Conteúdo não disponível",
        category: tipData?.category || "Bem-estar",
        userId,
        createdAt: new Date(),
        tags: tipData?.tags || [],
        sources: tipData?.sources || [],
        evidenceLevel: tipData?.evidenceLevel || "Preliminar",
        imageUrl: null,
        aiGenerated: true
      };
      
      return dailyTip;
    } catch (error) {
      console.error("Erro ao processar resposta da API:", error);
      return null;
    }
  } catch (error) {
    console.error("Erro ao gerar dica genérica:", error);
    return null;
  }
}