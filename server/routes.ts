import type { Express } from "express";
import { Router } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, createTokenAuthMiddleware } from "./auth";
import { hashPassword } from "./auth";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// Importar rotas
import paymentRoutes from './routes/payment-routes';
import journalRoutes from './routes/journal-routes';
import { setupSupportGroupsRoutes } from './routes/support-groups-routes';
import { registerAudioEndpoint } from './routes/audio-endpoint';
import { registerUnifiedAudioEndpoint } from './routes/unified-audio-endpoint';
import { registerDirectTranscriptionRoutes } from './routes/direct-transcription';
import { cleanTranscriptionRouter } from './routes/clean-transcription-route';

// Definir __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { 
  insertJournalEntrySchema, 
  insertProgressTrackingSchema,
  insertSessionSchema,
  insertNotificationSchema,
  DailyStreak,
  insertDailyTipSchema,
  insertTherapistAvailabilitySchema,
  insertTherapistUrgencyStatusSchema,
  insertVoiceCheckinSchema,
  insertMedicalRecordSchema
} from "@shared/schema";
import { registerTherapistDashboardRoutes } from "./routes/therapist-dashboard";
import { 
  suggestCategory, 
  generateSummary, 
  extractTags, 
  suggestVisualizationPosition,
  analyzeMood,
  generateJournalTitle
} from './openai-service';
import {
  generateRecommendationsForUser,
  generateRecommendationFromEntry
} from './content-recommendation-service';
import { updateAllAIComponents } from './ai-integration-service';
import {
  generateDailyTip
} from './daily-tips-service';
import { 
  generateUserActivitySummary, 
  generateTherapistBriefing,
  updateDailyTipsWithUserActivities
} from './ai-summary-service';
import { User } from "@shared/schema";

// Importar rotas do assistente virtual
import assistantRoutes from './routes/assistant';

// Importar rotas de AI Summaries
import aiSummariesRoutes from './routes/ai-summaries';

// Importar rotas relacionadas à LGPD
import lgpdRoutes from './routes/lgpd';

// Importar rotas de prontuários médicos
import medicalRecordsRoutes from './routes/medical-records';

// Importar rotas do estado emocional
import emotionalStateRoutes from './routes/emotional-state-routes';

// Importar rotas para gerenciamento de imagens de perfil
import profileImageRoutes from './routes/profile-image-routes';

// Importar rotas de videochamada
import videoRoutes from './routes/video-routes';

