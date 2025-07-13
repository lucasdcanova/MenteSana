import { Router } from "express";
import multer from "multer";
import { storage } from "../storage";
import { JournalEntry } from "@shared/schema";
import * as OpenAIService from "../openai-service";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Console } from "console";

const router = Router();

// Configurar o multer para upload de áudios com extensão e formato definidos
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Certifique-se de que o diretório de destino existe
    const destDir = 'uploads/audio/';
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Criar um nome de arquivo baseado em timestamp e MD5
    const hash = crypto.createHash('md5')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex');
    
    // Adicionar uma extensão de arquivo apropriada conforme o MIME type
    let extension = 'webm'; // Padrão é webm
    
    if (file.mimetype === 'audio/wav' || file.mimetype === 'audio/x-wav') {
      extension = 'wav';
    } else if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      extension = 'mp3';
    } else if (file.mimetype === 'audio/ogg') {
      extension = 'ogg';
    } else if (file.mimetype === 'audio/mp4' || file.mimetype === 'audio/x-m4a') {
      extension = 'mp4';
    } 
    
    cb(null, `${hash}.${extension}`);
  }
});

// Filtro para validar o tipo de arquivo
const fileFilter = (req: any, file: any, cb: any) => {
  // Lista de MIME types suportados pela OpenAI
  const supportedTypes = [
    'audio/wav', 'audio/x-wav',
    'audio/mpeg', 'audio/mp3',
    'audio/ogg', 'audio/webm',
    'audio/mp4', 'audio/x-m4a',
    'audio/flac'
  ];
  
  if (supportedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Log do mime-type para diagnóstico
    console.warn(`Tipo MIME não suportado: ${file.mimetype}`);
    cb(new Error(`Formato de áudio não suportado: ${file.mimetype}. Use WAV, MP3, MP4, OGG ou WEBM.`), false);
  }
};

const audioUpload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

// Obter todas as entradas do diário para um usuário
router.get('/', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  try {
    const entries = await storage.getJournalEntriesByUser(req.user.id);
    res.json(entries);
  } catch (error) {
    console.error("Erro ao buscar entradas do diário:", error);
    res.status(500).json({ error: "Erro ao buscar entradas do diário" });
  }
});

// Criar uma nova entrada de texto no diário
router.post('/', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  try {
    const { content, mood, category, title, tags, colorHex, audioUrl, audioDuration } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Conteúdo obrigatório" });
    }

    // Verificar se deve usar análise avançada (parâmetro de consulta)
    const useEnhancedAnalysis = req.query.enhancedAnalysis === 'true';
    
    // Iniciar objeto para a nova entrada
    const newEntry: Partial<JournalEntry> = {
      userId: req.user.id,
      content,
      mood: mood || 'neutro',
      title: title // Usar título fornecido pelo cliente se existir
    };
    
    // Adicionar campos opcionais se fornecidos
    if (audioUrl) newEntry.audioUrl = audioUrl;
    if (audioDuration) newEntry.audioDuration = audioDuration;
    if (tags) newEntry.tags = tags;
    if (colorHex) newEntry.colorHex = colorHex;
    
    // Se não temos todos os campos de análise, gerá-los com IA
    if (!title || !tags || !colorHex) {
      // Analisar o conteúdo com OpenAI
      let analyzedMood;
      if (useEnhancedAnalysis) {
        analyzedMood = await OpenAIService.analyzeEmotionInDepth(content, mood || 'neutro');
      } else {
        analyzedMood = await OpenAIService.analyzeMood(content, mood || 'neutro');
      }
      
      // Extrair tópicos e categorizar
      if (!tags) {
        newEntry.tags = await OpenAIService.extractTags(content);
      }
      
      // Gerar categoria se não for fornecida
      let suggestedCategory = category;
      if (!category) {
        suggestedCategory = await OpenAIService.suggestCategory(content);
      }
      newEntry.category = suggestedCategory;
      
      // Gerar resumo do conteúdo
      newEntry.summary = await OpenAIService.generateSummary(content);
      
      // Gerar título baseado no conteúdo se não fornecido
      if (!title) {
        newEntry.title = await OpenAIService.generateJournalTitle(content);
      }
      
      // Adicionar análises detalhadas de emoção
      newEntry.emotionalTone = analyzedMood.emotionalTone;
      newEntry.sentimentScore = analyzedMood.sentimentScore;
      newEntry.dominantEmotions = analyzedMood.dominantEmotions;
      newEntry.recommendedActions = analyzedMood.recommendedActions;
      
      // Gerar cor baseada na emoção se não fornecida
      if (!colorHex) {
        newEntry.colorHex = getColorForEmotion(analyzedMood.emotionalTone);
      }
    }
    
    const entry = await storage.createJournalEntry(newEntry as any);
    
    // Atualizar automaticamente o streak do usuário
    await storage.updateDailyStreak(req.user.id, "journal");
    
    res.status(201).json(entry);
    
  } catch (error) {
    console.error("Erro ao criar entrada no diário:", error);
    res.status(500).json({ error: "Erro ao criar entrada no diário" });
  }
});

