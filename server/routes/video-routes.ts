import { Router } from 'express';
import { createVideoToken, createOrGetRoom, getRoomStatus, endRoom } from '../twilio-service';
import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { cacheService } from '../cache-service';

const router = Router();

// GET /api/video/token - Obter token de acesso para video call
router.get('/token', async (req, res) => {
  try {
    // Verificar autenticação por token ou por sessão
    if (!req.isAuthenticated() && !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { sessionId, emergency } = req.query;
    
    // Garantir que o usuário está disponível
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not properly authenticated' });
    }
    
    // Definir um identificador único para o usuário
    const identity = `user_${req.user.id}`;
    
    // Criar nome de sala com base na sessão ou criar nova sala para emergência
    let roomName = '';
    
    if (sessionId) {
      // Verificar existência da sessão
      const session = await storage.getSession(Number(sessionId));
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Nomes de sala para sessões normais incluem o ID da sessão
      roomName = `session_${sessionId}`;
      
      console.log(`[VIDEO] Usuário ${req.user.id} solicitando token para sessão ${sessionId}, sala ${roomName}`);
    } else if (emergency === 'true') {
      // Para atendimentos de emergência, usamos um formato diferente
      const therapistId = req.query.therapistId;
      
      if (!therapistId) {
        return res.status(400).json({ error: 'Therapist ID is required for emergency calls' });
      }
      
      // Verificar disponibilidade do terapeuta para emergências
      const therapistStatus = await storage.getTherapistUrgencyStatus(Number(therapistId));
      
      if (!therapistStatus || !therapistStatus.isAvailableForUrgent) {
        return res.status(400).json({ error: 'Therapist is not available for emergency calls' });
      }
      
      // Nomes de sala para emergências
      roomName = `emergency_${req.user.id}_${therapistId}_${Date.now().toString().substring(0, 10)}`;
      console.log(`[VIDEO] Usuário ${req.user.id} solicitando token para emergência com terapeuta ${therapistId}, sala ${roomName}`);
      
      // Salvar registro desta chamada de emergência
      const emergencyCall = {
        userId: req.user.id,
        therapistId: Number(therapistId),
        startedAt: new Date(),
        roomName,
        status: 'initiated'
      };
      
      // Salvar no storage e no cache
      await storage.createEmergencyCall(emergencyCall);
      cacheService.set(`emergency_call_${roomName}`, emergencyCall, { ttl: 24 * 60 * 60 * 1000 });
    } else {
      // Para testes ou outros casos, gerar um nome aleatório
      roomName = `test_${uuidv4().substring(0, 8)}`;
      console.log(`[VIDEO] Usuário ${req.user.id} solicitando token para sala de teste ${roomName}`);
    }
    
    // Obter ou criar a sala
    const room = await createOrGetRoom(roomName);
    
    if (!room) {
      console.error(`[VIDEO] Falha ao criar/obter sala ${roomName}`);
      return res.status(500).json({ error: 'Failed to create or get room' });
    }
    
    // Gerar token para o usuário
    const token = await createVideoToken(identity, roomName);
    
    if (!token) {
      console.error(`[VIDEO] Falha ao gerar token para ${identity} na sala ${roomName}`);
      return res.status(500).json({ error: 'Failed to generate token' });
    }
    
    console.log(`[VIDEO] Token gerado com sucesso para ${identity} na sala ${roomName}`);
    
    // Retornar token e informações da sala
    res.json({
      token,
      roomName,
      identity,
      role: req.user.isTherapist ? 'therapist' : 'patient'
    });
  } catch (error) {
    console.error('[VIDEO] Erro ao gerar token:', error);
    res.status(500).json({
      error: 'Erro interno ao gerar token de acesso',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/video/status - Verificar status de uma sala
router.get('/status', async (req, res) => {
  try {
    const { roomName, sessionId } = req.query;
    
    // Determinar o nome da sala
    let roomIdentifier = '';
    
    if (roomName) {
      roomIdentifier = String(roomName);
    } else if (sessionId) {
      roomIdentifier = `session_${sessionId}`;
    } else {
      return res.status(400).json({ error: 'Room name or session ID is required' });
    }
    
    // Obter status da sala
    const status = await getRoomStatus(roomIdentifier);
    
    if (!status) {
      return res.status(404).json({
        exists: false,
        status: 'not-found',
        otherParticipantConnected: false,
        roomName: roomIdentifier
      });
    }
    
    // Determinar o papel do usuário
    const role = req.user?.isTherapist ? 'therapist' : 'patient';
    
    // Retornar status
    res.json({
      ...status,
      otherParticipantConnected: status.participantCount > 0,
      role
    });
  } catch (error) {
    console.error('[VIDEO] Erro ao verificar status da sala:', error);
    res.status(500).json({
      error: 'Erro interno ao verificar status da sala',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/video/end - Encerrar uma sala
router.post('/end', async (req, res) => {
  try {
    // Verificar autenticação por token ou por sessão
    if (!req.isAuthenticated() && !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Garantir que o usuário está disponível
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not properly authenticated' });
    }
    
    const { roomName } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    
    console.log(`[VIDEO] Usuário ${req.user.id} solicitando encerramento de sala ${roomName}`);
    
    // Verificar se é uma chamada de emergência
    if (roomName.startsWith('emergency_')) {
      try {
        // Primeiro buscar a chamada de emergência pelo nome da sala
        const emergencyCall = await storage.getEmergencyCallByRoomName(roomName);
        
        if (emergencyCall) {
          console.log(`[VIDEO] Completando chamada de emergência: ${emergencyCall.id}`);
          
          // Completar a chamada com o método apropriado
          const endedAt = new Date();
          const completedCall = await storage.completeEmergencyCall(emergencyCall.id, endedAt);
          
          if (completedCall) {
            // Atualizar no cache 
            cacheService.set(`emergency_call_${roomName}`, completedCall, { ttl: 24 * 60 * 60 * 1000 });
            console.log(`[VIDEO] Chamada de emergência ${emergencyCall.id} completada com sucesso`);
          }
        } else {
          console.log(`[VIDEO] Chamada de emergência não encontrada para sala ${roomName}`);
        }
      } catch (error: any) {
        console.error(`[VIDEO] Falha ao completar chamada de emergência: ${error.message || String(error)}`);
        // Continuamos o fluxo para encerrar a sala mesmo em caso de erro com a chamada
      }
    }
    
    // Encerrar a sala
    const result = await endRoom(roomName);
    
    if (!result) {
      console.error(`[VIDEO] Falha ao encerrar sala ${roomName}`);
      return res.status(500).json({ error: 'Failed to end room' });
    }
    
    console.log(`[VIDEO] Sala ${roomName} encerrada com sucesso`);
    
    // Invalidar o cache para essa sala
    const cacheKey = `twilio_room_${roomName}`;
    cacheService.delete(cacheKey);
    
    res.json({ success: true, message: 'Room ended successfully' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[VIDEO] Erro ao encerrar sala:', errorMessage);
    res.status(500).json({
      error: 'Erro interno ao encerrar sala',
      details: errorMessage
    });
  }
});

// Webhook para status de sala do Twilio
router.post('/room-status-callback', (req, res) => {
  try {
    const roomStatus = req.body;
    console.log('[TWILIO] Room status callback:', roomStatus);
    
    // Atualizar o cache com o novo status
    if (roomStatus.RoomName) {
      const cacheKey = `twilio_room_${roomStatus.RoomName}`;
      const existingRoom = cacheService.get(`twilio_room_${roomStatus.RoomName}`);
      
      if (existingRoom) {
        // Garantimos que existingRoom é um objeto válido
        const updatedRoom = {
          ...existingRoom,
          roomStatus: roomStatus.RoomStatus,
          lastUpdated: new Date().toISOString()
        };
        cacheService.set(cacheKey, updatedRoom, { ttl: 60 * 1000 }); // 1 minuto
      }
      
      // Se for uma sala de emergência e o status indicar que a sala foi encerrada
      // também podemos atualizar o registro de chamada de emergência correspondente
      if (roomStatus.RoomName.startsWith('emergency_') && 
          (roomStatus.RoomStatus === 'completed' || 
           roomStatus.RoomStatus === 'failed')) {
        // Executamos em um try/catch separado para não afetar a resposta principal
        try {
          const roomName = roomStatus.RoomName;
          storage.getEmergencyCallByRoomName(roomName)
            .then(emergencyCall => {
              if (emergencyCall && emergencyCall.status !== 'completed') {
                console.log(`[TWILIO] Completando chamada de emergência ${emergencyCall.id} via webhook`);
                storage.completeEmergencyCall(emergencyCall.id, new Date())
                  .then(() => console.log(`[TWILIO] Chamada ${emergencyCall.id} completada com sucesso`))
                  .catch(err => console.error(`[TWILIO] Erro ao completar chamada: ${err.message}`));
              }
            })
            .catch(err => console.error(`[TWILIO] Erro ao buscar chamada de emergência: ${err.message}`));
        } catch (innerErr) {
          const errorMessage = innerErr instanceof Error ? innerErr.message : String(innerErr);
          console.error('[TWILIO] Erro no processamento de emergência:', errorMessage);
        }
      }
    }
    
    res.sendStatus(200);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[TWILIO] Erro no callback de status:', errorMessage);
    res.sendStatus(200); // Respondemos 200 mesmo em caso de erro para que o Twilio não reenvie
  }
});

export default router;