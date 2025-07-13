import { Router } from 'express';
import { storage } from '../storage';
import { lgpdService } from '../lgpd-compliance';
import { z } from 'zod';
import { ConsentTypes } from '@shared/schema';
import { createTokenAuthMiddleware } from '../auth';

const router = Router();

// Middleware para garantir que o usuário está autenticado
const tokenAuth = createTokenAuthMiddleware();
router.use(tokenAuth);

// Obter consentimentos do usuário
router.get('/consents', async (req, res) => {
  try {
    const userId = req.user!.id;
    const consents = await storage.getUserConsentRecords(userId);
    res.json(consents);
  } catch (error) {
    console.error('Erro ao obter consentimentos do usuário:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação de consentimentos' });
  }
});

// Atualizar consentimento do usuário
router.post('/consents', async (req, res) => {
  try {
    const consentSchema = z.object({
      consentType: z.string(),
      granted: z.boolean(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
      documentVersion: z.string().optional(),
      additionalData: z.any().optional()
    });

    const validatedData = consentSchema.parse(req.body);
    const userId = req.user!.id;

    // Verificar se já existe um consentimento deste tipo para o usuário
    const existingConsent = await storage.getUserConsentByType(userId, validatedData.consentType);

    if (existingConsent) {
      // Atualizar consentimento existente
      const updatedConsent = await storage.updateUserConsent(existingConsent.id, {
        granted: validatedData.granted,
        timestamp: new Date(),
        ipAddress: validatedData.ipAddress || req.ip || '127.0.0.1',
        userAgent: validatedData.userAgent || req.get('user-agent') || null,
        documentVersion: validatedData.documentVersion || existingConsent.documentVersion,
        additionalData: validatedData.additionalData || existingConsent.additionalData
      });
      res.json(updatedConsent);
    } else {
      // Criar novo consentimento
      const newConsent = await storage.createUserConsent({
        userId,
        consentType: validatedData.consentType,
        granted: validatedData.granted,
        ipAddress: validatedData.ipAddress || req.ip || '127.0.0.1',
        userAgent: validatedData.userAgent || req.get('user-agent') || null,
        documentVersion: validatedData.documentVersion || null,
        additionalData: validatedData.additionalData || null
      });
      res.status(201).json(newConsent);
    }

    // Registrar atividade de processamento de dados
    await storage.createDataProcessingLog({
      userId,
      action: existingConsent ? 'update_consent' : 'create_consent',
      dataCategory: 'consent',
      description: `Usuário ${existingConsent ? 'atualizou' : 'forneceu'} consentimento para ${validatedData.consentType}`,
      ipAddress: validatedData.ipAddress || req.ip || '127.0.0.1',
      authorized: true
    });
  } catch (error) {
    console.error('Erro ao atualizar consentimento:', error);
    res.status(400).json({ message: 'Erro ao processar solicitação de consentimento' });
  }
});

// Revogar consentimento específico
router.delete('/consents/:type', async (req, res) => {
  try {
    const userId = req.user!.id;
    const consentType = req.params.type;
    const success = await storage.revokeConsent(userId, consentType);

    if (success) {
      // Registrar atividade de processamento de dados
      await storage.createDataProcessingLog({
        userId,
        action: 'revoke_consent',
        dataCategory: 'consent',
        description: `Usuário revogou consentimento para ${consentType}`,
        ipAddress: req.ip || '127.0.0.1',
        authorized: true
      });
      res.json({ message: 'Consentimento revogado com sucesso' });
    } else {
      res.status(404).json({ message: 'Consentimento não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao revogar consentimento:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação de revogação' });
  }
});

// Obter documento legal ativo por tipo
router.get('/documents/:type', async (req, res) => {
  try {
    const documentType = req.params.type;
    const document = await storage.getLegalDocumentByType(documentType, true);
    
    if (document) {
      res.json(document);
    } else {
      res.status(404).json({ message: `Documento legal do tipo ${documentType} não encontrado` });
    }
  } catch (error) {
    console.error('Erro ao obter documento legal:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação de documento legal' });
  }
});

// Criar solicitação de exclusão ou anonimização de dados (direito ao esquecimento)
router.post('/subject-requests', async (req, res) => {
  try {
    const requestSchema = z.object({
      requestType: z.enum(['deletion', 'anonymization', 'export', 'correction']),
      requestDetails: z.string().optional()
    });

    const validatedData = requestSchema.parse(req.body);
    const userId = req.user!.id;

    const request = await storage.createDataSubjectRequest({
      userId,
      requestType: validatedData.requestType,
      requestDetails: validatedData.requestDetails || null,
      requestDate: new Date(),
      status: 'Pendente',
      completionDate: null,
      handledBy: null,
      responseDetails: null,
      evidenceFile: null
    });

    // Registrar atividade de processamento de dados
    await storage.createDataProcessingLog({
      userId,
      action: 'data_subject_request',
      dataCategory: 'subject_request',
      description: `Usuário solicitou ${validatedData.requestType} de dados`,
      ipAddress: req.ip || '127.0.0.1',
      authorized: true
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Erro ao criar solicitação de direito do titular:', error);
    res.status(400).json({ message: 'Erro ao processar solicitação de direito do titular' });
  }
});

// Obter solicitações de direito do titular do usuário
router.get('/subject-requests', async (req, res) => {
  try {
    const userId = req.user!.id;
    const requests = await storage.getDataSubjectRequestsByUser(userId);
    res.json(requests);
  } catch (error) {
    console.error('Erro ao obter solicitações de direito do titular:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
});

// Obter registros de processamento de dados do usuário
router.get('/processing-logs', async (req, res) => {
  try {
    const userId = req.user!.id;
    const logs = await storage.getDataProcessingLogsByUser(userId);
    res.json(logs);
  } catch (error) {
    console.error('Erro ao obter registros de processamento:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
});

// Obter status de consentimento específico
router.get('/consents/:type', async (req, res) => {
  try {
    const userId = req.user!.id;
    const consentType = req.params.type;
    const consent = await storage.getUserConsentByType(userId, consentType);
    
    if (consent) {
      res.json(consent);
    } else {
      res.status(404).json({ 
        message: `Consentimento do tipo ${consentType} não encontrado`,
        // Retorna um objeto com consentimento negado por padrão
        default: {
          userId,
          consentType,
          granted: false,
          timestamp: new Date(),
          ipAddress: null,
          userAgent: null,
          documentVersion: null,
          expiresAt: null,
          additionalData: null
        }
      });
    }
  } catch (error) {
    console.error('Erro ao obter status de consentimento:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
});

// Rota para geração de relatório completo de dados pessoais
router.get('/data-report', async (req, res) => {
  try {
    const userId = req.user!.id;
    const report = await lgpdService.generatePersonalDataReport(userId);
    
    // Registrar atividade de processamento de dados
    await storage.createDataProcessingLog({
      userId,
      action: 'export_data',
      dataCategory: 'personal',
      description: 'Usuário solicitou relatório completo de dados pessoais',
      ipAddress: req.ip || '127.0.0.1',
      authorized: true
    });
    
    res.json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório de dados pessoais:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação de relatório de dados' });
  }
});

export default router;