// Processar texto como se fosse transcrição para análise avançada
// Endpoint para analisar texto e retornar análises sem criar entrada
router.post('/analyze', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  try {
    const { content, mood, enhancedAnalysis = true } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Conteúdo obrigatório" });
    }

    // Análises em paralelo para processamento mais rápido
    const analysisPromises = [];
    
    // Análise de emoção (padrão ou avançada)
    const moodPromise = enhancedAnalysis 
      ? OpenAIService.analyzeEmotionInDepth(content, mood || 'neutro')
      : OpenAIService.analyzeMood(content, mood || 'neutro');
    
    // Extração de tópicos
    const tagsPromise = OpenAIService.extractTags(content);
    
    // Categoria, resumo e título
    const categoryPromise = OpenAIService.suggestCategory(content);
    const summaryPromise = OpenAIService.generateSummary(content);
    const titlePromise = OpenAIService.generateJournalTitle(content);
    
    // Aguardar todas as análises serem concluídas
    const [moodAnalysis, tags, category, summary, title] = await Promise.all([
      moodPromise, tagsPromise, categoryPromise, summaryPromise, titlePromise
    ]);

    // Montar objeto de resposta com todas as análises
    const analysisResult = {
      title,
      category,
      summary,
      tags,
      emotionalTone: moodAnalysis.emotionalTone,
      colorHex: getColorForEmotion(moodAnalysis.emotionalTone),
      moodAnalysis
    };
    
    res.status(200).json(analysisResult);
    
  } catch (error) {
    console.error("Erro ao analisar texto:", error);
    res.status(500).json({ error: "Erro ao analisar texto. Tente novamente mais tarde." });
  }
});

router.post('/process-text', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  try {
    const { text, mood, category, userId, enhancedAnalysis = true, detectTopics = true } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Texto obrigatório" });
    }

    // Verificar se o user ID corresponde ao usuário autenticado
    if (userId !== req.user.id) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Análises em paralelo para processamento mais rápido
    const analysisPromises = [];
    
    // Análise de emoção (padrão ou avançada)
    if (enhancedAnalysis) {
      analysisPromises.push(OpenAIService.analyzeEmotionInDepth(text, mood || 'neutro'));
    } else {
      analysisPromises.push(OpenAIService.analyzeMood(text, mood || 'neutro'));
    }
    
    // Extração de tópicos (padrão ou detalhada)
    if (detectTopics) {
      analysisPromises.push(OpenAIService.extractDetailedTopics(text));
    } else {
      analysisPromises.push(OpenAIService.extractTags(text));
    }
    
    // Categoria, resumo e título
    analysisPromises.push(category ? Promise.resolve(category) : OpenAIService.suggestCategory(text));
    analysisPromises.push(OpenAIService.generateSummary(text));
    analysisPromises.push(OpenAIService.generateJournalTitle(text));
    
    // Aguardar todas as análises serem concluídas
    const [moodAnalysis, tags, suggestedCategory, summary, title] = await Promise.all(analysisPromises);

    // Criar a entrada no banco de dados
    const newEntry: Partial<JournalEntry> = {
      userId: req.user.id,
      content: text,
      title, // Agora incluindo o título na entrada
      mood: mood || 'neutro',
      category: suggestedCategory,
      tags,
      summary,
      emotionalTone: moodAnalysis.emotionalTone,
      sentimentScore: moodAnalysis.sentimentScore,
      dominantEmotions: moodAnalysis.dominantEmotions,
      recommendedActions: moodAnalysis.recommendedActions,
      colorHex: getColorForEmotion(moodAnalysis.emotionalTone)
    };
    
    const entry = await storage.createJournalEntry(newEntry as any);
    
    // Atualizar automaticamente o streak do usuário
    await storage.updateDailyStreak(req.user.id, "journal");
    
    res.status(201).json(entry);
    
  } catch (error) {
    console.error("Erro ao processar texto para análise:", error);
    res.status(500).json({ error: "Erro ao processar texto. Tente novamente mais tarde." });
  }
});

