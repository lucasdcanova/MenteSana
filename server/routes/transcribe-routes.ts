import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

// Inicializar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuração para upload de arquivos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    
    // Verificar se o diretório existe, se não, criá-lo
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Gerar nome de arquivo único para evitar colisões
    const uniqueFilename = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Limite de 50MB para arquivos de áudio
  }
});

// Função para converter áudio para formato adequado (se necessário)
async function preprocessAudio(filePath: string): Promise<string> {
  // Verificar a extensão do arquivo para determinar se é necessário converter
  const fileExt = path.extname(filePath).toLowerCase();
  
  if (fileExt === '.m4a' || fileExt === '.mp4' || fileExt === '.aac') {
    console.log("Arquivo de áudio em formato iOS detectado, convertendo para WAV...");
    
    try {
      // No ambiente de produção, poderíamos usar ffmpeg para converter
      // Por enquanto, retornamos o arquivo original para simplificar
      return filePath;
    } catch (error) {
      console.error("Erro ao converter arquivo de áudio:", error);
      return filePath; // Em caso de erro, retornar o caminho original
    }
  }
  
  // Se não precisar de conversão, retornar o caminho original
  return filePath;
}

export function registerTranscribeRoutes(router: Router) {
  // Rota para transcrever áudio
  router.post("/transcribe", upload.single("audio"), async (req, res) => {
    try {
      // Verificar se o arquivo foi enviado
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo de áudio enviado" });
      }
      
      const filePath = req.file.path;
      
      // Pré-processar o áudio se necessário
      const processedFilePath = await preprocessAudio(filePath);
      
      // Abrir o arquivo para transcrição
      const fileStream = fs.createReadStream(processedFilePath);
      
      console.log(`Enviando arquivo ${processedFilePath} para a API de transcrição...`);
      
      // Usando o modelo Whisper da OpenAI para transcrição
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        language: "pt", // Português
        response_format: "json",
      });
      
      // Limpar arquivo após transcrição
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Arquivo de áudio removido: ${filePath}`);
          }
          
          // Se for um arquivo processado diferente, limpar também
          if (processedFilePath !== filePath && fs.existsSync(processedFilePath)) {
            fs.unlinkSync(processedFilePath);
            console.log(`Arquivo de áudio processado removido: ${processedFilePath}`);
          }
        } catch (error) {
          console.error("Erro ao remover arquivo de áudio:", error);
        }
      }, 5000); // Remover após 5 segundos para garantir que o arquivo foi completamente processado
      
      return res.status(200).json({ 
        transcription: transcription.text,
      });
      
    } catch (error) {
      console.error("Erro ao transcrever áudio:", error);
      
      // Resposta de erro com detalhes para depuração
      return res.status(500).json({ 
        error: "Erro ao processar transcrição de áudio", 
        details: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });
}