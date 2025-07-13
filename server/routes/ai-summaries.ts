import { Router } from "express";
import { generateUserActivitySummary, generateTherapistBriefing, updateDailyTipsWithUserActivities } from '../ai-summary-service';
import { storage } from '../storage';
import { User } from '@shared/schema';

const router = Router();

// Rota para obter resumo de atividades do usuário
router.get("/user/:userId/activity-summary", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const reqUser = req.user as User;
    const targetUserId = parseInt(req.params.userId);

    // Verificar se o usuário está solicitando seu próprio resumo ou
    // se é um terapeuta solicitando o resumo de um paciente
    if (reqUser.id !== targetUserId && !reqUser.isTherapist) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const summary = await generateUserActivitySummary(targetUserId);
    if (!summary) {
      return res.status(404).json({ error: 'Não foi possível gerar o resumo' });
    }

    res.json(summary);
  } catch (error) {
    console.error('Erro ao obter resumo de atividades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para gerar briefing do terapeuta para consulta
router.get("/therapist/:therapistId/patient/:patientId/briefing", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const reqUser = req.user as User;
    const therapistId = parseInt(req.params.therapistId);
    const patientId = parseInt(req.params.patientId);
    const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;

    // Verificar se o usuário é o terapeuta em questão
    if (!reqUser.isTherapist || (reqUser.id !== therapistId && reqUser.therapistId !== therapistId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o paciente existe
    const patient = await storage.getUser(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Verificar consentimento do paciente para compartilhar dados com terapeuta
    if (patient.privacySettings && 
        typeof patient.privacySettings === 'object' && 
        'shareDataWithTherapist' in patient.privacySettings && 
        patient.privacySettings.shareDataWithTherapist === false) {
      return res.status(403).json({ 
        error: 'O paciente não autorizou o compartilhamento de dados com terapeutas',
        consentRequired: true
      });
    }

    // Gerar briefing
    const briefing = await generateTherapistBriefing(therapistId, patientId, sessionId);
    if (!briefing) {
      return res.status(404).json({ error: 'Não foi possível gerar o briefing' });
    }

    // Salvar o briefing gerado no banco de dados para referência futura
    const savedBriefing = await storage.createTherapistBriefing({
      therapistId,
      patientId,
      sessionId: sessionId || null,
      mainIssues: briefing.mainIssues,
      emotionalState: briefing.emotionalState,
      recentProgress: briefing.recentProgress,
      suggestedTopics: briefing.suggestedTopics,
      recommendedApproaches: briefing.recommendedApproaches,
      warningFlags: briefing.warningFlags,
      moodTrends: briefing.moodTrends
    });

    res.json({ ...briefing, id: savedBriefing.id });
  } catch (error) {
    console.error('Erro ao gerar briefing para terapeuta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para marcar um briefing como visualizado
router.post("/therapist-briefing/:briefingId/viewed", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    const reqUser = req.user as User;
    const briefingId = parseInt(req.params.briefingId);
    
    const briefing = await storage.getTherapistBriefingById(briefingId);
    if (!briefing) {
      return res.status(404).json({ error: 'Briefing não encontrado' });
    }
    
    // Verificar se o usuário é o terapeuta do briefing
    if (!reqUser.isTherapist || (reqUser.id !== briefing.therapistId && reqUser.therapistId !== briefing.therapistId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const updatedBriefing = await storage.markTherapistBriefingAsViewed(briefingId);
    res.json(updatedBriefing);
  } catch (error) {
    console.error('Erro ao marcar briefing como visualizado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para atualizar dicas diárias com atividades do usuário
router.post("/user/:userId/update-daily-tips", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    const reqUser = req.user as User;
    const targetUserId = parseInt(req.params.userId);
    
    // Verificar se o usuário está solicitando sua própria atualização ou
    // se é um terapeuta solicitando a atualização para um paciente
    if (reqUser.id !== targetUserId && !reqUser.isTherapist) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const success = await updateDailyTipsWithUserActivities(targetUserId);
    if (!success) {
      return res.status(400).json({ error: 'Não foi possível atualizar as dicas diárias' });
    }
    
    // Obter dicas atualizadas do usuário
    const tips = await storage.getDailyTipsByUser(targetUserId);
    res.json({ success: true, tips });
  } catch (error) {
    console.error('Erro ao atualizar dicas diárias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;