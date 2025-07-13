import twilio from 'twilio';

// Definir interfaces para tokens e grants manualmente
interface TokenOptions {
  identity: string;
  ttl?: number;
}

class VideoGrant {
  room?: string;
  
  constructor(options?: { room?: string }) {
    this.room = options?.room;
  }
}

class AccessToken {
  private accountSid: string;
  private keySid: string;
  private secret: string;
  private identity: string;
  private ttl: number;
  private grants: any[] = [];

  constructor(accountSid: string, keySid: string, secret: string, options: TokenOptions) {
    this.accountSid = accountSid;
    this.keySid = keySid;
    this.secret = secret;
    this.identity = options.identity;
    this.ttl = options.ttl || 3600; // 1 hora por padrão
  }

  addGrant(grant: any): void {
    this.grants.push(grant);
  }

  toJwt(): string {
    // Simulação do token JWT para uso em desenvolvimento
    // Em produção, usaríamos a implementação real do Twilio
    const toBase64 = (str: string) => Buffer.from(str).toString('base64');
    
    const header = toBase64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = toBase64(JSON.stringify({
      jti: `${this.keySid}-${now}`,
      iss: this.keySid,
      sub: this.accountSid,
      exp: now + this.ttl,
      grants: {
        identity: this.identity,
        video: this.grants.find(g => g instanceof VideoGrant)
      }
    }));
    
    // Aqui seria feita a assinatura HMAC, mas estamos simulando
    const signature = toBase64(`${this.accountSid}_${this.keySid}_${now}`);
    
    return `${header}.${payload}.${signature}`;
  }
}
import { cacheService } from './cache-service';

// Interface para status de salas
interface RoomStatus {
  exists: boolean;
  status: string;
  participantCount: number;
  roomName: string;
  createdAt?: Date;
}

// Verificar disponibilidade das variáveis de ambiente do Twilio
const isTwilioConfigured = () => {
  return (
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_API_KEY_SID &&
    !!process.env.TWILIO_API_KEY_SECRET
  );
};

// Função de inicialização do cliente Twilio
const initializeTwilioClient = () => {
  if (!isTwilioConfigured()) {
    console.warn('[TWILIO] Configuração incompleta do Twilio. Usando modo simulado.');
    return null;
  }

  try {
    console.log('[TWILIO] Inicializando cliente Twilio...');
    return twilio(
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
      { accountSid: process.env.TWILIO_ACCOUNT_SID }
    );
  } catch (error) {
    console.error('[TWILIO] Erro ao inicializar cliente:', error);
    return null;
  }
};

// Cliente Twilio global
const twilioClient = initializeTwilioClient();

/**
 * Gera token de acesso para salas de vídeo do Twilio
 * @param identity Identificador único do usuário
 * @param roomName Nome da sala a ser acessada
 * @returns Token de acesso ou null em caso de erro
 */
export async function createVideoToken(identity: string, roomName: string): Promise<string | null> {
  try {
    console.log(`[TWILIO] Gerando token para ${identity} na sala ${roomName}`);
    
    // Verificar se o Twilio está configurado
    if (!isTwilioConfigured()) {
      console.warn('[TWILIO] Configuração incompleta do Twilio. Gerando token simulado.');
      return `simulated-token-${Math.random().toString(36).substring(2, 10)}`;
    }
    
    // Usar o SDK real do Twilio para gerar o token
    try {
      // Importa o AccessToken do SDK oficialmente
      const { AccessToken } = twilio.jwt;
      const { VideoGrant } = AccessToken;
      
      // Criar token de acesso usando o SDK oficial
      const token = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_API_KEY_SID!,
        process.env.TWILIO_API_KEY_SECRET!,
        { identity }
      );
      
      // Adicionar permissões de vídeo
      const videoGrant = new VideoGrant({ room: roomName });
      token.addGrant(videoGrant);
      
      // Gerar JWT
      return token.toJwt();
    } catch (tokenError) {
      console.error('[TWILIO] Erro ao gerar token com SDK oficial:', tokenError);
      
      // Fallback para implementação simulada
      console.warn('[TWILIO] Usando geração de token simulada como fallback');
      const simulatedToken = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_API_KEY_SID!,
        process.env.TWILIO_API_KEY_SECRET!,
        { identity }
      );
      
      const videoGrant = new VideoGrant({ room: roomName });
      simulatedToken.addGrant(videoGrant);
      
      return simulatedToken.toJwt();
    }
  } catch (error) {
    console.error('[TWILIO] Erro ao gerar token de vídeo:', error);
    return null;
  }
}

/**
 * Cria uma sala de vídeo do Twilio ou retorna uma existente
 * @param roomName Nome da sala a ser criada
 * @returns Informações da sala ou null em caso de erro
 */
