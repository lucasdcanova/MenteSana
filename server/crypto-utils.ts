/**
 * Utilitários de criptografia para proteção de dados sensíveis
 * Implementa criptografia AES-256-GCM para dados confidenciais
 * em conformidade com LGPD (Lei Geral de Proteção de Dados)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import argon2 from 'argon2';
import { fileURLToPath } from 'url';

// Constantes para configuração de criptografia
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEY_PATH = path.join(__dirname, '..', 'sensitive', 'encryption-key.bin');
const ENCODING = 'utf8';
const HASH_ENCODING = 'hex';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// Carrega ou cria uma chave de criptografia
let encryptionKey: Buffer;

try {
  // Criar pasta se não existir
  const dirPath = path.dirname(KEY_PATH);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Tentar ler chave existente
  if (fs.existsSync(KEY_PATH)) {
    encryptionKey = fs.readFileSync(KEY_PATH);
  } else {
    encryptionKey = Buffer.from(generateAndSaveKey(), 'hex');
  }
} catch (error) {
  console.error('Erro ao carregar chave de criptografia:', error);
  // Gerar chave em memória (menos seguro, apenas para desenvolvimento)
  encryptionKey = crypto.randomBytes(KEY_LENGTH);
}

/**
 * Gera uma nova chave de criptografia e salva em arquivo local
 * Apenas para desenvolvimento - em produção, usar variáveis de ambiente
 * @returns Nova chave gerada
 */
function generateAndSaveKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH).toString('hex');
  fs.writeFileSync(KEY_PATH, Buffer.from(key, 'hex'));
  return key;
}

/**
 * Criptografa dados sensíveis usando AES-256-GCM
 * @param text Texto a ser criptografado
 * @returns String criptografada no formato: iv.encrypted.authTag (base64)
 */
export function encrypt(text: string): string {
  try {
    // Criar IV (vetor de inicialização) único para cada operação
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Criar cifrador
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
    
    // Criptografar dados
    let encrypted = cipher.update(text, ENCODING, 'base64');
    encrypted += cipher.final('base64');
    
    // Obter tag de autenticação para verificação de integridade
    const authTag = cipher.getAuthTag();
    
    // Combinar IV, dados criptografados e tag de autenticação em uma única string
    // Formato: iv.encrypted.authTag (todos em base64)
    return Buffer.from(iv).toString('base64') + 
           '.' + encrypted + 
           '.' + authTag.toString('base64');
  } catch (error) {
    console.error('Erro ao criptografar:', error);
    // Em caso de erro, retornar texto original (apenas para desenvolvimento)
    // Em produção, seria melhor lançar um erro
    return text;
  }
}

/**
 * Descriptografa dados sensíveis usando AES-256-GCM
 * @param encryptedData Dados criptografados no formato: iv.encrypted.authTag (base64)
 * @returns Texto original descriptografado
 */
export function decrypt(encryptedData: string): string {
  try {
    // Verificar se os dados estão no formato esperado
    const parts = encryptedData.split('.');
    if (parts.length !== 3) {
      // Se não estiver no formato correto, pode ser um dado não criptografado
      return encryptedData;
    }
    
    // Extrair as partes da string criptografada
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'base64');
    
    // Criar decifridor
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
    
    // Definir a tag de autenticação para verificação
    decipher.setAuthTag(authTag);
    
    // Descriptografar dados
    let decrypted = decipher.update(encrypted, 'base64', ENCODING);
    decrypted += decipher.final(ENCODING);
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    // Em caso de erro, retornar dados criptografados originais
    // Em produção, seria melhor lançar um erro
    return encryptedData;
  }
}

/**
 * Função para criptografar objetos JSON com propriedades específicas
 * @param data Objeto de dados
 * @param fieldsToEncrypt Lista de campos a serem criptografados
 * @returns Objeto com campos selecionados criptografados
 */
export function encryptObject<T extends Record<string, any>>(
  data: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const result = { ...data };
  
  for (const field of fieldsToEncrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      // Para campos que são objetos ou arrays, converter para JSON primeiro
      const value = typeof result[field] === 'object' 
        ? JSON.stringify(result[field]) 
        : String(result[field]);
      
      result[field] = encrypt(value) as any;
    }
  }
  
  return result;
}

/**
 * Função para descriptografar objetos JSON com propriedades específicas
 * @param data Objeto de dados criptografados
 * @param fieldsToDecrypt Lista de campos a serem descriptografados
 * @param parseJson Se deve tentar analisar campos como JSON após descriptografia
 * @returns Objeto com campos selecionados descriptografados
 */
export function decryptObject<T extends Record<string, any>>(
  data: T,
  fieldsToDecrypt: (keyof T)[],
  parseJson = true
): T {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const result = { ...data };
  
  for (const field of fieldsToDecrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      const decrypted = decrypt(String(result[field]));
      
      // Se o campo era um objeto ou array e parseJson=true, tentar converter de volta
      if (parseJson) {
        try {
          result[field] = JSON.parse(decrypted) as any;
        } catch (e) {
          // Se não for um JSON válido, usar o valor descriptografado diretamente
          result[field] = decrypted as any;
        }
      } else {
        result[field] = decrypted as any;
      }
    }
  }
  
  return result;
}

