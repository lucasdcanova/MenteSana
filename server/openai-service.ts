import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { cleanAIResponseText } from './utils/text-formatter';

// Inicializar o cliente OpenAI com validação da chave API
if (!process.env.OPENAI_API_KEY) {
  console.warn("AVISO: OPENAI_API_KEY não está definida. Os recursos de IA não funcionarão corretamente.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

// Usar modelo mais recente 
const MODEL = "gpt-4o"; // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

/**
 * Limpa as respostas da API da OpenAI, removendo formatação Markdown indesejada
 * e corrigindo códigos de quebra de linha incorretos
 * 
 * @param text Texto a ser limpo
 * @returns Texto limpo
 */
export function cleanOpenAIResponse(text: string): string {
  if (!text) return '';
  
  // Usar a função aprimorada do utilitário text-formatter
  return cleanAIResponseText(text);
}

/**
 * Gera um título conciso para uma entrada de diário
 * @param content Conteúdo da entrada de diário
 * @returns Título gerado (ou "AUTO" em caso de erro)
 */
export async function generateJournalTitle(content: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY está faltando");
    return "Minha Entrada de Diário";
  }
  
  try {
    // Limitar o conteúdo para processamento mais rápido e econômico
    const truncatedContent = content.length > 1000 
      ? content.substring(0, 1000) + "..." 
      : content;
    
    const prompt = `
    Gere um título curto, impactante e emotivo para a seguinte entrada de diário.
    O título deve capturar a essência emocional ou o tema principal do texto.
    Ideal: 3-5 palavras, máximo 6.
    Formato: Título com primeira letra de cada palavra maiúscula (Title Case).
    Sem pontuação final, sem aspas e sem emoji.
    
    Se o texto mencionar algum estado emocional específico (felicidade, ansiedade, frustração, etc.), 
    priorize esse elemento no título.
    
    Exemplos de bons títulos:
    "Ansiedade Antes da Apresentação"
    "Encontro Inesperado"
    "Conquista de Objetivos Pessoais"
    "Reflexões Sobre Mudanças"
    "Dia de Gratidão"
    
    Texto do diário:
    ${truncatedContent}
    
    Responda apenas com o título, sem incluir explicações.
    `;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: "system", 
          content: "Você é um especialista em criar títulos concisos e emotivos para entradas de diário pessoal. Seus títulos são precisos, relevantes e capturam a essência do texto." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.6, // Reduzido para gerar títulos mais consistentes
      max_tokens: 25,
      presence_penalty: 0.3, // Adicionado para evitar repetições
      frequency_penalty: 0.5 // Adicionado para incentivar diversidade
    });
    
    // Extrair e limpar o título
    let title = response.choices[0].message.content?.trim() || "AUTO";
    
    // Limpar formatação Markdown e outros caracteres indesejados
    title = cleanAIResponseText(title);
    title = title.replace(/["""''\.!?]+/g, ''); // Removendo mais pontuações
    title = title.replace(/^["']|["']$/g, ''); // Remove aspas apenas no início e fim
    title = title.trim();
    
    // Converter para Title Case se não estiver
    if (title !== "AUTO" && !/^[A-Z]/.test(title)) {
      title = title.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Certificar-se de que o título tem comprimento adequado
    if (title === "AUTO" || title.length < 3 || title.length > 60) {
      // Gerar um título com data formatada para ser mais descritivo que apenas "AUTO"
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
      });
      return `Reflexão de ${dataFormatada}`;
    }
    
    console.log(`[JournalTitle] Título gerado: "${title}"`);
    return title;
  } catch (error) {
    console.error("Erro ao gerar título com OpenAI:", error);
    // Gerar um título com data atual
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
    return `Reflexão de ${dataFormatada}`;
  }
}

// Função simplificada para apenas transcrever um arquivo de áudio
export async function transcribeAudioFile(filePath: string): Promise<string> {
  try {
    console.log(`[OpenAI] Iniciando transcrição do arquivo: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    
    // Abrir o arquivo como stream para o OpenAI
    const audioFile = fs.createReadStream(filePath);
    
    // Chamar API de transcrição
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "pt",
      response_format: "json",
      prompt: "Transcreva este áudio em português brasileiro com pontuação adequada."
    });
    
    if (!transcriptionResponse || !transcriptionResponse.text) {
      throw new Error("Resposta de transcrição vazia");
    }
    
    console.log(`[OpenAI] Transcrição bem-sucedida (${transcriptionResponse.text.length} caracteres)`);
    return transcriptionResponse.text;
    
  } catch (error) {
    console.error("[OpenAI] Erro na transcrição:", error);
    throw error;
  }
}

// Categorias pré-definidas para organização mental
export const CATEGORIES = [
  "Ansiedade",
  "Depressão",
  "Estresse",
  "Relacionamentos",
  "Família",
  "Trabalho",
  "Estudos",
  "Saúde",
  "Sono",
  "Alimentação",
  "Lazer",
  "Finanças",
  "Espiritualidade",
  "Metas Pessoais",
  "Crescimento Pessoal",
  "Reflexões Gerais",
  "Conquistas",
  "Desafios",
  "Memórias",
  "Pensamentos Criativos"
];

/**
 * Analisa o conteúdo do texto e sugere uma categoria usando a API da OpenAI
 * @param content Conteúdo da entrada de diário
 * @returns A categoria sugerida
 */
export async function suggestCategory(content: string): Promise<string> {
  try {
    // Criar um prompt para classificação
    const prompt = `
    Analise o seguinte texto e classifique-o em UMA ÚNICA categoria dentre as opções fornecidas.
    Escolha apenas uma categoria que melhor represente o assunto principal do texto.
    Retorne APENAS o nome da categoria, sem explicações ou comentários adicionais.

    Categorias disponíveis: ${CATEGORIES.join(", ")}

    Texto: "${content}"

    Categoria:
    `;

    // Chamar a API da OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Você é um assistente especializado em categorizar entradas de diário de saúde mental em categorias predefinidas." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3, // Baixa temperatura para respostas mais determinísticas
      max_tokens: 50
    });

    // Obter a resposta
    const suggestedCategory = completion.choices[0].message.content?.trim();
    
    // Verificar se a categoria está na lista
    if (suggestedCategory && CATEGORIES.includes(suggestedCategory)) {
      return suggestedCategory;
    }
    
    // Se não encontrar uma correspondência exata, procurar por substring
    for (const category of CATEGORIES) {
      if (suggestedCategory?.includes(category)) {
        return category;
      }
    }

    // Fallback para uma categoria genérica
    return "Reflexões Gerais";
  } catch (error) {
    console.error("Erro ao sugerir categoria:", error);
    return "Reflexões Gerais"; // Categoria padrão em caso de erro
  }
}

/**
 * Gera um resumo do conteúdo do diário usando a API da OpenAI
 * @param content Conteúdo da entrada de diário
 * @returns Um resumo conciso do conteúdo
 */
export async function generateSummary(content: string): Promise<string> {
  try {
    // Criar um prompt para resumo
    const prompt = `
    Resuma o seguinte texto de diário em 2-3 frases curtas, capturando os pontos principais:

    Texto: "${content}"

    Resumo:
    `;

    // Chamar a API da OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Você é um assistente especializado em criar resumos concisos de entradas de diário de saúde mental." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 100
    });

    // Obter a resposta e limpar markdown
    const summary = completion.choices[0].message.content?.trim() || "Sem resumo disponível";
    return cleanAIResponseText(summary);
  } catch (error) {
    console.error("Erro ao gerar resumo:", error);
    return "Sem resumo disponível";
  }
}

/**
 * Extrai tags relevantes do conteúdo usando a API da OpenAI
 * @param content Conteúdo da entrada de diário
 * @returns Array de tags relevantes
 */
export async function extractTags(content: string): Promise<string[]> {
  try {
    // Criar um prompt para extração de tags
    const prompt = `
    Analise o seguinte texto de diário e extraia 3 a 5 palavras-chave ou frases curtas que representem os temas principais.
    Retorne apenas as tags separadas por vírgulas, sem numeração ou formatação adicional.

    Texto: "${content}"

    Tags:
    `;

    // Chamar a API da OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL, 
      messages: [
        { role: "system", content: "Você é um assistente especializado em extrair tags relevantes de entradas de diário de saúde mental." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 50
    });

    // Obter a resposta e dividir as tags
    const tagsString = completion.choices[0].message.content?.trim() || "";
    return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  } catch (error) {
    console.error("Erro ao extrair tags:", error);
    return [];
  }
}

/**
 * Extrai tópicos e categorias detalhadas a partir do texto, com uma análise mais profunda
 * Versão aprimorada de extractTags que retorna categorias mais detalhadas para melhor classificação
 * @param content Texto para extrair tópicos e categorias 
 * @returns Array de tags e categorias
 */
export async function extractDetailedTopics(content: string): Promise<string[]> {
  try {
    const systemPrompt = `
    Você é um especialista em psicologia e saúde mental que realiza análise detalhada de entradas de diário.
    
    Analise o texto a seguir e extraia de 4 a 7 tags que representem:
    1. Categorias clínicas relevantes (ex: "ansiedade generalizada", "estresse pós-traumático")
    2. Temas emocionais dominantes (ex: "medo de rejeição", "insegurança profissional")
    3. Contextos relevantes (ex: "ambiente familiar", "relações interpessoais")
    4. Eventos ou gatilhos significativos (ex: "mudança de trabalho", "conflito familiar")
    
    As tags podem ter até 3 palavras e devem ser relevantes para organização, busca e categorização.
    Retorne apenas um array de strings em formato JSON: {"tags": ["tag1", "tag2", ...]}
    `;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      response_format: { type: "json_object" },
      max_tokens: 250,
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return Array.isArray(result.tags) ? result.tags : [];
  } catch (error) {
    console.error('Erro ao extrair tópicos detalhados:', error);
    return [];
  }
}

/**
 * Analisa o sentimento do texto e sugere uma coordenada 3D para visualização
 * @param content Conteúdo da entrada de diário
 * @param mood Estado de humor associado
 * @returns Coordenadas {x,y,z} para visualização espacial
 */
export async function suggestVisualizationPosition(content: string, mood: string): Promise<{x: number, y: number, z: number}> {
  try {
    // Criar um prompt para análise de sentimento e visualização
    const prompt = `
    Analise o seguinte texto de diário e o humor associado. Gere coordenadas 3D (x, y, z) entre -1 e 1 que representem visualmente o estado emocional:
    
    - x: horizontal (negativo para introspecção, positivo para expressão externa)
    - y: vertical (negativo para baixa energia, positivo para alta energia)
    - z: profundidade (negativo para desafio, positivo para conforto)

    Humor declarado: ${mood}
    Texto: "${content}"

    Responda apenas com as três coordenadas separadas por vírgulas no formato x,y,z.
    `;

    // Chamar a API da OpenAI com formato de resposta JSON
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Você é um assistente especializado em análise emocional e visualização espacial." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 20
    });

    // Obter a resposta
    const positionString = completion.choices[0].message.content?.trim() || "0,0,0";
    
    // Extrair coordenadas
    const coords = positionString.split(',').map(n => parseFloat(n));
    
    // Garantir que temos 3 coordenadas e que estão no intervalo [-1, 1]
    const clamp = (num: number) => Math.max(-1, Math.min(1, num));
    
    return {
      x: coords.length > 0 ? clamp(coords[0]) : 0,
      y: coords.length > 1 ? clamp(coords[1]) : 0,
      z: coords.length > 2 ? clamp(coords[2]) : 0
    };
  } catch (error) {
    console.error("Erro ao sugerir posição de visualização:", error);
    return { x: 0, y: 0, z: 0 };
  }
}

/**
 * Analisa detalhadamente o humor e estado emocional do texto do diário
 * @param content Conteúdo da entrada de diário
 * @param declaredMood Humor declarado pelo usuário
 * @returns Objeto com análise detalhada de humor e emoções
 */
export async function analyzeMood(content: string, declaredMood: string): Promise<{
  detailedAnalysis: string;
  emotionalTone: string;
  sentimentScore: number;
  dominantEmotions: string[];
  recommendedActions: string[];
}> {
  try {
    // Criar um prompt para análise detalhada de humor com resposta em JSON
    const prompt = `
    Analise detalhadamente o texto a seguir e o humor declarado pelo usuário. 
    Forneça uma análise psicológica profunda do estado emocional, identificando padrões, emoções subjacentes e possíveis desencadeadores.
    
    Texto do diário: "${content}"
    Humor declarado pelo usuário: "${declaredMood}"
    
    Gere uma resposta no formato json que inclua os seguintes campos:
    1. detailedAnalysis: Uma análise detalhada em português (3-5 frases) do estado emocional.
    2. emotionalTone: O tom emocional predominante em uma palavra (ex: "Otimista", "Melancólico", "Ansioso").
    3. sentimentScore: Pontuação de sentimento entre -100 (extremamente negativo) e 100 (extremamente positivo).
    4. dominantEmotions: Array com 3-5 emoções dominantes detectadas no texto.
    5. recommendedActions: Array com 3-5 ações recomendadas para abordar o estado emocional atual.
    
    Forneça a resposta em json.
    `;

    // Chamar a API da OpenAI com formato de resposta JSON
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: "system", 
          content: "Você é um psicólogo especializado em análise emocional e saúde mental. Forneça insights profundos e recomendações úteis em português."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 800
    });

    // Obter a resposta em formato JSON
    const responseContent = completion.choices[0].message.content?.trim() || "{}";
    const analysis = JSON.parse(responseContent);
    
    // Garantir que todos os campos existam e tenham valores válidos, aplicando limpeza de markdown
    return {
      detailedAnalysis: cleanAIResponseText(analysis.detailedAnalysis || "Análise não disponível"),
      emotionalTone: analysis.emotionalTone || "Neutro",
      sentimentScore: typeof analysis.sentimentScore === 'number' 
        ? Math.max(-100, Math.min(100, analysis.sentimentScore)) 
        : 0,
      dominantEmotions: Array.isArray(analysis.dominantEmotions) 
        ? analysis.dominantEmotions.map((emotion: string) => cleanAIResponseText(emotion)).slice(0, 5) 
        : ["Indefinido"],
      recommendedActions: Array.isArray(analysis.recommendedActions) 
        ? analysis.recommendedActions.map((action: string) => cleanAIResponseText(action)).slice(0, 5)  
        : ["Reflita sobre seus sentimentos"]
    };
  } catch (error) {
    console.error("Erro ao analisar humor:", error);
    // Retornar valores padrão em caso de erro
    return {
      detailedAnalysis: "Não foi possível analisar o texto neste momento.",
      emotionalTone: "Indefinido",
      sentimentScore: 0,
      dominantEmotions: ["Indefinido"],
      recommendedActions: ["Tente novamente mais tarde"]
    };
  }
}

/**
 * Versão aprimorada da análise de emoções com processamento mais detalhado
 * Inclui análise contextual e dicas personalizadas para gestão emocional
 * 
 * @param content Texto do diário para análise 
 * @param declaredMood Humor declarado pelo usuário
 * @returns Objeto com análise detalhada e recomendações
 */
export async function analyzeEmotionInDepth(content: string, declaredMood: string): Promise<{
  detailedAnalysis: string;
  emotionalTone: string;
  sentimentScore: number;
  dominantEmotions: string[];
  recommendedActions: string[];
}> {
  try {
    // Criar um prompt para análise avançada de emoções
    const systemPrompt = `
    Você é um psicólogo especializado em análise emocional com treinamento avançado em terapia cognitivo-comportamental.
    Realize uma análise profunda e detalhada do estado emocional presente no texto fornecido.
    
    Analise os seguintes aspectos:
    1. Padrões emocionais subjacentes que podem não estar explícitos
    2. Possíveis gatilhos emocionais presentes no contexto
    3. Estratégias de enfrentamento que a pessoa está usando
    4. Distorções cognitivas que possam estar presentes
    5. Interpretação entre o humor declarado e o conteúdo emocional real do texto
    
    Gere sua resposta em formato json com os seguintes campos:
    - detailedAnalysis: Uma análise completa e contextualizada (4-6 frases)
    - emotionalTone: Tom emocional predominante em uma palavra 
    - sentimentScore: Pontuação entre -100 (extremamente negativo) e 100 (extremamente positivo)
    - dominantEmotions: Array com 3-5 emoções dominantes com nomes específicos (ex: "insegurança", "esperança")
    - recommendedActions: Array com 3-5 recomendações personalizadas baseadas na TCC e mindfulness
    
    Certifique-se de formatar sua resposta como um objeto json válido.
    Sua resposta DEVE ser em formato json.
    `;
    
    // Chamar a API da OpenAI com formato de resposta JSON
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Texto: "${content}"\nHumor declarado: "${declaredMood}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 1000
    });
    
    // Analisar a resposta em formato JSON
    const responseContent = completion.choices[0].message.content?.trim() || "{}";
    const analysis = JSON.parse(responseContent);
    
    // Garantir que todos os campos existam e tenham valores válidos, aplicando limpeza de markdown
    return {
      detailedAnalysis: cleanAIResponseText(analysis.detailedAnalysis || "Análise detalhada não disponível"),
      emotionalTone: analysis.emotionalTone || "Complexo",
      sentimentScore: typeof analysis.sentimentScore === 'number' 
        ? Math.max(-100, Math.min(100, analysis.sentimentScore)) 
        : 0,
      dominantEmotions: Array.isArray(analysis.dominantEmotions) 
        ? analysis.dominantEmotions.map((emotion: string) => cleanAIResponseText(emotion)).slice(0, 5) 
        : ["Emoção não identificada"],
      recommendedActions: Array.isArray(analysis.recommendedActions) 
        ? analysis.recommendedActions.map((action: string) => cleanAIResponseText(action)).slice(0, 5)  
        : ["Consulte um profissional para orientação personalizada"]
    };
  } catch (error) {
    console.error("Erro na análise emocional aprofundada:", error);
    return {
      detailedAnalysis: "Erro ao processar análise emocional detalhada.",
      emotionalTone: "Indefinido",
      sentimentScore: 0,
      dominantEmotions: ["Erro na análise"],
      recommendedActions: ["Tente novamente mais tarde ou contate suporte"]
    };
  }
}

/**
 * Transcreve um arquivo de áudio usando o modelo Whisper da OpenAI
 * @param audioFilePath Caminho do arquivo de áudio no sistema de arquivos
 * @returns Objeto com texto transcrito e metadados
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    console.log(`Iniciando transcrição do arquivo: ${audioFilePath}`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Arquivo não encontrado: ${audioFilePath}`);
    }
    
    // Obter estatísticas do arquivo
    const fileStats = fs.statSync(audioFilePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    
    // Verificar extensão do arquivo para melhor diagnóstico
    const extension = path.extname(audioFilePath).toLowerCase();
    
    // Compatibilidade com iOS: tratamento especial para diferentes formatos
    let formatInfo = "";
    if (extension === '.mp4' && audioFilePath.includes('/audio/')) {
      formatInfo = "Áudio iOS (MP4/AAC)";
      console.log('Detectado áudio de iOS no formato MP4/AAC. Compatível com OpenAI Whisper.');
    } else if (extension === '.m4a') {
      formatInfo = "Áudio iOS (M4A/AAC)";
      console.log('Detectado áudio de iOS no formato M4A/AAC. Compatível com OpenAI Whisper.');
    } else if (extension === '.webm') {
      formatInfo = "Áudio WebM (navegador)";
      console.log('Detectado áudio WebM de navegador. Compatível com OpenAI Whisper.');
    }
    
    // Registrar informações detalhadas para diagnóstico
    console.log(`Detalhes do arquivo de áudio:
      - Caminho: ${audioFilePath}
      - Tamanho: ${fileSizeMB.toFixed(2)} MB
      - Formato: ${extension} ${formatInfo ? `(${formatInfo})` : ''}
      - Data modificação: ${new Date(fileStats.mtime).toISOString()}
    `);
    console.log(`Tamanho do arquivo: ${fileSizeMB.toFixed(2)} MB`);
    
    // Verificar se o arquivo tem algum conteúdo
    if (fileSizeMB === 0) {
      throw new Error("Arquivo de áudio vazio");
    }
    
    // Log para verificação de formato do arquivo
    console.log(`Extensão do arquivo: ${extension || 'sem extensão'}`);
    
    // Verificar compatibilidade com formatos suportados pela OpenAI
    const supportedOpenAIFormats = ['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm'];
    
    // Se a extensão estiver presente e não for suportada, tentar correção automática
    if (extension && !supportedOpenAIFormats.includes(extension)) {
      console.warn(`AVISO: Extensão ${extension} pode não ser suportada pela OpenAI. Formatos suportados: ${supportedOpenAIFormats.join(', ')}`);
      
      // Tentar identificar o tipo de arquivo real e renomear para um formato compatível
      try {
        const newPath = audioFilePath.replace(extension, '.mp3');
        fs.copyFileSync(audioFilePath, newPath);
        console.log(`Arquivo convertido de ${extension} para .mp3: ${newPath}`);
        
        // Usar o novo arquivo para transcrição
        audioFilePath = newPath;
        // Não podemos atribuir a uma constante, então usar uma variável temporária
        const newExtension = '.mp3';
        console.log(`Usando novo caminho com extensão ${newExtension}: ${audioFilePath}`);
      } catch (e) {
        console.error(`Erro ao converter formato de arquivo: ${e}`);
      }
    }
    
    // Verificação adicional para arquivos de áudio iOS
    if (audioFilePath.includes('audio_') && (extension === '.mp4' || extension === '.m4a')) {
      console.log('Detectado formato iOS. Forçando conversão para formato compatível.');
      try {
        // Sempre converter arquivos iOS para MP3 que tem melhor compatibilidade
        const newPath = audioFilePath.replace(extension, '.mp3');
        fs.copyFileSync(audioFilePath, newPath);
        audioFilePath = newPath;
        console.log(`Arquivo iOS convertido para MP3: ${audioFilePath}`);
      } catch (e) {
        console.error(`Erro ao converter formato iOS: ${e}`);
      }
    }
    
    // Se o arquivo for muito grande, tentar otimizar
    if (fileSizeMB > 5) {
      console.log(`Arquivo grande detectado (${fileSizeMB.toFixed(2)} MB). Processando...`);
    }
    
    // Especial para iOS: verificar se é um arquivo .mp4 de áudio (iOS grava áudio dessa forma)
    if (extension === '.mp4' && audioFilePath.includes('/audio/')) {
      console.log('Detectado possível áudio de iOS no formato MP4.');
    }
    
    // Iniciando cronômetro para medir desempenho
    const startTime = Date.now();
    
    // Obter o stream do arquivo
    const audioReadStream = fs.createReadStream(audioFilePath);
    
    try {
      // Chamar a API do OpenAI para transcrição com configurações otimizadas
      // Adiciona um timeout explícito para evitar processos presos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 segundos

      try {
        const transcriptionResult = await openai.audio.transcriptions.create({
          file: audioReadStream,
          model: "whisper-1",
          language: "pt",
          response_format: "json",  // Alterado para JSON para evitar problemas com HTML
          temperature: 0.2,  // Reduzir a temperatura para resultados mais precisos
          prompt: "Esta é uma gravação de um diário de saúde mental em português brasileiro."  // Promovendo contexto para melhor reconhecimento
        }, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        // Calcular tempo gasto
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        // Extrair texto da resposta JSON
        let textContent = '';
        if (typeof transcriptionResult === 'string') {
          try {
            // Tentar fazer parse do JSON se for string
            const parsedJson = JSON.parse(transcriptionResult);
            textContent = parsedJson.text || '';
          } catch (e) {
            // Se falhar o parse, usar a string diretamente (fallback)
            console.warn('Falha ao fazer parse do JSON, usando como texto plano:', e);
            textContent = transcriptionResult;
          }
        } else if (transcriptionResult && typeof transcriptionResult === 'object') {
          // Se já for objeto, extrair a propriedade text
          textContent = transcriptionResult.text || '';
        }
        
        console.log(`Transcrição concluída em ${elapsedTime}s. Tamanho do texto: ${textContent.length} caracteres`);
        
        // Limpar a transcrição - remover espaços duplicados e normalizar pontuação
        const cleanedTranscription = textContent
          .replace(/\s+/g, ' ')
          .replace(/\s+\./g, '.')
          .replace(/\s+\,/g, ',')
          .trim();
          
        return cleanedTranscription;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('A transcrição foi cancelada devido ao tempo limite excedido (45s)');
        }
        throw error;
      }

    } catch (apiError) {
      // Tratamento específico para erros da API da OpenAI
      if (apiError instanceof Error) {
        const errorMessage = apiError.message;
        
        // Verificar se é um erro de formato não reconhecido
        if (errorMessage.includes("Unrecognized file format")) {
          console.error("Erro de formato de arquivo não reconhecido pela OpenAI");
          throw new Error("Formato de áudio não suportado. Por favor, tente gravar novamente ou use outro formato de áudio (ex: MP3, WAV, OGG).");
        }
        
        // Verificar se é um erro de arquivo muito grande
        if (errorMessage.includes("file too large") || errorMessage.includes("exceeded maximum size")) {
          console.error("Erro de arquivo muito grande");
          throw new Error("O arquivo de áudio é muito grande. Por favor, tente uma gravação mais curta (máximo 25MB).");
        }
        
        // Outros erros da API
        console.error(`Erro da API OpenAI ao transcrever áudio: ${errorMessage}`);
        throw new Error(`Erro na transcrição: ${errorMessage}`);
      }
      
      // Se não for um erro conhecido, apenas repassar
      throw apiError;
    }
    
  } catch (error) {
    console.error(`Erro ao transcrever áudio: ${error instanceof Error ? error.message : String(error)}`);
    // Registrar mais detalhes do erro para diagnóstico
    if (error instanceof Error && error.stack) {
      console.error(`Stack de erro:\n${error.stack}`);
    }
    
    // Preparar uma mensagem amigável para o usuário
    let userMessage = "Não foi possível transcrever o áudio. Por favor, tente novamente.";
    
    if (error instanceof Error) {
      // Se já temos uma mensagem específica (dos blocos try/catch aninhados), usá-la
      if (error.message.includes("Formato de áudio não suportado") || 
          error.message.includes("arquivo muito grande") ||
          error.message.includes("Erro na transcrição")) {
        userMessage = error.message;
      }
    }
    
    throw new Error(userMessage);
  } finally {
    // Garantir que o arquivo foi lido e fechado corretamente
    try {
      // Verificar se o arquivo ainda existe após a leitura (pode ter sido movido/excluído)
      if (fs.existsSync(audioFilePath)) {
        console.log(`Arquivo de áudio ainda disponível em: ${audioFilePath}`);
      }
    } catch (e) {
      console.error(`Erro ao verificar arquivo após transcrição: ${e}`);
    }
  }
}

// Map para cache de transcrições
const audioTranscriptionCache = new Map<string, {
  timestamp: number;
  result: {
    transcription: string;
    category: string;
    summary: string;
    tags: string[];
    moodAnalysis: {
      detailedAnalysis: string;
      emotionalTone: string;
      sentimentScore: number;
      dominantEmotions: string[];
      recommendedActions: string[];
    };
  };
}>();

// Tempo de expiração do cache em ms (30 minutos)
const CACHE_EXPIRATION_MS = 30 * 60 * 1000;

/**
 * Versão aprimorada da transcrição com processamento em paralelo para análise de conteúdo
 * Inclui cache e melhor manipulação de erros
 * 
 * @param audioFilePath Caminho do arquivo de áudio
 * @param mood Estado de humor declarado
 * @returns Objeto com transcrição e análises
 */
interface TranscriptionOptions {
  enhancedAnalysis?: boolean;
  detectTopics?: boolean;
}

export async function transcribeAndAnalyzeAudio(
  audioFilePath: string, 
  mood: string = "neutro", 
  options?: TranscriptionOptions
): Promise<{
  transcription: string;
  category: string;
  summary: string;
  tags: string[];
  moodAnalysis: {
    detailedAnalysis: string;
    emotionalTone: string;
    sentimentScore: number;
    dominantEmotions: string[];
    recommendedActions: string[];
  };
}> {
  try {
    console.log(`Iniciando processamento completo do áudio: ${audioFilePath}`);
    const startTime = Date.now();
    
    // Configurações baseadas nas opções
    const enableEnhancedAnalysis = options?.enhancedAnalysis === true;
    const enableTopicDetection = options?.detectTopics === true;
    
    console.log(`Configurações: análise aprimorada=${enableEnhancedAnalysis}, detecção de tópicos=${enableTopicDetection}`);
    
    // Gerar uma chave de cache baseada no nome do arquivo e data de modificação
    const fileStats = fs.statSync(audioFilePath);
    const cacheKey = `${audioFilePath}_${fileStats.size}_${fileStats.mtimeMs}_${enableEnhancedAnalysis}_${enableTopicDetection}`;
    
    // Verificar se temos resultado em cache e se ainda é válido
    const cachedResult = audioTranscriptionCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_EXPIRATION_MS) {
      console.log(`Usando resultado em cache para: ${audioFilePath}`);
      return cachedResult.result;
    }
    
    // Etapa 1: Transcrição com timeout e retentativas
    let transcription = '';
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Tentativa ${attempts} de transcrição do áudio: ${audioFilePath}`);
        
        // Verificar o formato do arquivo e converter se necessário
        console.log(`Verificando formato do arquivo: ${audioFilePath}`);
        
        // Não precisamos mais converter o arquivo - usar diretamente
        // A API OpenAI Whisper pode processar diretamente diversos formatos
        let fileToProcess = audioFilePath;
        
        // Extrair extensão do arquivo apenas para logging
        const extension = path.extname(audioFilePath).toLowerCase();
        
        // Logar o formato para diagnóstico, mas não alterar o caminho
        if (extension === '.webm') {
          console.log(`Usando arquivo webm diretamente: ${audioFilePath}`);
        }
        else if (extension === '.mp4' && audioFilePath.includes('/audio/')) {
          console.log(`Detectado formato de áudio iOS (MP4). Usando diretamente.`);
          // Será tratado diretamente pelo Whisper da OpenAI
          console.log('Arquivos MP4 de áudio do iOS geralmente são AAC e podem ser processados diretamente pela API Whisper');
        }
        
        // Envolver em um Promise.race para ter timeout
        transcription = await Promise.race([
          transcribeAudio(fileToProcess),
          new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao transcrever áudio')), 30000);
          })
        ]);
        
        // Se chegou aqui, a transcrição foi bem-sucedida
        break;
      } catch (transcriptionError) {
        if (attempts >= maxAttempts) {
          console.error(`Falha nas ${maxAttempts} tentativas de transcrição:`, transcriptionError);
          throw transcriptionError;
        }
        console.warn(`Tentativa ${attempts} falhou, tentando novamente...`);
        // Aguardar um segundo antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Verificar se a transcrição foi bem-sucedida
    if (!transcription || transcription.trim() === '') {
      throw new Error('Não foi possível transcrever o áudio. Tente novamente com um áudio mais claro.');
    }
    
    console.log(`Transcrição concluída em ${((Date.now() - startTime) / 1000).toFixed(2)}s. Iniciando análises...`);
    
    // Etapa 2: Processamento paralelo para análise do texto com manipulação de erros individuais
    let category = "Não categorizado";
    let summary = "Resumo não disponível";
    let tags: string[] = [];
    let moodAnalysisResult = {
      detailedAnalysis: "Análise não disponível",
      emotionalTone: "Neutro",
      sentimentScore: 0,
      dominantEmotions: ["Indefinido"],
      recommendedActions: ["Reflita sobre seus sentimentos"]
    };
    
    try {
      // Configurar análises a serem executadas com base nas opções
      const analysisPromises = [];
      
      // Análises básicas sempre são executadas
      analysisPromises.push(suggestCategory(transcription));
      analysisPromises.push(generateSummary(transcription));
      
      // Tags básicas ou detecção avançada de tópicos
      if (enableTopicDetection) {
        analysisPromises.push(extractDetailedTopics(transcription));
      } else {
        analysisPromises.push(extractTags(transcription));
      }
      
      // Análise de humor padrão ou aprimorada
      if (enableEnhancedAnalysis) {
        analysisPromises.push(analyzeEmotionInDepth(transcription, mood));
      } else {
        analysisPromises.push(analyzeMood(transcription, mood));
      }
      
      // Usar Promise.allSettled para continuar mesmo se alguma análise falhar
      const analysisResults = await Promise.allSettled(analysisPromises);
      
      // Processar os resultados individualmente
      if (analysisResults[0].status === 'fulfilled') category = analysisResults[0].value as string;
      if (analysisResults[1].status === 'fulfilled') summary = analysisResults[1].value as string;
      if (analysisResults[2].status === 'fulfilled') tags = analysisResults[2].value as string[];
      if (analysisResults[3].status === 'fulfilled') moodAnalysisResult = analysisResults[3].value as {
        detailedAnalysis: string;
        emotionalTone: string;
        sentimentScore: number;
        dominantEmotions: string[];
        recommendedActions: string[];
      };
      
      // Registrar falhas específicas para diagnóstico
      analysisResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          const analysisTypes = ['categoria', 'resumo', 'tags', 'análise de humor'];
          console.error(`Falha ao processar ${analysisTypes[index]}:`, result.reason);
        }
      });
    } catch (analysisError) {
      console.error(`Erro geral na análise do conteúdo:`, analysisError);
      // Continuar com os valores padrão
    }
    
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Processamento completo concluído em ${processingTime}s`);
    
    // Criar o resultado final
    const result = {
      transcription,
      category,
      summary,
      tags,
      moodAnalysis: moodAnalysisResult
    };
    
    // Armazenar em cache
    audioTranscriptionCache.set(cacheKey, {
      timestamp: Date.now(),
      result
    });
    
    // Limpar cache antigo - manter apenas os últimos 20 resultados
    if (audioTranscriptionCache.size > 20) {
      const entries = Array.from(audioTranscriptionCache.entries());
      const oldestKey = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      audioTranscriptionCache.delete(oldestKey);
      console.log(`Cache de transcrição limpo, removido: ${oldestKey}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Erro no processamento completo do áudio: ${error instanceof Error ? error.message : String(error)}`);
    
    // Resposta de fallback com mensagem adequada
    return {
      transcription: "Não foi possível processar o áudio. Por favor, tente novamente.",
      category: "Erro",
      summary: "Processamento falhou",
      tags: ["erro", "falha_processamento"],
      moodAnalysis: {
        detailedAnalysis: "Ocorreu um erro ao analisar o áudio. Tente novamente ou contate o suporte.",
        emotionalTone: "Indefinido",
        sentimentScore: 0,
        dominantEmotions: ["Indefinido"],
        recommendedActions: ["Tente gravar novamente com um áudio mais claro"]
      }
    };
  }
}

// A função generateJournalTitle já foi definida no início do arquivo
// e não precisa ser redefinida aqui