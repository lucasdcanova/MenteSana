import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { transcribeAudio } from '../openai-service';

// Configuração do multer para arquivos de áudio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/audio';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Usar timestamp para evitar colisões de nomes
    const timestamp = Date.now();
    const userId = req.user?.id || 'unknown';
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio_${userId}_${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024, // Limite de 30MB
  },
});

export const cleanTranscriptionRouter = Router();

/**
 * POST /api/clean-transcribe
 * Nova rota de transcrição projetada para ser mais robusta contra erros de HTML
 * Retorna apenas JSON com estrutura consistente
 */
cleanTranscriptionRouter.post('/clean-transcribe', upload.single('audio'), async (req, res) => {
  console.log('Rota de transcrição limpa chamada');
  
  try {
    if (!req.file) {
      console.error('Nenhum arquivo de áudio recebido');
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo de áudio recebido',
        text: ''
      });
    }

    console.log(`Arquivo recebido: ${req.file.originalname}, tamanho: ${(req.file.size / 1024).toFixed(2)}KB`);
    
    // Extrair informações do arquivo
    const filePath = req.file.path;
    const fileType = req.file.mimetype;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    
    console.log(`Iniciando transcrição do arquivo: ${filePath} (${fileType})`);
    
    try {
      const text = await transcribeAudio(filePath);
      
      // Verificar se a transcrição foi bem-sucedida
      if (!text || text.trim() === '') {
        console.warn('Transcrição vazia retornada');
        return res.status(200).json({
          success: true,
          warning: 'Transcrição vazia',
          text: '',
          fileInfo: {
            name: originalName,
            type: fileType,
            size: fileSize
          }
        });
      }
      
      // Remover qualquer tag HTML que possa ter escapado
      const cleanText = text
        .replace(/<[^>]*>/g, '')  // Remove tags HTML
        .replace(/&[^;]+;/g, '')  // Remove entidades HTML
        .trim();
      
      console.log(`Transcrição bem-sucedida. Tamanho do texto: ${cleanText.length} caracteres`);
      
      // Retornar resposta bem estruturada
      return res.status(200).json({
        success: true,
        text: cleanText,
        fileInfo: {
          name: originalName,
          type: fileType,
          size: fileSize
        }
      });
      
    } catch (error) {
      console.error('Erro na transcrição:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido na transcrição',
        text: '',
        fileInfo: {
          name: originalName,
          type: fileType,
          size: fileSize
        }
      });
    }
    
  } catch (error) {
    console.error('Erro ao processar a solicitação:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido no processamento',
      text: ''
    });
  }
});