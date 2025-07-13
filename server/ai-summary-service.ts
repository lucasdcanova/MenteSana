import { openai } from './openai-service';
import { storage } from './storage';

/**
 * Interface para resumo de atividades do usuário
 */
interface UserActivitySummary {
  journalSummary: string;
  emotionalState: string;
  dominantThemes: string[];
  recommendedApproaches: string[];
  patternsSince: string | null;
  recentProgress: string;
}

/**
 * Interface para briefing do terapeuta
 */
interface TherapistBriefing {
  patientName: string;
  mainIssues: string[];
  emotionalState: string;
  recentProgress: string;
  suggestedTopics: string[];
  recommendedApproaches: string[];
  warningFlags: string[];
  moodTrends: string;
}

/**
 * Gera um resumo das atividades do usuário com base nas entradas do diário
 * e interações com o assistente virtual.
 * 
 * @param userId ID do usuário
 * @returns Resumo das atividades do usuário
 */
export async function generateUserActivitySummary(userId: number): Promise<UserActivitySummary | null> {
  try {
    // Obter as últimas entradas do diário do usuário (últimas 10)
    const journalEntries = await storage.getJournalEntriesByUser(userId);
    
    // Obter as últimas interações com o assistente
    const assistantInteractions = await storage.getChatMessagesByUser(userId);
    
    // Obter o perfil do usuário
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new Error(`Usuário com ID ${userId} não encontrado`);
    }
    
    // Verificar se há dados suficientes para análise
    if (!journalEntries.length && !assistantInteractions.length) {
      console.log(`Sem dados suficientes para análise do usuário ${userId}`);
      return null;
    }
    
    // Formatar dados para prompt
    const journalData = journalEntries.map(entry => ({
      data: entry.date.toISOString().split('T')[0],
      conteudo: entry.content,
      humor: entry.mood,
      categoria: entry.category,
    }));
    
    const assistantData = assistantInteractions.map((msg: { timestamp: Date; role: string; content: string }) => ({
      data: new Date(msg.timestamp).toISOString().split('T')[0],
      usuario: msg.role === 'user' ? msg.content : null,
      assistente: msg.role === 'assistant' ? msg.content : null,
    })).filter((m: { usuario: string | null; assistente: string | null }) => m.usuario || m.assistente);
    
    // Preparar prompt para a API
    const prompt = `
Analise as seguintes entradas de diário e interações com o assistente virtual de um usuário:

ENTRADAS DO DIÁRIO:
${JSON.stringify(journalData, null, 2)}

INTERAÇÕES COM ASSISTENTE:
${JSON.stringify(assistantData, null, 2)}

DADOS DO USUÁRIO:
- Nome: ${user.firstName} ${user.lastName}
- Idade: ${user.dateOfBirth ? Math.floor((new Date().getTime() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "Não informada"}
- Ocupação: ${user.occupation || "Não informada"}

Com base nesses dados, forneça um resumo abrangente no formato JSON com os seguintes campos:
{
  "journalSummary": "Resumo conciso das principais questões abordadas nas entradas do diário",
  "emotionalState": "Análise do estado emocional atual do usuário",
  "dominantThemes": ["Lista dos temas dominantes identificados nas entradas e interações"],
  "recommendedApproaches": ["Abordagens recomendadas para apoiar o bem-estar do usuário"],
  "patternsSince": "Padrões observados desde o início dos registros, ou null se não houver dados suficientes",
  "recentProgress": "Avaliação de qualquer progresso recente observado"
}
`;

    // Chamar a API do OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "Você é um assistente especializado em análise de saúde mental, focado em identificar padrões e fornecer insights úteis." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Resposta vazia da API");
    }

    // Parsear a resposta
    const summary: UserActivitySummary = JSON.parse(content);
    return summary;
  } catch (error) {
    console.error("Erro ao gerar resumo de atividades do usuário:", error);
    return null;
  }
}

/**
 * Gera um briefing para o terapeuta antes da consulta com um paciente
 * 
 * @param therapistId ID do terapeuta
 * @param patientId ID do paciente
 * @param sessionId ID da sessão (opcional)
 * @returns Briefing para o terapeuta
 */
