/**
 * Serviço de conformidade com a LGPD (Lei Geral de Proteção de Dados)
 * 
 * Este módulo implementa funcionalidades para garantir conformidade com
 * a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) no Brasil.
 * Inclui mecanismos para consentimento, direito ao esquecimento,
 * relatórios de acesso a dados pessoais e outras exigências da lei.
 */

import { storage } from './storage';
import { encrypt, decrypt, anonymizePersonalData, maskSensitiveData } from './crypto-utils';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Tipos de dados para conformidade LGPD

/**
 * Enum com os tipos de consentimento
 */
export enum ConsentType {
  ESSENTIAL = 'essential',           // Funcionamento essencial (não pode recusar)
  MARKETING = 'marketing',           // Comunicações de marketing
  THIRD_PARTY = 'third_party',       // Compartilhamento com terceiros
  ANALYTICS = 'analytics',           // Análise de uso
  PERSONALIZATION = 'personalization' // Personalização de conteúdo
}

/**
 * Interface para registros de atividades de processamento de dados
 */
export interface DataProcessingLog {
  id?: number;
  userId: number;
  action: string; // 'read', 'write', 'delete', 'export', etc.
  dataCategory: string; // 'personal', 'health', 'preferences', etc.
  description: string;
  ipAddress: string;
  timestamp: Date;
  authorized: boolean;
  performedBy?: number; // ID do usuário ou sistema que realizou a ação
}

/**
 * Interface para registro de consentimento do usuário
 */
export interface UserConsent {
  id?: number;
  userId: number;
  consentType: ConsentType;
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
  expiresAt?: Date | null;
  documentVersion?: string; // Versão dos termos aceitos
}

/**
 * Classe de serviço para conformidade com LGPD
 */
export class LGPDComplianceService {
  private static instance: LGPDComplianceService;
  private dataProcessingLogsPath: string;
  
  private constructor() {
    // Inicializar caminhos para logs
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.dataProcessingLogsPath = path.join(__dirname, '..', 'logs', 'data_processing');
    
    // Garantir que os diretórios existam
    this.ensureDirectoriesExist();
  }
  
  /**
   * Obtém a instância única do serviço (padrão Singleton)
   */
  public static getInstance(): LGPDComplianceService {
    if (!LGPDComplianceService.instance) {
      LGPDComplianceService.instance = new LGPDComplianceService();
    }
    return LGPDComplianceService.instance;
  }
  
  /**
   * Cria diretórios necessários para armazenamento de logs
   */
  private ensureDirectoriesExist(): void {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const dirs = [
      path.join(__dirname, '..', 'logs'),
      this.dataProcessingLogsPath
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
  
  /**
   * Registra o consentimento do usuário
   * @param consent Informações sobre o consentimento
   * @returns Registro de consentimento salvo
   */
  public async recordConsent(consent: UserConsent): Promise<UserConsent> {
    try {
      // Se já existe um consentimento deste tipo para este usuário, atualizar
      const existingConsent = await storage.getUserConsentByType(
        consent.userId, 
        consent.consentType
      );
      
      if (existingConsent) {
        return await storage.updateUserConsent(existingConsent.id!, {
          ...consent,
          timestamp: new Date()
        });
      }
      
      // Caso contrário, criar novo
      return await storage.createUserConsent(consent);
    } catch (error) {
      console.error('Erro ao registrar consentimento:', error);
      throw new Error('Falha ao registrar consentimento do usuário');
    }
  }
  
  /**
   * Verifica se o usuário concedeu um determinado tipo de consentimento
   * @param userId ID do usuário
   * @param consentType Tipo de consentimento a verificar
   * @returns Verdadeiro se o consentimento foi concedido e está válido
   */
  public async hasConsent(userId: number, consentType: ConsentType): Promise<boolean> {
    try {
      const consent = await storage.getUserConsentByType(userId, consentType);
      
      if (!consent) return false;
      
      // Verificar se o consentimento está válido (não expirado)
      if (consent.expiresAt && new Date() > consent.expiresAt) {
        return false;
      }
      
      return consent.granted;
    } catch (error) {
      console.error('Erro ao verificar consentimento:', error);
      return false; // Em caso de erro, assumir que não há consentimento
    }
  }
  
  /**
   * Implementa o "direito ao esquecimento" excluindo ou anonimizando dados do usuário
   * @param userId ID do usuário
   * @param requestType Tipo de exclusão: 'full' (completa) ou 'anonymize' (anonimizar)
   * @returns Informações sobre a operação
   */
  public async implementRightToBeForgotten(
    userId: number, 
    requestType: 'full' | 'anonymize' = 'anonymize'
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Registrar a solicitação
      await this.logDataProcessing({
        userId,
        action: 'delete',
        dataCategory: 'all',
        description: `Solicitação de direito ao esquecimento - tipo: ${requestType}`,
        ipAddress: '0.0.0.0', // Seria substituído pelo IP real em produção
        timestamp: new Date(),
        authorized: true,
        performedBy: userId
      });
      
      // 2. Processar conforme o tipo solicitado
      if (requestType === 'full') {
        // Exclusão completa (pode manter dados mínimos exigidos por lei)
        await storage.deleteUser(userId);
        
        return {
          success: true,
          message: 'Conta e dados pessoais excluídos permanentemente'
        };
      } else {
        // Anonimização (mantém a conta, mas remove/anonimiza dados pessoais)
        const user = await storage.getUser(userId);
        
        if (!user) {
          return {
            success: false,
            message: 'Usuário não encontrado'
          };
        }
        
        // Campos a serem anonimizados (ajustar conforme estrutura de dados)
        const anonymizedUser = {
          ...user,
          email: `anonymous_${userId}@example.com`,
          firstName: 'Anonimizado',
          lastName: 'Anonimizado',
          profilePicture: null,
          phone: null,
          address: null,
          bio: null,
          // Manter campos essenciais
          isTherapist: user.isTherapist,
          // Marcar como anonimizado
          anonymized: true
        };
        
        await storage.updateUser(userId, anonymizedUser);
        
        // Anonimizar entradas do diário e outros dados pessoais
        await storage.anonymizeUserData(userId);
        
        return {
          success: true,
          message: 'Dados pessoais anonimizados com sucesso'
        };
      }
    } catch (error) {
      console.error('Erro ao processar direito ao esquecimento:', error);
      return {
        success: false,
        message: 'Falha ao processar a solicitação de exclusão de dados'
      };
    }
  }
  
  /**
   * Gera um relatório de todos os dados pessoais armazenados sobre um usuário
   * @param userId ID do usuário
   * @returns Objeto com todos os dados pessoais do usuário
   */
  public async generatePersonalDataReport(userId: number): Promise<any> {
    try {
      // Registrar o acesso aos dados
      await this.logDataProcessing({
        userId,
        action: 'export',
        dataCategory: 'all',
        description: 'Geração de relatório de dados pessoais',
        ipAddress: '0.0.0.0', // Seria substituído pelo IP real em produção
        timestamp: new Date(),
        authorized: true,
        performedBy: userId
      });
      
      // Coletar todos os dados do usuário
      const user = await storage.getUser(userId);
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      
      // Coletar dados relacionados
      const [
        journalEntries,
        sessions,
        notifications,
        consentRecords,
        voiceCheckins,
        // Outros dados relacionados
      ] = await Promise.all([
        storage.getJournalEntriesByUser(userId),
        storage.getSessionsByUser(userId),
        storage.getNotificationsByUser(userId),
        storage.getUserConsentRecords(userId),
        storage.getVoiceCheckinsByUser(userId),
        // Adicionar outras consultas conforme necessário
      ]);
      
      // Compilar o relatório completo
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth,
          profilePicture: user.profilePicture,
          bio: user.bio,
          preferences: user.preferences,
          isTherapist: user.isTherapist,
          createdAt: user.createdAt,
          // Outros campos do usuário (exceto senha)
        },
        journalEntries,
        sessions,
        notifications,
        consentRecords,
        voiceCheckins,
        dataProcessingLogs: await this.getUserDataProcessingLogs(userId),
        // Adicionar outras categorias de dados conforme necessário
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de dados pessoais:', error);
      throw new Error('Falha ao gerar relatório de dados pessoais');
    }
  }
  
