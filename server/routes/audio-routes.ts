import { Express, Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "../storage";
import { InsertJournalEntry } from "@shared/schema";

// Configuração do Multer para upload de arquivos
const audioUploadDir = path.join(__dirname, '../../uploads/audio');

// Garantir que o diretório de uploads existe
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}

// Configuração do multer sem validação estrita de mimetype
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioUploadDir);
  },
  filename: (req, file, cb) => {
    // Gerar um nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Usar extensão original ou .webm por padrão
    const extension = path.extname(file.originalname) || '.webm';
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Aceitar qualquer tipo de arquivo sem verificar o mimetype
const upload = multer({ 
  storage: audioStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB máximo
  }
});

export function registerAudioRoutes(app: Express) {
  // Endpoint simplificado para envio de áudio
  app.post("/api/journal-entries/audio", upload.single("audio"), async (req: Request, res: Response) => {
    console.log("POST /api/journal-entries/audio - Rota chamada");
    
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        console.log("POST /api/journal-entries/audio - Usuário não autenticado");
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const userId = (req.user as Express.User).id;
      
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
      
      // Versão simplificada - salvar sem processamento pesado
      try {
        // Criar entrada básica no diário
        const entry: InsertJournalEntry = {
          userId,
          title,
          content: "Gravação de áudio",
          date: new Date(),
          summary: "Áudio gravado através do aplicativo",
          category: "Nota de voz",
          mood: mood,
          audioUrl: req.file.path,
          tags: ["áudio", "gravação"],
          emotionalTone: "neutro",
          sentimentScore: 0,
          dominantEmotions: [],
          recommendedActions: [],
          detailedAnalysis: ""
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
        
        // Retornar sucesso imediato para o usuário
        return res.status(201).json({
          success: true,
          entry: savedEntry,
          message: "Áudio recebido e entrada criada com sucesso"
        });
        
      } catch (error) {
        console.error("POST /api/journal-entries/audio - Erro ao criar entrada no diário:", error);
        return res.status(500).json({ 
          message: "Erro ao salvar entrada no diário", 
          error: error.message
        });
      }
    } catch (error) {
      console.error("POST /api/journal-entries/audio - Erro não tratado:", error);
      return res.status(500).json({ 
        message: "Erro ao processar solicitação", 
        error: error.message 
      });
    }
  });
}