export async function generateTherapistBriefing(
  therapistId: number,
  patientId: number,
  sessionId?: number
): Promise<TherapistBriefing | null> {
  try {
    // Obter dados do paciente
    const patient = await storage.getUser(patientId);
    if (!patient) {
      throw new Error(`Paciente com ID ${patientId} não encontrado`);
    }
    
    // Verificar consentimento do paciente para compartilhar dados
    if (patient.privacySettings && 
        typeof patient.privacySettings === 'object' && 
        'shareDataWithTherapist' in patient.privacySettings && 
        patient.privacySettings.shareDataWithTherapist === false) {
      throw new Error(`Paciente com ID ${patientId} não autorizou compartilhamento de dados`);
    }
    
    // Obter entradas de diário do paciente
    const journalEntries = await storage.getJournalEntriesByUser(patientId);
    
    // Obter sessões anteriores
    const previousSessions = await storage.getSessionsByTherapist(therapistId);
    
    // Obter registros médicos
    const medicalRecords = await storage.getMedicalRecordsByPatientId(patientId);
    
    // Resumir dados
    const journalSummary = journalEntries.map(entry => ({
      data: entry.date.toISOString().split('T')[0],
      conteudo: entry.content.substring(0, 200) + (entry.content.length > 200 ? "..." : ""),
      humor: entry.mood,
      categoria: entry.category
    }));
    
    const sessionsSummary = previousSessions.map((session: { scheduledFor: Date; duration: number; notes: string | null; status: string }) => ({
      data: session.scheduledFor.toISOString().split('T')[0],
      duracao: session.duration,
      notas: session.notes,
      status: session.status
    }));
    
    const medicalRecordsSummary = medicalRecords.map((record) => ({
      data: record.createdAt.toISOString().split('T')[0],
      queixa: record.mainComplaint,
      evolucao: record.evolution.substring(0, 200) + (record.evolution.length > 200 ? "..." : ""),
      diagnostico: record.diagnosis ? record.diagnosis.join(", ") : "Não informado",
      tratamento: record.treatmentPlan || "Não informado",
      compartilhadoComPaciente: record.accessLevel === "patient"
    }));
    
    // Preparar prompt para a API
    const prompt = `
Como terapeuta especializado, prepare um briefing para uma consulta com o paciente:

DADOS DO PACIENTE:
Nome: ${patient.firstName} ${patient.lastName}
Bio: ${patient.bio || "Não informado"}
${patient.fears && typeof patient.fears === 'object' && Array.isArray(patient.fears) && patient.fears.length > 0 ? `Medos: ${patient.fears.join(", ")}` : ""}
${patient.anxieties && typeof patient.anxieties === 'object' && Array.isArray(patient.anxieties) && patient.anxieties.length > 0 ? `Ansiedades: ${patient.anxieties.join(", ")}` : ""}
${patient.goals && typeof patient.goals === 'object' && Array.isArray(patient.goals) && patient.goals.length > 0 ? `Objetivos: ${patient.goals.join(", ")}` : ""}

RESUMO DO DIÁRIO DO PACIENTE:
${JSON.stringify(journalSummary, null, 2)}

SESSÕES ANTERIORES:
${JSON.stringify(sessionsSummary, null, 2)}

REGISTROS MÉDICOS:
${JSON.stringify(medicalRecordsSummary, null, 2)}

Com base nesses dados, forneça um briefing abrangente no formato JSON com os seguintes campos:
{
  "patientName": "Nome do paciente",
  "mainIssues": ["Lista das principais questões que o paciente está enfrentando"],
  "emotionalState": "Descrição do estado emocional atual do paciente",
  "recentProgress": "Avaliação do progresso recente do paciente",
  "suggestedTopics": ["Tópicos importantes para abordar na próxima sessão"],
  "recommendedApproaches": ["Abordagens terapêuticas recomendadas baseadas no perfil e histórico"],
  "warningFlags": ["Sinais de alerta ou pontos de atenção que o terapeuta deve estar atento"],
  "moodTrends": "Análise das tendências de humor ao longo do tempo"
}
`;

    // Chamar a API do OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "Você é um assistente especializado em análise clínica para terapeutas, focado em preparar briefings informativos antes de consultas." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Resposta vazia da API");
    }

    // Parsear a resposta
    const briefing: TherapistBriefing = JSON.parse(content);
    return briefing;
  } catch (error) {
    console.error("Erro ao gerar briefing para o terapeuta:", error);
    return null;
  }
}

/**
 * Atualiza as dicas diárias com base nas atividades recentes do usuário
 * 
 * @param userId ID do usuário
 * @returns Boolean indicando se a operação foi bem-sucedida
 */
export async function updateDailyTipsWithUserActivities(userId: number): Promise<boolean> {
  try {
    // Gerar resumo de atividades do usuário
    const activitySummary = await generateUserActivitySummary(userId);
    if (!activitySummary) {
      console.log(`Não foi possível gerar resumo para usuário ${userId}`);
      return false;
    }

    // Preparar prompt para a API com base no resumo
    const prompt = `
Você é um especialista em saúde mental responsável por gerar dicas diárias personalizadas.
Com base no seguinte resumo das atividades recentes do usuário, crie uma dica diária útil e relevante:

RESUMO DE ATIVIDADES:
- Estado emocional: ${activitySummary.emotionalState}
- Temas dominantes: ${activitySummary.dominantThemes.join(", ")}
- Resumo do diário: ${activitySummary.journalSummary}
- Progresso recente: ${activitySummary.recentProgress}

Crie uma dica que aborde diretamente um dos temas ou necessidades emocionais identificadas.
A dica deve ser apresentada em formato JSON com os seguintes campos:
{
  "title": "Título curto e inspirador para a dica",
  "content": "Texto da dica, com aproximadamente 2-3 parágrafos, oferecendo conselhos práticos e específicos",
  "category": "Categoria da dica (Ansiedade, Depressão, Bem-estar, Motivação, Mindfulness, etc.)",
  "tags": ["Lista de 3-5 tags relevantes"],
  "evidenceLevel": "Uma descrição do nível de evidência científica para a dica (Alto, Médio, Preliminar)"
}
`;

    // Chamar a API do OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "Você é um especialista em criação de conteúdo de saúde mental personalizado." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Resposta vazia da API");
    }

    // Parsear a dica gerada
    const tipData = JSON.parse(content);
    
    // Criar a dica no banco de dados
    await storage.createDailyTip({
      userId,
      title: tipData.title,
      content: tipData.content,
      category: tipData.category,
      tags: tipData.tags,
      evidenceLevel: tipData.evidenceLevel,
      sources: ["Gerado com base em análise de entradas do diário e interações com assistente virtual"],
      aiGenerated: true
    });

    // Criar notificação para o usuário
    await storage.createNotification({
      userId,
      type: "DicaDiária",
      title: "Nova Dica Personalizada",
      message: `Uma nova dica sobre "${tipData.category}" baseada em suas atividades recentes foi gerada para você.`,
      relatedId: null
    });

    return true;
  } catch (error) {
    console.error("Erro ao atualizar dicas diárias com atividades do usuário:", error);
    return false;
  }
}