// Função para inicializar dados de teste
async function initTestData() {
  try {
    console.log("Inicializando dados de teste...");
    
    // Verificar se o usuário de teste já existe
    const testUser = await storage.getUserByUsername("teste");
    if (!testUser) {
      console.log("Criando usuário de teste (paciente)...");
      // Criar usuário de teste (paciente)
      await storage.createUser({
        username: "teste",
        password: await hashPassword("teste123"),
        firstName: "Usuário",
        lastName: "Teste",
        email: "teste@example.com",
        dateOfBirth: new Date(1990, 0, 1),
        gender: "Outro",
        location: "São Paulo, SP",
        phone: "11987654321",
        occupation: "Estudante",
        bio: "Usuário de teste para a plataforma",
        profilePicture: null,
        preferences: {},
        isTherapist: false,
        therapistId: null,
        fears: {},
        anxieties: {},
        goals: {},
        medicalHistory: {},
        emergencyContact: {},
        privacySettings: {}
      });
      console.log("Usuário de teste (paciente) criado com sucesso!");
    } else {
      console.log("Usuário de teste (paciente) já existe:", testUser.id);
    }
    
    // Verificar se o terapeuta de teste já existe
    const testTherapist = await storage.getUserByUsername("terapeuta");
    if (!testTherapist) {
      console.log("Criando usuário de teste (terapeuta)...");
      try {
        // Criar usuário de teste (terapeuta)
        const therapistUser = await storage.createUser({
          username: "terapeuta",
          password: await hashPassword("terapeuta123"),
          firstName: "Terapeuta",
          lastName: "Teste",
          email: "terapeuta@example.com",
          dateOfBirth: new Date(1980, 0, 1),
          gender: "Outro",
          location: "Rio de Janeiro, RJ",
          phone: "21987654321",
          occupation: "Psicólogo",
          bio: "Terapeuta de teste para a plataforma",
          profilePicture: null,
          preferences: {},
          isTherapist: true,
          therapistId: null, // Será atualizado depois
          fears: {},
          anxieties: {},
          goals: {},
          medicalHistory: {},
          emergencyContact: {},
          privacySettings: {}
        });
        
        console.log("Usuário de teste (terapeuta) criado com ID:", therapistUser.id);
        
        // Criar perfil de terapeuta
        const therapistProfile = await storage.createTherapist({
          firstName: "Terapeuta",
          lastName: "Teste",
          email: "terapeuta@example.com",
          specialization: "Psicologia Clínica, Ansiedade, Depressão",
          bio: "Terapeuta de teste especializado em ansiedade e depressão",
          education: "Universidade Federal do Brasil",
          languages: ["Português", "Inglês"],
          yearsOfExperience: 10,
          imageUrl: null,
          rating: 4,
          tags: ["Ansiedade", "Depressão", "Terapia Online", "Emergências"],
          availability: {
            "Segunda": true,
            "Terça": false,
            "Quarta": true,
            "Quinta": false,
            "Sexta": true,
            "Sábado": true,
            "Domingo": false
          },
          approachDescription: "Abordagem cognitivo-comportamental",
          certifications: ["CRP 01/12345", "Especialização em TCC"],
          hourlyRate: 150,
          location: "Rio de Janeiro, RJ",
          phone: "21987654321",
          experience: ["10 anos em clínica privada", "5 anos em hospital"],
          treatmentMethods: ["Terapia Cognitivo-Comportamental", "Mindfulness"],
          professionalBio: "Formado em Psicologia com especialização em ansiedade e depressão",
          availableForEmergency: true,
          successRate: 92
        });
        
        console.log("Perfil de terapeuta criado com ID:", therapistProfile.id);
        
        // Atualizar usuário com ID do terapeuta
        const updatedUser = await storage.updateUser(therapistUser.id, {
          therapistId: therapistProfile.id,
          isTherapist: true // Garantindo que isTherapist seja true
        });
        
        if (updatedUser) {
          console.log("Usuário terapeuta atualizado com sucesso:", JSON.stringify({
            id: updatedUser.id,
            username: updatedUser.username,
            isTherapist: updatedUser.isTherapist,
            therapistId: updatedUser.therapistId
          }));
        } else {
          console.error("Falha ao atualizar usuário terapeuta");
        }
        
        console.log("Usuário de teste (terapeuta) criado e configurado com sucesso!");
      } catch (error) {
        console.error("Erro ao criar terapeuta de teste:", error);
      }
    } else {
      console.log("Usuário de teste (terapeuta) já existe:", testTherapist.id);
      
      // Verificar se o terapeuta tem todos os dados necessários
      if (!testTherapist.isTherapist || !testTherapist.therapistId) {
        console.log("Atualizando dados do terapeuta existente...");
        
        // Se o therapistId não estiver definido, verificar se já existe um perfil de terapeuta
        if (!testTherapist.therapistId) {
          // Buscar todos os terapeutas existentes
          const allTherapists = await storage.getAllTherapists();
          const therapistProfile = allTherapists.find(t => 
            t.firstName === "Terapeuta" && t.lastName === "Teste");
          
          if (therapistProfile) {
            console.log("Encontrado perfil de terapeuta existente com ID:", therapistProfile.id);
            // Atualizar o usuário com o ID do terapeuta
            await storage.updateUser(testTherapist.id, {
              therapistId: therapistProfile.id,
              isTherapist: true
            });
            console.log("Usuário terapeuta atualizado com therapistId:", therapistProfile.id);
          } else {
            // Criar um novo perfil de terapeuta
            const newTherapistProfile = await storage.createTherapist({
              firstName: "Terapeuta",
              lastName: "Teste",
              email: "terapeuta@example.com",
              specialization: "Psicologia Clínica, Ansiedade, Depressão",
              bio: "Terapeuta de teste especializado em ansiedade e depressão",
              education: "Universidade Federal do Brasil",
              languages: ["Português", "Inglês"],
              yearsOfExperience: 10,
              imageUrl: null,
              rating: 4,
              tags: ["Ansiedade", "Depressão", "Terapia Online", "Emergências"],
              availability: {
                "Segunda": true,
                "Terça": false,
                "Quarta": true,
                "Quinta": false,
                "Sexta": true,
                "Sábado": true,
                "Domingo": false
              },
              approachDescription: "Abordagem cognitivo-comportamental",
              certifications: ["CRP 01/12345", "Especialização em TCC"],
              hourlyRate: 150,
              location: "Rio de Janeiro, RJ",
              phone: "21987654321",
              experience: ["10 anos em clínica privada", "5 anos em hospital"],
              treatmentMethods: ["Terapia Cognitivo-Comportamental", "Mindfulness"],
              professionalBio: "Formado em Psicologia com especialização em ansiedade e depressão",
              availableForEmergency: true,
              successRate: 92
            });
            
            console.log("Novo perfil de terapeuta criado com ID:", newTherapistProfile.id);
            
            // Atualizar o usuário com o ID do novo terapeuta
            await storage.updateUser(testTherapist.id, {
              therapistId: newTherapistProfile.id,
              isTherapist: true
            });
            console.log("Usuário terapeuta atualizado com novo therapistId:", newTherapistProfile.id);
          }
        } else {
          // Apenas garantir que isTherapist seja true
          await storage.updateUser(testTherapist.id, {
            isTherapist: true
          });
          console.log("Usuário terapeuta atualizado com isTherapist=true");
        }
      }
    }
    
  } catch (error) {
    console.error("Erro ao inicializar dados de teste:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Servir pastas estáticas
  app.use('/static', express.static(path.join(process.cwd(), 'public', 'static')));
  
  // Setup authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);
  
  // Inicializar dados de teste
  await initTestData();
  
  // Disponibilizar a instância de storage para as rotas
  app.locals.storage = storage;
  
  // Criar middleware de autenticação por token
  const tokenAuth = createTokenAuthMiddleware();
  
  // Configurar diretório de uploads como estático
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
  
  // Registrar o novo endpoint de transcrição direta que utiliza OpenAI otimizado
  registerDirectTranscriptionRoutes(app);
  
  // Registrar o endpoint unificado de áudio para iOS
  registerUnifiedAudioEndpoint(app);
  
  // Registrar rotas de transcrição direta
  const { registerTranscribeRoutes } = await import('./routes/transcribe-routes');
  registerTranscribeRoutes(app);
  
  // Registrar nossa nova rota de transcrição limpa e confiável
  app.use('/api', cleanTranscriptionRouter);
  
  // Endpoint de teste para verificar se a transcrição funciona
  app.get('/api/test-transcription', async (req, res) => {
    try {
      return res.json({
        message: 'Serviço de transcrição em funcionamento',
        endpoints: [
          { url: '/api/transcribe-direct', method: 'POST', description: 'Transcrição otimizada com OpenAI' },
          { url: '/api/transcribe-direct/status', method: 'GET', description: 'Verificar status do serviço' }
        ],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao verificar serviço de transcrição:', error);
      return res.status(500).json({
        message: 'Erro ao verificar serviço de transcrição',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Adicionar endpoint para verificar status de processamento de áudio (sem autenticação para facilitar)
  app.get('/api/processing-status/:audioId', async (req, res) => {
    const { audioId } = req.params;
    
    try {
      // Verificar se o audioId contém um ID de entrada de diário
      // Se sim, buscar a entrada pelo ID e retornar o status
      if (audioId && !isNaN(parseInt(audioId))) {
        const entryId = parseInt(audioId);
        const entry = await storage.getJournalEntry(entryId);
        
        if (entry) {
          // Retornar o status de processamento da entrada
          return res.json({
            id: entry.id,
            processingStatus: entry.processingStatus || 'pending',
            processingProgress: entry.processingProgress || 0,
            isComplete: (entry.processingStatus === 'completed'),
            audioUrl: entry.audioUrl,
            transcription: entry.content !== 'Gravação de áudio' ? entry.content : null
          });
        }
      }
      
      // Se não é um ID ou a entrada não foi encontrada, verificar se é o nome do arquivo
      // Buscar entradas recentes e verificar se alguma tem o audioId no audioUrl
      const recentEntries = await storage.getRecentJournalEntries(10);
      const matchingEntry = recentEntries.find(entry => 
        entry.audioUrl && entry.audioUrl.includes(audioId)
      );
      
      if (matchingEntry) {
        return res.json({
          id: matchingEntry.id,
          processingStatus: matchingEntry.processingStatus || 'pending',
          processingProgress: matchingEntry.processingProgress || 0,
          isComplete: (matchingEntry.processingStatus === 'completed'),
          audioUrl: matchingEntry.audioUrl,
          transcription: matchingEntry.content !== 'Gravação de áudio' ? matchingEntry.content : null
        });
      }
      
      // Se não encontrou, retornar 404
      return res.status(404).json({ 
        message: "Processamento não encontrado", 
        audioId 
      });
    } catch (error) {
      console.error(`Erro ao verificar status de processamento para ${audioId}:`, error);
      return res.status(500).json({ 
        message: "Erro ao verificar status de processamento",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Registrar rotas do assistente
  app.use('/api/assistant', tokenAuth, assistantRoutes);
  
  // Rotas de fallback para transcrição de áudio (compatibilidade)
  app.post('/api/transcribe-audio', tokenAuth, (req, res) => {
    // Redirecionar para a rota correta
    res.redirect(307, '/api/journal/transcribe');
  });
  
  // Rotas de fallback para compatibilidade com client journal-page-ios.tsx
  app.post('/api/journal-entries/transcribe', tokenAuth, (req, res) => {
    // Redirecionar para a rota correta
    res.redirect(307, '/api/journal/transcribe');
  });
  
  // Rota de fallback para criação de entradas do diário
  app.post('/api/journal-entries', tokenAuth, async (req, res) => {
    try {
      console.log('[API] POST /api/journal-entries - Corpo da requisição:', JSON.stringify(req.body));
      
      // Solução especial para entradas com transcriberMood mas sem content (bug no cliente iOS)
      if (req.body && req.body.mood && !req.body.content) {
        console.log('[API] POST /api/journal-entries - Detectada entrada sem conteúdo mas com mood');
        
        // Definir um conteúdo padrão apenas para evitar o erro
        req.body.content = req.body.content || "(Gravação de áudio sem transcrição)";
      }
      
      // Verificar se o conteúdo está presente após a correção
      if (!req.body || !req.body.content) {
        console.log('[API] POST /api/journal-entries - Conteúdo não fornecido no corpo da requisição');
        return res.status(400).json({ error: "Conteúdo obrigatório no corpo da requisição", 
                                      body: req.body });
      }
      
      // Em vez de redirecionar, vamos chamar diretamente a rota de criação no journal-routes
      const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/journal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify(req.body)
      });
      
      const data = await response.json();
      
      // Retornar a resposta da API interna
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('[API] POST /api/journal-entries - Erro:', error);
      return res.status(500).json({ 
        error: "Erro interno ao processar a requisição", 
        details: String(error) 
      });
    }
  });
  
  // Registrar rotas do dashboard de terapeuta
  app.use('/api/therapist', tokenAuth, registerTherapistDashboardRoutes(Router()));
  
  // Registrar rotas de pagamento
  app.use('/api/payments', paymentRoutes);
  
  // Registrar rotas do diário
  app.use('/api/journal', tokenAuth, journalRoutes);
  
  // Registrar rotas de AI Summaries
  app.use('/api', aiSummariesRoutes);
  
  // Registrar rotas relacionadas à LGPD
  app.use('/api/lgpd', lgpdRoutes);
  
  // Registrar rotas para grupos de apoio
  app.use('/api', tokenAuth, setupSupportGroupsRoutes(Router()));
  
  // Registrar rotas de prontuários médicos
  app.use('/api/medical-records', medicalRecordsRoutes);
  
  // Registrar rotas de estado emocional
  app.use('/api/emotional-state', tokenAuth, emotionalStateRoutes);
  
  // Registrar rotas para upload de imagens de perfil
  app.use('/api/profile-image', tokenAuth, profileImageRoutes);
  
  // Registrar rotas de videochamada
  app.use('/api/video', tokenAuth, videoRoutes);
  
  // Endpoint para login de teste como terapeuta
  app.post("/api/login-terapeuta", async (req, res) => {
    try {
      // Buscar o terapeuta pelo nome de usuário
      console.log(`[API] POST /api/login-terapeuta - Buscando terapeuta`);
      console.log(`[API] POST /api/login-terapeuta - Headers:`, JSON.stringify(req.headers, null, 2));

      // Tentar encontrar o usuário terapeuta de teste pelo ID 2 (mais confiável)
      let realUser = await storage.getUser(2);
      
      // Caso não encontre por ID, tenta pelo username
      if (!realUser) {
        realUser = await storage.getUserByUsername("terapeuta");
      }
      
      if (!realUser) {
        console.log(`[API] POST /api/login-terapeuta - Terapeuta de teste não encontrado, iniciando nova tentativa de criação`);
        
        // Chamar a função para recriar o terapeuta de teste
        await initTestData();
        
        // Tentar obter o terapeuta novamente
        realUser = await storage.getUserByUsername("terapeuta");
        
        if (!realUser) {
          console.log(`[API] POST /api/login-terapeuta - Falha ao criar terapeuta de teste. Tentando buscar qualquer terapeuta.`);
          
          // Último recurso: tentar encontrar qualquer usuário com isTherapist = true
          const allUsers = await storage.getAllUsers();
          const therapistUser = allUsers.find(user => user.isTherapist === true);
          
          if (therapistUser) {
            console.log(`[API] POST /api/login-terapeuta - Encontrado um terapeuta alternativo com ID ${therapistUser.id}`);
            realUser = therapistUser;
          } else {
            return res.status(500).json({ 
              message: "Não foi possível encontrar ou criar um terapeuta de teste. Contate o administrador." 
            });
          }
        }
      }
      
      // Verificar se o usuário tem um perfil de terapeuta associado
      if (!realUser.therapistId) {
        console.log(`[API] POST /api/login-terapeuta - Usuário não tem perfil de terapeuta. Verificando perfis existentes...`);
        
        // Buscar todos os terapeutas
        const allTherapists = await storage.getAllTherapists();
        const matchingTherapist = allTherapists.find(t => 
          t.firstName === "Terapeuta" && t.lastName === "Teste");
        
        if (matchingTherapist) {
          console.log(`[API] POST /api/login-terapeuta - Encontrado perfil de terapeuta com ID ${matchingTherapist.id}`);
          // Atualizar o usuário com o ID do terapeuta
          await storage.updateUser(realUser.id, {
            therapistId: matchingTherapist.id,
            isTherapist: true
          });
          
          // Buscar o usuário atualizado
          realUser = await storage.getUser(realUser.id) || realUser;
        } else if (allTherapists.length > 0) {
          // Se não encontrar um terapeuta correspondente, usar o primeiro disponível
          console.log(`[API] POST /api/login-terapeuta - Usando primeiro perfil de terapeuta disponível com ID ${allTherapists[0].id}`);
          await storage.updateUser(realUser.id, {
            therapistId: allTherapists[0].id,
            isTherapist: true
          });
          
          // Buscar o usuário atualizado
          realUser = await storage.getUser(realUser.id) || realUser;
        } else {
          console.log(`[API] POST /api/login-terapeuta - Nenhum perfil de terapeuta encontrado. Criando novo perfil...`);
          
          // Criar um novo perfil de terapeuta
          const newTherapistProfile = await storage.createTherapist({
            firstName: "Terapeuta",
            lastName: "Teste",
            email: "terapeuta@example.com",
            specialization: "Psicologia Clínica, Ansiedade, Depressão",
            bio: "Terapeuta de teste especializado em ansiedade e depressão",
            education: "Universidade Federal do Brasil",
            languages: ["Português", "Inglês"],
            yearsOfExperience: 10,
            imageUrl: null,
            rating: 4,
            tags: ["Ansiedade", "Depressão", "Terapia Online", "Emergências"],
            availability: {
              "Segunda": true,
              "Terça": false,
              "Quarta": true,
              "Quinta": false,
              "Sexta": true,
              "Sábado": true,
              "Domingo": false
            },
            approachDescription: "Abordagem cognitivo-comportamental",
            certifications: ["CRP 01/12345", "Especialização em TCC"],
            hourlyRate: 150,
            location: "Rio de Janeiro, RJ",
            phone: "21987654321",
            experience: ["10 anos em clínica privada", "5 anos em hospital"],
            treatmentMethods: ["Terapia Cognitivo-Comportamental", "Mindfulness"],
            professionalBio: "Formado em Psicologia com especialização em ansiedade e depressão",
            availableForEmergency: true,
            successRate: 92
          });
          
          console.log(`[API] POST /api/login-terapeuta - Novo perfil de terapeuta criado com ID ${newTherapistProfile.id}`);
          
          // Atualizar o usuário com o ID do terapeuta
          await storage.updateUser(realUser.id, {
            therapistId: newTherapistProfile.id,
            isTherapist: true
          });
          
          // Buscar o usuário atualizado
          realUser = await storage.getUser(realUser.id) || realUser;
        }
      }
      
      // Garantir que o usuário é um terapeuta
      if (!realUser.isTherapist) {
        console.log(`[API] POST /api/login-terapeuta - Forçando flag isTherapist para true`);
        await storage.updateUser(realUser.id, { isTherapist: true });
        realUser = await storage.getUser(realUser.id) || realUser;
      }
      
      // Verificar se o usuário tem a flag definida corretamente
      if (realUser.isTherapist !== true) {
        console.log(`[API] POST /api/login-terapeuta - Forçando flag isTherapist para booleano true`);
        await storage.updateUser(realUser.id, { isTherapist: true });
        realUser = await storage.getUser(realUser.id) || realUser;
      }
      
      console.log(`[API] POST /api/login-terapeuta - Usuário terapeuta preparado:`, 
        JSON.stringify({
          id: realUser.id,
          username: realUser.username,
          isTherapist: realUser.isTherapist,
          therapistId: realUser.therapistId
        })
      );
      
      // Usar autenticação baseada em token
      const { generateToken } = await import('./auth');
      
      // Obter o User-Agent para registro
      const userAgent = req.headers['user-agent'] || 'desconhecido';
      
      // Gerar um token para o usuário
      const token = await import('./auth').then(auth => auth.generateToken(realUser.id, realUser.username, true, userAgent));
      
      // Retornar usuário e token
      const { password, ...userWithoutPassword } = realUser;
      const responseObj = {
        ...userWithoutPassword,
        isTherapist: true,  // Forçar como booleano
        authenticated: true,
        token: token
      };
      
      console.log(`[API] POST /api/login-terapeuta - Login do terapeuta concluído com sucesso`);
      
      return res.status(200).json(responseObj);
    } catch (error) {
      console.error("[API] POST /api/login-terapeuta - Erro:", error);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });
  
  // Endpoint para buscar pacientes (para terapeutas)
  app.get('/api/patients', tokenAuth, async (req, res) => {
    try {
      // Obter o usuário do token
      const user = req.user;
      
      console.log(`[API] GET /api/patients - Usuário: ${JSON.stringify({
        id: user?.id,
        username: user?.username,
        isTherapist: user?.isTherapist,
        therapistId: user?.therapistId
      })}`);
      
      if (!user) {
        console.log('[API] GET /api/patients - Usuário não encontrado');
        return res.status(401).json({ message: 'Não autorizado' });
      }
      
      // Verificar se o usuário é um terapeuta
      console.log('[API] GET /api/patients - Tipo da flag isTherapist:', typeof user.isTherapist);
      console.log('[API] GET /api/patients - Valor da flag isTherapist:', user.isTherapist);
      
      // Verificar os dados completos do usuário para depuração
      const userFromStorage = await storage.getUser(user.id);
      console.log('[API] GET /api/patients - Dados completos do usuário do banco de dados:', 
        JSON.stringify({
          id: userFromStorage?.id,
          isTherapist: userFromStorage?.isTherapist,
          therapistId: userFromStorage?.therapistId
        })
      );
      
      // Permitir acesso se o usuário for terapeuta OU se os dados do banco dizem que é terapeuta
      const isTherapistUser = user.isTherapist === true || 
                             (userFromStorage && userFromStorage.isTherapist === true) ||
                             user.id === 1; // Temporário: permitir usuário ID 1 para testes
      
      if (!isTherapistUser) {
        console.log('[API] GET /api/patients - Usuário não é terapeuta:', JSON.stringify({
          id: user.id,
          isTherapist: user.isTherapist,
          userFromStorage: userFromStorage ? { id: userFromStorage.id, isTherapist: userFromStorage.isTherapist } : null
        }));
        return res.status(403).json({ 
          message: 'Acesso negado. Apenas terapeutas podem acessar esta rota.',
          debug: {
            id: user.id,
            isTherapist: user.isTherapist,
            fromStorage: userFromStorage ? userFromStorage.isTherapist : null
          }
        });
      }
      
      // Substitui o valor de isTherapist para garantir consistência
      user.isTherapist = true;
      
      console.log('[API] GET /api/patients - Usuário autenticado como terapeuta:', user.id, 'isTherapist:', user.isTherapist);
      
      // Obter o ID do terapeuta
      const therapistId = user.therapistId || user.id;
      
      // Buscar os pacientes do terapeuta
      const patients = await storage.getPatientsByTherapistId(therapistId);
      
      console.log(`[API] GET /api/patients - Encontrados ${patients.length} pacientes para o terapeuta ${therapistId}`);
      
      // Retornar os dados
      res.json(patients);
    } catch (error) {
      console.error('[API] GET /api/patients - Erro ao buscar pacientes:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Endpoint especial para fazer login de teste sem senha - usando token
  app.post("/api/login-teste", async (req, res) => {
    try {
      console.log("[API] /api/login-teste - Tentando fazer login de teste");
      console.log("[API] /api/login-teste - Headers:", JSON.stringify(req.headers, null, 2));
      
      // Buscar o usuário de teste (ID 1)
      const user = await storage.getUser(1);
      
      if (!user) {
        console.log("[API] /api/login-teste - Usuário de teste não encontrado");
        return res.status(404).json({ message: "Usuário de teste não encontrado" });
      }
      
      console.log("[API] /api/login-teste - Usuário de teste encontrado:", user.id);
      
      // Obter o User-Agent para registro
      const userAgent = req.headers['user-agent'] || 'desconhecido';
      
      // Gerar um token seguro para o usuário de teste
      const token = await import('./auth').then(auth => auth.generateToken(user.id, user.username, !!user.isTherapist, userAgent));
      
      console.log(`[API] /api/login-teste - Token gerado: ${token.substring(0, 8)}...`);
      
      // Retornar usuário e token
      const { password, ...userWithoutPassword } = user;
      
      // Retornar resposta com status adequado
      return res.status(200).json({
        ...userWithoutPassword,
        authenticated: true,
        token: token,
        sessionID: req.sessionID,
        isTherapist: false
      });
    } catch (error) {
      console.error("[API] /api/login-teste - Erro:", error);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });
  
  // Endpoint temporário para criar um usuário de teste
  // Rotas de usuário para gerenciamento de perfil
  app.get("/api/users/:id", tokenAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      // Remove a senha antes de enviar
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  
  // Rota para atualizar usuário
  app.patch("/api/users/:id", tokenAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o usuário existe
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      // Verificar permissão (apenas o próprio usuário ou um admin pode alterar)
      if ((req.user as any).id !== id) {
        return res.status(403).json({ error: "Sem permissão para alterar este usuário" });
      }
      
      // Validar campos permitidos para atualização
      const allowedFields = [
        "firstName", "lastName", "email", "phone", "location", 
        "occupation", "bio", "gender", "dateOfBirth", "profilePicture",
        "fears", "anxieties", "goals",
      ];
      
      const updateData: any = {};
      
      // Filtrar apenas campos permitidos e converter formatos quando necessário
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          if (field === "dateOfBirth" && req.body[field]) {
            try {
              // Tentar converter para uma data válida
              updateData[field] = new Date(req.body[field]);
              // Verificar se é uma data válida
              if (isNaN(updateData[field].getTime())) {
                throw new Error("Data inválida");
              }
            } catch (error) {
              console.log(`Erro ao processar dateOfBirth:`, req.body[field]);
              return res.status(400).json({ error: "Formato de data inválido para dateOfBirth" });
            }
          } else {
            updateData[field] = req.body[field];
          }
        }
      }
      
      console.log("Database error in updateUser: Dados enviados para atualização:", JSON.stringify(updateData));
      
      // Atualizar usuário
      const updatedUser = await storage.updateUser(id, updateData);
      
      if (!updatedUser) {
        return res.status(500).json({ error: "Falha ao atualizar usuário" });
      }
      
      // Retornar usuário atualizado sem a senha
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Database error in updateUser:", error);
      res.status(500).json({ error: "Falha ao atualizar usuário" });
    }
  });
  
  // Rota para obter dados do terapeuta
  app.get("/api/therapists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const therapist = await storage.getTherapist(id);
      
      if (!therapist) {
        return res.status(404).json({ error: "Terapeuta não encontrado" });
      }
      
      res.json(therapist);
    } catch (error) {
      console.error("Erro ao buscar terapeuta:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  
  // Rota para atualizar dados do terapeuta
  app.patch("/api/therapists/:id", tokenAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o terapeuta existe
      const therapist = await storage.getTherapist(id);
      if (!therapist) {
        return res.status(404).json({ error: "Terapeuta não encontrado" });
      }
      
      // Verificar permissão (apenas o próprio terapeuta pode alterar seus dados)
      const user = req.user as any;
      if (!user.isTherapist || user.therapistId !== id) {
        return res.status(403).json({ error: "Sem permissão para alterar este terapeuta" });
      }
      
      // Atualizar terapeuta
      const updatedTherapist = await storage.updateTherapist(id, req.body);
      
      if (!updatedTherapist) {
        return res.status(500).json({ error: "Falha ao atualizar terapeuta" });
      }
      
      res.json(updatedTherapist);
    } catch (error) {
      console.error("Erro ao atualizar terapeuta:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  
  // Rota para buscar sessões de um terapeuta
  app.get("/api/sessions/therapist/:id", tokenAuth, async (req, res) => {
    try {
      const therapistId = parseInt(req.params.id);
      
      // Verificar permissão
      const user = req.user as any;
      if (!user.isTherapist || user.therapistId !== therapistId) {
        return res.status(403).json({ error: "Sem permissão para acessar estas sessões" });
      }
      
      // Buscar sessões
      const sessions = await storage.getSessionsByTherapistId(therapistId);
      res.json(sessions);
    } catch (error) {
      console.error("Erro ao buscar sessões do terapeuta:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  
  app.get("/api/v1/create-test-user", async (req, res) => {
    try {
      // Verificar se o usuário já existe
      const existingUser = await storage.getUserByUsername("usuario_teste");
      
      if (existingUser) {
        return res.json({ 
          message: "Usuário de teste já existe", 
          username: "usuario_teste",
          password: "senha123"
        });
      }
      
      // Criar o usuário de teste
      const hashedPassword = await hashPassword("senha123");
      const user = await storage.createUser({
        username: "usuario_teste",
        password: hashedPassword,
        email: "teste@example.com",
        firstName: "Usuário",
        lastName: "Teste",
        dateOfBirth: new Date("1990-01-01"),
        profilePicture: null,
        bio: "Usuário de teste para demonstração da plataforma",
        preferences: {}
      });
      
      res.json({ 
        message: "Usuário de teste criado com sucesso", 
        username: "usuario_teste", 
        password: "senha123" 
      });
    } catch (error) {
      console.error("Erro ao criar usuário de teste:", error);
      res.status(500).json({ message: "Erro ao criar usuário de teste" });
    }
  });

  // Therapists routes
  app.get("/api/therapists", async (req, res) => {
    try {
      let therapists;
      const specialization = req.query.specialization as string;
      const emergencyOnly = req.query.emergency === "true";
      
      if (emergencyOnly) {
        therapists = await storage.getTherapistsAvailableForEmergency();
      } else if (specialization) {
        therapists = await storage.getTherapistsBySpecialization(specialization);
      } else {
        therapists = await storage.getAllTherapists();
      }
      res.json(therapists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch therapists" });
    }
  });

  // Rota específica para atendimentos de emergência
  app.get("/api/therapists/emergency", async (req, res) => {
    try {
      console.log("[DEBUG] Buscando terapeutas disponíveis para emergência");
      const therapists = await storage.getTherapistsAvailableForEmergency();
      console.log("[DEBUG] Terapeutas disponíveis para emergência:", therapists);
      
      if (therapists && therapists.length > 0) {
        res.json(therapists);
      } else {
        // Enviar array vazio em vez de erro quando não houver terapeutas disponíveis
        res.json([]);
      }
    } catch (error) {
      console.error("[ERROR] Falha ao buscar terapeutas de emergência:", error);
      res.status(500).json({ message: "Failed to fetch emergency therapists" });
    }
  });

  // Rota já definida anteriormente
  
  // Rota para obter avaliações de um terapeuta
  app.get("/api/therapists/:id/reviews", async (req, res) => {
    try {
      const therapistId = Number(req.params.id);
      if (isNaN(therapistId)) {
        return res.status(400).json({ error: "ID do terapeuta inválido" });
      }
      
      const reviews = await storage.getTherapistReviewsByTherapist(therapistId);
      res.json(reviews);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch therapist reviews" });
    }
  });
  
  // Remover duplicação desta declaração, o tokenAuth já foi definido anteriormente
  
  // Rota para criar uma avaliação para um terapeuta
  app.post("/api/therapists/:id/reviews", tokenAuth, async (req, res) => {
    try {
      const therapistId = Number(req.params.id);
      if (isNaN(therapistId)) {
        return res.status(400).json({ error: "ID do terapeuta inválido" });
      }
      
      // Verificar se o terapeuta existe
      const therapist = await storage.getTherapist(therapistId);
      if (!therapist) {
        return res.status(404).json({ error: "Terapeuta não encontrado" });
      }
      
      // Obter o usuário do token
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      const reviewData = {
        ...req.body,
        therapistId,
        userId
      };
      
      const review = await storage.createTherapistReview(reviewData);
      
      // Enviar uma notificação para o terapeuta
      const user = await storage.getUser(userId);
      if (user) {
        await storage.createNotification({
          userId: therapistId, // Enviar para o terapeuta
          type: "Avaliação",
          title: "Nova avaliação recebida",
          message: `${user.firstName} ${user.lastName} deixou uma avaliação de ${reviewData.rating / 10} estrelas para você.`,
          relatedId: review.id
        });
      }
      
      res.status(201).json(review);
    } catch (error) {
      console.error("Erro ao criar avaliação:", error);
      res.status(500).json({ error: "Erro ao processar a avaliação" });
    }
  });
  
  // Sessions routes
  app.get("/api/sessions", async (req, res) => {
    console.log("GET /api/sessions - Autenticado:", req.isAuthenticated());
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      console.log("GET /api/sessions - userId:", userId);
      
      // Parâmetros de paginação
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Parâmetros de filtro
      const status = req.query.status as string;
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
      
      // Buscar usando a função de cache
      const cacheKey = `sessions_user_${userId}_page_${page}_limit_${limit}_status_${status || 'all'}_from_${fromDate?.toISOString() || 'none'}_to_${toDate?.toISOString() || 'none'}`;
      
      // Função que busca do banco de dados usando as novas funções de paginação
      const fetchFromDb = async () => {
        // Importar as funções de paginação
        const { getPaginatedSessions } = await import('./utils/pagination');
        
        // Preparar os parâmetros de paginação
        const paginationParams = {
          page,
          limit,
          orderBy: 'startTime',
          order: 'desc' as const
        };
        
        // Preparar os filtros
        const filters = {
          userId,
          status,
          fromDate,
          toDate
        };
        
        // Buscar as sessões usando a função de paginação
        return await getPaginatedSessions(paginationParams, filters);
      };
      
      try {
        // Importar o serviço de cache
        const { cacheService } = await import('./cache-service');
        
        // Buscar do cache ou do banco
        const result = await cacheService.getOrSet(cacheKey, fetchFromDb, {
          ttl: 5 * 60 * 1000, // 5 minutos
          invalidateOnMutation: true
        });
        
        res.json(result);
      } catch (cacheError) {
        console.warn("Erro ao usar cache, fazendo fallback para consulta direta:", cacheError);
        // Fallback: buscar direto do banco se o cache falhar
        const result = await fetchFromDb();
        res.json(result);
      }
    } catch (error) {
      console.error("Erro ao buscar sessões de terapia:", error);
      res.status(500).json({ message: "Falha ao buscar sessões de terapia" });
    }
  });
  
  app.get("/api/sessions/:id", async (req, res) => {
    console.log("GET /api/sessions/:id - Autenticado:", req.isAuthenticated());
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      
      // Verificar se o usuário tem permissão para ver esta sessão
      // (tanto paciente quanto terapeuta podem ver)
      if (session.userId !== userId && session.therapistId !== userId) {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Erro ao buscar sessão de terapia:", error);
      res.status(500).json({ message: "Falha ao buscar sessão de terapia" });
    }
  });
  
  app.delete("/api/sessions/:id", tokenAuth, async (req, res) => {
    console.log("DELETE /api/sessions/:id - Autenticado:", req.isAuthenticated());
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const sessionId = parseInt(req.params.id);
      
      // Verificar se a sessão existe
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      
      // Verificar se o usuário tem permissão para cancelar esta sessão
      if (session.userId !== userId && session.therapistId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Atualizar a sessão para status 'canceled' (soft delete)
      // Se a requisição tiver um motivo de cancelamento, adicionar às notas
      const notes = req.body.reason 
        ? `Cancelado: ${req.body.reason}` 
        : session.notes 
          ? `${session.notes} - Cancelado pelo usuário` 
          : 'Cancelado pelo usuário';
      
      const updatedSession = await storage.updateSession(sessionId, { 
        status: 'canceled',
        notes 
      });
      
      // Notificar o serviço de cache sobre a mutação
      const { cacheService } = await import('./cache-service');
      cacheService.notifyMutation('session', sessionId, updatedSession);
      
      // Invalidar qualquer cache de sessões de usuário
      if (session.userId) {
        cacheService.notifyMutation('user', session.userId, { action: 'session_canceled' });
      }
      
      if (session.therapistId) {
        cacheService.notifyMutation('therapist', session.therapistId, { action: 'session_canceled' });
      }
      
      // Criar notificação para o outro participante da sessão
      const recipientId = session.userId === userId ? session.therapistId : session.userId;
      const notifierName = (req.user as Express.User).firstName;
      
      await storage.createNotification({
        userId: recipientId,
        type: 'session_canceled',
        title: 'Consulta cancelada',
        message: `${notifierName} cancelou a consulta agendada para ${new Date(session.scheduledFor).toLocaleDateString('pt-BR')} às ${new Date(session.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        relatedId: sessionId
      });
      
      return res.json(updatedSession);
    } catch (error) {
      console.error("Erro ao cancelar sessão:", error);
      res.status(500).json({ message: "Erro ao cancelar a sessão" });
    }
  });
  
  app.post("/api/sessions", async (req, res) => {
    console.log("POST /api/sessions - Autenticado:", req.isAuthenticated());
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      
      // Converter scheduledFor de string para Date antes da validação
      let dataToValidate = {
        ...req.body,
        userId,
        // Definir status como "Confirmada" diretamente, sem necessidade de pagamento
        status: req.body.status || "Confirmada",
        type: req.body.type || "Video",
        duration: req.body.duration || 50
      };
      
      // Verifica se scheduledFor é uma string e converte para Date
      if (typeof dataToValidate.scheduledFor === 'string') {
        dataToValidate.scheduledFor = new Date(dataToValidate.scheduledFor);
      }
      
      // Validar dados de entrada
      const sessionData = insertSessionSchema.parse(dataToValidate);
      
      // Buscar informações do terapeuta para incluir o nome
      const therapist = await storage.getTherapist(sessionData.therapistId);
      if (!therapist) {
        return res.status(404).json({ message: "Terapeuta não encontrado" });
      }
      
      // Verificar disponibilidade do terapeuta
      const scheduledDate = new Date(sessionData.scheduledFor);
      const dayOfWeek = scheduledDate.getDay(); // 0 (domingo) a 6 (sábado)
      const timeString = scheduledDate.toTimeString().slice(0, 5); // HH:MM no formato 24h
      
      const therapistAvailabilities = await storage.getTherapistAvailabilitiesByTherapist(sessionData.therapistId);
      
      // Verificar se o horário está dentro da disponibilidade do terapeuta
      const isAvailable = therapistAvailabilities.some(availability => {
        // Verifica se é para o mesmo dia da semana
        if (availability.dayOfWeek !== dayOfWeek) return false;
        
        // Verificar se o horário está dentro do intervalo disponível
        const startTime = availability.startTime;
        const endTime = availability.endTime;
        
        return timeString >= startTime && timeString <= endTime;
      });
      
      if (!isAvailable) {
        return res.status(400).json({ 
          message: "Horário indisponível. Por favor, escolha outro horário ou terapeuta."
        });
      }
      
      // Verificar se já existe agendamento no mesmo horário
      const existingSessions = await storage.getSessionsByTherapist(sessionData.therapistId);
      const sessionsOnSameDay = existingSessions.filter(session => {
        const sessionDate = new Date(session.scheduledFor);
        return sessionDate.toISOString().split('T')[0] === scheduledDate.toISOString().split('T')[0];
      });
      
      const hasConflict = sessionsOnSameDay.some(session => {
        const sessionTime = new Date(session.scheduledFor);
        const sessionEndTime = new Date(sessionTime.getTime() + (session.duration * 60 * 1000));
        const newSessionTime = scheduledDate;
        const newSessionEndTime = new Date(newSessionTime.getTime() + ((sessionData.duration || 50) * 60 * 1000));
        
        // Verificar se há sobreposição de horários
        return (
          (newSessionTime <= sessionEndTime && newSessionTime >= sessionTime) ||
          (newSessionEndTime <= sessionEndTime && newSessionEndTime >= sessionTime) ||
          (newSessionTime <= sessionTime && newSessionEndTime >= sessionEndTime)
        );
      });
      
      if (hasConflict) {
        return res.status(409).json({ 
          message: "Conflito de horários. Este horário já está agendado."
        });
      }
      
      // Adicionar nome do terapeuta
      const sessionWithTherapistName = {
        ...sessionData,
        therapistName: `${therapist.firstName} ${therapist.lastName}`
      };
      
      const session = await storage.createSession(sessionWithTherapistName);
      
      // Criar notificação para o terapeuta
      await storage.createNotification({
        userId: sessionData.therapistId,
        title: "Nova Consulta Confirmada",
        message: `Consulta confirmada com paciente #${userId} para ${format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`,
        type: "appointment",
        relatedId: session.id
      });
      
      // Criar notificação para o paciente
      await storage.createNotification({
        userId: userId,
        title: "Consulta Confirmada",
        message: `Sua consulta com Dr. ${therapist.firstName} ${therapist.lastName} foi confirmada para ${format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`,
        type: "appointment",
        relatedId: session.id
      });
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Erro ao criar sessão de terapia:", error);
      res.status(500).json({ message: "Falha ao criar sessão de terapia" });
    }
  });
  
  // Endpoint para cancelar uma sessão
  app.post("/api/sessions/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const sessionId = parseInt(req.params.id);
      const reason = req.body.reason || "Cancelado pelo usuário";
      const userId = (req.user as Express.User).id;
      
      // Verificar se a sessão existe
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      
      // Verificar permissão (apenas o usuário ou terapeuta da sessão podem cancelá-la)
      if (session.userId !== userId && session.therapistId !== userId) {
        return res.status(403).json({ message: "Não autorizado a cancelar esta sessão" });
      }
      
      // Verificar se a sessão já foi cancelada, concluída ou reagendada
      if (["Cancelada", "Concluída", "Reagendada"].includes(session.status)) {
        return res.status(400).json({ 
          message: `Esta sessão já está ${session.status.toLowerCase()}, não pode ser cancelada`
        });
      }
      
      // Cancelar a sessão
      const updatedSession = await storage.cancelSession(sessionId, reason);
      if (!updatedSession) {
        return res.status(500).json({ message: "Erro ao cancelar sessão" });
      }
      
      // Notificar a outra parte sobre o cancelamento
      const canceladoPor = session.userId === userId ? "paciente" : "terapeuta";
      const notificaQuem = session.userId === userId ? session.therapistId : session.userId;
      
      await storage.createNotification({
        userId: notificaQuem,
        title: "Consulta Cancelada",
        message: `A consulta agendada para ${format(new Date(session.scheduledFor), "dd/MM/yyyy 'às' HH:mm", { locale: pt })} foi cancelada pelo ${canceladoPor}. Motivo: ${reason}`,
        type: "appointment",
        relatedId: sessionId
      });
      
      res.json(updatedSession);
    } catch (error) {
      console.error("Erro ao cancelar sessão:", error);
      res.status(500).json({ message: "Falha ao cancelar sessão" });
    }
  });
  
  // Endpoint para confirmar uma sessão
  app.post("/api/sessions/:id/confirm", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const sessionId = parseInt(req.params.id);
      const userId = (req.user as Express.User).id;
      
      // Verificar se a sessão existe
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      
      // Determinar se é o paciente ou terapeuta confirmando
      let confirmationType: 'user' | 'therapist';
      if (session.userId === userId) {
        confirmationType = 'user';
      } else if (session.therapistId === userId) {
        confirmationType = 'therapist';
      } else {
        return res.status(403).json({ message: "Não autorizado a confirmar esta sessão" });
      }
      
      // Verificar se a sessão já foi cancelada, concluída ou reagendada
      if (["Cancelada", "Concluída", "Reagendada"].includes(session.status)) {
        return res.status(400).json({ 
          message: `Esta sessão já está ${session.status.toLowerCase()}, não pode ser confirmada`
        });
      }
      
      // Confirmar a sessão
      const updatedSession = await storage.confirmSession(sessionId, confirmationType);
      if (!updatedSession) {
        return res.status(500).json({ message: "Erro ao confirmar sessão" });
      }
      
      // Como agora mudamos para status "Confirmada" diretamente, verificamos o status
      if (updatedSession.status === "Confirmada") {
        const scheduledDate = new Date(updatedSession.scheduledFor);
        
        // Notificar paciente
        await storage.createNotification({
          userId: updatedSession.userId,
          title: "Consulta Totalmente Confirmada",
          message: `Sua consulta com Dr. ${updatedSession.therapistName} para ${format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: pt })} foi confirmada por ambas as partes`,
          type: "appointment",
          relatedId: sessionId
        });
        
        // Notificar terapeuta
        await storage.createNotification({
          userId: updatedSession.therapistId,
          title: "Consulta Totalmente Confirmada",
          message: `A consulta com o paciente para ${format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: pt })} foi confirmada por ambas as partes`,
          type: "appointment",
          relatedId: sessionId
        });
      }
      
      res.json(updatedSession);
    } catch (error) {
      console.error("Erro ao confirmar sessão:", error);
      res.status(500).json({ message: "Falha ao confirmar sessão" });
    }
  });
  
  // Endpoint para reagendar uma sessão
  app.post("/api/sessions/:id/reschedule", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const sessionId = parseInt(req.params.id);
      const userId = (req.user as Express.User).id;
      const newDate = new Date(req.body.newDate);
      
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({ message: "Data inválida para reagendamento" });
      }
      
      // Verificar se a data é futura
      if (newDate <= new Date()) {
        return res.status(400).json({ message: "A nova data precisa ser no futuro" });
      }
      
      // Verificar se a sessão existe
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      
      // Verificar permissão (apenas o usuário ou terapeuta da sessão podem reagendá-la)
      if (session.userId !== userId && session.therapistId !== userId) {
        return res.status(403).json({ message: "Não autorizado a reagendar esta sessão" });
      }
      
      // Verificar se a sessão já foi cancelada, concluída ou reagendada
      if (["Cancelada", "Concluída", "Reagendada"].includes(session.status)) {
        return res.status(400).json({ 
          message: `Esta sessão já está ${session.status.toLowerCase()}, não pode ser reagendada`
        });
      }
      
      // Verificar disponibilidade do terapeuta na nova data
      const dayOfWeek = newDate.getDay();
      const timeString = newDate.toTimeString().slice(0, 5);
      
      const therapistAvailabilities = await storage.getTherapistAvailabilitiesByTherapist(session.therapistId);
      
      const isAvailable = therapistAvailabilities.some(availability => {
        if (availability.dayOfWeek !== dayOfWeek) return false;
        return timeString >= availability.startTime && timeString <= availability.endTime;
      });
      
      if (!isAvailable) {
        return res.status(400).json({ 
          message: "Horário indisponível. Por favor, escolha outro horário."
        });
      }
      
      // Reagendar a sessão (cria uma nova sessão e marca a atual como reagendada)
      const newSession = await storage.rescheduleSession(sessionId, newDate);
      if (!newSession) {
        return res.status(500).json({ message: "Erro ao reagendar sessão" });
      }
      
      // Notificar a outra parte sobre o reagendamento
      const reagendadoPor = session.userId === userId ? "paciente" : "terapeuta";
      const notificaQuem = session.userId === userId ? session.therapistId : session.userId;
      
      await storage.createNotification({
        userId: notificaQuem,
        title: "Consulta Reagendada",
        message: `A consulta foi reagendada pelo ${reagendadoPor} para ${format(newDate, "dd/MM/yyyy 'às' HH:mm", { locale: pt })}`,
        type: "appointment",
        relatedId: newSession.id
      });
      
      res.json(newSession);
    } catch (error) {
      console.error("Erro ao reagendar sessão:", error);
      res.status(500).json({ message: "Falha ao reagendar sessão" });
    }
  });

  // Journal entries routes
  app.get("/api/journal", async (req, res) => {
    console.log("GET /api/journal - Autenticado:", req.isAuthenticated());
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      console.log("GET /api/journal - userId:", userId);
      const entries = await storage.getJournalEntriesByUser(userId);
      res.json(entries);
    } catch (error) {
      console.error("Erro ao buscar entradas do diário:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });
  
  // Endpoint alternativo para obter entradas de diário para compatibilidade com o componente journal-history-new
  app.get("/api/journal-entries/user", async (req, res) => {
    console.log("GET /api/journal-entries/user - Autenticado:", req.isAuthenticated());
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      console.log("GET /api/journal-entries/user - userId:", userId);
      const entries = await storage.getJournalEntriesByUser(userId);
      // Responder com o formato esperado pelo componente: { data: [...] }
      res.json({ data: entries });
    } catch (error) {
      console.error("Erro ao buscar entradas do diário:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });
  
  // Endpoint para obter apenas a última entrada do diário
  app.get("/api/journal-last-entry", async (req, res) => {
    console.log("GET /api/journal-last-entry - Autenticado:", req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = (req.user as Express.User).id;
      console.log("GET /api/journal-last-entry - userId:", userId);
      
      // Obter apenas a última entrada
      const entries = await storage.getJournalEntriesByUser(userId, { limit: 1 });
      
      if (entries && entries.length > 0) {
        const lastEntry = entries[0];
        
        // Calcular há quanto tempo foi a última entrada
        const now = new Date();
        const entryDate = new Date(lastEntry.date);
        const diffInMs = now.getTime() - entryDate.getTime();
        
        // Converter para dias
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        // Informação personalizada baseada no tempo desde a última entrada
        let message = "";
        
        if (diffInDays === 0) {
          message = "Você escreveu hoje! Ótimo trabalho!";
        } else if (diffInDays === 1) {
          message = "Faz 1 dia desde sua última anotação.";
        } else if (diffInDays <= 3) {
          message = `Faz ${diffInDays} dias desde sua última anotação.`;
        } else if (diffInDays <= 7) {
          message = "Faz quase uma semana que você não escreve.";
        } else if (diffInDays <= 14) {
          message = "Faz mais de uma semana que você não escreve.";
        } else if (diffInDays <= 30) {
          message = "Faz mais de duas semanas que você não escreve.";
        } else {
          message = "Faz mais de um mês que você não escreve.";
        }
        
        res.json({
          lastEntry,
          daysAgo: diffInDays,
          message
        });
      } else {
        // Nenhuma entrada encontrada
        res.json({
          lastEntry: null,
          daysAgo: null,
          message: "Você ainda não tem entradas no diário. Comece agora!"
        });
      }
    } catch (error) {
      console.error("Erro ao buscar última entrada do diário:", error);
      res.status(500).json({ message: "Falha ao buscar a última entrada do diário" });
    }
  });

  app.post("/api/journal", async (req, res) => {
    console.log("POST /api/journal - Autenticado:", req.isAuthenticated());
    console.log("POST /api/journal - User:", req.user);
    
    // Verificação de autenticação
    if (!req.isAuthenticated()) {
      console.log("POST /api/journal - Usuário não autenticado, retornando 401");
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    try {
      // Forçar o erro se o user não tiver id para facilitar o debug
      if (!req.user || !(req.user as any).id) {
        console.error("POST /api/journal - Requisição autenticada mas user.id não existe");
        return res.status(500).json({ message: "Erro na sessão do usuário" });
      }
      
      const userId = (req.user as Express.User).id;
      console.log("POST /api/journal - userId:", userId);
      console.log("POST /api/journal - Body:", JSON.stringify(req.body).substring(0, 100) + "...");
      
      // Validar dados de entrada
      const validatedData = insertJournalEntrySchema.parse({
        ...req.body,
        userId
      });
      console.log("POST /api/journal - Dados validados com sucesso");

      // Serviço de IA para categorização já importado no topo do arquivo
      
      // Gerar cor baseada no humor
      let colorHex = "#7dd3fc"; // Azul claro padrão
      switch(validatedData.mood.toLowerCase()) {
        case "feliz":
        case "happy": 
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
          colorHex = "#fda4af"; // Vermelho claro
          break;
        case "calmo":
        case "calm": 
          colorHex = "#a5b4fc"; // Lilás claro
          break;
      }
      
      console.log("POST /api/journal - Chamando serviços de IA");
      // Usar IA para enriquecer a entrada do diário em paralelo
      try {
        const [title, category, summary, tags, position, moodAnalysisResult] = await Promise.all([
          generateJournalTitle(validatedData.content),
          suggestCategory(validatedData.content),
          generateSummary(validatedData.content),
          extractTags(validatedData.content),
          suggestVisualizationPosition(validatedData.content, validatedData.mood),
          analyzeMood(validatedData.content, validatedData.mood)
        ]);
        console.log("POST /api/journal - Serviços de IA concluídos com sucesso");
        console.log("POST /api/journal - Título gerado:", title);

        // Adicionar dados enriquecidos à entrada do diário
        const enrichedData = {
          ...validatedData,
          title, // Usar o título gerado pela IA
          category,
          summary,
          colorHex,
          position,
          tags,
          // Adicionar análise de humor
          moodAnalysis: moodAnalysisResult,
          emotionalTone: moodAnalysisResult.emotionalTone,
          sentimentScore: moodAnalysisResult.sentimentScore,
          dominantEmotions: moodAnalysisResult.dominantEmotions,
          recommendedActions: moodAnalysisResult.recommendedActions
        };
        
        // Criar a entrada do diário com os dados enriquecidos
        console.log("POST /api/journal - Criando entrada no storage");
        const entry = await storage.createJournalEntry(enrichedData);
        console.log("POST /api/journal - Entrada criada com sucesso:", entry.id);
        
        // Atualizar todos os componentes de IA para manter sincronização
        try {
          console.log("POST /api/journal - Atualizando todos os componentes de IA");
          await updateAllAIComponents(userId, 'journal');
          console.log("POST /api/journal - Componentes de IA atualizados com sucesso");
        } catch (aiError) {
          console.error("POST /api/journal - Erro ao atualizar componentes de IA:", aiError);
          // Não falhar a operação principal se a atualização de IA falhar
        }
        
        // Gerar recomendação baseada na entrada do diário
        try {
          const recommendation = await generateRecommendationFromEntry(entry);
          console.log("Recomendação gerada com sucesso:", recommendation?.id);
        } catch (recError) {
          console.error("Erro ao gerar recomendação:", recError);
          // Não falhar a operação principal se a geração de recomendação falhar
        }
        
        res.status(201).json(entry);
      } catch (aiError) {
        console.error("POST /api/journal - Erro com serviços de IA:", aiError);
        
        // Mesmo com erro de IA, ainda salvamos a entrada básica
        const basicData = {
          ...validatedData,
          title: "AUTO", // Usar valor padrão para o título
          category: "Não categorizado",
          summary: "Não foi possível gerar resumo",
          colorHex,
          position: { x: 0, y: 0, z: 0 },
          tags: [],
          // Adicionar valores padrão para campos de análise de humor
          moodAnalysis: { detailedAnalysis: "Análise não disponível devido a um erro" },
          emotionalTone: "Indefinido",
          sentimentScore: 0,
          dominantEmotions: ["Indefinido"],
          recommendedActions: ["Tente novamente mais tarde"]
        };
        
        const entry = await storage.createJournalEntry(basicData);
        console.log("POST /api/journal - Entrada básica criada com sucesso após erro de IA:", entry.id);
        
        res.status(201).json(entry);
      }
    } catch (error) {
      console.error("Erro ao criar entrada de diário:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados de entrada de diário inválidos", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Falha ao criar entrada de diário", error: String(error) });
    }
  });

  app.put("/api/journal/:id", async (req, res) => {
    console.log("PUT /api/journal/:id - Autenticado:", req.isAuthenticated());
    console.log("PUT /api/journal/:id - User:", req.user);
    
    // Verificação de autenticação
    if (!req.isAuthenticated()) {
      console.log("PUT /api/journal/:id - Usuário não autenticado, retornando 401");
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    try {
      // Forçar o erro se o user não tiver id para facilitar o debug
      if (!req.user || !(req.user as any).id) {
        console.error("PUT /api/journal/:id - Requisição autenticada mas user.id não existe");
        return res.status(500).json({ message: "Erro na sessão do usuário" });
      }
      
      const userId = (req.user as Express.User).id;
      const entryId = parseInt(req.params.id);
      console.log(`PUT /api/journal/${entryId} - userId: ${userId}`);
      
      // Verify ownership
      const existingEntry = await storage.getJournalEntry(entryId);
      if (!existingEntry) {
        console.log(`PUT /api/journal/${entryId} - Entrada não encontrada`);
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (existingEntry.userId !== userId) {
        console.log(`PUT /api/journal/${entryId} - Usuário ${userId} não autorizado a editar entrada de ${existingEntry.userId}`);
        return res.status(403).json({ message: "Not authorized to update this entry" });
      }
      
      // Verificar se o conteúdo foi modificado
      const contentChanged = req.body.content && req.body.content !== existingEntry.content;
      const moodChanged = req.body.mood && req.body.mood !== existingEntry.mood;
      console.log(`PUT /api/journal/${entryId} - contentChanged: ${contentChanged}, moodChanged: ${moodChanged}`);
      
      let updateData = { ...req.body };

      try {
        // Só recategoriza se o conteúdo foi alterado
        if (contentChanged) {
          console.log(`PUT /api/journal/${entryId} - Recategorizando com IA devido a mudança de conteúdo`);
          // Serviço de IA para categorização já importado no topo do arquivo
          
          // Usar IA para categorizar e analisar a entrada do diário atualizada
          const [title, category, summary, tags, moodAnalysisResult] = await Promise.all([
            generateJournalTitle(req.body.content),
            suggestCategory(req.body.content),
            generateSummary(req.body.content),
            extractTags(req.body.content),
            analyzeMood(req.body.content, req.body.mood)
          ]);
          
          updateData = {
            ...updateData,
            title, // Usar o título gerado pela IA
            category,
            summary,
            tags,
            // Adicionar análise de humor
            moodAnalysis: moodAnalysisResult,
            emotionalTone: moodAnalysisResult.emotionalTone,
            sentimentScore: moodAnalysisResult.sentimentScore,
            dominantEmotions: moodAnalysisResult.dominantEmotions,
            recommendedActions: moodAnalysisResult.recommendedActions
          };
          
          // Atualizar posição 3D se o conteúdo E o humor foram alterados
          if (moodChanged) {
            console.log(`PUT /api/journal/${entryId} - Atualizando posição 3D com IA`);
            const position = await suggestVisualizationPosition(req.body.content, req.body.mood);
            updateData.position = position;
          }
        }
        
        // Atualizar a cor se o humor foi alterado
        if (moodChanged) {
          console.log(`PUT /api/journal/${entryId} - Atualizando cor devido a mudança de humor`);
          let colorHex = "#7dd3fc"; // Azul claro padrão
          switch(req.body.mood.toLowerCase()) {
            case "feliz":
            case "happy": 
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
              colorHex = "#fda4af"; // Vermelho claro
              break;
            case "calmo":
            case "calm": 
              colorHex = "#a5b4fc"; // Lilás claro
              break;
          }
          
          updateData = {
            ...updateData,
            colorHex
          };
        }
        
        console.log(`PUT /api/journal/${entryId} - Atualizando entrada no storage`);
        const updatedEntry = await storage.updateJournalEntry(entryId, updateData);
        console.log(`PUT /api/journal/${entryId} - Entrada atualizada com sucesso`);
        
        // Atualizar todos os componentes de IA quando uma entrada é modificada
        try {
          console.log(`PUT /api/journal/${entryId} - Atualizando todos os componentes de IA`);
          await updateAllAIComponents(userId, 'journal');
          console.log(`PUT /api/journal/${entryId} - Componentes de IA atualizados com sucesso`);
        } catch (aiSyncError) {
          console.error(`PUT /api/journal/${entryId} - Erro ao atualizar componentes de IA:`, aiSyncError);
          // Não falhar a operação principal se a atualização de IA falhar
        }
        
        // Gerar nova recomendação baseada na entrada atualizada
        try {
          const recommendation = await generateRecommendationFromEntry(updatedEntry);
          console.log(`Recomendação gerada para entrada atualizada ${entryId}:`, recommendation?.id);
        } catch (recError) {
          console.error(`Erro ao gerar recomendação para entrada atualizada ${entryId}:`, recError);
          // Não falhar a operação principal se a geração de recomendação falhar
        }
        
        res.json(updatedEntry);
      } catch (aiError) {
        console.error(`PUT /api/journal/${entryId} - Erro com serviços de IA:`, aiError);
        
        // Mesmo com erro de IA, ainda salvamos as alterações básicas
        const basicUpdate = {
          ...req.body,
        };
        
        if (moodChanged) {
          // Atualizar cor mesmo com erro de IA
          let colorHex = "#7dd3fc"; // Azul claro padrão
          switch(req.body.mood.toLowerCase()) {
            case "feliz":
            case "happy": 
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
              colorHex = "#fda4af"; // Vermelho claro
              break;
            case "calmo":
            case "calm": 
              colorHex = "#a5b4fc"; // Lilás claro
              break;
          }
          basicUpdate.colorHex = colorHex;
        }
        
        const updatedEntry = await storage.updateJournalEntry(entryId, basicUpdate);
        console.log(`PUT /api/journal/${entryId} - Entrada atualizada após erro de IA`);
        res.json(updatedEntry);
      }
    } catch (error) {
      console.error("Erro ao atualizar entrada de diário:", error);
      res.status(500).json({ 
        message: "Falha ao atualizar entrada de diário",
        error: String(error)
      });
    }
  });

  app.delete("/api/journal/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const entryId = parseInt(req.params.id);
      
      // Verify ownership
      const existingEntry = await storage.getJournalEntry(entryId);
      if (!existingEntry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      if (existingEntry.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this entry" });
      }
      
      const success = await storage.deleteJournalEntry(entryId);
      if (success) {
        res.sendStatus(204);
      } else {
        res.status(500).json({ message: "Failed to delete journal entry" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete journal entry" });
    }
  });

  // Self-help tools routes
  app.get("/api/self-help-tools", async (req, res) => {
    try {
      let tools;
      const category = req.query.category as string;
      if (category) {
        tools = await storage.getSelfHelpToolsByCategory(category);
      } else {
        tools = await storage.getAllSelfHelpTools();
      }
      res.json(tools);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch self-help tools" });
    }
  });

  app.get("/api/self-help-tools/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tool = await storage.getSelfHelpTool(id);
      if (!tool) {
        return res.status(404).json({ message: "Self-help tool not found" });
      }
      
      // Atualizar automaticamente o streak quando o usuário acessa uma ferramenta de auto-ajuda
      if (req.isAuthenticated()) {
        const userId = (req.user as Express.User).id;
        await storage.updateDailyStreak(userId, "self-help-tool");
      }
      
      res.json(tool);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch self-help tool" });
    }
  });

  // Sessions (therapy appointments) routes
  app.get("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const sessions = await storage.getSessionsByUser(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = insertSessionSchema.parse({
        ...req.body,
        userId,
        status: "scheduled"
      });
      
      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const sessionId = parseInt(req.params.id);
      
      // Verify ownership
      const existingSession = await storage.getSession(sessionId);
      if (!existingSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (existingSession.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this session" });
      }
      
      const updatedSession = await storage.updateSession(sessionId, req.body);
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Progress tracking routes
  app.get("/api/progress", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const progress = await storage.getProgressTrackingsByUser(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress data" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = insertProgressTrackingSchema.parse({
        ...req.body,
        userId
      });
      
      const progress = await storage.createProgressTracking(validatedData);
      res.status(201).json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create progress record" });
    }
  });

  // Daily tips routes
  app.get("/api/daily-tips", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        console.log("GET /api/daily-tips - Usuário não autenticado");
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const userId = (req.user as Express.User).id;
      
      let tips;
      const category = req.query.category as string;
      if (category) {
        tips = await storage.getDailyTipsByCategory(category);
      } else {
        tips = await storage.getDailyTipsByUser(userId);
      }
      
      res.json(tips);
    } catch (error) {
      console.error("Erro ao buscar dicas diárias:", error);
      res.status(500).json({ message: "Erro ao buscar dicas diárias" });
    }
  });
  
  // Endpoint para gerar uma nova dica diária personalizada
  app.post("/api/daily-tips/generate", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        console.log("POST /api/daily-tips/generate - Usuário não autenticado");
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const userId = (req.user as Express.User).id;
      
      // Gerar uma nova dica personalizada
      console.log(`Gerando dica personalizada para usuário ${userId}`);
      
      // Primeiro sincronizar todos os componentes de IA para ter dados atualizados
      try {
        console.log("POST /api/daily-tips/generate - Sincronizando componentes de IA");
        await updateAllAIComponents(userId, 'daily-tips');
        console.log("POST /api/daily-tips/generate - Sincronização completa");
      } catch (syncError) {
        console.error("POST /api/daily-tips/generate - Erro na sincronização de componentes IA:", syncError);
        // Continuar mesmo com erro na sincronização
      }
      
      const newTip = await generateDailyTip(userId);
      
      if (!newTip) {
        return res.status(500).json({ message: "Erro ao gerar dica diária" });
      }
      
      // Salvar a dica no banco de dados
      const savedTip = await storage.createDailyTip(newTip);
      
      // Criar uma notificação para o usuário
      await storage.createNotification({
        userId,
        type: "DicaDiária",
        title: "Nova Dica Personalizada",
        message: `Uma nova dica sobre "${savedTip.category}" foi gerada para você.`,
        relatedId: savedTip.id
      });
      
      res.json(savedTip);
    } catch (error) {
      console.error("Erro ao gerar dica diária:", error);
      res.status(500).json({ message: "Erro ao gerar dica diária" });
    }
  });
  
  // Endpoint para criar uma nova dica diária
  app.post("/api/daily-tips", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        console.log("POST /api/daily-tips - Usuário não autenticado");
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const userId = (req.user as Express.User).id;
      
      // Adicionar userId ao corpo da requisição
      const tipData = { ...req.body, userId };
      
      // Validar os dados usando o schema
      const validatedData = insertDailyTipSchema.parse(tipData);
      
      // Salvar a dica no banco de dados
      const savedTip = await storage.createDailyTip(validatedData);
      
      res.status(201).json(savedTip);
    } catch (error) {
      console.error("Erro ao criar dica diária:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Erro ao criar dica diária" });
    }
  });

  // Endpoint para buscar dica aleatória ou gerar nova dica diária se não existir
  app.get("/api/daily-tips/random", async (req, res) => {
    try {
      // Verificar autenticação
      let userId;
      if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.substring(7);
        const { activeTokens } = await import('./auth');
        
        const tokenInfo = activeTokens.get(token);
        if (!tokenInfo) {
          console.log("GET /api/daily-tips/random - Token inválido");
        } else {
          userId = tokenInfo.userId;
        }
      }
      
      if (!userId && req.isAuthenticated()) {
        userId = (req.user as Express.User).id;
      }
      
      // Buscar todas as dicas
      const allTips = await storage.getAllDailyTips();
      
      // Filtrar para o usuário, se autenticado
      let userTips = allTips;
      if (userId) {
        // Filtrar por data (apenas dicas das últimas 24 horas)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const recentUserTips = allTips.filter(tip => {
          const tipDate = new Date(tip.createdAt);
          return tip.userId === userId && tipDate > oneDayAgo;
        });
        
        // Se houver dicas recentes do usuário, usar a mais recente
        if (recentUserTips.length > 0) {
          // Ordenar por data (mais recente primeiro)
          recentUserTips.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          return res.json(recentUserTips[0]);
        }
        
        // Se não houver dicas recentes, verificar se o usuário tem entradas no diário
        if (userId) {
          const userIdNumber = typeof userId === 'number' ? userId : userId.userId;
          const journalEntries = await storage.getJournalEntriesByUser(userIdNumber);
          
          // Sincronizar componentes de IA primeiro
          try {
            console.log(`Sincronizando componentes de IA para usuário ${userIdNumber} antes de gerar dica diária`);
            const { updateAllAIComponents } = await import('./ai-integration-service');
            await updateAllAIComponents(userIdNumber, 'daily-tips');
            console.log(`Sincronização de IA concluída para usuário ${userIdNumber}`);
          } catch (syncError) {
            console.error(`Erro na sincronização de IA para usuário ${userIdNumber}:`, syncError);
            // Continuar mesmo com erro na sincronização
          }
          
          // Gerar uma nova dica personalizada
          console.log(`Gerando dica para usuário ${userIdNumber} baseada em ${journalEntries.length} entradas do diário`);
          const newTip = await generateDailyTip(userIdNumber);
          
          if (newTip) {
            // Salvar a dica no banco de dados
            const savedTip = await storage.createDailyTip(newTip);
            
            // Enviar uma notificação ao usuário
            await storage.createNotification({
              userId: userIdNumber,
              type: "DicaDiária",
              title: "Nova Dica Diária",
              message: `Uma nova dica sobre "${savedTip.category}" foi gerada para você.`,
              relatedId: savedTip.id
            });
            
            return res.json(savedTip);
          }
        }
      }
      
      // Caso não tenha gerado dica personalizada, fornecer uma dica genérica
      if (userTips.length > 0) {
        const randomIndex = Math.floor(Math.random() * userTips.length);
        const randomTip = userTips[randomIndex];
        res.json(randomTip);
      } else {
        // Se não houver nenhuma dica no banco, gerar uma dica genérica
        const genericTip = await generateDailyTip(null);
        if (genericTip) {
          const savedTip = await storage.createDailyTip(genericTip);
          res.json(savedTip);
        } else {
          res.status(404).json({ message: "Nenhuma dica disponível" });
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dica diária aleatória:", error);
      res.status(500).json({ message: "Erro ao buscar dica diária aleatória" });
    }
  });
  
  // Daily streak routes
  app.get("/api/streaks", tokenAuth, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const streak = await storage.getDailyStreak(userId);
      
      if (!streak) {
        // Se não houver streak, retorne um objeto vazio mas não 404
        return res.json({
          currentStreak: 0,
          longestStreak: 0,
          lastCheckin: null,
          activities: []
        });
      }
      
      res.json(streak);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch streak data" });
    }
  });
  
  app.post("/api/streaks/checkin", tokenAuth, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const activity = req.body.activity as string;
      
      if (!activity) {
        return res.status(400).json({ message: "Activity is required" });
      }
      
      const streak = await storage.updateDailyStreak(userId, activity);
      res.json(streak);
    } catch (error) {
      res.status(500).json({ message: "Failed to update streak" });
    }
  });
  
  app.post("/api/streaks/reset", tokenAuth, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const streak = await storage.resetDailyStreak(userId);
      res.json(streak);
    } catch (error) {
      res.status(500).json({ message: "Failed to reset streak" });
    }
  });

  // Rota para verificar dicas não lidas
  app.get("/api/daily-tips/unread", async (req, res) => {
    try {
      // Verificar autenticação
      let userId;
      if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.substring(7);
        const { activeTokens } = await import('./auth');
        
        const tokenInfo = activeTokens.get(token);
        if (!tokenInfo) {
          console.log("GET /api/daily-tips/unread - Token inválido");
          return res.status(401).json({ message: "Usuário não autenticado" });
        } else {
          userId = tokenInfo.userId;
        }
      }
      
      if (!userId && req.isAuthenticated()) {
        userId = (req.user as Express.User).id;
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Obter a dica mais recente
      const latestTip = await storage.getLatestDailyTip(userId);
      
      if (!latestTip) {
        return res.json({ hasUnreadTip: false });
      }
      
      // Verificar se a dica já foi visualizada
      const viewed = await storage.hasViewedDailyTip(userId, latestTip.id);
      
      res.json({
        hasUnreadTip: !viewed,
        tipId: latestTip.id
      });
    } catch (error) {
      console.error("Erro ao verificar dicas não lidas:", error);
      res.status(500).json({ message: "Erro ao verificar dicas não lidas" });
    }
  });
  
  // Rota para marcar uma dica como visualizada
  app.post("/api/daily-tips/:id/view", async (req, res) => {
    try {
      // Verificar autenticação
      let userId;
      if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.substring(7);
        const { activeTokens } = await import('./auth');
        
        const tokenInfo = activeTokens.get(token);
        if (!tokenInfo) {
          console.log("POST /api/daily-tips/:id/view - Token inválido");
          return res.status(401).json({ message: "Usuário não autenticado" });
        } else {
          userId = tokenInfo.userId;
        }
      }
      
      if (!userId && req.isAuthenticated()) {
        userId = (req.user as Express.User).id;
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const tipId = parseInt(req.params.id);
      
      if (isNaN(tipId)) {
        return res.status(400).json({ message: "ID da dica inválido" });
      }
      
      // Verificar se a dica existe
      const tip = await storage.getDailyTip(tipId);
      
      if (!tip) {
        return res.status(404).json({ message: "Dica não encontrada" });
      }
      
      // Marcar a dica como visualizada para o usuário
      const viewed = await storage.markDailyTipAsViewed(userId, tipId);
      
      res.json({ success: true, viewed });
    } catch (error) {
      console.error("Erro ao marcar dica como visualizada:", error);
      res.status(500).json({ message: "Erro ao marcar dica como visualizada" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const notifications = await storage.getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  // Content recommendations routes
  app.get("/api/content-recommendations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const recommendations = await storage.getContentRecommendationsByUser(userId);
      res.json(recommendations);
    } catch (error) {
      console.error("Erro ao buscar recomendações de conteúdo:", error);
      res.status(500).json({ message: "Falha ao buscar recomendações de conteúdo" });
    }
  });
  
  app.get("/api/content-recommendations/unread", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const recommendations = await storage.getUnreadContentRecommendationsByUser(userId);
      res.json(recommendations);
    } catch (error) {
      console.error("Erro ao buscar recomendações não lidas:", error);
      res.status(500).json({ message: "Falha ao buscar recomendações não lidas" });
    }
  });
  
  app.post("/api/content-recommendations/generate", tokenAuth, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const limit = req.body.limit || 3;
      
      // Gerar recomendações para o usuário
      const recommendations = await generateRecommendationsForUser(userId, limit);
      
      res.json(recommendations);
    } catch (error) {
      console.error("Erro ao gerar recomendações:", error);
      res.status(500).json({ message: "Falha ao gerar recomendações de conteúdo" });
    }
  });
  
  app.patch("/api/content-recommendations/:id/read", tokenAuth, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const recommendationId = parseInt(req.params.id);
      
      // Verificar se a recomendação existe e pertence ao usuário
      const recommendation = await storage.getContentRecommendation(recommendationId);
      if (!recommendation) {
        return res.status(404).json({ message: "Recomendação não encontrada" });
      }
      
      if (recommendation.userId !== userId) {
        return res.status(403).json({ message: "Não autorizado a atualizar esta recomendação" });
      }
      
      const updatedRecommendation = await storage.markContentRecommendationAsRead(recommendationId);
      res.json(updatedRecommendation);
    } catch (error) {
      console.error("Erro ao marcar recomendação como lida:", error);
      res.status(500).json({ message: "Falha ao marcar recomendação como lida" });
    }
  });

  app.post("/api/notifications", tokenAuth, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = insertNotificationSchema.parse({
        ...req.body,
        userId
      });
      
      const notification = await storage.createNotification(validatedData);
      
      // Enviar notificação em tempo real usando o WebSocket
      sendToUser(userId, {
        type: 'notification',
        notification
      });
      
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid notification data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.patch("/api/notifications/:id/read", tokenAuth, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const notificationId = parseInt(req.params.id);
      
      // Verificar se a notificação existe e pertence ao usuário
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this notification" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", tokenAuth, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const success = await storage.markAllNotificationsAsRead(userId);
      
      if (success) {
        res.json({ message: "All notifications marked as read" });
      } else {
        res.json({ message: "No unread notifications found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", tokenAuth, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = (req.user as Express.User).id;
      const notificationId = parseInt(req.params.id);
      
      // Verificar se a notificação existe e pertence ao usuário
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this notification" });
      }
      
      const success = await storage.deleteNotification(notificationId);
      if (success) {
        res.sendStatus(204);
      } else {
        res.status(500).json({ message: "Failed to delete notification" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Rotas para Voice Check-in
  app.get('/api/voice-checkins', tokenAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }
      
      const checkins = await storage.getVoiceCheckinsByUserId(userId);
      res.json(checkins);
    } catch (error) {
      console.error('Erro ao buscar check-ins de voz:', error);
      res.status(500).json({ message: 'Erro ao buscar check-ins de voz' });
    }
  });

  app.get('/api/voice-checkins/:id', tokenAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }
      
      const checkin = await storage.getVoiceCheckinById(id);
      
      if (!checkin) {
        return res.status(404).json({ message: 'Check-in de voz não encontrado' });
      }
      
      // Verificar se o check-in pertence ao usuário
      if (checkin.userId !== userId) {
        return res.status(403).json({ message: 'Acesso negado a este check-in' });
      }
      
      res.json(checkin);
    } catch (error) {
      console.error('Erro ao buscar check-in de voz:', error);
      res.status(500).json({ message: 'Erro ao buscar check-in de voz' });
    }
  });

  // Configuração do Multer para upload de arquivos
  const audioUploadDir = path.join(__dirname, '../uploads/audio');
  
  // Garantir que o diretório de uploads existe
  if (!fs.existsSync(audioUploadDir)) {
    fs.mkdirSync(audioUploadDir, { recursive: true });
  }
  
  const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, audioUploadDir);
    },
    filename: (req, file, cb) => {
      // Gerar um nome único para o arquivo
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname) || '.webm';
      cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
  });
  
  const audioUpload = multer({ 
    storage: audioStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB máximo
    },
    fileFilter: (req, file, cb) => {
      // Aceitar apenas arquivos de áudio
      if (file.mimetype.startsWith('audio/')) {
        console.log(`Recebendo arquivo de áudio: ${file.originalname}, tipo: ${file.mimetype}, tamanho: ${file.size || 'desconhecido'}`);
        cb(null, true);
      } else {
        console.log(`Arquivo rejeitado: ${file.originalname}, tipo: ${file.mimetype} - não é áudio`);
        cb(null, false);
      }
    }
  });
  
  // Otimização para processamento de imagens
  const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'uploads', 'images');
      
      // Garantir que o diretório existe
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname) || '.jpg';
      cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
  });
  
  const imageUpload = multer({ 
    storage: imageStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
      // Aceitar apenas imagens
      if (file.mimetype.startsWith('image/')) {
        console.log(`Recebendo imagem: ${file.originalname}, tipo: ${file.mimetype}`);
        cb(null, true);
      } else {
        console.log(`Arquivo rejeitado: ${file.originalname}, tipo: ${file.mimetype} - não é imagem`);
        cb(null, false);
      }
    }
  });

  // Rota para upload de áudio genérico (para diário e outros usos)
  app.post('/api/upload/audio', tokenAuth, audioUpload.single('audio'), async (req, res) => {
    try {
      const userId = req.user?.id || parseInt(req.body.userId);
      
      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }
      
      // Verificar se temos um arquivo
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo de áudio enviado' });
      }
      
      // Obter o caminho relativo do arquivo
      const audioUrl = `/uploads/audio/${req.file.filename}`;
      
      console.log(`Upload de áudio concluído: ${audioUrl}, tamanho: ${req.file.size} bytes`);
      
      return res.status(201).json({
        audioUrl,
        message: 'Arquivo de áudio enviado com sucesso'
      });
      
    } catch (error) {
      console.error('Erro ao fazer upload de áudio:', error);
      return res.status(500).json({ 
        message: 'Erro ao fazer upload de áudio',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para upload de imagens (perfil, anexos, etc.)
  app.post('/api/upload/image', tokenAuth, imageUpload.single('image'), async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }
      
      // Verificar se temos um arquivo
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhuma imagem enviada' });
      }
      
      // Obter o caminho relativo do arquivo
      const imageUrl = `/uploads/images/${req.file.filename}`;
      console.log(`Upload de imagem concluído: ${imageUrl}, tamanho: ${req.file.size} bytes`);
      
      // Otimizar para resposta rápida
      return res.status(201).json({
        imageUrl,
        message: 'Imagem enviada com sucesso'
      });
      
    } catch (error) {
      console.error('Erro ao fazer upload de imagem:', error);
      return res.status(500).json({ 
        message: 'Erro ao fazer upload de imagem',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para upload e transcrição de áudio para o diário
  app.post('/api/journal/transcribe', tokenAuth, audioUpload.single('audio'), async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }
      
      // Verificar se temos um arquivo
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo de áudio enviado' });
      }
      
      // Verificar se o diretório de uploads existe, criando-o se necessário
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const audioDir = path.join(uploadsDir, 'audio');
      
      if (!fs.existsSync(uploadsDir)) {
        console.log('Criando diretório de uploads...');
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      if (!fs.existsSync(audioDir)) {
        console.log('Criando diretório de áudio...');
        fs.mkdirSync(audioDir, { recursive: true });
      }
      
      // Obter caminho absoluto do arquivo
      // Obter o caminho correto do arquivo de áudio considerando a estrutura da aplicação
      const relativePath = req.file.path;
      const filePath = relativePath.startsWith('/') ? 
        path.join(__dirname, '..', relativePath) : 
        path.join(process.cwd(), relativePath);
      
      console.log("Caminho do arquivo para processamento:", filePath);
      
      // Verificar explicitamente se o arquivo existe antes de prosseguir
      if (!fs.existsSync(filePath)) {
        console.error("ERRO: Arquivo de áudio não encontrado no caminho:", filePath);
        console.log("Verificando diretório pai:", path.dirname(filePath));
        console.log("Arquivos disponíveis no diretório:", 
          fs.existsSync(path.dirname(filePath)) ? 
            fs.readdirSync(path.dirname(filePath)) : 
            "Diretório não encontrado"
        );
        return res.status(400).json({ 
          message: 'Não foi possível processar o áudio enviado.', 
          error: 'Arquivo não encontrado no servidor'
        });
      }
      console.log(`Caminho completo do arquivo: ${filePath}`);
      console.log(`O arquivo existe? ${fs.existsSync(filePath) ? 'Sim' : 'Não'}`);
      
      // Verificar se o arquivo existe no caminho original
      if (!fs.existsSync(filePath)) {
        // Se não existir, tentar encontrar no diretório de uploads
        const alternativePath = path.join(audioDir, path.basename(req.file.path));
        console.log(`Tentando caminho alternativo: ${alternativePath}`);
        
        if (fs.existsSync(alternativePath)) {
          console.log('Arquivo encontrado no caminho alternativo');
          req.file.path = `uploads/audio/${path.basename(req.file.path)}`;
        } else {
          console.error('Arquivo não encontrado em nenhum dos caminhos esperados');
        }
      }
      
      const audioUrl = `/uploads/audio/${req.file.filename}`;
      const duration = parseInt(req.body.duration || "0");
      const mood = req.body.mood || "neutro";
      
      // Verificar flags para recursos adicionais
      const autoTranscribe = req.body.autoTranscribe === "true";
      const autoCategories = req.body.autoCategories === "true";
      
      console.log(`Transcrição solicitada para o arquivo: ${filePath}`);
      console.log(`Configurações: autoTranscribe=${autoTranscribe}, autoCategories=${autoCategories}`);
      
      // Cronometrar o processamento para avaliação de desempenho
      const startProcessingTime = Date.now();
      
      // Importar a função aprimorada de transcrição e análise
      const { transcribeAndAnalyzeAudio } = await import('./openai-service');
      
      // Usar a nova função otimizada que faz transcrição e análise em paralelo
      console.log("Usando função de transcrição e análise otimizada");
      const result = await transcribeAndAnalyzeAudio(filePath, mood, {
        enhancedAnalysis: autoCategories,
        detectTopics: autoCategories
      });
      
      const processingTimeMs = Date.now() - startProcessingTime;
      console.log(`Transcrição e análise completas em ${(processingTimeMs / 1000).toFixed(2)}s`);
      
      // Gerar um título para a entrada usando IA ou estratégia de fallback
      let entryTitle = "Entrada de Áudio";
      
      // Tentativa de obter título do resultado da transcrição se existir
      if (result.title && typeof result.title === 'string') {
        entryTitle = result.title;
      } 
      // Alternativa: usar a categoria como título
      else if (result.category) {
        entryTitle = `Sobre: ${result.category}`;
      } 
      // Alternativa: usar a primeira tag como título
      else if (result.tags && result.tags.length > 0) {
        entryTitle = `${result.tags[0].charAt(0).toUpperCase() + result.tags[0].slice(1)}`;
      }
      
      // Registrar o título gerado para debug
      console.log("[JournalTitle] Título gerado:", entryTitle);
      
      // Criar entrada básica no diário com a transcrição e título
      const journalEntryBase = {
        userId,
        content: result.transcription,
        mood,
        audioUrl,
        audioDuration: duration,
        tags: result.tags || [],
        title: entryTitle
      };
      
      // Inserir a entrada básica (que vai passar pela validação do InsertJournalEntry)
      const journalEntry = await storage.createJournalEntry(journalEntryBase);
      
      // Atualizar componentes de IA após criar a entrada de áudio no diário
      try {
        console.log("POST /api/journal/voice - Atualizando componentes de IA após transcrição");
        const { updateAllAIComponents } = await import('./ai-integration-service');
        await updateAllAIComponents(userId, 'journal');
        console.log("POST /api/journal/voice - Componentes de IA atualizados com sucesso");
      } catch (aiError) {
        console.error("POST /api/journal/voice - Erro ao atualizar componentes de IA:", aiError);
        // Continuar mesmo com erro na atualização de IA
      }
      
      // Agora atualizamos com os campos de análise que são geralmente preenchidos pela IA
      // Isso evita o problema com o schema de inserção
      if (journalEntry) {
        // Determinar uma cor baseada no tom emocional ou sentimento
        let colorHex = '#4dbb8a'; // Verde padrão (neutro)
        
        if (result.moodAnalysis?.emotionalTone) {
          // Atribuir cores baseadas em emoções
          const emotionColorMap = {
            'positivo': '#4dbb8a', // Verde (alegria/positivo)
            'alegria': '#4dbb8a',
            'negativo': '#e06c75', // Vermelho leve (tristeza/negativo)
            'tristeza': '#e06c75',
            'ansiedade': '#d19a66', // Âmbar (ansiedade/preocupação) 
            'preocupação': '#c678dd', // Roxo (medo/tensão)
            'medo': '#c678dd',
            'raiva': '#e06c75', // Vermelho leve (raiva)
            'neutro': '#61afef', // Azul (neutro/calma)
            'calma': '#61afef',
            'confusão': '#abb2bf', // Cinza (confusão/incerteza)
            'surpresa': '#98c379', // Verde claro (surpresa)
            'esperança': '#98c379' // Verde claro (esperança)
          };
          
          const tone = result.moodAnalysis.emotionalTone.toLowerCase();
          Object.keys(emotionColorMap).forEach(emotion => {
            if (tone.includes(emotion)) {
              // Usando acesso seguro de tipo com as keyof
              const emotionKey = emotion as keyof typeof emotionColorMap;
              colorHex = emotionColorMap[emotionKey];
            }
          });
        }
        
        await storage.updateJournalEntry(journalEntry.id, {
          category: result.category,
          summary: result.summary,
          colorHex,
          emotionalTone: result.moodAnalysis.emotionalTone,
          sentimentScore: result.moodAnalysis.sentimentScore,
          dominantEmotions: result.moodAnalysis.dominantEmotions,
          recommendedActions: result.moodAnalysis.recommendedActions,
          moodAnalysis: {
            detailedAnalysis: result.moodAnalysis.detailedAnalysis,
          }
        });
      }
      
      // Retornar a entrada criada com estatísticas de desempenho e categoria para feedback ao usuário
      res.status(201).json({
        journalEntry,
        transcription: result.transcription,
        category: result.category,
        tags: result.tags,
        processingTimeMs,
        message: 'Áudio transcrito e adicionado ao diário com sucesso'
      });
      
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      return res.status(500).json({ 
        message: 'Erro ao processar o áudio',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para Voice Check-ins
  app.post('/api/voice-checkins', tokenAuth, audioUpload.single('audio'), async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }
      
      // Verificar se temos um arquivo
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo de áudio enviado' });
      }
      
      // Obter o caminho relativo do arquivo
      const audioUrl = `/uploads/audio/${req.file.filename}`;
      const duration = parseInt(req.body.duration || "0");
      
      // Criar o check-in com os dados básicos
      const checkin = await storage.createVoiceCheckin({
        userId,
        audioUrl,
        duration
      });
      
      // Aqui poderia ser integrado com OpenAI para análise do áudio
      // Atualizar o check-in com os dados de análise depois
      
      res.status(201).json(checkin);
    } catch (error) {
      console.error('Erro ao criar check-in de voz:', error);
      if (error instanceof Error && 'name' in error && error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: (error as any).errors 
        });
      }
      res.status(500).json({ message: 'Erro ao criar check-in de voz' });
    }
  });

  // Prontuários Eletrônicos (Medical Records) routes
  
  // Rota para obter prontuários de um paciente específico
  app.get('/api/medical-records/patient/:patientId', tokenAuth, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: 'ID do paciente inválido' });
      }
      
      // Verificar permissão - apenas o próprio paciente ou um terapeuta associado pode ver
      const user = req.user as any;
      let hasPermission = false;
      
      if (user.id === patientId) {
        // É o próprio paciente
        hasPermission = true;
      } else if (user.isTherapist) {
        // É um terapeuta - verificar se tem relação com o paciente
        const sessions = await storage.getSessionsByTherapist(user.id);
        const hasSession = sessions.some(session => session.userId === patientId);
        hasPermission = hasSession;
      }
      
      if (!hasPermission) {
        return res.status(403).json({ message: 'Sem permissão para acessar estes prontuários' });
      }
      
      const records = await storage.getMedicalRecordsByPatientId(patientId);
      
      // Se for o paciente, filtrar apenas registros com accessLevel = "patient"
      const filteredRecords = user.id === patientId
        ? records.filter(record => record.accessLevel === "patient")
        : records;
      
      res.json(filteredRecords);
    } catch (error) {
      console.error('Erro ao buscar prontuários do paciente:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Rota para obter prontuários criados por um terapeuta
  app.get('/api/medical-records/therapist/:therapistId', tokenAuth, async (req, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      if (isNaN(therapistId)) {
        return res.status(400).json({ message: 'ID do terapeuta inválido' });
      }
      
      // Verificar permissão - apenas o próprio terapeuta pode ver todos os seus prontuários
      const user = req.user as any;
      if (!user.isTherapist || user.id !== therapistId) {
        return res.status(403).json({ message: 'Sem permissão para acessar estes prontuários' });
      }
      
      const records = await storage.getMedicalRecordsByTherapistId(therapistId);
      res.json(records);
    } catch (error) {
      console.error('Erro ao buscar prontuários do terapeuta:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Rota para obter um prontuário específico pelo ID
  app.get('/api/medical-records/:id', tokenAuth, async (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      if (isNaN(recordId)) {
        return res.status(400).json({ message: 'ID do prontuário inválido' });
      }
      
      const record = await storage.getMedicalRecordById(recordId);
      if (!record) {
        return res.status(404).json({ message: 'Prontuário não encontrado' });
      }
      
      // Verificar permissão - paciente só pode ver se accessLevel = "patient"
      const user = req.user as any;
      let hasPermission = false;
      
      if (user.id === record.patientId && record.accessLevel === "patient") {
        // É o próprio paciente e o prontuário permite acesso do paciente
        hasPermission = true;
      } else if (user.isTherapist) {
        if (user.id === record.therapistId) {
          // É o terapeuta que criou o prontuário
          hasPermission = true;
        } else if (record.accessLevel === "team") {
          // É outro terapeuta, mas o prontuário permite acesso da equipe
          // Verificar se tem alguma sessão com o paciente
          const sessions = await storage.getSessionsByTherapist(user.id);
          const hasSession = sessions.some(session => session.userId === record.patientId);
          hasPermission = hasSession;
        }
      }
      
      if (!hasPermission) {
        return res.status(403).json({ message: 'Sem permissão para acessar este prontuário' });
      }
      
      res.json(record);
    } catch (error) {
      console.error('Erro ao buscar prontuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Rota para criar um novo prontuário
  app.post('/api/medical-records', tokenAuth, async (req, res) => {
    try {
      // Verificar se o usuário é um terapeuta
      const user = req.user as any;
      if (!user.isTherapist) {
        return res.status(403).json({ message: 'Apenas terapeutas podem criar prontuários' });
      }
      
      const therapistId = user.id;
      
      // Validar dados recebidos
      const recordData = insertMedicalRecordSchema.parse({
        ...req.body,
        therapistId
      });
      
      // Verificar se o paciente existe
      const patient = await storage.getUser(recordData.patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }
      
      // Verificar se há relação terapeuta-paciente (sessões anteriores)
      const sessions = await storage.getSessionsByTherapist(therapistId);
      const hasSession = sessions.some(session => session.userId === recordData.patientId);
      
      if (!hasSession) {
        return res.status(403).json({ message: 'Sem permissão para criar prontuário para este paciente' });
      }
      
      // Criar o prontuário
      const record = await storage.createMedicalRecord(recordData);
      
      // Notificar o paciente se o nível de acesso permitir
      if (record.accessLevel === "patient") {
        await storage.createNotification({
          userId: record.patientId,
          type: "Prontuário",
          title: "Novo prontuário disponível",
          message: `O Dr. ${user.firstName} ${user.lastName} atualizou seu prontuário médico.`,
          relatedId: record.id
        });
      }
      
      res.status(201).json(record);
    } catch (error) {
      console.error('Erro ao criar prontuário:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Rota para atualizar um prontuário existente
  app.patch('/api/medical-records/:id', tokenAuth, async (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      if (isNaN(recordId)) {
        return res.status(400).json({ message: 'ID do prontuário inválido' });
      }
      
      // Verificar se o prontuário existe
      const record = await storage.getMedicalRecordById(recordId);
      if (!record) {
        return res.status(404).json({ message: 'Prontuário não encontrado' });
      }
      
      // Verificar permissão - apenas o terapeuta que criou pode editar
      const user = req.user as any;
      if (!user.isTherapist || user.id !== record.therapistId) {
        return res.status(403).json({ message: 'Sem permissão para editar este prontuário' });
      }
      
      // Atualizar o prontuário
      const updatedRecord = await storage.updateMedicalRecord(recordId, req.body);
      
      // Notificar o paciente se o nível de acesso permitir
      if (updatedRecord?.accessLevel === "patient") {
        await storage.createNotification({
          userId: record.patientId,
          type: "Prontuário",
          title: "Prontuário atualizado",
          message: `O Dr. ${user.firstName} ${user.lastName} atualizou seu prontuário médico.`,
          relatedId: record.id
        });
      }
      
      res.json(updatedRecord);
    } catch (error) {
      console.error('Erro ao atualizar prontuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Rota para excluir um prontuário (soft delete)
  app.delete('/api/medical-records/:id', tokenAuth, async (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      if (isNaN(recordId)) {
        return res.status(400).json({ message: 'ID do prontuário inválido' });
      }
      
      // Verificar se o prontuário existe
      const record = await storage.getMedicalRecordById(recordId);
      if (!record) {
        return res.status(404).json({ message: 'Prontuário não encontrado' });
      }
      
      // Verificar permissão - apenas o terapeuta que criou pode excluir
      const user = req.user as any;
      if (!user.isTherapist || user.id !== record.therapistId) {
        return res.status(403).json({ message: 'Sem permissão para excluir este prontuário' });
      }
      
      // Excluir o prontuário (soft delete)
      const result = await storage.deleteMedicalRecord(recordId);
      
      res.json({ success: result });
    } catch (error) {
      console.error('Erro ao excluir prontuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  const httpServer = createServer(app);

  // Configuração do WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Map para armazenar as conexões ativas
  type ConnectionInfo = {
    ws: WebSocket;
    userId: number | null;
    callId?: string | null;
    userName?: string;
  };
  const activeConnections = new Map<string, ConnectionInfo>();

  wss.on('connection', (ws, req) => {
    console.log('Nova conexão WebSocket estabelecida');
    
    // Gere um ID único para esta conexão
    const connectionId = Date.now().toString() + Math.random().toString(36).substring(2);
    activeConnections.set(connectionId, { ws, userId: null });
    
    // Envie uma mensagem de boas-vindas
    ws.send(JSON.stringify({
      type: 'info',
      message: 'Conexão estabelecida com o servidor'
    }));
    
    // Envie ping a cada 30 segundos para manter a conexão ativa
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(`Enviando ping para conexão ${connectionId}`);
        ws.ping();
      }
    }, 30000);
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Mensagem recebida:', data);
        
        // Processar diferentes tipos de mensagens
        switch (data.type) {
          case 'identify':
            if (data.userId) {
              // Associe o ID do usuário e outras informações a esta conexão
              activeConnections.set(connectionId, { 
                ws, 
                userId: data.userId,
                callId: data.callId || null,
                userName: data.userName || `Usuário ${data.userId}`
              });
              
              console.log(`Usuário ${data.userId} identificado na conexão ${connectionId}, callId: ${data.callId || 'não especificado'}`);
              
              // Informe ao usuário que está conectado
              ws.send(JSON.stringify({
                type: 'connectionStatus',
                status: 'connected',
                userId: data.userId,
                callId: data.callId
              }));
              
              // Notifique outros participantes da mesma chamada sobre o novo participante
              if (data.callId) {
                activeConnections.forEach((conn) => {
                  if (conn.callId === data.callId && conn.userId !== data.userId && conn.ws.readyState === WebSocket.OPEN) {
                    conn.ws.send(JSON.stringify({
                      type: 'participantJoined',
                      userId: data.userId,
                      userName: data.userName || `Usuário ${data.userId}`
                    }));
                  }
                });
              }
            }
            break;
            
          case 'chat':
            // Exemplo: enviar mensagem para um destinatário específico
            if (data.recipientId) {
              // Envie para o destinatário usando nossa função auxiliar
              sendToUser(data.recipientId, {
                type: 'chat',
                senderId: data.senderId,
                senderName: data.senderName,
                message: data.message,
                timestamp: new Date().toISOString()
              });
            }
            break;
            
          case 'notification':
            // Exemplo: enviar notificação para todos os clientes conectados
            broadcastMessage({
              type: 'notification',
              title: data.title,
              message: data.message,
              timestamp: new Date().toISOString()
            });
            break;
            
          case 'videoSignal':
            // Repassar sinais de vídeo para o destinatário específico
            if (data.recipientId && data.signal) {
              console.log(`Repassando sinal de vídeo do usuário ${data.senderId} para ${data.recipientId}`);
              sendToUser(data.recipientId, {
                type: 'videoSignal',
                senderId: data.senderId,
                signal: data.signal
              });
            }
            break;
            
          default:
            console.log('Tipo de mensagem desconhecido:', data.type);
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    ws.on('close', () => {
      console.log(`Conexão ${connectionId} fechada`);
      
      // Notificar outros participantes da mesma chamada que o usuário saiu
      const connectionInfo = activeConnections.get(connectionId);
      if (connectionInfo && connectionInfo.callId && connectionInfo.userId) {
        activeConnections.forEach((conn) => {
          if (conn.callId === connectionInfo.callId && 
              conn.userId !== connectionInfo.userId && 
              conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.send(JSON.stringify({
              type: 'participantLeft',
              userId: connectionInfo.userId,
              userName: connectionInfo.userName
            }));
          }
        });
      }
      
      // Limpar intervalo de ping e remover conexão
      clearInterval(pingInterval);
      activeConnections.delete(connectionId);
    });
    
    // Tratar erros na conexão WebSocket
    ws.on('error', (error) => {
      console.error(`Erro WebSocket na conexão ${connectionId}:`, error);
      clearInterval(pingInterval);
      try {
        activeConnections.delete(connectionId);
      } catch (cleanupError) {
        console.error('Erro ao limpar conexão com erro:', cleanupError);
      }
    });
  });

  // Função para enviar mensagem para todos os clientes conectados
  function broadcastMessage(message: Record<string, any>): void {
    activeConnections.forEach((conn, id) => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(JSON.stringify(message));
      }
    });
  }

  // Função para enviar mensagem para um usuário específico
  function sendToUser(userId: number, message: Record<string, any>): void {
    activeConnections.forEach((conn, id) => {
      if (conn.userId === userId && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(JSON.stringify(message));
      }
    });
  }

  // =================================================================
  // Rotas para videoconferência com Twilio
  // =================================================================
  
  // Middleware para autenticação com token
  app.use('/api/video', tokenAuth);

  // Obter token para entrar na sala
  app.get('/api/video/token', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const sessionId = Number(req.query.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: 'ID de sessão inválido' });
      }
      
      // Verificar se a sessão existe
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
      
      // Verificar se o usuário tem acesso à sessão (é o paciente ou o terapeuta)
      const isPatient = session.userId === req.user.id;
      const isTherapist = session.therapistId === req.user.id;
      
      if (!isPatient && !isTherapist) {
        return res.status(403).json({ error: 'Acesso negado a esta sessão' });
      }
      
      // Formatar nome da sala e identidade do usuário
      const roomName = formatRoomName(sessionId);
      const identity = formatIdentity(req.user);
      
      // Criar ou obter sala
      await createOrGetRoom(roomName);
      
      // Gerar token de acesso
      const token = generateAccessToken(identity, roomName);
      
      res.json({
        token,
        roomName,
        identity,
        role: isTherapist ? 'therapist' : 'patient',
        sessionId,
      });
    } catch (error) {
      console.error('Erro ao gerar token para sala de vídeo:', error);
      res.status(500).json({ error: 'Falha ao gerar acesso para videoconferência' });
    }
  });
  
  // Finalizar uma sessão de vídeo
  app.post('/api/video/complete', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const sessionId = Number(req.body.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: 'ID de sessão inválido' });
      }
      
      // Verificar se a sessão existe
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
      
      // Apenas o terapeuta pode finalizar a sessão
      if (session.therapistId !== req.user.id) {
        return res.status(403).json({ error: 'Apenas o terapeuta pode finalizar a sessão' });
      }
      
      // Formatar nome da sala
      const roomName = formatRoomName(sessionId);
      
      // Completar a sala
      await completeRoom(roomName);
      
      // Atualizar o status da sessão para "Concluída"
      await storage.updateSession(sessionId, { status: 'Concluída' });
      
      res.json({ success: true, message: 'Sessão de vídeo finalizada com sucesso' });
    } catch (error) {
      console.error('Erro ao finalizar sessão de vídeo:', error);
      res.status(500).json({ error: 'Falha ao finalizar a sessão de vídeo' });
    }
  });
  
  // Verificar status de uma sala de vídeo
  app.get('/api/video/status', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const sessionId = Number(req.query.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: 'ID de sessão inválido' });
      }
      
      // Verificar se a sessão existe
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
      
      // Verificar se o usuário tem acesso à sessão
      const isPatient = session.userId === req.user.id;
      const isTherapist = session.therapistId === req.user.id;
      
      if (!isPatient && !isTherapist) {
        return res.status(403).json({ error: 'Acesso negado a esta sessão' });
      }
      
      // Formatar nome da sala e identidade do usuário
      const roomName = formatRoomName(sessionId);
      const identity = formatIdentity(req.user);
      
      try {
        // Criar ou obter sala
        const roomInfo = await createOrGetRoom(roomName);
        
        // Verificar se o outro participante está conectado
        const patientIdentity = formatIdentity({
          id: session.userId,
          isTherapist: false,
          username: 'temp',
          firstName: 'temp',
          lastName: 'temp',
          email: 'temp',
          password: 'temp',
          dateOfBirth: null,
          profilePicture: null,
          bio: null,
          preferences: {},
          createdAt: new Date(),
          therapistId: null
        });
        
        const therapistIdentity = formatIdentity({
          id: session.therapistId,
          isTherapist: true,
          username: 'temp',
          firstName: 'temp',
          lastName: 'temp',
          email: 'temp',
          password: 'temp',
          dateOfBirth: null,
          profilePicture: null,
          bio: null,
          preferences: {},
          createdAt: new Date(),
          therapistId: null
        });
        
        const otherIdentity = isTherapist ? patientIdentity : therapistIdentity;
        const otherIsConnected = await isParticipantConnected(roomName, otherIdentity);
        
        res.json({
          exists: true,
          status: roomInfo.status,
          otherParticipantConnected: otherIsConnected,
          roomName,
          role: isTherapist ? 'therapist' : 'patient'
        });
      } catch (error) {
        // Erro ao obter sala
        console.error('Erro ao obter sala:', error);
        res.json({
          exists: false,
          status: 'not_created',
          otherParticipantConnected: false,
          roomName,
          role: isTherapist ? 'therapist' : 'patient'
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status da sala de vídeo:', error);
      res.status(500).json({ error: 'Falha ao verificar status da videoconferência' });
    }
  });

  // Rotas para gerenciar disponibilidade de terapeuta
  app.get('/api/therapist-availability/:therapistId', async (req, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      if (isNaN(therapistId)) {
        return res.status(400).json({ error: 'ID do terapeuta inválido' });
      }

      const availabilities = await storage.getTherapistAvailabilitiesByTherapist(therapistId);
      res.json(availabilities);
    } catch (error) {
      console.error('Erro ao buscar disponibilidade do terapeuta:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.post('/api/therapist-availability', tokenAuth, async (req, res) => {
    try {
      // Verificar se o usuário é um terapeuta
      const user = req.user as any;
      if (!user.isTherapist) {
        return res.status(403).json({ error: 'Apenas terapeutas podem definir disponibilidade' });
      }

      const therapistId = user.therapistId || user.id;
      
      // Validar dados usando o schema Zod
      let validatedData;
      try {
        validatedData = insertTherapistAvailabilitySchema.parse({
          ...req.body,
          therapistId,
          isRecurring: req.body.isRecurring || false // Garantir que isRecurring tenha um valor padrão
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ error: 'Dados inválidos', details: validationError.errors });
        }
        throw validationError;
      }
      
      const availability = await storage.createTherapistAvailability(validatedData);
      res.status(201).json(availability);
    } catch (error) {
      console.error('Erro ao criar disponibilidade do terapeuta:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.put('/api/therapist-availability/:id', tokenAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID de disponibilidade inválido' });
      }

      // Verificar se o usuário é um terapeuta
      const user = req.user as any;
      if (!user.isTherapist) {
        return res.status(403).json({ error: 'Apenas terapeutas podem atualizar disponibilidade' });
      }

      // Verificar se a disponibilidade existe e pertence a este terapeuta
      const availability = await storage.getTherapistAvailability(id);
      if (!availability) {
        return res.status(404).json({ error: 'Disponibilidade não encontrada' });
      }

      const therapistId = user.therapistId || user.id;
      if (availability.therapistId !== therapistId) {
        return res.status(403).json({ error: 'Você não tem permissão para atualizar esta disponibilidade' });
      }

      const updatedAvailability = await storage.updateTherapistAvailability(id, req.body);
      res.json(updatedAvailability);
    } catch (error) {
      console.error('Erro ao atualizar disponibilidade do terapeuta:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.delete('/api/therapist-availability/:id', tokenAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID de disponibilidade inválido' });
      }

      // Verificar se o usuário é um terapeuta
      const user = req.user as any;
      if (!user.isTherapist) {
        return res.status(403).json({ error: 'Apenas terapeutas podem excluir disponibilidade' });
      }

      // Verificar se a disponibilidade existe e pertence a este terapeuta
      const availability = await storage.getTherapistAvailability(id);
      if (!availability) {
        return res.status(404).json({ error: 'Disponibilidade não encontrada' });
      }

      const therapistId = user.therapistId || user.id;
      if (availability.therapistId !== therapistId) {
        return res.status(403).json({ error: 'Você não tem permissão para excluir esta disponibilidade' });
      }

      await storage.deleteTherapistAvailability(id);
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir disponibilidade do terapeuta:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rotas para gerenciar status de urgência do terapeuta
  app.get('/api/therapist-urgency-status/:therapistId', async (req, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      if (isNaN(therapistId)) {
        return res.status(400).json({ error: 'ID do terapeuta inválido' });
      }

      const status = await storage.getTherapistUrgencyStatus(therapistId);
      if (!status) {
        return res.json({ isAvailableForUrgent: false });
      }

      res.json(status);
    } catch (error) {
      console.error('Erro ao buscar status de urgência do terapeuta:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.get('/api/available-therapists-for-urgent', async (req, res) => {
    try {
      console.log("[DEBUG] Busca terapeutas disponíveis para atendimento de urgência");
      const therapists = await storage.getTherapistsAvailableForEmergency();
      
      console.log("[DEBUG] Encontrados", therapists.length, "terapeutas disponíveis para urgência");
      res.json(therapists);
    } catch (error) {
      console.error('[ERROR] Erro ao buscar terapeutas disponíveis para urgência:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.post('/api/therapist-urgency-status', tokenAuth, async (req, res) => {
    try {
      // Verificar se o usuário é um terapeuta
      const user = req.user as any;
      if (!user.isTherapist) {
        return res.status(403).json({ error: 'Apenas terapeutas podem definir status de urgência' });
      }

      const therapistId = user.therapistId || user.id;
      
      console.log('Requisição recebida para atualizar status de urgência:', {
        userId: user.id,
        therapistId,
        payload: req.body
      });
      
      // Validar dados usando o schema Zod
      let validatedData;
      try {
        // Normalizar o valor booleano caso seja uma string
        const isAvailableForUrgent = typeof req.body.isAvailableForUrgent === 'string'
          ? req.body.isAvailableForUrgent === 'true'
          : Boolean(req.body.isAvailableForUrgent);
          
        validatedData = {
          therapistId,
          isAvailableForUrgent
        };
        
        console.log('Dados validados:', validatedData);
      } catch (validationError) {
        console.error('Erro de validação:', validationError);
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ error: 'Dados inválidos', details: validationError.errors });
        }
        throw validationError;
      }
      
      const status = await storage.updateTherapistUrgencyStatus(therapistId, validatedData);
      console.log('Status atualizado com sucesso:', status);
      res.json(status);
    } catch (error) {
      console.error('Erro ao atualizar status de urgência do terapeuta:', error);
      res.status(500).json({ error: 'Erro interno do servidor', details: String(error) });
    }
  });

  // Endpoint para obter informações sobre a última entrada do diário
  app.get("/api/journal-last-entry", async (req, res) => {
    try {
      // Verificar autenticação
      let userId;
      if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.substring(7);
        const { activeTokens } = await import('./auth');
        
        const tokenInfo = activeTokens.get(token);
        if (!tokenInfo) {
          console.log("GET /api/journal-last-entry - Token inválido");
          return res.status(401).json({ message: "Usuário não autenticado" });
        } else {
          userId = tokenInfo.userId;
        }
      }
      
      if (!userId && req.isAuthenticated()) {
        userId = (req.user as Express.User).id;
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Obter a última entrada do diário do usuário (limite 1)
      const entries = await storage.getJournalEntriesByUser(userId, { limit: 1 });
      const lastEntry = entries.length > 0 ? entries[0] : null;
      
      // Calcular mensagem personalizada
      let message = "Registre emoções";
      let daysAgo = null;
      
      if (lastEntry) {
        const now = new Date();
        const entryDate = new Date(lastEntry.date);
        
        // Calcular a diferença em dias
        const diffTime = Math.abs(now.getTime() - entryDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        daysAgo = diffDays;
        
        // Definir mensagem com base no tempo decorrido
        if (diffDays === 0) {
          message = "Entrada feita hoje";
        } else if (diffDays === 1) {
          message = "Última entrada: ontem";
        } else if (diffDays <= 2) {
          message = `Última entrada: ${diffDays} dias atrás`;
        } else if (diffDays <= 7) {
          message = "Não esqueça de registrar";
        } else if (diffDays <= 14) {
          message = "Faz uma semana...";
        } else {
          message = "Sentimos sua falta!";
        }
      }
      
      // Retornar dados
      return res.json({
        lastEntry,
        daysAgo,
        message
      });
    } catch (error) {
      console.error("Erro ao obter última entrada do diário:", error);
      return res.status(500).json({ message: "Erro ao obter última entrada do diário" });
    }
  });

  return httpServer;
}
