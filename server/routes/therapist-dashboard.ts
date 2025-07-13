import { Router, Request, Response } from 'express';
import { storage } from '../storage';

// Middleware para verificar se o usuário é um terapeuta
export function isTherapistMiddleware(req: Request, res: Response, next: Function) {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  if (!user.isTherapist) {
    return res.status(403).json({ error: 'Acesso negado. Apenas terapeutas podem acessar este recurso.' });
  }
  
  next();
}

export function registerTherapistDashboardRoutes(router: Router) {
  
  // Rota para obter dados do perfil do terapeuta
  router.get('/profile', isTherapistMiddleware, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(404).json({ error: 'Perfil de terapeuta não encontrado' });
      }
      
      const therapist = await storage.getTherapist(user.therapistId);
      
      if (!therapist) {
        return res.status(404).json({ error: 'Perfil de terapeuta não encontrado' });
      }
      
      res.json(therapist);
    } catch (error) {
      console.error('Erro ao buscar perfil do terapeuta:', error);
      res.status(500).json({ error: 'Erro ao buscar perfil do terapeuta' });
    }
  });
  
  // Rota para obter pacientes do terapeuta
  router.get('/patients', isTherapistMiddleware, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(404).json({ error: 'Terapeuta não encontrado' });
      }
      
      const patients = await storage.getPatientsByTherapistId(user.therapistId);
      
      res.json(patients);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      res.status(500).json({ error: 'Erro ao buscar pacientes' });
    }
  });
  
  // Rota para obter sessões do terapeuta
  router.get('/sessions', isTherapistMiddleware, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(404).json({ error: 'Terapeuta não encontrado' });
      }
      
      const sessions = await storage.getSessionsByTherapist(user.therapistId);
      
      res.json(sessions);
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      res.status(500).json({ error: 'Erro ao buscar sessões' });
    }
  });
  
  // Rota para obter avaliações do terapeuta
  router.get('/reviews', isTherapistMiddleware, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(404).json({ error: 'Terapeuta não encontrado' });
      }
      
      const reviews = await storage.getTherapistReviewsByTherapist(user.therapistId);
      
      res.json(reviews);
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      res.status(500).json({ error: 'Erro ao buscar avaliações' });
    }
  });
  
  // Rota para obter dados de progresso
  router.get('/progress', isTherapistMiddleware, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(404).json({ error: 'Terapeuta não encontrado' });
      }
      
      // Obtém todos os pacientes deste terapeuta
      const patients = await storage.getPatientsByTherapistId(user.therapistId);
      
      if (!patients.length) {
        return res.json([]);
      }
      
      // Obtém dados de progresso para todos os pacientes
      const allProgressData = [];
      
      for (const patient of patients) {
        const patientProgress = await storage.getProgressTrackingsByUser(patient.id);
        allProgressData.push(...patientProgress);
      }
      
      res.json(allProgressData);
    } catch (error) {
      console.error('Erro ao buscar dados de progresso:', error);
      res.status(500).json({ error: 'Erro ao buscar dados de progresso' });
    }
  });
  
  // Rota para obter dados de diário
  router.get('/journal-data', isTherapistMiddleware, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(404).json({ error: 'Terapeuta não encontrado' });
      }
      
      // Obtém todos os pacientes deste terapeuta
      const patients = await storage.getPatientsByTherapistId(user.therapistId);
      
      if (!patients.length) {
        return res.json([]);
      }
      
      // Obtém dados de diário para todos os pacientes
      const allJournalEntries = [];
      
      for (const patient of patients) {
        const patientEntries = await storage.getJournalEntriesByUser(patient.id);
        allJournalEntries.push(...patientEntries);
      }
      
      res.json(allJournalEntries);
    } catch (error) {
      console.error('Erro ao buscar dados de diário:', error);
      res.status(500).json({ error: 'Erro ao buscar dados de diário' });
    }
  });
  
  // Rota para obter dados de uma sessão específica
  router.get('/sessions/:id', isTherapistMiddleware, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
      
      // Verificar se a sessão pertence a este terapeuta
      if (session.therapistId !== user.therapistId) {
        return res.status(403).json({ error: 'Acesso negado. Esta sessão não pertence ao terapeuta.' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Erro ao buscar sessão:', error);
      res.status(500).json({ error: 'Erro ao buscar sessão' });
    }
  });
  
  // Rota para obter dados de um paciente específico
  router.get('/patients/:id', isTherapistMiddleware, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const patient = await storage.getUser(patientId);
      
      if (!patient) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }
      
      // Verificar se o paciente está atribuído a este terapeuta
      if (patient.therapistId !== user.therapistId) {
        return res.status(403).json({ error: 'Acesso negado. Este paciente não está atribuído ao terapeuta.' });
      }
      
      res.json(patient);
    } catch (error) {
      console.error('Erro ao buscar paciente:', error);
      res.status(500).json({ error: 'Erro ao buscar paciente' });
    }
  });
  
  // Rota para obter dados de progresso de um paciente específico
  router.get('/patients/:id/progress', isTherapistMiddleware, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const patient = await storage.getUser(patientId);
      
      if (!patient) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }
      
      // Verificar se o paciente está atribuído a este terapeuta
      if (patient.therapistId !== user.therapistId) {
        return res.status(403).json({ error: 'Acesso negado. Este paciente não está atribuído ao terapeuta.' });
      }
      
      const progressData = await storage.getProgressTrackingsByUser(patientId);
      
      res.json(progressData);
    } catch (error) {
      console.error('Erro ao buscar progresso do paciente:', error);
      res.status(500).json({ error: 'Erro ao buscar progresso do paciente' });
    }
  });
  
  // Rota para obter dados de diário de um paciente específico
  router.get('/patients/:id/journal', isTherapistMiddleware, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const patient = await storage.getUser(patientId);
      
      if (!patient) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }
      
      // Verificar se o paciente está atribuído a este terapeuta
      if (patient.therapistId !== user.therapistId) {
        return res.status(403).json({ error: 'Acesso negado. Este paciente não está atribuído ao terapeuta.' });
      }
      
      const journalEntries = await storage.getJournalEntriesByUser(patientId);
      
      res.json(journalEntries);
    } catch (error) {
      console.error('Erro ao buscar entradas de diário do paciente:', error);
      res.status(500).json({ error: 'Erro ao buscar entradas de diário do paciente' });
    }
  });
  
  // Rota para adicionar uma observação a uma sessão
  router.post('/sessions/:id/notes', isTherapistMiddleware, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { notes } = req.body;
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
      
      // Verificar se a sessão pertence a este terapeuta
      if (session.therapistId !== user.therapistId) {
        return res.status(403).json({ error: 'Acesso negado. Esta sessão não pertence ao terapeuta.' });
      }
      
      // Atualizar as notas da sessão
      const updatedSession = await storage.updateSession(sessionId, { notes });
      
      res.json(updatedSession);
    } catch (error) {
      console.error('Erro ao adicionar observação à sessão:', error);
      res.status(500).json({ error: 'Erro ao adicionar observação à sessão' });
    }
  });
  
  // Rota para atualizar o status de uma sessão
  router.patch('/sessions/:id/status', isTherapistMiddleware, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { status } = req.body;
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
      
      // Verificar se a sessão pertence a este terapeuta
      if (session.therapistId !== user.therapistId) {
        return res.status(403).json({ error: 'Acesso negado. Esta sessão não pertence ao terapeuta.' });
      }
      
      // Validar o status
      if (!['scheduled', 'completed', 'canceled'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }
      
      // Atualizar o status da sessão
      const updatedSession = await storage.updateSession(sessionId, { status });
      
      // Se a sessão foi marcada como concluída, criar uma notificação para o paciente
      if (status === 'completed') {
        await storage.createNotification({
          userId: session.userId,
          title: 'Sessão Concluída',
          message: `Sua sessão com ${session.therapistName} foi concluída. Não esqueça de avaliá-la!`,
          type: 'appointment',
          relatedId: sessionId
        });
      }
      
      res.json(updatedSession);
    } catch (error) {
      console.error('Erro ao atualizar status da sessão:', error);
      res.status(500).json({ error: 'Erro ao atualizar status da sessão' });
    }
  });
  
  // Rota para obter status de disponibilidade para urgência do terapeuta
  router.get('/urgency-status', isTherapistMiddleware, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const status = await storage.getTherapistUrgencyStatus(user.therapistId);
      
      if (!status) {
        // Retorna um status padrão se não existir
        return res.json({
          therapistId: user.therapistId,
          isAvailableForUrgent: false,
          lastUpdated: new Date(),
          availableUntil: null,
          maxWaitingTime: null
        });
      }
      
      res.json(status);
    } catch (error) {
      console.error('Erro ao buscar status de disponibilidade para urgência:', error);
      res.status(500).json({ error: 'Erro ao buscar status de disponibilidade para urgência' });
    }
  });
  
  // Rota para atualizar status de disponibilidade para urgência do terapeuta
  router.post('/urgency-status', isTherapistMiddleware, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user?.therapistId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const { isAvailableForUrgent, availableUntil, maxWaitingTime } = req.body;
      
      const status = await storage.updateTherapistUrgencyStatus(user.therapistId, {
        isAvailableForUrgent,
        availableUntil,
        maxWaitingTime
      });
      
      res.json(status);
    } catch (error) {
      console.error('Erro ao atualizar status de disponibilidade para urgência:', error);
      res.status(500).json({ error: 'Erro ao atualizar status de disponibilidade para urgência' });
    }
  });
  
  return router;
}