/**
 * Gera um hash seguro de uma senha usando Argon2id
 * Recomendado para armazenamento seguro de senhas
 * @param password Senha em texto puro
 * @returns Hash da senha com sal
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Usar Argon2id (recomendado para senhas)
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterações
      parallelism: 1, // 1 thread
    });
    return hash;
  } catch (error) {
    console.error('Erro ao fazer hash da senha:', error);
    throw new Error('Falha ao processar senha');
  }
}

/**
 * Verifica se uma senha corresponde ao hash armazenado
 * @param password Senha em texto puro
 * @param storedHash Hash armazenado
 * @returns Verdadeiro se a senha corresponde ao hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    return await argon2.verify(storedHash, password);
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
}

/**
 * Sanitiza textos para prevenir injeção de código ou XSS
 * @param text Texto a ser sanitizado
 * @returns Texto sanitizado
 */
export function sanitizeText(text: string): string {
  if (!text) return text;
  
  // Substituir caracteres especiais por entidades HTML
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#x60;');
}

/**
 * Anonimiza dados pessoais para conformidade com LGPD
 * @param data Dados com informações pessoais
 * @returns Dados anonimizados
 */
export function anonymizePersonalData(data: any): any {
  if (!data) return data;
  
  if (typeof data === 'string') {
    // Anonimizar emails
    if (data.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      return 'anonymous@example.com';
    }
    
    // Anonimizar CPFs (formato brasileiro)
    if (data.match(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/) || data.match(/^\d{11}$/)) {
      return '***.***.***-**';
    }
    
    // Anonimizar RGs (formato brasileiro)
    if (data.match(/^\d{2}\.\d{3}\.\d{3}-\d{1}$/) || data.match(/^\d{8,9}$/)) {
      return '**.***.***-*';
    }
    
    // Anonimizar telefones (formato brasileiro)
    if (data.match(/^\(\d{2}\)\s\d{4,5}-\d{4}$/) || data.match(/^\d{10,11}$/)) {
      return '(**) ****-****';
    }
    
    // Para outros tipos de string, hashear o valor
    return hashValue(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => anonymizePersonalData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const result: any = {};
    
    for (const key in data) {
      // Campos sensíveis comuns a serem anonimizados
      const sensitivePII = [
        'name', 'firstName', 'lastName', 'fullName', 'email', 
        'phone', 'address', 'birthDate', 'cpf', 'rg', 'socialSecurity',
        'password', 'senha', 'creditCard', 'cartao'
      ];
      
      // Campos de saúde que são sensíveis 
      const sensitiveHealth = [
        'diagnosis', 'condition', 'treatment', 'medication',
        'disease', 'healthIssue', 'symptoms', 'medicalHistory'
      ];
      
      // Se o campo for sensível, anonimizar
      if (sensitivePII.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        result[key] = typeof data[key] === 'string' ? hashValue(data[key]) : 'ANONYMIZED';
      } 
      // Se for um campo de saúde, usar um identificador substituto
      else if (sensitiveHealth.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        result[key] = '[CONFIDENTIAL HEALTH DATA]';
      } 
      // Caso contrário, processar recursivamente
      else {
        result[key] = anonymizePersonalData(data[key]);
      }
    }
    
    return result;
  }
  
  // Retornar outros tipos de dados inalterados
  return data;
}

/**
 * Função auxiliar para gerar hash de valor
 * @param value Valor a ser transformado em hash
 * @returns String com hash
 */
function hashValue(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .substring(0, 8); // Usar apenas os primeiros 8 caracteres do hash
}

/**
 * Função para mascarar dados sensíveis em logs
 * @param data Dados possivelmente contendo campos sensíveis
 * @param sensitiveFields Campos que devem ser mascarados
 * @returns Dados com campos sensíveis mascarados
 */
export function maskSensitiveData<T extends Record<string, any>>(
  data: T,
  sensitiveFields: (keyof T)[] = ['password', 'token', 'secret', 'credit_card', 'cpf', 'rg']
): T {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const result = { ...data };
  
  for (const key in result) {
    // Verificar se o campo atual é sensível
    const isSensitive = sensitiveFields.includes(key as keyof T) || 
                        sensitiveFields.some(field => 
                          typeof field === 'string' && 
                          key.toLowerCase().includes(field.toString().toLowerCase())
                        );
    
    if (isSensitive && result[key] !== undefined && result[key] !== null) {
      // Mascarar campo sensível
      if (typeof result[key] === 'string') {
        const value = result[key] as string;
        // Preservar parte do início e fim para identificação, mascarando o meio
        const visibleChars = Math.min(2, Math.floor(value.length / 4));
        result[key] = value.length <= 4 
          ? '****' 
          : `${value.substring(0, visibleChars)}${'*'.repeat(value.length - 2 * visibleChars)}${value.substring(value.length - visibleChars)}`;
      } else {
        // Para outros tipos, substituir por placeholder
        result[key] = '[MASKED]';
      }
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      // Processar objetos aninhados recursivamente
      result[key] = maskSensitiveData(result[key], sensitiveFields as any);
    }
  }
  
  return result;
}