// Transcrever e analisar áudio
router.post('/transcribe', audioUpload.single('audio'), async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Arquivo de áudio não fornecido" });
  }

  try {
    // Obter parâmetros do request
    const mood = req.body.mood || 'neutro';
    const duration = parseInt(req.body.duration || '0', 10);
    const category = req.body.category || null;
    
    // Verificar opções de análise
    const enhancedAnalysis = req.body.enhancedAnalysis === 'true';
    const detectTopics = req.body.detectTopics === 'true';
    
    // Configurar opções de transcrição
    const transcriptionOptions = {
      enhancedAnalysis,
      detectTopics
    };
    
    // Verificar o formato do arquivo através da extensão
    const fileExt = path.extname(req.file.path).toLowerCase();
    console.log(`Processando arquivo de áudio com extensão: ${fileExt || 'sem extensão'}, mimetype: ${req.file.mimetype}`);
    
    // Transcrever e analisar o áudio
    const result = await OpenAIService.transcribeAndAnalyzeAudio(
      req.file.path, 
      mood,
      transcriptionOptions
    );
    
    // Se já temos uma categoria definida, usar em vez da sugestão da IA
    if (category) {
      result.category = category;
    }
    
    // Gerar um título para a entrada de áudio
    const title = await OpenAIService.generateJournalTitle(result.transcription);
    
    // Criar a entrada no banco de dados
    const newEntry: Partial<JournalEntry> = {
      userId: req.user.id,
      title: title, // Título gerado por IA
      content: result.transcription,
      mood,
      audioUrl: `/uploads/audio/${path.basename(req.file.path)}`,
      audioDuration: duration,
      category: result.category,
      tags: result.tags,
      summary: result.summary,
      emotionalTone: result.moodAnalysis.emotionalTone,
      sentimentScore: result.moodAnalysis.sentimentScore,
      dominantEmotions: result.moodAnalysis.dominantEmotions,
      recommendedActions: result.moodAnalysis.recommendedActions,
      colorHex: getColorForEmotion(result.moodAnalysis.emotionalTone)
    };
    
    const entry = await storage.createJournalEntry(newEntry as any);
    
    // Atualizar automaticamente o streak do usuário
    await storage.updateDailyStreak(req.user.id, "journal");
    
    // Atualizar todos os componentes de IA baseados nesta entrada de diário
    try {
      const { updateAllAIComponents } = await import('../ai-integration-service');
      updateAllAIComponents(req.user.id, 'journal')
        .then(success => {
          console.log(`[JournalRoutes] Atualização integrada de IA: ${success ? 'Sucesso' : 'Falha'}`);
        })
        .catch(error => {
          console.error('[JournalRoutes] Erro na atualização integrada de IA:', error);
        });
    } catch (error) {
      console.error('[JournalRoutes] Erro ao importar serviço de integração de IA:', error);
    }
    
    // Criar um objeto composto com o resultado + o ID
    const responseData = {
      ...result,
      id: entry.id
    };
    
    res.status(201).json(responseData);
    
  } catch (error) {
    console.error("Erro ao transcrever áudio:", error);
    
    // Tentar remover o arquivo em caso de erro
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("Erro ao excluir arquivo de áudio temporário:", e);
      }
    }
    
    res.status(500).json({ error: "Erro ao processar áudio. Tente novamente mais tarde." });
  }
});

// Obter uma entrada específica do diário
router.get('/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  try {
    const entryId = parseInt(req.params.id, 10);
    const entry = await storage.getJournalEntry(entryId);
    
    if (!entry) {
      return res.status(404).json({ error: "Entrada não encontrada" });
    }
    
    // Verificar se o usuário tem permissão para acessar esta entrada
    if (entry.userId !== req.user.id) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    
    // Atualizar automaticamente o streak do usuário ao visualizar entradas
    await storage.updateDailyStreak(req.user.id, "journal-view");
    
    res.json(entry);
  } catch (error) {
    console.error("Erro ao buscar entrada do diário:", error);
    res.status(500).json({ error: "Erro ao buscar entrada do diário" });
  }
});

