import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

// Estrutura para armazenar informações sobre tokens ativos
interface TokenInfo {
  userId: number;
  isTherapist: boolean;
  expiresAt: number; // Timestamp de expiração
  userAgent?: string; // User-Agent do navegador/dispositivo
}

// Sistema de tokens para autenticação alternativa com expiração
export const activeTokens = new Map<string, TokenInfo>();

// Tempo de expiração padrão dos tokens: 7 dias (em milissegundos)
const TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

// Chave secreta para assinatura de tokens
const TOKEN_SECRET = process.env.SESSION_SECRET || "mindwell-mental-health-platform-secret";

/**
 * Gera um token seguro com expiração e assinatura HMAC
 * @param userId ID do usuário
 * @param username Nome de usuário
 * @param isTherapist Flag indicando se o usuário é terapeuta
 * @param userAgent User-Agent do cliente (opcional)
 * @returns Token assinado
 */
export function generateToken(
  userId: number, 
  username: string, 
  isTherapist: boolean = false,
  userAgent?: string
): string {
  // Gerar componentes do token
  const randomPart = randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const expiresAt = timestamp + TOKEN_EXPIRATION_MS;
  
  // Montar payload do token
  const tokenPayload = `${userId}_${username}_${isTherapist ? '1' : '0'}_${timestamp}_${randomPart}`;
  
  // Criar assinatura do token
  const hmac = createHmac('sha256', TOKEN_SECRET);
  hmac.update(tokenPayload);
  const signature = hmac.digest('hex');
  
  // Armazenar informações do token
  const tokenInfo: TokenInfo = { 
    userId, 
    isTherapist, 
    expiresAt,
    userAgent
  };
  
  // Token final: payload + assinatura
  const token = `${tokenPayload}.${signature}`;
  activeTokens.set(token, tokenInfo);
  
  return token;
}

/**
 * Verifica se um token é válido, incluindo sua assinatura e expiração
 * @param token Token a ser verificado
 * @returns { valid: boolean, userId?: number, isTherapist?: boolean }
 */
