import { Router, Request, Response } from 'express';
import { uploadImage, handleUploadErrors, deleteImage } from '../middlewares/upload-middleware';
import { db } from '../db';
import { users, therapists, User } from '@shared/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

// Interface simplificada apenas com os campos que precisamos
interface AuthenticatedRequest extends Request {
  isAuthenticated(): boolean;
  user?: {
    id: number;
    isTherapist: boolean;
  };
}

const router = Router();

// Rota para upload de imagem de perfil do usuário
router.post('/upload', uploadImage.single('profileImage'), handleUploadErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verificar autenticação
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Garantir que temos um ID válido
    const userId = req.user.id;
    const isTherapist = !!req.user.isTherapist;

    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    // Caminho relativo para o arquivo
    const imageUrl = `/uploads/${req.file.filename}`;

    // Buscar a imagem anterior (se existir)
    let oldImageUrl: string | null = null;

    if (isTherapist) {
      // Buscar a imagem de perfil atual do terapeuta
      const [therapist] = await db
        .select({ imageUrl: therapists.imageUrl })
        .from(therapists)
        .where(eq(therapists.id, userId));
      
      if (therapist && therapist.imageUrl) {
        oldImageUrl = therapist.imageUrl;
      }

      // Atualizar imagem do terapeuta
      await db
        .update(therapists)
        .set({ imageUrl })
        .where(eq(therapists.id, userId));
    }

    // Buscar a imagem de perfil atual do usuário
    const [user] = await db
      .select({ profilePicture: users.profilePicture })
      .from(users)
      .where(eq(users.id, userId));
    
    if (user && user.profilePicture) {
      oldImageUrl = user.profilePicture;
    }

    // Atualizar imagem do usuário
    await db
      .update(users)
      .set({ profilePicture: imageUrl })
      .where(eq(users.id, userId));

    // Apagar a imagem antiga se existir
    if (oldImageUrl && oldImageUrl !== imageUrl) {
      const oldImagePath = path.join(process.cwd(), oldImageUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    return res.status(200).json({
      message: 'Imagem de perfil atualizada com sucesso',
      imageUrl
    });
  } catch (error) {
    console.error('Erro ao atualizar imagem de perfil:', error);
    return res.status(500).json({
      message: 'Erro ao processar o upload da imagem'
    });
  }
});

// Rota para excluir imagem de perfil
router.delete('/delete', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verificar autenticação
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Garantir que temos um ID válido
    const userId = req.user.id;
    const isTherapist = !!req.user.isTherapist;

    let oldImageUrl: string | null = null;

    if (isTherapist) {
      // Buscar a imagem de perfil atual do terapeuta
      const [therapist] = await db
        .select({ imageUrl: therapists.imageUrl })
        .from(therapists)
        .where(eq(therapists.id, userId));
      
      if (therapist && therapist.imageUrl) {
        oldImageUrl = therapist.imageUrl;
      }

      // Limpar imagem do terapeuta
      await db
        .update(therapists)
        .set({ imageUrl: null })
        .where(eq(therapists.id, userId));
    }

    // Buscar a imagem de perfil atual do usuário
    const [user] = await db
      .select({ profilePicture: users.profilePicture })
      .from(users)
      .where(eq(users.id, userId));
    
    if (user && user.profilePicture) {
      oldImageUrl = user.profilePicture;
    }

    // Limpar imagem do usuário
    await db
      .update(users)
      .set({ profilePicture: null })
      .where(eq(users.id, userId));

    // Apagar a imagem antiga se existir
    if (oldImageUrl) {
      const oldImagePath = path.join(process.cwd(), oldImageUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    return res.status(200).json({
      message: 'Imagem de perfil removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover imagem de perfil:', error);
    return res.status(500).json({
      message: 'Erro ao processar a remoção da imagem'
    });
  }
});

export default router;