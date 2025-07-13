import { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { transcribeAudioFile } from "../openai-service";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';

// Configurar __dirname para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do diretório de uploads temporários
const tempUploadDir = path.join(process.cwd(), 'uploads/temp');

// Garantir que o diretório de uploads temporários existe
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
  console.log("Diretório de uploads temporários criado:", tempUploadDir);
}

// Configuração de armazenamento temporário
const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir);
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
    
    cb(null, `temp-${uniqueSuffix}-${hash}.${extension}`);
  }
});

// Configurar o upload com multer
const tempUpload = multer({
  storage: tempStorage,
  limits: { 
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// Exponha a função que registra as novas rotas de transcrição direta
export function registerDirectTranscriptionRoutes(app: Express) {
  // Nova rota para transcrição direta e simplificada
  app.post("/api/transcribe-direct", tempUpload.single("audio"), async (req: Request, res: Response) => {
    console.log("[DirectTranscription] POST /api/transcribe-direct - Iniciando transcrição direta");
    
    try {
      // Verificar se arquivo foi enviado
      if (!req.file) {
        console.log("[DirectTranscription] Arquivo de áudio não enviado");
        return res.status(400).json({ 
          success: false, 
          message: "Arquivo de áudio não enviado" 
        });
      }
      
      console.log("[DirectTranscription] Arquivo recebido:", req.file.originalname);
      console.log("[DirectTranscription] Tamanho:", req.file.size);
      console.log("[DirectTranscription] Tipo:", req.file.mimetype);
      console.log("[DirectTranscription] Caminho:", req.file.path);
      
      // Verificar se o arquivo requer conversão (especialmente para iOS)
      const isIOS = req.body && req.body.isIOS === 'true';
      const extension = path.extname(req.file.path).toLowerCase();
      
      let fileToTranscribe = req.file.path;
      
      // Conversão de formato especificamente para dispositivos iOS
      if (isIOS || extension === '.mp4' || extension === '.m4a') {
        try {
          console.log("[DirectTranscription] Detectado formato iOS, convertendo para WAV");
          
          // Criar caminho para o arquivo WAV
          const wavPath = req.file.path.replace(extension, '.wav');
          
          // Converter usando ffmpeg
          await new Promise<void>((resolve, reject) => {
            ffmpeg(req.file.path)
              .output(wavPath)
              .audioChannels(1)                // Mono
              .audioFrequency(16000)           // 16 kHz
              .audioCodec('pcm_s16le')         // PCM 16-bit
              .on('start', (cmd) => {
                console.log(`[DirectTranscription] Iniciando conversão: ${cmd}`);
              })
              .on('error', (err) => {
                console.error(`[DirectTranscription] Erro de conversão: ${err.message}`);
                reject(err);
              })
              .on('end', () => {
                console.log(`[DirectTranscription] Conversão concluída: ${wavPath}`);
                resolve();
              })
              .run();
          });
          
          // Usar o arquivo WAV para transcrição
          if (fs.existsSync(wavPath)) {
            fileToTranscribe = wavPath;
            console.log(`[DirectTranscription] Usando arquivo WAV convertido: ${fileToTranscribe}`);
          } else {
            console.warn(`[DirectTranscription] Arquivo WAV não encontrado após conversão. Usando original: ${fileToTranscribe}`);
          }
        } catch (conversionError) {
          console.error("[DirectTranscription] Erro na conversão:", conversionError);
          console.log("[DirectTranscription] Prosseguindo com arquivo original");
        }
      }
      
      // Iniciar cronômetro para medir desempenho
      const startTime = Date.now();
      
      // Usar a função transcribeAudioFile otimizada
      console.log(`[DirectTranscription] Iniciando transcrição do arquivo: ${fileToTranscribe}`);
      const transcription = await transcribeAudioFile(fileToTranscribe);
      
      const elapsedTime = (Date.now() - startTime) / 1000;
      console.log(`[DirectTranscription] Transcrição concluída em ${elapsedTime.toFixed(2)}s`);
      
      // Verificar se a transcrição foi bem-sucedida
      if (!transcription || transcription.trim() === '') {
        return res.status(400).json({
          success: false,
          message: "Não foi possível transcrever o áudio. Tente com um áudio mais claro ou em outro formato."
        });
      }
      
      // Limpeza de arquivos temporários (opcional baseado em configuração)
      try {
        console.log(`[DirectTranscription] Removendo arquivo temporário: ${req.file.path}`);
        fs.unlinkSync(req.file.path);
        
        // Se criamos um arquivo WAV, também removê-lo
        if (fileToTranscribe !== req.file.path && fs.existsSync(fileToTranscribe)) {
          console.log(`[DirectTranscription] Removendo arquivo WAV temporário: ${fileToTranscribe}`);
          fs.unlinkSync(fileToTranscribe);
        }
      } catch (cleanupError) {
        console.warn(`[DirectTranscription] Aviso: Não foi possível remover arquivos temporários:`, cleanupError);
      }
      
      // Enviar resposta com a transcrição
      return res.status(200).json({
        success: true,
        transcription: transcription,
        processingTimeSeconds: elapsedTime,
        charCount: transcription.length
      });
      
    } catch (error) {
      console.error("[DirectTranscription] Erro no processamento:", error);
      
      // Extrair mensagem de erro para o cliente
      let errorMessage = "Erro ao processar o áudio";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  });
  
  // Endpoint para verificar o status do serviço
  app.get("/api/transcribe-direct/status", (req: Request, res: Response) => {
    res.status(200).json({
      status: "online",
      service: "direct-transcription",
      timestamp: new Date().toISOString()
    });
  });
}