export async function createOrGetRoom(roomName: string): Promise<RoomStatus | null> {
  try {
    // Verificar em cache primeiro
    const cacheKey = `twilio_room_${roomName}`;
    const cachedRoom = cacheService.get<RoomStatus>(cacheKey);
    
    if (cachedRoom) {
      console.log(`[TWILIO] Usando informações em cache para sala ${roomName}`);
      return cachedRoom;
    }
    
    // Se não há cliente Twilio, fornecer uma resposta simulada
    if (!twilioClient) {
      console.warn('[TWILIO] Cliente não inicializado. Usando modo simulado.');
      const simulatedRoom: RoomStatus = {
        exists: true,
        status: 'in-progress',
        participantCount: 0,
        roomName,
        createdAt: new Date()
      };
      
      // Armazenar em cache
      cacheService.set(cacheKey, simulatedRoom, { ttl: 60 * 1000 }); // 1 minuto
      return simulatedRoom;
    }
    
    // Verificar se a sala já existe
    try {
      const room = await twilioClient.video.v1.rooms(roomName).fetch();
      
      // Sala encontrada, retornar status
      const roomStatus: RoomStatus = {
        exists: true,
        status: room.status,
        participantCount: 0,  // Precisaremos de uma chamada separada para obter participantes
        roomName: room.uniqueName,
        createdAt: new Date(room.dateCreated)
      };
      
      // Obter número de participantes
      const participants = await twilioClient.video.v1.rooms(roomName).participants.list();
      roomStatus.participantCount = participants.length;
      
      // Armazenar em cache
      cacheService.set(cacheKey, roomStatus, { ttl: 60 * 1000 }); // 1 minuto
      return roomStatus;
    } catch (error: any) {
      // Sala não existe, vamos criar
      if (error.code === 20404) {
        const newRoom = await twilioClient.video.v1.rooms.create({
          uniqueName: roomName,
          type: 'group',
          recordParticipantsOnConnect: false,
          statusCallback: `${process.env.APP_URL || 'http://localhost:5000'}/api/video/room-status-callback`,
        });
        
        const roomStatus: RoomStatus = {
          exists: true,
          status: newRoom.status,
          participantCount: 0,
          roomName: newRoom.uniqueName,
          createdAt: new Date(newRoom.dateCreated)
        };
        
        // Armazenar em cache
        cacheService.set(cacheKey, roomStatus, { ttl: 60 * 1000 }); // 1 minuto
        return roomStatus;
      }
      
      // Outro erro
      throw error;
    }
  } catch (error) {
    console.error('[TWILIO] Erro ao criar/obter sala:', error);
    return null;
  }
}

/**
 * Encerra uma sala de vídeo do Twilio
 * @param roomName Nome da sala a ser encerrada
 * @returns true se encerrada com sucesso, false caso contrário
 */
export async function endRoom(roomName: string): Promise<boolean> {
  try {
    // Se não há cliente Twilio, fornecer uma resposta simulada
    if (!twilioClient) {
      console.warn('[TWILIO] Cliente não inicializado. Usando modo simulado para encerramento.');
      
      // Invalidar cache
      const cacheKey = `twilio_room_${roomName}`;
      cacheService.delete(cacheKey);
      
      return true;
    }
    
    // Encerrar sala
    await twilioClient.video.v1.rooms(roomName).update({ status: 'completed' });
    
    // Invalidar cache
    const cacheKey = `twilio_room_${roomName}`;
    cacheService.delete(cacheKey);
    
    return true;
  } catch (error) {
    console.error('[TWILIO] Erro ao encerrar sala:', error);
    return false;
  }
}

/**
 * Obter o status de uma sala
 * @param roomName Nome da sala 
 * @returns Status da sala ou null se não encontrada
 */
export async function getRoomStatus(roomName: string): Promise<RoomStatus | null> {
  try {
    // Verificar em cache primeiro
    const cacheKey = `twilio_room_${roomName}`;
    const cachedRoom = cacheService.get<RoomStatus>(cacheKey);
    
    if (cachedRoom) {
      return cachedRoom;
    }
    
    // Se não há cliente Twilio, fornecer uma resposta simulada
    if (!twilioClient) {
      console.warn('[TWILIO] Cliente não inicializado. Usando modo simulado para status.');
      return {
        exists: false,
        status: 'unknown',
        participantCount: 0,
        roomName
      };
    }
    
    // Buscar sala
    try {
      const room = await twilioClient.video.v1.rooms(roomName).fetch();
      const participants = await twilioClient.video.v1.rooms(roomName).participants.list();
      
      const roomStatus: RoomStatus = {
        exists: true,
        status: room.status,
        participantCount: participants.length,
        roomName: room.uniqueName,
        createdAt: new Date(room.dateCreated)
      };
      
      // Armazenar em cache
      cacheService.set(cacheKey, roomStatus, { ttl: 30 * 1000 }); // 30 segundos
      
      return roomStatus;
    } catch (error: any) {
      if (error.code === 20404) {
        // Sala não existe
        return {
          exists: false,
          status: 'not-found',
          participantCount: 0,
          roomName
        };
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[TWILIO] Erro ao obter status da sala:', error);
    return null;
  }
}