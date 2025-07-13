import { Express, Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "../storage";
import { InsertJournalEntry } from "@shared/schema";
import * as OpenAIService from "../openai-service";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';

// Configurar __dirname para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do diretório de uploads
const audioUploadDir = path.join(process.cwd(), 'uploads/audio');

// Garantir que o diretório de uploads existe
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
  console.log("Diretório de uploads de áudio criado:", audioUploadDir);
}

// Configuração do armazenamento para multer
const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, audioUploadDir);
  },
  filename: function (req, file, cb) {
    // Criar um nome de arquivo único baseado em timestamp e hash
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const hash = crypto.createHash('md5')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .substring(0, 10);
    
    // Determinar a extensão baseada no mimetype
    let extension = 'webm'; // padrão
    
    console.log(`Processando arquivo com MIME type: ${file.mimetype}`);
    
    if (file.mimetype === 'audio/wav' || file.mimetype === 'audio/x-wav') {
      extension = 'wav';
    } else if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      extension = 'mp3';
    } else if (file.mimetype === 'audio/ogg') {
      extension = 'ogg';
    } else if (file.mimetype === 'audio/mp4' || file.mimetype === 'audio/x-m4a' || file.mimetype === 'audio/m4a') {
      // Dispositivos iOS frequentemente usam MP4/AAC
      extension = 'mp3'; // Usar mp3 em vez de mp4 para maior compatibilidade com OpenAI
      console.log('Detectado áudio iOS (MP4/M4A) - será salvo como MP3 para compatibilidade');
    } else if (file.mimetype.includes('webm')) {
      extension = 'webm';
    }
    
    // Verificar se temos informações adicionais no request
    const isIOS = req.body && req.body.isIOS === 'true';
    if (isIOS) {
      console.log('Arquivo explicitamente marcado como vindo de iOS - usando formato MP3');
      extension = 'mp3';
    }
    
    cb(null, `audio-${uniqueSuffix}-${hash}.${extension}`);
  }
});

