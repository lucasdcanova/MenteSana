import { Express, Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "../storage";
import { InsertJournalEntry } from "@shared/schema";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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
  destination: (req, file, cb) => {
    cb(null, audioUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Suporte para vários formatos
    let extension = path.extname(file.originalname);
    if (!extension || extension === '.') {
      // Se não houver extensão, definir com base no mimetype ou usar .webm
      if (file.mimetype.includes('webm')) {
        extension = '.webm';
      } else if (file.mimetype.includes('mp4') || file.mimetype.includes('mp4a')) {
        extension = '.mp4';
      } else if (file.mimetype.includes('mp3')) {
        extension = '.mp3';
      } else {
        extension = '.webm'; // Padrão se não conseguir determinar
      }
    }
    cb(null, 'audio-' + uniqueSuffix + extension);
  }
});

// Configuração do multer com regras menos estritas para iOS
const audioUpload = multer({ 
  storage: audioStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  }
});

// Exporta a função que registra o endpoint
export function registerAudioEndpoint(app: Express) {
  app.post("/api/journal-entries/audio", audioUpload.single("audio"), async (req: Request, res: Response) => {
    console.log("POST /api/journal-entries/audio - Rota chamada");
    
    try {
      // Verificar autenticação e obter userId
      let userId;
      if (req.isAuthenticated() && req.user) {
        userId = (req.user as Express.User).id;
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
      
      // Criar entrada básica no diário
      const entry: InsertJournalEntry = {
        userId,
        title,
        content: "Gravação de áudio",
        mood: mood,
        audioUrl: req.file.path,
        tags: ["áudio", "gravação"]
      };
      
      // Cor baseada no humor
      let colorHex = "#7dd3fc"; // Azul claro padrão
      switch(mood.toLowerCase()) {
        case "feliz":
        case "happy":
        case "alegre":
          colorHex = "#86efac"; // Verde claro
          break;
        case "triste":
        case "sad": 
          colorHex = "#a1a1aa"; // Cinza
          break;
        case "ansioso":
        case "anxious": 
          colorHex = "#fdba74"; // Laranja claro
          break;
        case "irritado":
        case "angry": 
        case "raiva":
          colorHex = "#fda4af"; // Vermelho claro
          break;
        case "calmo":
        case "calm": 
          colorHex = "#a5b4fc"; // Lilás claro
          break;
        case "neutro":
          colorHex = "#7dd3fc"; // Azul claro
          break;
      }
      
      // Adicionar cor
      entry.colorHex = colorHex;
      
      // Salvar a entrada de forma simples
      console.log("POST /api/journal-entries/audio - Salvando entrada básica no diário");
      const savedEntry = await storage.createJournalEntry(entry);
      
      // Log de debug
      console.log("POST /api/journal-entries/audio - Entrada salva com ID:", savedEntry.id);
      
      // Retornar sucesso imediato
      return res.status(201).json({
        success: true,
        entry: savedEntry,
        message: "Áudio recebido e entrada criada com sucesso"
      });
      
    } catch (error: any) {
      console.error("POST /api/journal-entries/audio - Erro:", error);
      return res.status(500).json({ 
        message: "Erro ao processar áudio", 
        error: error?.message || String(error)
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
        message: "Arquivo de áudio não encontrado",
        path: filepath
      });
    }
  });
}