export function verifyToken(token: string): { 
  valid: boolean, 
  userId?: number, 
  isTherapist?: boolean 
} {
  try {
    // Token de teste fixo para desenvolvimento
    if (token === '1_teste_token_fixo_para_desenvolvimento') {
      console.log('[TokenAuth] Usando token de desenvolvimento para usuário ID 1');
      // Criar informações do token para o usuário de teste
      if (!activeTokens.has(token)) {
        const tokenInfo: TokenInfo = {
          userId: 1,
          isTherapist: false,
          expiresAt: Date.now() + TOKEN_EXPIRATION_MS
        };
        activeTokens.set(token, tokenInfo);
      }
      return { valid: true, userId: 1, isTherapist: false };
    }
    
    // Verificar se o token está no formato correto
    if (!token || !token.includes('.')) {
      return { valid: false };
    }
    
    // Separar payload e assinatura
    const [payload, signature] = token.split('.');
    
    // Recalcular a assinatura para verificar integridade
    const hmac = createHmac('sha256', TOKEN_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    // Verificar se a assinatura corresponde
    if (signature !== expectedSignature) {
      console.log('[TokenAuth] Assinatura inválida para token:', token.substring(0, 10));
      return { valid: false };
    }
    
    // Primeiro tentamos buscar do mapa em memória
    const tokenInfo = activeTokens.get(token);
    
    // Se o token não estiver no mapa, vamos tentar extrair as informações do payload
    if (!tokenInfo) {
      try {
        // Decodificar o payload para extrair informações necessárias
        const payloadParts = payload.split('_');
        if (payloadParts.length >= 5) {
          const userId = parseInt(payloadParts[0]);
          const isTherapist = payloadParts[2] === '1';
          const timestamp = parseInt(payloadParts[3]);
          const expiresAt = timestamp + TOKEN_EXPIRATION_MS;
          
          console.log(`[TokenAuth] Token não encontrado no mapa, reconstruindo: userId=${userId}, isTherapist=${isTherapist}`);
          
          // Verificar expiração
          if (Date.now() > expiresAt) {
            console.log('[TokenAuth] Token reconstruído expirado');
            return { valid: false };
          }
          
          // Colocar no mapa para futuras verificações
          const newTokenInfo: TokenInfo = {
            userId,
            isTherapist,
            expiresAt
          };
          
          activeTokens.set(token, newTokenInfo);
          
          // Token é válido
          return { 
            valid: true, 
            userId, 
            isTherapist 
          };
        }
      } catch (err) {
        console.error('[TokenAuth] Erro ao reconstruir token:', err);
      }
      
      return { valid: false };
    }
    
    // Verificar expiração
    if (Date.now() > tokenInfo.expiresAt) {
      // Remover token expirado
      activeTokens.delete(token);
      return { valid: false };
    }
    
    // Token é válido
    return { 
      valid: true, 
      userId: tokenInfo.userId, 
      isTherapist: tokenInfo.isTherapist 
    };
  } catch (error) {
    console.error('[TokenAuth] Erro ao verificar token:', error);
    return { valid: false };
  }
}

// Middleware creator para autenticação por token
export function createTokenAuthMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Extrair o token do cabeçalho Authorization, aceitando tanto o formato Bearer quanto o token direto
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    
    if (authHeader) {
      token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;
    }
    
    // Log especial para requisições DELETE para ajudar na depuração
    if (req.method === 'DELETE') {
      console.log(`[TokenAuth-DELETE] Middleware chamado para ${req.method} ${req.path}`);
      console.log(`[TokenAuth-DELETE] Cabeçalho de autorização: ${authHeader || 'não encontrado'}`);
      console.log(`[TokenAuth-DELETE] Token extraído: ${token ? `${token.substring(0, 8)}...` : 'nenhum'}`);
    } else {
      console.log(`[TokenAuth] Verificando token para ${req.method} ${req.path}`);
    }
    
    if (!token) {
      console.log(`[TokenAuth] Token não encontrado no cabeçalho Authorization`);
      return next(); // Sem token, continua para autenticação por sessão
    }
    
    // Verificar validade do token
    const { valid, userId, isTherapist: isTherapistFromToken } = verifyToken(token);
    
    if (!valid || !userId) {
      console.log(`[TokenAuth] Token inválido ou expirado: ${token.substring(0, 8)}...`);
      return next(); // Token inválido, continua para autenticação por sessão
    }
    
    console.log(`[TokenAuth] Token válido para usuário ${userId}`);
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log(`[TokenAuth] Usuário ${userId} não encontrado no banco de dados`);
        return next();
      }
      
      // Verificar e corrigir o status de terapeuta
      let isTherapist = user.isTherapist || false;
      
      // Se o usuário tem therapistId, garantir que isTherapist seja true
      if (user.therapistId) {
        isTherapist = true;
        console.log(`[TokenAuth] Usuário ${user.id} tem therapistId ${user.therapistId}, definindo isTherapist como true`);
      }
      
      // Se o token indica que é terapeuta, preservar essa informação
      if (isTherapistFromToken) {
        isTherapist = true;
        console.log(`[TokenAuth] Token indica que usuário ${user.id} é terapeuta, definindo isTherapist como true`);
      }
      
      // Registrar IP e User-Agent para auditoria de segurança
      const userIp = req.ip || req.socket.remoteAddress || 'desconhecido';
      const userAgent = req.headers['user-agent'] || 'desconhecido';
      
      // Em uma implementação completa, registraríamos esses acessos no banco de dados
      // para detecção de atividades suspeitas
      if (process.env.NODE_ENV === 'production') {
        console.log(`[Auditoria] Acesso via token: User ${userId}, IP ${userIp}, UA: ${userAgent}`);
      }
      
      // Criar cópia do usuário com isTherapist correto
      const userWithCorrectFlags = {
        ...user,
        isTherapist: isTherapist
      };
      
      // Definir o user no request como se fosse passport
      (req as any).user = userWithCorrectFlags;
      (req as any).isAuthenticated = () => true;
      console.log(`[TokenAuth] Usuário ${user.id} autenticado via token, isTherapist: ${isTherapist}`);
      
      // Registrar mais informações de depuração
      if (req.path.includes('/api/patients')) {
        console.log(`[TokenAuth] Detalhes do usuário para rota /api/patients:`, {
          id: userWithCorrectFlags.id,
          username: userWithCorrectFlags.username,
          isTherapist: userWithCorrectFlags.isTherapist,
          therapistId: userWithCorrectFlags.therapistId
        });
      }
      return next();
    } catch (error) {
      console.error(`[TokenAuth] Erro ao buscar usuário ${userId}:`, error);
      return next();
    }
  };
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Verificar se a senha armazenada está no formato correto
  if (!stored || !stored.includes('.')) {
    console.error("Formato de senha inválido:", stored);
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  
  if (!hashed || !salt) {
    console.error("Não foi possível extrair hash e salt da senha armazenada");
    return false;
  }
  
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Verificar se os buffers têm o mesmo tamanho
    if (hashedBuf.length !== suppliedBuf.length) {
      console.error(`Erro ao comparar senhas: tamanhos diferentes (hashedBuf: ${hashedBuf.length}, suppliedBuf: ${suppliedBuf.length})`);
      return false;
    }
    
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`Comparação de senha: resultado = ${result}`);
    return result;
  } catch (error) {
    console.error("Erro ao comparar senhas:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "mindwell-mental-health-platform-secret",
    resave: true,  // Importante: true para garantir que a sessão seja sempre salva
    saveUninitialized: false, // Não salvar sessões não inicializadas
    store: storage.sessionStore,
    name: 'mindwell.sid', // Nome específico para evitar conflitos
    cookie: {
      secure: false, // Importante: manter false para desenvolvimento
      httpOnly: true,
      sameSite: 'none', // Configuração mais permissiva para trabalhar em qualquer ambiente
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      path: '/', // Garantir que o cookie esteja disponível em todas as rotas
    },
    rolling: true // Renovar o cookie a cada request
  };
  
  // Ajustar cookie para desenvolvimento local onde sameSite: 'none' requer secure: true
  if (sessionSettings.cookie) {
    // Em ambiente de desenvolvimento local, vamos sobrescrever algumas configurações
    if (process.env.NODE_ENV !== 'production') {
      sessionSettings.cookie.sameSite = 'lax';
    }
  }

  app.set("trust proxy", 1);
  
  // Adicionar middleware de sessão
  app.use(session(sessionSettings));
  
  // Inicializar passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Removemos a proteção CSRF temporariamente para focar no problema de autenticação
  
  // Middleware para debug de autenticação em todas as requisições
  app.use((req, res, next) => {
    // Registrar apenas rotas que não são de recursos estáticos
    if (!req.path.startsWith('/assets/') && 
        !req.path.includes('.js') && 
        !req.path.includes('.css') && 
        !req.path.includes('.ico') &&
        !req.path.includes('.png') &&
        !req.path.includes('.jpg')) {
      
      if (req.isAuthenticated()) {
        console.log(`[AUTH] Rota ${req.method} ${req.path} - Usuário autenticado: ${(req.user as any)?.id}`);
      } else if (req.path.startsWith('/api/')) {
        console.log(`[AUTH] Rota ${req.method} ${req.path} - Não autenticado`);
      }
    }
    next();
  });
  
  console.log("Auth middleware configurado com cookies:", sessionSettings.cookie);

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("Serializando usuário:", user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Desserializando usuário com ID:", id);
      const user = await storage.getUser(id);
      if (user) {
        console.log("Usuário encontrado:", user.id);
        done(null, user);
      } else {
        console.log("Usuário não encontrado para ID:", id);
        done(null, false);
      }
    } catch (error) {
      console.error("Erro ao desserializar usuário:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check for existing username or email
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        console.log(`Tentativa de registro com nome de usuário já utilizado: ${req.body.username}`);
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        console.log(`Tentativa de registro com email já utilizado: ${req.body.email}`);
        return res.status(400).json({ message: "Email já está em uso" });
      }
      
      console.log(`Novo registro de usuário: ${req.body.username}, email: ${req.body.email}`);
      if (req.body.isTherapist === true) {
        console.log("Registrando como terapeuta, especialização:", req.body.specialization);
      }
      
      // Extrair e remover os campos específicos de terapeuta que não fazem parte do schema de usuário
      const { 
        graduationYear, 
        universityName, 
        diplomaFile, 
        licenseNumber, 
        specialization, 
        isTherapist, 
        confirmPassword, 
        terms, 
        ...userData 
      } = req.body;
      
      // Criar objeto de usuário
      let userToCreate = {
        ...userData,
        password: await hashPassword(userData.password),
        isTherapist: isTherapist === true,
      };
      
      let therapistId = null;
      
      // Se estiver se cadastrando como terapeuta, criar o terapeuta primeiro
      if (isTherapist === true) {
        // Verificar se a especialização está presente (simplificado)
        if (!specialization) {
          return res.status(400).json({ 
            message: "Por favor, informe sua especialização."
          });
        }
        
        // Criar um terapeuta primeiro para obter o ID
        const therapist = await storage.createTherapist({
          firstName: userData.firstName,
          lastName: userData.lastName,
          specialization: specialization,
          bio: `${userData.firstName} ${userData.lastName} é especialista em ${specialization}`,
          tags: [specialization],
          email: userData.email,
          graduationYear: graduationYear,
          universityName: universityName,
          licenseNumber: licenseNumber,
          // Outros campos padrão para iniciar o perfil do terapeuta
          availability: { 
            "Segunda": true, 
            "Terça": true, 
            "Quarta": true, 
            "Quinta": true, 
            "Sexta": true, 
            "Sábado": false, 
            "Domingo": false 
          },
          hourlyRate: 100, // Taxa inicial padrão
          rating: null,    // Ainda sem avaliação
          imageUrl: null,  // Sem imagem inicial
        });
        
        console.log(`Terapeuta criado com ID: ${therapist.id}`);
        therapistId = therapist.id;
        
        // Atualizar o objeto de usuário com o ID do terapeuta
        userToCreate.therapistId = therapistId;
      }

      // Criar o usuário no banco de dados
      const user = await storage.createUser(userToCreate);
      console.log(`Usuário criado com ID: ${user.id}`);
      
      // Se for terapeuta e houver diplomaFile, processar o upload (em uma implementação real)
      if (isTherapist && diplomaFile) {
        console.log("Diploma enviado, seria processado em produção");
        // Aqui implementaríamos o upload do diploma para um serviço de armazenamento
        // e atualizaríamos o registro do terapeuta com a URL do documento
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Salvar a sessão explicitamente para garantir persistência
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Erro ao salvar sessão após registro:", saveErr);
            return next(saveErr);
          }
          
          console.log("Sessão salva após registro, ID:", req.sessionID);
          
          // Return user without password
          const { password, ...userWithoutPassword } = user;
          res.status(201).json({
            ...userWithoutPassword,
            therapistId,
            message: isTherapist 
              ? "Conta de terapeuta criada com sucesso! Após a verificação do seu diploma, você terá acesso ao dashboard de terapeuta."
              : "Conta criada com sucesso!"
          });
        });
      });
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res, next) => {
    // Garantir que a sessão seja salva antes de responder
    req.session.save((err) => {
      if (err) {
        console.error("Erro ao salvar sessão após login:", err);
        return next(err);
      }
      // Verificar que o usuário está realmente logado
      if (req.isAuthenticated()) {
        console.log("Usuário autenticado após login:", req.user.id);
        
        // Gerar um token para autenticação alternativa
        const user = req.user as SelectUser;
        const userAgent = req.headers['user-agent'] || 'desconhecido';
        const token = generateToken(user.id, user.username, !!user.isTherapist, userAgent);
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(200).json({
          ...userWithoutPassword,
          token,
          authenticated: true
        });
      } else {
        console.error("Erro: usuário não autenticado após login");
        res.status(500).json({ message: "Erro interno de autenticação" });
      }
    });
  });

  app.post("/api/logout", (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = (req.user as any)?.id;
    
    console.log("Deslogando usuário:", userId);
    
    // Se tiver um token de autenticação, remova-o
    if (token && activeTokens.has(token)) {
      activeTokens.delete(token);
      console.log(`Token removido para usuário ${userId}`);
    }
    
    // Se não estiver autenticado por sessão, já pode retornar
    if (!req.isAuthenticated()) {
      return res.status(200).json({ message: "Logout realizado com sucesso" });
    }
    
    // Fazer logout da sessão
    req.logout((err) => {
      if (err) {
        console.error("Erro ao fazer logout:", err);
        return next(err);
      }
      
      // Destruir a sessão após o logout
      req.session.destroy((err) => {
        if (err) {
          console.error("Erro ao destruir sessão:", err);
          return next(err);
        }
        
        console.log("Sessão destruída com sucesso");
        res.status(200).json({ message: "Logout realizado com sucesso" });
      });
    });
  });

  // Token Authentication
  app.post("/api/token", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      console.log(`Tentativa de login para usuário: "${username}"`);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`Usuário "${username}" não encontrado`);
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      console.log(`Usuário "${username}" encontrado, ID: ${user.id}, verificando senha`);
      
      // Verificar se a senha armazenada tem formato válido
      if (!user.password || !user.password.includes('.')) {
        console.error(`Formato de senha inválido para usuário "${username}": ${user.password}`);
        return res.status(401).json({ message: "Formato de senha inválido, contate o administrador" });
      }
      
      const isPasswordValid = await comparePasswords(password, user.password);
      console.log(`Senha para usuário ${username}: ${isPasswordValid ? 'válida' : 'inválida'}`);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      // Obter o User-Agent para registro
      const userAgent = req.headers['user-agent'] || 'desconhecido';
      
      // Criar um token de autenticação que inclui a flag isTherapist
      const token = generateToken(user.id, user.username, !!user.isTherapist, userAgent);
      
      console.log(`Token gerado para usuário ${user.id}: ${token.substring(0, 8)}...`);
      
      // Return user and token
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json({
        user: userWithoutPassword,
        token,
        message: "Autenticação por token bem-sucedida"
      });
    } catch (error) {
      console.error("Erro na autenticação por token:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Login de terapeuta (demo)
  app.post("/api/login-terapeuta", async (req, res) => {
    try {
      // Buscar um terapeuta na base (usando o primeiro disponível para demonstração)
      const therapists = await storage.getAllTherapists();
      if (!therapists || therapists.length === 0) {
        return res.status(404).json({ message: "Nenhum terapeuta disponível" });
      }
      
      const therapistId = therapists[0].id;
      console.log("Usando terapeuta de ID:", therapistId);
      
      // Buscar o usuário associado ao terapeuta ou criar um se não existir
      let therapistUser = await storage.getUser(therapistId);
      
      // Se não existir um usuário com este ID, criar um novo
      if (!therapistUser) {
        const therapist = therapists[0];
        therapistUser = await storage.createUser({
          username: `terapeuta_${therapist.firstName.toLowerCase()}`,
          password: await hashPassword("senha123"), // Senha padrão para testes
          firstName: therapist.firstName,
          lastName: therapist.lastName,
          email: therapist.email || `${therapist.firstName.toLowerCase()}@mindwell.com`,
          isTherapist: true,
          therapistId: therapist.id,
          dateOfBirth: new Date("1980-01-01"),
          bio: `Perfil de terapeuta ${therapist.firstName} ${therapist.lastName}`,
          preferences: {}
        });
        console.log(`Criado novo usuário para terapeuta ${therapist.id}:`, therapistUser.id);
      }
      
      // Criar token de autenticação para o terapeuta (com flag isTherapist)
      const userAgent = req.headers['user-agent'] || 'desconhecido';
      const token = generateToken(therapistUser.id, therapistUser.username, true, userAgent);
      
      console.log(`Token de terapeuta gerado para usuário ${therapistUser.id}: ${token.substring(0, 8)}...`);
      
      // Retornar o usuário sem a senha e com o token
      const { password, ...userWithoutPassword } = therapistUser;
      res.status(200).json({
        ...userWithoutPassword,
        token,
        authenticated: true,
        isTherapist: true
      });
    } catch (error) {
      console.error("Erro ao processar login de terapeuta:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Middleware para verificar tokens
  const tokenAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    console.log(`[TokenAuth] Verificando token para ${req.method} ${req.path}`);
    
    if (!token) {
      console.log(`[TokenAuth] Token não encontrado no cabeçalho Authorization`);
      return next(); // Sem token, continua para autenticação por sessão
    }
    
    if (!activeTokens.has(token)) {
      console.log(`[TokenAuth] Token inválido ou não encontrado: ${token.substring(0, 8)}...`);
      return next(); // Token inválido, continua para autenticação por sessão
    }
    
    const tokenInfo = activeTokens.get(token);
    if (!tokenInfo) {
      console.log(`[TokenAuth] Informações do token não encontradas`);
      return next();
    }
    
    // Verificar expiração do token
    const agora = Date.now();
    if (tokenInfo.expiresAt < agora) {
      console.log(`[TokenAuth] Token expirado: ${token.substring(0, 8)}...`);
      activeTokens.delete(token); // Remover token expirado
      return next(); // Token expirado, continua para autenticação por sessão
    }
    
    const userId = tokenInfo.userId;
    console.log(`[TokenAuth] Token válido para usuário ${userId}`);
    
    try {
      const user = await storage.getUser(userId!);
      
      if (!user) {
        console.log(`[TokenAuth] Usuário ${userId} não encontrado no banco de dados`);
        return next();
      }
      
      // Log detalhado para depuração
      console.log(`[TokenAuth] Dados completos do usuário:`, JSON.stringify({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isTherapist: user.isTherapist,
        therapistId: user.therapistId
      }));
      
      // Garantir que isTherapist seja um boolean
      const isTherapist = !!user.isTherapist;
      
      // Definir o user no request como se fosse passport
      (req as any).user = {
        ...user,
        isTherapist  // Garantir que isTherapist seja um boolean
      };
      (req as any).isAuthenticated = () => true;
      console.log(`[TokenAuth] Usuário ${user.id} autenticado via token, isTherapist: ${isTherapist}`);
      return next();
    } catch (error) {
      console.error(`[TokenAuth] Erro ao buscar usuário ${userId}:`, error);
      return next();
    }
  };
  
  // Aplicar autenticação por token globalmente em todas as rotas da API 
  // que necessitam de autenticação, exceto login/registro
  app.use('/api', (req, res, next) => {
    // Pular rotas que não precisam de autenticação
    if (req.path === '/login' || 
        req.path === '/register' || 
        req.path === '/login-teste' ||
        req.path === '/login-terapeuta' ||
        req.path === '/token' ||
        req.path === '/daily-tips/random' ||
        req.path === '/therapists') {
      return next();
    }
    
    // Aplicar autenticação por token
    tokenAuth(req, res, next);
  });

  app.get("/api/user", (req, res) => {
    console.log("GET /api/user - isAuthenticated:", req.isAuthenticated ? req.isAuthenticated() : false, 
      "Session ID:", req.sessionID);
    
    // Verificar autenticação via session ou token
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log("GET /api/user - Usuário não autenticado, enviando 401");
      return res.status(401).json({ 
        authenticated: false, 
        message: "Usuário não autenticado" 
      });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    
    // Verificar se existe um token de autenticação
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    console.log("GET /api/user - Enviando dados do usuário:", userWithoutPassword.id);
    
    res.json({
      ...userWithoutPassword,
      authenticated: true,
      sessionID: req.sessionID,
      token: token // Retornar o mesmo token para manter a sessão
    });
  });
}