  /**
   * Registra atividades de processamento de dados (para auditoria LGPD)
   * @param log Registro de processamento de dados
   */
  public async logDataProcessing(log: DataProcessingLog): Promise<void> {
    try {
      // Salvar no banco de dados, se disponível
      if (storage.createDataProcessingLog) {
        await storage.createDataProcessingLog(log);
      }
      
      // Também salvar em arquivo para redundância
      const logFileName = path.join(
        this.dataProcessingLogsPath,
        `${new Date().toISOString().split('T')[0]}.log`
      );
      
      // Mascarar dados sensíveis nos logs
      const logEntry = JSON.stringify({
        ...maskSensitiveData(log),
        timestamp: new Date().toISOString()
      });
      
      fs.appendFileSync(logFileName, logEntry + '\n');
    } catch (error) {
      console.error('Erro ao registrar processamento de dados:', error);
      // Continuar sem falhar - logs não devem interromper a operação
    }
  }
  
  /**
   * Obtém registros de processamento de dados de um usuário específico
   * @param userId ID do usuário
   * @returns Lista de registros de processamento
   */
  public async getUserDataProcessingLogs(userId: number): Promise<DataProcessingLog[]> {
    try {
      // Se disponível no storage, usar
      if (storage.getDataProcessingLogsByUser) {
        return await storage.getDataProcessingLogsByUser(userId);
      }
      
      // Caso contrário, ler dos arquivos de log
      // (Implementação simplificada - em produção seria mais robusto)
      const logs: DataProcessingLog[] = [];
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      // Ler logs dos últimos 30 dias
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const logFileName = path.join(this.dataProcessingLogsPath, `${dateStr}.log`);
        
        if (fs.existsSync(logFileName)) {
          const content = fs.readFileSync(logFileName, 'utf8');
          
          content.split('\n').forEach(line => {
            if (!line.trim()) return;
            
            try {
              const log = JSON.parse(line);
              if (log.userId === userId) {
                logs.push(log);
              }
            } catch (e) {
              // Ignorar linhas inválidas
            }
          });
        }
      }
      
      return logs;
    } catch (error) {
      console.error('Erro ao obter logs de processamento de dados:', error);
      return [];
    }
  }
  
  /**
   * Criptografa dados sensíveis para armazenamento
   * @param data Dados a serem criptografados
   * @param fields Campos a serem criptografados
   * @returns Dados com campos selecionados criptografados
   */
  public encryptSensitiveData<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): T {
    return encrypt ? encrypt(data, fields) : data;
  }
  
  /**
   * Descriptografa dados sensíveis
   * @param data Dados com campos criptografados
   * @param fields Campos a serem descriptografados
   * @returns Dados com campos selecionados descriptografados
   */
  public decryptSensitiveData<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): T {
    return decrypt ? decrypt(data, fields) : data;
  }
}

// Exportar instância única do serviço
export const lgpdService = LGPDComplianceService.getInstance();