// Processar uma entrada de diário (categorizar e gerar título)
router.post('/:id/process', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  try {
    console.log(`[JournalRoutes] Recebida solicitação para processar entrada ID: ${req.params.id}`);
    const entryId = parseInt(req.params.id, 10);
    const entry = await storage.getJournalEntry(entryId);
    
    if (!entry) {
      return res.status(404).json({ error: "Entrada não encontrada" });
    }
    
    // Verificar se a entrada pertence ao usuário
    if (entry.userId !== req.user.id) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    
    // Verificar se a entrada precisa de processamento
    if (!entry.needsProcessing) {
      return res.status(400).json({ error: "Entrada já foi processada" });
    }
    
    console.log(`[JournalRoutes] Iniciando processamento da entrada ${entryId}`);
    
    // Atualizar o status para indicar que está em processamento
    await storage.updateJournalEntry(entryId, {
      processingStatus: 'processing'
    });
    
    // Realizar análises em paralelo
    const [category, tags, title, summary, analyzedMood] = await Promise.all([
      OpenAIService.suggestCategory(entry.content),
      OpenAIService.extractTags(entry.content),
      OpenAIService.generateJournalTitle(entry.content),
      OpenAIService.generateSummary(entry.content),
      OpenAIService.analyzeMood(entry.content, entry.mood)
    ]);
    
    // Gerar cor baseada na emoção se não existir
    const colorHex = entry.colorHex || getColorForEmotion(analyzedMood.emotionalTone || 'neutro');
    
    // Atualizar a entrada com os resultados da análise
    const updatedEntry = await storage.updateJournalEntry(entryId, {
      category,
      tags,
      title,
      summary,
      colorHex,
      emotionalTone: analyzedMood.emotionalTone,
      sentimentScore: analyzedMood.sentimentScore,
      dominantEmotions: analyzedMood.dominantEmotions,
      recommendedActions: analyzedMood.recommendedActions,
      needsProcessing: false,
      processingStatus: 'completed'
    });
    
    console.log(`[JournalRoutes] Processamento concluído para entrada ${entryId}`);
    
    res.json(updatedEntry);
  } catch (error) {
    console.error(`[JournalRoutes] Erro ao processar entrada ${req.params.id}:`, error);
    
    // Atualizar o status para indicar que houve um erro
    try {
      await storage.updateJournalEntry(parseInt(req.params.id, 10), {
        processingStatus: 'error'
      });
    } catch (updateError) {
      console.error(`[JournalRoutes] Erro ao atualizar status de erro:`, updateError);
    }
    
    res.status(500).json({ error: "Erro ao processar entrada do diário" });
  }
});

