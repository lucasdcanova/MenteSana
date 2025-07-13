import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Garante que o diretório de uploads existe
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Gera um nome de arquivo único usando UUID e preserva a extensão original
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// Filtro de tipos de arquivo permitidos (imagens)
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Apenas imagens (JPEG, PNG, GIF, WebP, SVG) são permitidas.'));
  }
};

// Configuração do tamanho máximo do arquivo (5MB)
const maxSize = 5 * 1024 * 1024;

// Middleware de upload
export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize
  }
});

// Middleware de tratamento de erros para o multer
export const handleUploadErrors = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Erro do Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Arquivo muito grande. O tamanho máximo permitido é 5MB.'
      });
    }
    return res.status(400).json({
      message: `Erro no upload: ${err.message}`
    });
  } else if (err) {
    // Outros erros
    return res.status(400).json({
      message: err.message
    });
  }
  next();
};

// Função para excluir imagem
export const deleteImage = (imagePath: string) => {
  const fullPath = path.join(process.cwd(), imagePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
};