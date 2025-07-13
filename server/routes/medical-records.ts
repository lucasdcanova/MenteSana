import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertMedicalRecordSchema } from '@shared/schema';
import { createTokenAuthMiddleware } from '../auth';

// A interface Request já está estendida no arquivo auth.ts
// Aqui apenas usamos a interface existente

// Middleware para verificar se o usuário é um terapeuta
const isTherapistMiddleware = (req: Request, res: Response, next: Function) => {
  if (req.user && req.user.isTherapist) {
    next();
  } else {
    return res.status(403).json({ error: 'Apenas terapeutas podem acessar esta funcionalidade' });
  }
};

// Criar o router para prontuários médicos
const medicalRecordsRouter = Router();

// Criar middleware de autenticação por token
const tokenAuth = createTokenAuthMiddleware();

// Aplicar autenticação em todas as rotas
medicalRecordsRouter.use(tokenAuth);

// Obter todos os prontuários médicos de um paciente
medicalRecordsRouter.get('/patient/:patientId', isTherapistMiddleware, async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.patientId);
    
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'ID de paciente inválido' });
    }
    
    const records = await storage.getMedicalRecordsByPatientId(patientId);
    
    // Ordenar por data de criação, mais recentes primeiro
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return res.status(200).json(records);
  } catch (error) {
    console.error('Erro ao buscar prontuários médicos:', error);
    return res.status(500).json({ error: 'Erro ao buscar prontuários médicos' });
  }
});

// Obter um prontuário médico específico
medicalRecordsRouter.get('/:id', isTherapistMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID de prontuário inválido' });
    }
    
    const record = await storage.getMedicalRecordById(id);
    
    if (!record) {
      return res.status(404).json({ error: 'Prontuário médico não encontrado' });
    }
    
    return res.status(200).json(record);
  } catch (error) {
    console.error('Erro ao buscar prontuário médico:', error);
    return res.status(500).json({ error: 'Erro ao buscar prontuário médico' });
  }
});

// Criar um novo prontuário médico
medicalRecordsRouter.post('/', isTherapistMiddleware, async (req: Request, res: Response) => {
  try {
    // Validar os dados recebidos
    const validationResult = insertMedicalRecordSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos para criação de prontuário médico',
        details: validationResult.error.errors 
      });
    }
    
    // Criar o registro
    const newRecord = await storage.createMedicalRecord(validationResult.data);
    
    return res.status(201).json(newRecord);
  } catch (error) {
    console.error('Erro ao criar prontuário médico:', error);
    return res.status(500).json({ error: 'Erro ao criar prontuário médico' });
  }
});

// Atualizar um prontuário médico existente
medicalRecordsRouter.patch('/:id', isTherapistMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID de prontuário inválido' });
    }
    
    // Buscar o registro existente
    const existingRecord = await storage.getMedicalRecordById(id);
    
    if (!existingRecord) {
      return res.status(404).json({ error: 'Prontuário médico não encontrado' });
    }
    
    // Verificar se o terapeuta atual é o proprietário do registro
    if (req.user && existingRecord.therapistId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para editar este prontuário médico' 
      });
    }
    
    // Atualizar o registro
    const updatedRecord = await storage.updateMedicalRecord(id, req.body);
    
    if (!updatedRecord) {
      return res.status(500).json({ error: 'Erro ao atualizar o prontuário médico' });
    }
    
    return res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Erro ao atualizar prontuário médico:', error);
    return res.status(500).json({ error: 'Erro ao atualizar prontuário médico' });
  }
});

// Excluir um prontuário médico
medicalRecordsRouter.delete('/:id', isTherapistMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID de prontuário inválido' });
    }
    
    // Buscar o registro existente
    const existingRecord = await storage.getMedicalRecordById(id);
    
    if (!existingRecord) {
      return res.status(404).json({ error: 'Prontuário médico não encontrado' });
    }
    
    // Verificar se o terapeuta atual é o proprietário do registro
    if (req.user && existingRecord.therapistId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para excluir este prontuário médico' 
      });
    }
    
    // Marcar o registro como excluído
    const success = await storage.deleteMedicalRecord(id);
    
    if (!success) {
      return res.status(500).json({ error: 'Erro ao excluir o prontuário médico' });
    }
    
    return res.status(200).json({ success: true, message: 'Prontuário médico excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir prontuário médico:', error);
    return res.status(500).json({ error: 'Erro ao excluir prontuário médico' });
  }
});

export default medicalRecordsRouter;