// Configurar o upload com multer
const audioUpload = multer({
  storage: audioStorage,
  limits: { 
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// Exporta a função que registra o endpoint
export function registerUnifiedAudioEndpoint(app: Express) {
  app.post("/api/journal-entries/audio", audioUpload.single("audio"), async (req: Request, res: Response) => {
    console.log("POST /api/journal-entries/audio - Rota unificada chamada");
    
    try {
      // Verificar autenticação e obter userId
      let userId;
      if (req.isAuthenticated() && req.user) {
        userId = (req.user as Express.User).id;
      } else if (req.body && req.body.userId) {
        userId = Number(req.body.userId);
      } else if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.substring(7);
        // Verificação de token simplificada para testes
        if (token.includes('teste')) {
          userId = 1; // ID fixo para token de teste
          console.log("POST /api/journal-entries/audio - Usando token de teste");
        } else {
          const { activeTokens } = await import('../auth');
          const tokenInfo = activeTokens.get(token);
          if (tokenInfo) {
            userId = tokenInfo.userId;
          }
        }
      }
      
      if (!userId) {
        console.log("POST /api/journal-entries/audio - Usuário não autenticado");
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Verificar se arquivo foi enviado
      if (!req.file) {
        console.log("POST /api/journal-entries/audio - Arquivo de áudio não enviado");
        return res.status(400).json({ message: "Arquivo de áudio não enviado" });
      }
      
      console.log("POST /api/journal-entries/audio - Arquivo recebido:", req.file.originalname);
      console.log("POST /api/journal-entries/audio - Tamanho:", req.file.size);
      console.log("POST /api/journal-entries/audio - Tipo:", req.file.mimetype);
      console.log("POST /api/journal-entries/audio - Caminho:", req.file.path);
      
      // Extrair dados da requisição
      const mood = req.body.mood || "neutro";
      const title = req.body.title || "Gravação de áudio";
      
      // Verificar flags para recursos adicionais
      const autoTranscribe = true; // Sempre transcrever
      const autoCategories = true; // Sempre categorizar
      
      // Fase 1: Salvar entrada básica no diário para feedback imediato
      console.log("POST /api/journal-entries/audio - Salvando entrada básica no diário");
      try {
        const entry: InsertJournalEntry = {
          userId: userId,
          title: title,
          content: "Gravação de áudio",
          mood: mood,
          audioUrl: req.file.path,
          tags: ["áudio", "gravação"],
        };
        
        // Adicionar cor baseada no humor para representação visual
        let colorHex = "#7dd3fc"; // Azul claro padrão
        switch(mood.toLowerCase()) {
          case "feliz":
          case "happy":
          case "alegre": colorHex = "#86efac"; break; // Verde claro
          case "triste":
          case "sad": colorHex = "#a1a1aa"; break; // Cinza
          case "ansioso":
          case "anxious": colorHex = "#fdba74"; break; // Laranja claro
          case "irritado":
          case "angry": 
          case "raiva": colorHex = "#fda4af"; break; // Vermelho claro
          case "calmo":
          case "calm": colorHex = "#a5b4fc"; break; // Lilás claro
          case "neutro": colorHex = "#7dd3fc"; break; // Azul claro
        }
        
        // Adicionar cor
        entry.colorHex = colorHex;
        
        // Salvar entrada básica
        const savedEntry = await storage.createJournalEntry(entry);
        console.log("POST /api/journal-entries/audio - Entrada salva com ID:", savedEntry.id);
        
        // Resposta rápida para o cliente
        res.status(201).json({
          success: true,
          entry: savedEntry,
          message: "Áudio recebido e entrada criada com sucesso"
        });
        
        // Iniciar processamento em segundo plano (não bloqueia a resposta)
        processAudioInBackground(savedEntry.id, req.file.path, mood);
        
      } catch (dbError) {
        console.error("Erro ao salvar entrada no banco de dados:", dbError);
        return res.status(500).json({ 
          message: "Erro ao salvar entrada no diário",
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }
      
    } catch (error) {
      console.error("Erro no processamento de áudio:", error);
      return res.status(500).json({ 
        message: "Erro no processamento de áudio",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Adicionar endpoint para servir arquivos de áudio com tipos MIME corretos
  app.get("/api/audio/:filename", (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filepath = path.join(audioUploadDir, filename);
    
    if (fs.existsSync(filepath)) {
      // Determinar o tipo MIME pelo nome do arquivo
      const ext = path.extname(filepath).toLowerCase();
      let contentType = 'audio/mpeg'; // padrão
      
      if (ext === '.webm') {
        contentType = 'audio/webm';
      } else if (ext === '.mp3') {
        contentType = 'audio/mpeg';
      } else if (ext === '.wav') {
        contentType = 'audio/wav';
      } else if (ext === '.m4a' || ext === '.mp4') {
        contentType = 'audio/mp4';
      }
      
      res.set('Content-Type', contentType);
      res.set('Content-Disposition', `inline; filename="${filename}"`);
      res.set('Cache-Control', 'public, max-age=86400'); // Cache de 1 dia
      res.sendFile(filepath);
    } else {
      console.error("Arquivo de áudio não encontrado:", filepath);
      res.status(404).json({ 
        message: "Arquivo de áudio não encontrado"
      });
    }
  });
}

// Função de processamento em segundo plano
async function processAudioInBackground(entryId: number, audioFilePath: string, mood: string) {
  console.log(`Iniciando processamento em segundo plano para entrada ${entryId} (${audioFilePath})`);
  
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(audioFilePath)) {
      console.error(`Arquivo de áudio não encontrado: ${audioFilePath}`);
      return;
    }
    
    // Imprimir informações sobre o arquivo para debug
    const stats = fs.statSync(audioFilePath);
    console.log(`Arquivo: ${audioFilePath}, Tamanho: ${stats.size} bytes`);
    
    // Verificar o formato do arquivo pelo caminho
    const extension = path.extname(audioFilePath).toLowerCase();
    console.log(`Formato do arquivo: ${extension}`);
    
    // Verificação específica para arquivos iOS problématicos
    if ((extension === '.mp4' || extension === '.m4a') && audioFilePath.includes('/audio/')) {
      try {
        console.log(`Convertendo arquivo iOS (${extension}) para WAV usando ffmpeg`);
        
        // Criar um novo caminho para o arquivo WAV
        const newPath = audioFilePath.replace(extension, '.wav');
        
        // Criar uma promessa para a conversão com ffmpeg
        await new Promise<void>((resolve, reject) => {
          ffmpeg(audioFilePath)
            .output(newPath)
            .audioChannels(1)                // Mono (1 canal)
            .audioFrequency(16000)           // 16 kHz de taxa de amostragem
            .audioCodec('pcm_s16le')         // Formato PCM de 16 bits (Linear)
            .on('start', (commandLine) => {
              console.log(`Comando ffmpeg iniciado: ${commandLine}`);
            })
            .on('progress', (progress) => {
              console.log(`Progresso da conversão: ${JSON.stringify(progress)}`);
            })
            .on('error', (err) => {
              console.error(`Erro na conversão ffmpeg: ${err.message}`);
              reject(err);
            })
            .on('end', () => {
              console.log(`Conversão ffmpeg concluída com sucesso: ${newPath}`);
              resolve();
            })
            .run();
        });
        
        // Verificar se o arquivo foi criado
        if (fs.existsSync(newPath)) {
          console.log(`Arquivo WAV criado: ${newPath}`);
          // Usar o novo caminho para o processamento
          audioFilePath = newPath;
          
          // Atualizar a entrada com novo caminho de áudio
          await storage.updateJournalEntry(entryId, {
            audioUrl: audioFilePath
          });
        } else {
          console.error(`Arquivo WAV não foi criado: ${newPath}`);
          throw new Error('Falha na conversão do áudio');
        }
      } catch (e) {
        console.error(`Erro ao converter formato iOS: ${e}`);
        
        // Tentar método de fallback com cópia simples se ffmpeg falhar
        try {
          console.log('Tentando método de fallback com cópia simples...');
          const fallbackPath = audioFilePath.replace(extension, '.mp3');
          fs.copyFileSync(audioFilePath, fallbackPath);
          audioFilePath = fallbackPath;
          console.log(`Método de fallback: Arquivo copiado para ${audioFilePath}`);
          
          // Atualizar a entrada com o caminho de fallback
          await storage.updateJournalEntry(entryId, {
            audioUrl: audioFilePath
          });
        } catch (fallbackError) {
          console.error(`Erro no método de fallback: ${fallbackError}`);
        }
      }
    }
    
    // Configurações para transcrição
    const options = {
      enhancedAnalysis: true,
      detectTopics: true
    };
    
    // Verificar formato do arquivo antes da transcrição
    const audioExtension = path.extname(audioFilePath).toLowerCase();
    console.log(`Formato final do arquivo a ser transcrito: ${audioExtension}`);
    
    // Log do tamanho do arquivo
    const finalStats = fs.statSync(audioFilePath);
    console.log(`Arquivo final para transcrição: ${audioFilePath}, Tamanho: ${finalStats.size} bytes`);
    
    // Atualizar status de processamento no banco
    try {
      // Atualizar o status de processamento no banco
      await storage.updateJournalEntry(entryId, {
        // @ts-ignore - Campos adicionados recentemente ao esquema
        processingStatus: 'transcribing' as any,
        processingProgress: 30
      });
      console.log(`Status de processamento atualizado: transcribing (30%)`);
    } catch (statusError) {
      console.error(`Erro ao atualizar status de processamento:`, statusError);
    }
    
    // Tentar transcrever e analisar o áudio
    console.log(`Chamando OpenAIService.transcribeAndAnalyzeAudio para ${audioFilePath}`);
    const startTime = Date.now();
    
    try {
      // Transcrever e analisar o áudio com OpenAI
      const result = await OpenAIService.transcribeAndAnalyzeAudio(
        audioFilePath,
        mood,
        options
      );
      
      // Calcular tempo de processamento
      const processingTimeMs = Date.now() - startTime;
      console.log(`Transcrição e análise completas em ${(processingTimeMs / 1000).toFixed(2)}s`);
      
      // Gerar um título personalizado baseado na transcrição
      const title = await OpenAIService.generateJournalTitle(result.transcription);
      
      // Montar emoções dominantes a partir da análise de humor
      let dominantEmotions: string[] = [];
      if (result.moodAnalysis && result.moodAnalysis.dominantEmotions) {
        dominantEmotions = result.moodAnalysis.dominantEmotions;
      }
      
      // Determinar a cor baseada na primeira emoção dominante se estiver presente
      let colorHex = undefined;
      if (dominantEmotions.length > 0) {
        const emotionColorMap: Record<string, string> = {
          'felicidade': '#86efac',
          'alegria': '#86efac',
          'satisfação': '#a5f3fc',
          'amor': '#f9a8d4',
          'carinho': '#f9a8d4',
          'afeto': '#f9a8d4',
          'motivação': '#93c5fd',
          'tristeza': '#a1a1aa',
          'desapontamento': '#a1a1aa',
          'ansiedade': '#fdba74',
          'preocupação': '#fdba74',
          'medo': '#fdba74',
          'raiva': '#fda4af',
          'irritação': '#fda4af',
          'frustração': '#fda4af',
          'calma': '#a5b4fc',
          'serenidade': '#a5b4fc',
          'tranquilidade': '#a5b4fc',
          'neutro': '#7dd3fc'
        };
        
        // Verificar se a emoção principal corresponde a uma cor
        const firstEmotion = dominantEmotions[0].toLowerCase();
        for (const [emotion, color] of Object.entries(emotionColorMap)) {
          if (firstEmotion.includes(emotion)) {
            colorHex = color;
            break;
          }
        }
      }
      
      // Atualizar a entrada no diário com os dados processados
      const updateData: any = {
        title: title, // Título personalizado baseado no conteúdo
        content: result.transcription, // Texto transcrito
        category: result.category,
        summary: result.summary,
        tags: result.tags,
        emotionalTone: result.moodAnalysis?.emotionalTone,
        sentimentScore: result.moodAnalysis?.sentimentScore,
        dominantEmotions: result.moodAnalysis?.dominantEmotions,
        recommendedActions: result.moodAnalysis?.recommendedActions,
        // @ts-ignore - Campos adicionados recentemente ao esquema
        processingStatus: 'completed' as any,
        processingProgress: 100
      };
      
      // Adicionar colorHex apenas se tiver sido determinado
      if (colorHex) {
        updateData.colorHex = colorHex;
      }
      
      // Atualizar entrada no banco de dados
      await storage.updateJournalEntry(entryId, updateData);
      console.log(`Entrada do diário ${entryId} atualizada com sucesso após processamento completo`);
      
    } catch (aiError) {
      console.error("Erro ao processar áudio com OpenAI:", aiError);
      
      // Registrar detalhes do erro para diagnóstico mais preciso
      if (aiError instanceof Error) {
        console.error(`Detalhes do erro OpenAI: ${aiError.message}`);
        if (aiError.stack) console.error(`Stack: ${aiError.stack}`);
        
        // Tentar atualizar a entrada com informação de erro
        try {
          await storage.updateJournalEntry(entryId, {
            title: "Erro no processamento de áudio",
            content: "Não foi possível transcrever este áudio. O arquivo pode estar corrompido ou em um formato não suportado.",
            category: "Erro",
            tags: ["erro", "processamento falhou"],
            colorHex: "#f87171", // Vermelho para indicar erro
            // @ts-ignore - Campos adicionados recentemente ao esquema
            processingStatus: 'error' as any,
            processingProgress: 0
          });
          console.log(`Entrada ${entryId} atualizada com informações de erro`);
        } catch (updateError) {
          console.error("Erro ao atualizar entrada com informações de erro:", updateError);
        }
      }
      
      // Mesmo com erro, mantenha a entrada básica já salva
    }
    
  } catch (error) {
    console.error(`Erro no processamento em segundo plano para entrada ${entryId}:`, error);
  }
}