// Excluir uma entrada do diário
router.delete('/:id', async (req, res) => {
  const entryId = parseInt(req.params.id, 10);
  console.log(`[DELETE JOURNAL] Recebida solicitação para excluir entrada ID: ${entryId}`);
  
  // Verificar autorização pelo token ou sessão
  if (req.headers.authorization) {
    console.log(`[DELETE JOURNAL] Autorização via token presente: ${req.headers.authorization.substring(0, 15)}...`);
  } else {
    console.log(`[DELETE JOURNAL] Sem token de autorização no cabeçalho`);
  }
  
  console.log(`[DELETE JOURNAL] Status de autenticação: isAuthenticated=${req.isAuthenticated()}`);
  
  // Usuário precisa estar autenticado
  if (!req.isAuthenticated()) {
    console.log(`[DELETE JOURNAL] ERRO: Usuário não autenticado para ID: ${entryId}`);
    return res.status(401).json({ error: "Não autenticado", message: "É necessário estar autenticado para excluir entradas do diário" });
  }

  try {
    if (isNaN(entryId)) {
      console.log(`[DELETE JOURNAL] ERRO: ID inválido: ${req.params.id}`);
      return res.status(400).json({ error: "ID inválido", message: "O ID da entrada deve ser um número válido" });
    }
    
    console.log(`[DELETE JOURNAL] Verificando existência da entrada ID: ${entryId}`);
    
    // Buscar a entrada para verificar permissões
    const entry = await storage.getJournalEntry(entryId);
    
    // Verificar se a entrada existe
    if (!entry) {
      console.log(`[DELETE JOURNAL] ERRO: Entrada ID ${entryId} não encontrada`);
      return res.status(404).json({ 
        error: "Entrada não encontrada", 
        message: "A entrada solicitada não existe ou já foi excluída"
      });
    }
    
    // Log de debug para depuração
    console.log(`[DELETE JOURNAL] Entrada encontrada:`, {
      id: entry.id,
      userId: entry.userId,
      date: entry.date,
      hasAudio: !!entry.audioUrl
    });
    
    // Verificar se o usuário tem permissão para excluir esta entrada
    console.log(`[DELETE JOURNAL] Verificando permissão - Entry userId: ${entry.userId}, Auth userId: ${req.user.id}`);
    
    if (entry.userId !== req.user.id) {
      console.log(`[DELETE JOURNAL] ERRO: Acesso negado - IDs não correspondem`);
      return res.status(403).json({ 
        error: "Acesso negado", 
        message: "Você não tem permissão para excluir esta entrada"
      });
    }
    
    // Excluir arquivo de áudio associado, se existir
    if (entry.audioUrl) {
      try {
        // Normalizar o caminho do arquivo de áudio
        const audioPath = entry.audioUrl.replace(/^\/uploads\//, '');
        const fullPath = path.join(process.cwd(), 'uploads', audioPath.replace(/^uploads\//, ''));
        
        console.log(`[DELETE JOURNAL] Verificando arquivo de áudio: ${fullPath}`);
        
        // Verificar se o arquivo existe antes de tentar excluí-lo
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`[DELETE JOURNAL] Arquivo de áudio excluído com sucesso: ${fullPath}`);
        } else {
          console.log(`[DELETE JOURNAL] Arquivo de áudio não encontrado: ${fullPath}`);
        }
      } catch (e) {
        console.error("[DELETE JOURNAL] Erro ao excluir arquivo de áudio:", e);
        // Continuar com a exclusão da entrada mesmo se o arquivo não puder ser excluído
      }
    }
    
    // Excluir a entrada do banco de dados
    console.log(`[DELETE JOURNAL] Executando exclusão da entrada ID: ${entryId}`);
    const resultado = await storage.deleteJournalEntry(entryId);
    
    // Verificar resultado da exclusão
    if (resultado) {
      console.log(`[DELETE JOURNAL] Entrada ${entryId} excluída com sucesso`);
      res.status(200).json({ 
        success: true, 
        message: "Entrada excluída com sucesso", 
        entryId: entryId 
      });
    } else {
      console.log(`[DELETE JOURNAL] ERRO: Falha ao excluir entrada ${entryId}`);
      res.status(500).json({ 
        error: "Falha na exclusão", 
        message: "A entrada foi encontrada, mas não pôde ser excluída. Tente novamente."
      });
    }
  } catch (error) {
    console.error("[DELETE JOURNAL] Erro ao excluir entrada do diário:", error);
    res.status(500).json({ 
      error: "Erro interno", 
      message: `Erro ao excluir entrada do diário: ${error.message}`
    });
  }
});

// Utilitário para gerar cores com base na emoção
function getColorForEmotion(emotion: string | null): string | null {
  if (!emotion) return null;
  
  const colorMap: Record<string, string> = {
    'positivo': '#4dbb8a',    // Verde
    'alegria': '#4dbb8a',     // Verde
    'alegre': '#4dbb8a',      // Verde
    'feliz': '#4dbb8a',       // Verde
    
    'neutro': '#6c757d',      // Cinza
    'calmo': '#98c1d9',       // Azul claro
    'sereno': '#98c1d9',      // Azul claro
    
    'triste': '#7986cb',      // Roxo azulado
    'tristeza': '#7986cb',    // Roxo azulado
    'melancólico': '#9fa8da', // Roxo azulado mais claro
    
    'ansioso': '#f8c291',     // Laranja claro
    'ansiedade': '#f8c291',   // Laranja claro
    'preocupado': '#f5b971',  // Laranja mais claro
    'preocupação': '#f5b971', // Laranja mais claro
    
    'estressado': '#e69875',  // Laranja
    'nervoso': '#e69875',     // Laranja
    
    'raiva': '#e57373',        // Vermelho
    'frustrado': '#ef9a9a',   // Vermelho claro
    'irritado': '#f48c8c',    // Vermelho mais vivo
    
    'surpresa': '#81c784',    // Verde claro
    'confusão': '#adb5bd',    // Cinza mais claro
    'esperança': '#85c8a9'    // Verde mais claro
  };
  
  // Normalizar a emoção para minúsculas
  const normalizedEmotion = emotion.toLowerCase().trim();
  
  // Retornar a cor correspondente ou um valor padrão
  return colorMap[normalizedEmotion] || '#6c757d';
}

export default router;