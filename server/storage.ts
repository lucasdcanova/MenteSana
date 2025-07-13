import { 
  User, InsertUser, 
  Therapist, InsertTherapist,
  Session, InsertSession,
  JournalEntry, InsertJournalEntry,
  SelfHelpTool, InsertSelfHelpTool,
  ProgressTracking, InsertProgressTracking,
  DailyTip, InsertDailyTip,
  Notification, InsertNotification,
  DailyStreak, TherapistReview, InsertTherapistReview,
  ContentRecommendation, InsertContentRecommendation,
  ChatMessage, InsertChatMessage,
  TherapistAvailability, InsertTherapistAvailability,
  TherapistUrgencyStatus, InsertTherapistUrgencyStatus,
  VoiceCheckin, InsertVoiceCheckin,
  MedicalRecord, InsertMedicalRecord,
  TherapistBriefing, InsertTherapistBriefing,
  // Importar tipos relacionados ao pagamento
  PaymentRecord, InsertPaymentRecord,
  // Importar tipos relacionados à LGPD
  UserConsent, InsertUserConsent,
  DataProcessingLog, InsertDataProcessingLog,
  DataSubjectRequest, InsertDataSubjectRequest,
  LegalDocument, InsertLegalDocument,
  // Importar tipos relacionados a chamadas de emergência
  EmergencyCall, InsertEmergencyCall,
  ConsentTypes,
  // Importar esquemas de tabelas
  chatMessages, paymentRecords, therapistUrgencyStatus, contentRecommendations,
  journalEntries, users, therapists, sessions, selfHelpTools, progressTrackings,
  dailyTips, notifications, dailyStreaks, therapistReviews, therapistAvailability,
  voiceCheckins, medicalRecords, therapistBriefings, userConsents, dataProcessingLogs, 
  dataSubjectRequests, legalDocuments, emergencyCalls
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, and, desc, asc, or, isNull, not, gte, lte, like, ilike, inArray, sql, gt } from "drizzle-orm";
import * as schema from "@shared/schema";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Interface para opções de filtro de sessões
export interface SessionQueryOptions {
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  offset?: number;
  limit?: number;
}

export interface IStorage {
  // User related operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(userId: number): Promise<boolean>;
  anonymizeUserData(userId: number): Promise<boolean>;
  
  // Stripe related operations - User
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: number, stripeInfo: { 
    stripeCustomerId?: string, 
    stripeSubscriptionId?: string,
    stripeSubscriptionStatus?: string 
  }): Promise<User | undefined>;
  
  // Payment records operations
  getPaymentRecord(id: number): Promise<PaymentRecord | undefined>;
  getPaymentRecordsByUser(userId: number): Promise<PaymentRecord[]>;
  getPaymentRecordsBySession(sessionId: number): Promise<PaymentRecord[]>;
  getPaymentRecordByStripeId(paymentIntentId: string): Promise<PaymentRecord | undefined>;
  createPaymentRecord(record: InsertPaymentRecord): Promise<PaymentRecord>;
  updatePaymentRecord(id: number, updates: Partial<PaymentRecord>): Promise<PaymentRecord | undefined>;
  updateSessionPaymentStatus(sessionId: number, status: string): Promise<boolean>;
  
  // Therapist related operations
  getTherapist(id: number): Promise<Therapist | undefined>;
  getAllTherapists(): Promise<Therapist[]>;
  getTherapistsAvailableForEmergency(): Promise<Therapist[]>;
  getTherapistsBySpecialization(specialization: string): Promise<Therapist[]>;
  createTherapist(therapist: InsertTherapist): Promise<Therapist>;
  updateTherapist(id: number, therapist: Partial<Therapist>): Promise<Therapist | undefined>;
  getPatientsByTherapistId(therapistId: number): Promise<User[]>;
  
  // LGPD - User Consent related operations
  getUserConsentById(id: number): Promise<UserConsent | undefined>;
  getUserConsentByType(userId: number, consentType: string): Promise<UserConsent | undefined>;
  getUserConsentRecords(userId: number): Promise<UserConsent[]>;
  createUserConsent(consent: InsertUserConsent): Promise<UserConsent>;
  updateUserConsent(id: number, consentData: Partial<UserConsent>): Promise<UserConsent>;
  revokeConsent(userId: number, consentType: string): Promise<boolean>;
  
  // LGPD - Data Processing Logs operations
  getDataProcessingLog(id: number): Promise<DataProcessingLog | undefined>;
  getDataProcessingLogsByUser(userId: number): Promise<DataProcessingLog[]>;
  createDataProcessingLog(log: InsertDataProcessingLog): Promise<DataProcessingLog>;
  
  // LGPD - Data Subject Requests operations
  getDataSubjectRequest(id: number): Promise<DataSubjectRequest | undefined>;
  getDataSubjectRequestsByUser(userId: number): Promise<DataSubjectRequest[]>;
  createDataSubjectRequest(request: InsertDataSubjectRequest): Promise<DataSubjectRequest>;
  updateDataSubjectRequest(id: number, status: string, details?: string): Promise<DataSubjectRequest | undefined>;
  
  // LGPD - Legal Documents operations
  getLegalDocument(id: number): Promise<LegalDocument | undefined>;
  getLegalDocumentByType(type: string, active?: boolean): Promise<LegalDocument | undefined>;
  getLegalDocumentsByType(type: string): Promise<LegalDocument[]>;
  createLegalDocument(document: InsertLegalDocument): Promise<LegalDocument>;
  activateLegalDocument(id: number): Promise<LegalDocument | undefined>;
  deactivateLegalDocument(id: number): Promise<LegalDocument | undefined>;
  
  // Session related operations
  getSession(id: number): Promise<Session | undefined>;
  // Método para contar sessões com filtros
  countSessionsByUser(userId: number, options?: SessionQueryOptions): Promise<number>;
  // Método para buscar sessões com paginação e filtros
  getSessionsByUser(userId: number, options?: SessionQueryOptions): Promise<Session[]>;
  getSessionsByTherapist(therapistId: number): Promise<Session[]>;
  getSessionsByTherapistId(therapistId: number): Promise<Session[]>;
  getSessionsByTherapistAndDate(therapistId: number, date: Date): Promise<Session[]>;
  getSessions(): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<Session>): Promise<Session | undefined>;
  cancelSession(id: number, reason: string): Promise<Session | undefined>;
  confirmSession(id: number, by: 'user' | 'therapist'): Promise<Session | undefined>;
  rescheduleSession(id: number, newDate: Date): Promise<Session | undefined>;
  
  // Journal related operations
  getJournalEntry(id: number): Promise<JournalEntry | undefined>;
  getJournalEntriesByUser(userId: number, options?: { limit?: number }): Promise<JournalEntry[]>;
  getRecentJournalEntries(limit?: number): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, entry: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: number): Promise<boolean>;
  deleteAllJournalEntriesByUser(userId: number): Promise<{ count: number }>;
  
  // Self-help tools related operations
  getSelfHelpTool(id: number): Promise<SelfHelpTool | undefined>;
  getAllSelfHelpTools(): Promise<SelfHelpTool[]>;
  getSelfHelpToolsByCategory(category: string): Promise<SelfHelpTool[]>;
  createSelfHelpTool(tool: InsertSelfHelpTool): Promise<SelfHelpTool>;
  
  // Progress tracking related operations
  getProgressTracking(id: number): Promise<ProgressTracking | undefined>;
  getProgressTrackingsByUser(userId: number): Promise<ProgressTracking[]>;
  createProgressTracking(tracking: InsertProgressTracking): Promise<ProgressTracking>;
  
  // Daily tips related operations
  getDailyTip(id: number): Promise<DailyTip | undefined>;
  getDailyTipById(id: number): Promise<DailyTip | undefined>; // Alias para getDailyTip para consistência
  getAllDailyTips(): Promise<DailyTip[]>;
  getDailyTipsByCategory(category: string): Promise<DailyTip[]>;
  getDailyTipsByUser(userId: number): Promise<DailyTip[]>;
  createDailyTip(tip: InsertDailyTip): Promise<DailyTip>;
  getLatestDailyTip(userId: number): Promise<DailyTip | undefined>;
  getRandomDailyTip(userId: number): Promise<DailyTip | undefined>;
  
  // Operações para dicas visualizadas
  hasViewedDailyTip(userId: number, tipId: number): Promise<boolean>;
  markDailyTipAsViewed(userId: number, tipId: number): Promise<boolean>;
  getViewedDailyTips(userId: number): Promise<number[]>; // Retorna os IDs das dicas visualizadas
  
  // Daily streak related operations
  getDailyStreak(userId: number): Promise<DailyStreak | undefined>;
  createDailyStreak(userId: number): Promise<DailyStreak>;
  updateDailyStreak(userId: number, activity: string): Promise<DailyStreak>;
  resetDailyStreak(userId: number): Promise<DailyStreak>;
  
  // Notification related operations
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Therapist reviews operations
  getTherapistReview(id: number): Promise<TherapistReview | undefined>;
  getTherapistReviewsByTherapist(therapistId: number): Promise<TherapistReview[]>;
  getTherapistReviewsByUser(userId: number): Promise<TherapistReview[]>;
  createTherapistReview(review: InsertTherapistReview): Promise<TherapistReview>;
  updateTherapistReview(id: number, review: Partial<TherapistReview>): Promise<TherapistReview | undefined>;
  deleteTherapistReview(id: number): Promise<boolean>;
  
  // Content recommendation operations
  getContentRecommendation(id: number): Promise<ContentRecommendation | undefined>;
  getContentRecommendationsByUser(userId: number): Promise<ContentRecommendation[]>;
  getContentRecommendationsByCategory(category: string): Promise<ContentRecommendation[]>;
  getUnreadContentRecommendationsByUser(userId: number): Promise<ContentRecommendation[]>;
  createContentRecommendation(recommendation: InsertContentRecommendation): Promise<ContentRecommendation>;
  markContentRecommendationAsRead(id: number): Promise<ContentRecommendation | undefined>;
  deleteContentRecommendation(id: number): Promise<boolean>;
  
  // Medical records operations
  getMedicalRecordById(id: number): Promise<MedicalRecord | null>;
  getMedicalRecordsByPatientId(patientId: number): Promise<MedicalRecord[]>;
  getMedicalRecordsByTherapistId(therapistId: number): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: number, data: Partial<InsertMedicalRecord>): Promise<MedicalRecord | null>;
  deleteMedicalRecord(id: number): Promise<boolean>;
  
  // Chat messages operations
  getChatMessage(id: number): Promise<ChatMessage | undefined>;
  getChatMessagesByUser(userId: number, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteChatMessage(id: number): Promise<boolean>;
  clearChatHistory(userId: number): Promise<boolean>;
  
  // Therapist availability operations
  getTherapistAvailability(id: number): Promise<TherapistAvailability | undefined>;
  getTherapistAvailabilitiesByTherapist(therapistId: number): Promise<TherapistAvailability[]>;
  createTherapistAvailability(availability: InsertTherapistAvailability): Promise<TherapistAvailability>;
  updateTherapistAvailability(id: number, availability: Partial<TherapistAvailability>): Promise<TherapistAvailability | undefined>;
  deleteTherapistAvailability(id: number): Promise<boolean>;
  
  // Therapist urgency status operations
  getTherapistUrgencyStatus(therapistId: number): Promise<TherapistUrgencyStatus | undefined>;
  getAllAvailableTherapistsForUrgent(): Promise<number[]>; // Retorna IDs de terapeutas disponíveis para urgência
  updateTherapistUrgencyStatus(therapistId: number, status: Partial<InsertTherapistUrgencyStatus>): Promise<TherapistUrgencyStatus>;
  
  // Voice check-in operations
  getVoiceCheckinsByUserId(userId: number): Promise<VoiceCheckin[]>;
  getVoiceCheckinById(id: number): Promise<VoiceCheckin | null>;
  createVoiceCheckin(data: InsertVoiceCheckin): Promise<VoiceCheckin>;
  
  // Therapist briefing operations
  getTherapistBriefingById(id: number): Promise<TherapistBriefing | null>;
  getTherapistBriefingsByTherapistId(therapistId: number): Promise<TherapistBriefing[]>;
  getTherapistBriefingsByPatientId(patientId: number): Promise<TherapistBriefing[]>;
  getTherapistBriefingBySessionId(sessionId: number): Promise<TherapistBriefing | null>;
  createTherapistBriefing(data: InsertTherapistBriefing): Promise<TherapistBriefing>;
  markTherapistBriefingAsViewed(id: number): Promise<TherapistBriefing | null>;
  deleteTherapistBriefing(id: number): Promise<boolean>;
  getSessionsBetweenTherapistAndPatient(therapistId: number, patientId: number): Promise<Session[]>;
  
  // Medical Records (Prontuários Eletrônicos) operations
  getMedicalRecordById(id: number): Promise<MedicalRecord | null>;
  getMedicalRecordsByPatientId(patientId: number): Promise<MedicalRecord[]>;
  getMedicalRecordsByTherapistId(therapistId: number): Promise<MedicalRecord[]>;
  getMedicalRecordsBySessionId(sessionId: number): Promise<MedicalRecord | null>;
  createMedicalRecord(data: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: number, data: Partial<MedicalRecord>): Promise<MedicalRecord | null>;
  deleteMedicalRecord(id: number): Promise<boolean>;
  
  // Emergency call operations
  getEmergencyCall(id: number): Promise<EmergencyCall | undefined>;
  getEmergencyCallByRoomName(roomName: string): Promise<EmergencyCall | undefined>;
  getEmergencyCallsByUser(userId: number): Promise<EmergencyCall[]>;
  getEmergencyCallsByTherapist(therapistId: number): Promise<EmergencyCall[]>;
  createEmergencyCall(call: InsertEmergencyCall): Promise<EmergencyCall>;
  updateEmergencyCall(call: Partial<EmergencyCall> & { id: number }): Promise<EmergencyCall | undefined>;
  completeEmergencyCall(id: number, endedAt: Date, feedback?: string, rating?: number): Promise<EmergencyCall | undefined>;
  
  // Session store for authentication
  sessionStore: session.Store;
}

// Implementação da interface IStorage com armazenamento em memória
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private therapists: Map<number, Therapist>;
  private therapySessions: Map<number, Session>;
  private journalEntries: Map<number, JournalEntry>;
  private selfHelpTools: Map<number, SelfHelpTool>;
  private progressTrackings: Map<number, ProgressTracking>;
  private dailyTips: Map<number, DailyTip>;
  private notifications: Map<number, Notification>;
  private dailyStreaks: Map<number, DailyStreak>;
  private therapistReviews: Map<number, TherapistReview>;
  private contentRecommendations: Map<number, ContentRecommendation>;
  private therapistAvailabilities: Map<number, TherapistAvailability>;
  private therapistUrgencyStatuses: Map<number, TherapistUrgencyStatus>;
  private voiceCheckins: Map<number, VoiceCheckin> = new Map();
  private medicalRecords: Map<number, MedicalRecord> = new Map();
  private therapistBriefings: Map<number, TherapistBriefing> = new Map();
  // Payment related storage
  private paymentRecords: Map<number, PaymentRecord> = new Map();
  // LGPD related storage
  private userConsents: Map<number, UserConsent> = new Map();
  private dataProcessingLogs: Map<number, DataProcessingLog> = new Map();
  private dataSubjectRequests: Map<number, DataSubjectRequest> = new Map();
  private legalDocuments: Map<number, LegalDocument> = new Map();
  // Emergency calls
  private emergencyCalls: Map<number, EmergencyCall> = new Map();
  
  userId: number;
  therapistId: number;
  sessionId: number;
  journalEntryId: number;
  toolId: number;
  progressId: number;
  tipId: number;
  notificationId: number;
  dailyStreakId: number;
  availabilityId: number;
  urgencyStatusId: number;
  voiceCheckinId: number;
  medicalRecordId: number;
  therapistBriefingId: number;
  // Payment related IDs
  paymentRecordId: number;
  // LGPD related IDs
  userConsentId: number;
  dataProcessingLogId: number;
  dataSubjectRequestId: number;
  legalDocumentId: number;
  // Emergency call ID
  emergencyCallId: number;
  
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.therapists = new Map();
    this.therapySessions = new Map();
    this.journalEntries = new Map();
    this.selfHelpTools = new Map();
    this.progressTrackings = new Map();
    this.dailyTips = new Map();
    this.notifications = new Map();
    this.dailyStreaks = new Map();
    this.therapistReviews = new Map();
    this.contentRecommendations = new Map();
    this.therapistAvailabilities = new Map();
    this.therapistUrgencyStatuses = new Map();
    this.therapistBriefings = new Map();
    this.paymentRecords = new Map();
    
    this.userId = 1;
    this.therapistId = 1;
    this.sessionId = 1;
    this.journalEntryId = 1;
    this.toolId = 1;
    this.progressId = 1;
    this.tipId = 1;
    this.notificationId = 1;
    this.dailyStreakId = 1;
    this.availabilityId = 1;
    this.urgencyStatusId = 1;
    this.voiceCheckinId = 1;
    this.medicalRecordId = 1;
    this.therapistBriefingId = 1;
    this.paymentRecordId = 1;
    
    // LGPD related counters
    this.userConsentId = 1;
    this.dataProcessingLogId = 1;
    this.dataSubjectRequestId = 1;
    this.legalDocumentId = 1;
    
    // Emergency call counter
    this.emergencyCallId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Criar o usuário de teste com uma senha já hashada
    this.users.set(1, {
      id: 1,
      username: "usuario_teste",
      password: "2d9a3048642d010dbc3e6e4aeef50171bf6f1df6c77adadbfe37f6f2d9c5b41a2ad3ea31536241abd5e3a596dd06a3d85ce0a0c26bf88c27ef41a826fa7fe23c.a6e9ba2c6606c902f86ad3c1f9ebdb69",
      email: "teste@example.com",
      firstName: "Usuário",
      lastName: "Teste",
      createdAt: new Date(),
      dateOfBirth: new Date("1990-01-01"),
      profilePicture: null,
      bio: "Usuário de teste para demonstração da plataforma",
      preferences: {},
      isTherapist: false,
      therapistId: null
    });
    this.userId = 2; // Atualizar o contador para que novos usuários comecem do ID 2
    
    // Initialize with some self-help tools
    this.initializeSelfHelpTools();
    // Initialize with some therapists
    this.initializeTherapists();
    // Initialize with some daily tips
    this.initializeDailyTips();
    // Initialize with some therapy sessions
    this.initializeTherapySessions();
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  // Método para obter pacientes de um terapeuta
  async getPatientsByTherapistId(therapistId: number): Promise<User[]> {
    // Encontrar todos os usuários que fizeram sessões com este terapeuta
    const sessions = await this.getSessionsByTherapist(therapistId);
    const userIds = Array.from(new Set(sessions.map(session => session.userId)));
    
    // Buscar informações de cada usuário
    const patients: User[] = [];
    for (const userId of userIds) {
      const user = await this.getUser(userId);
      if (user) {
        patients.push(user);
      }
    }
    
    return patients;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    
    // Garantir que os campos opcionais sejam inicializados corretamente
    const user: User = {
      ...insertUser,
      id,
      createdAt,
      dateOfBirth: insertUser.dateOfBirth || null,
      profilePicture: insertUser.profilePicture || null,
      bio: insertUser.bio || null,
      preferences: insertUser.preferences || {},
      isTherapist: insertUser.isTherapist || false,
      therapistId: insertUser.therapistId || null
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    // Log detalhado para depuração
    console.log(`[Storage] updateUser - ID: ${id}, campos para atualizar:`, userData);
    console.log(`[Storage] updateUser - Usuário antes da atualização:`, JSON.stringify({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isTherapist: user.isTherapist,
      therapistId: user.therapistId
    }));
    
    // Garantir que isTherapist seja um booleano (se estiver presente)
    if (userData.isTherapist !== undefined) {
      userData = { 
        ...userData, 
        isTherapist: !!userData.isTherapist 
      };
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    
    console.log(`[Storage] updateUser - Usuário após atualização:`, JSON.stringify({
      id: updatedUser.id,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      isTherapist: updatedUser.isTherapist,
      therapistId: updatedUser.therapistId
    }));
    
    return updatedUser;
  }

  // Therapist related methods
  async getTherapist(id: number): Promise<Therapist | undefined> {
    return this.therapists.get(id);
  }

  async getAllTherapists(): Promise<Therapist[]> {
    return Array.from(this.therapists.values());
  }

  async getTherapistsAvailableForEmergency(): Promise<Therapist[]> {
    // Primeiro, busca os IDs de todos os terapeutas disponíveis para urgência
    const availableTherapistIds = await this.getAllAvailableTherapistsForUrgent();
    
    // Em seguida, busca as informações completas de cada terapeuta disponível
    const availableTherapists: Therapist[] = [];
    for (const id of availableTherapistIds) {
      const therapist = await this.getTherapist(id);
      if (therapist) {
        availableTherapists.push(therapist);
      }
    }
    
    return availableTherapists;
  }

  async getTherapistsBySpecialization(specialization: string): Promise<Therapist[]> {
    return Array.from(this.therapists.values()).filter(
      (therapist) => therapist.specialization.toLowerCase().includes(specialization.toLowerCase())
    );
  }
  
  async updateTherapist(id: number, therapistData: Partial<Therapist>): Promise<Therapist | undefined> {
    const therapist = await this.getTherapist(id);
    if (!therapist) return undefined;
    
    const updatedTherapist = { ...therapist, ...therapistData };
    this.therapists.set(id, updatedTherapist);
    return updatedTherapist;
  }

  async createTherapist(insertTherapist: InsertTherapist): Promise<Therapist> {
    const id = this.therapistId++;
    const therapist: Therapist = { 
      ...insertTherapist, 
      id, 
      imageUrl: insertTherapist.imageUrl || null,
      rating: insertTherapist.rating || null,
      location: insertTherapist.location || null,
      hourlyRate: insertTherapist.hourlyRate || null,
      email: insertTherapist.email || null,
      phone: insertTherapist.phone || null
    };
    this.therapists.set(id, therapist);
    return therapist;
  }

  // Session related methods
  async getSession(id: number): Promise<Session | undefined> {
    return this.therapySessions.get(id);
  }
  
  // Implementação para MemStorage dos novos métodos de sessão
  async getSessionsByTherapistAndDate(therapistId: number, date: Date): Promise<Session[]> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return Array.from(this.therapySessions.values()).filter(session => {
      const sessionDate = new Date(session.scheduledFor);
      const sessionDateStr = sessionDate.toISOString().split('T')[0];
      
      return session.therapistId === therapistId && sessionDateStr === dateStr;
    });
  }
  
  async cancelSession(id: number, reason: string): Promise<Session | undefined> {
    const session = this.therapySessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: Session = {
      ...session,
      status: "Cancelada",
      // Store cancellation reason in notes field instead
      notes: session.notes 
        ? `${session.notes} | Cancelamento: ${reason}`
        : `Cancelamento: ${reason}`
    };
    
    this.therapySessions.set(id, updatedSession);
    return updatedSession;
  }
  
  async confirmSession(id: number, by: 'user' | 'therapist'): Promise<Session | undefined> {
    const session = this.therapySessions.get(id);
    if (!session) return undefined;
    
    // No novo esquema, simplesmente marcamos a sessão como confirmada diretamente
    // pois não temos mais os campos confirmedByUser e confirmedByTherapist
    const updatedSession: Session = {
      ...session,
      status: "Confirmada",
      notes: session.notes ? 
        `${session.notes} | Confirmada por: ${by === 'user' ? 'paciente' : 'terapeuta'}` :
        `Confirmada por: ${by === 'user' ? 'paciente' : 'terapeuta'}`
    };
    
    this.therapySessions.set(id, updatedSession);
    return updatedSession;
  }
  
  async rescheduleSession(id: number, newDate: Date): Promise<Session | undefined> {
    const session = this.therapySessions.get(id);
    if (!session) return undefined;
    
    // Marcar a sessão atual como reagendada
    const updatedSession: Session = {
      ...session,
      status: "Reagendada"
    };
    this.therapySessions.set(id, updatedSession);
    
    // Criar nova sessão
    const newSessionId = this.sessionId++;
    const newSession: Session = {
      id: newSessionId,
      createdAt: new Date(),
      userId: session.userId,
      therapistId: session.therapistId,
      therapistName: session.therapistName,
      scheduledFor: newDate,
      duration: session.duration,
      status: "Confirmada", // Definir status como confirmada diretamente
      notes: session.notes ? `${session.notes} | Reagendada da sessão #${session.id}` : `Reagendada da sessão #${session.id}`,
      type: session.type
    };
    
    this.therapySessions.set(newSessionId, newSession);
    return newSession;
  }

  async getSessionsByUser(userId: number): Promise<Session[]> {
    return Array.from(this.therapySessions.values()).filter(
      (session) => session.userId === userId
    );
  }
  
  async getSessionsByTherapistId(therapistId: number): Promise<Session[]> {
    return this.getSessionsByTherapist(therapistId);
  }
  
  // Implementação do método getSessions
  async getSessions(): Promise<Session[]> {
    return Array.from(this.therapySessions.values());
  }

  async getSessionsByTherapist(therapistId: number): Promise<Session[]> {
    return Array.from(this.therapySessions.values()).filter(
      (session) => session.therapistId === therapistId
    );
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.sessionId++;
    const createdAt = new Date();
    const session: Session = { 
      ...insertSession, 
      id,
      createdAt,
      notes: insertSession.notes || null,
      therapistName: insertSession.therapistName || null,
      scheduledFor: insertSession.scheduledFor instanceof Date 
        ? insertSession.scheduledFor 
        : new Date(insertSession.scheduledFor)
    };
    this.therapySessions.set(id, session);
    return session;
  }

  async updateSession(id: number, sessionData: Partial<Session>): Promise<Session | undefined> {
    const session = await this.getSession(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...sessionData };
    this.therapySessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: number): Promise<boolean> {
    return this.therapySessions.delete(id);
  }

  // Journal related methods
  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    return this.journalEntries.get(id);
  }

  async getJournalEntriesByUser(userId: number, options?: { limit?: number }): Promise<JournalEntry[]> {
    let entries = Array.from(this.journalEntries.values())
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by most recent
    
    // Aplicar limite se especificado
    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }
    
    return entries;
  }
  
  async getRecentJournalEntries(limit: number = 10): Promise<JournalEntry[]> {
    // Obter todas as entradas de diário, ordenadas por data (mais recentes primeiro)
    const entries = Array.from(this.journalEntries.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Aplicar limite
    return entries.slice(0, limit);
  }

  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const id = this.journalEntryId++;
    const date = new Date();
    const entry: JournalEntry = {
      ...insertEntry,
      id,
      date,
      category: null,
      summary: null,
      position: null,
      tags: insertEntry.tags || null,
      colorHex: insertEntry.colorHex || null,
      moodAnalysis: null,
      emotionalTone: null,
      sentimentScore: null,
      dominantEmotions: null,
      recommendedActions: null
    };
    this.journalEntries.set(id, entry);
    return entry;
  }

  async updateJournalEntry(id: number, entryData: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    const entry = await this.getJournalEntry(id);
    if (!entry) return undefined;
    
    const updatedEntry = { ...entry, ...entryData };
    this.journalEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    return this.journalEntries.delete(id);
  }

  // Self-help tools related methods
  async getSelfHelpTool(id: number): Promise<SelfHelpTool | undefined> {
    return this.selfHelpTools.get(id);
  }

  async getAllSelfHelpTools(): Promise<SelfHelpTool[]> {
    return Array.from(this.selfHelpTools.values());
  }

  async getSelfHelpToolsByCategory(category: string): Promise<SelfHelpTool[]> {
    return Array.from(this.selfHelpTools.values()).filter(
      (tool) => tool.category.toLowerCase() === category.toLowerCase()
    );
  }

  async createSelfHelpTool(insertTool: InsertSelfHelpTool): Promise<SelfHelpTool> {
    const id = this.toolId++;
    const tool: SelfHelpTool = { 
      ...insertTool, 
      id,
      imageUrl: insertTool.imageUrl || null
    };
    this.selfHelpTools.set(id, tool);
    return tool;
  }

  // Progress tracking related methods
  async getProgressTracking(id: number): Promise<ProgressTracking | undefined> {
    return this.progressTrackings.get(id);
  }

  async getProgressTrackingsByUser(userId: number): Promise<ProgressTracking[]> {
    return Array.from(this.progressTrackings.values())
      .filter((tracking) => tracking.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by most recent
  }

  async createProgressTracking(insertTracking: InsertProgressTracking): Promise<ProgressTracking> {
    const id = this.progressId++;
    const date = new Date();
    const tracking: ProgressTracking = { ...insertTracking, id, date };
    this.progressTrackings.set(id, tracking);
    return tracking;
  }

  // Daily tips related methods
  async getDailyTip(id: number): Promise<DailyTip | undefined> {
    return this.dailyTips.get(id);
  }
  
  async getDailyTipById(id: number): Promise<DailyTip | undefined> {
    return this.getDailyTip(id);
  }

  async getAllDailyTips(): Promise<DailyTip[]> {
    return Array.from(this.dailyTips.values());
  }

  async getDailyTipsByCategory(category: string): Promise<DailyTip[]> {
    return Array.from(this.dailyTips.values()).filter(
      (tip) => tip.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  async getDailyTipsByUser(userId: number): Promise<DailyTip[]> {
    return Array.from(this.dailyTips.values()).filter(
      (tip) => tip.userId === userId
    );
  }
  
  async getLatestDailyTip(userId: number): Promise<DailyTip | undefined> {
    // Obter todas as dicas diárias e ordená-las por data (decrescente)
    const tips = Array.from(this.dailyTips.values())
      .filter(tip => tip.userId === userId || tip.userId === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Retornar a mais recente
    return tips.length > 0 ? tips[0] : undefined;
  }
  
  async getRandomDailyTip(userId: number): Promise<DailyTip | undefined> {
    // Obter todas as dicas diárias aplicáveis ao usuário
    const tips = Array.from(this.dailyTips.values())
      .filter(tip => tip.userId === userId || tip.userId === null);
    
    if (tips.length === 0) {
      return undefined;
    }
    
    // Selecionar uma dica aleatória
    const randomIndex = Math.floor(Math.random() * tips.length);
    return tips[randomIndex];
  }
  
  // ViewedDailyTips - estrutura para armazenar dicas visualizadas (userId -> Set<tipId>)
  private viewedDailyTips: Map<number, Set<number>> = new Map();
  
  async hasViewedDailyTip(userId: number, tipId: number): Promise<boolean> {
    const userViewed = this.viewedDailyTips.get(userId);
    if (!userViewed) {
      return false;
    }
    return userViewed.has(tipId);
  }
  
  async markDailyTipAsViewed(userId: number, tipId: number): Promise<boolean> {
    // Verificar se a dica existe
    const tip = await this.getDailyTip(tipId);
    if (!tip) {
      return false;
    }
    
    // Obter ou criar conjunto de dicas visualizadas para o usuário
    let userViewed = this.viewedDailyTips.get(userId);
    if (!userViewed) {
      userViewed = new Set<number>();
      this.viewedDailyTips.set(userId, userViewed);
    }
    
    // Marcar como visualizada
    userViewed.add(tipId);
    return true;
  }
  
  async getViewedDailyTips(userId: number): Promise<number[]> {
    const userViewed = this.viewedDailyTips.get(userId);
    if (!userViewed) {
      return [];
    }
    return Array.from(userViewed);
  }

  async createDailyTip(insertTip: InsertDailyTip): Promise<DailyTip> {
    const id = this.tipId++;
    const now = new Date();
    const tip: DailyTip = { 
      ...insertTip, 
      id,
      createdAt: insertTip.createdAt || now,
      userId: insertTip.userId || null,
      tags: insertTip.tags || null,
      sources: insertTip.sources || null,
      evidenceLevel: insertTip.evidenceLevel || null,
      imageUrl: insertTip.imageUrl || null,
      aiGenerated: insertTip.aiGenerated !== undefined ? insertTip.aiGenerated : true
    };
    this.dailyTips.set(id, tip);
    return tip;
  }

  // Daily streak related methods
  async getDailyStreak(userId: number): Promise<DailyStreak | undefined> {
    return Array.from(this.dailyStreaks.values()).find(
      (streak) => streak.userId === userId
    );
  }

  async createDailyStreak(userId: number): Promise<DailyStreak> {
    const id = this.dailyStreakId++;
    const now = new Date();
    const streak: DailyStreak = {
      id,
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastCheckin: now,
      activities: [],
      updatedAt: now
    };
    this.dailyStreaks.set(id, streak);
    return streak;
  }

  async updateDailyStreak(userId: number, activity: string): Promise<DailyStreak> {
    let streak = await this.getDailyStreak(userId);
    const now = new Date();
    
    if (!streak) {
      // Criar um novo streak se não existir
      streak = await this.createDailyStreak(userId);
    }
    
    // Verificar se o último check-in foi hoje
    let isToday = false;
    if (streak.lastCheckin) {
      const lastDate = new Date(streak.lastCheckin);
      isToday = 
        lastDate.getDate() === now.getDate() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getFullYear() === now.getFullYear();
    }
    
    // Verificar se o último check-in foi ontem
    let isYesterday = false;
    if (streak.lastCheckin) {
      const lastDate = new Date(streak.lastCheckin);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      isYesterday = 
        lastDate.getDate() === yesterday.getDate() &&
        lastDate.getMonth() === yesterday.getMonth() &&
        lastDate.getFullYear() === yesterday.getFullYear();
    }
    
    // Atualizar o streak
    let updatedStreak: DailyStreak;
    
    if (isToday) {
      // Já fez check-in hoje, apenas atualize as atividades se não existirem ainda
      const activities = streak.activities.includes(activity) 
        ? streak.activities 
        : [...streak.activities, activity];
      
      updatedStreak = {
        ...streak,
        activities,
        updatedAt: now
      };
      
    } else if (isYesterday) {
      // Último check-in foi ontem, incremente o streak
      const currentStreak = streak.currentStreak + 1;
      const longestStreak = Math.max(currentStreak, streak.longestStreak);
      
      updatedStreak = {
        ...streak,
        currentStreak,
        longestStreak,
        lastCheckin: now,
        activities: [activity],
        updatedAt: now
      };
      
    } else {
      // Mais de um dia se passou, reinicie o streak
      updatedStreak = {
        ...streak,
        currentStreak: 1,
        lastCheckin: now,
        activities: [activity],
        updatedAt: now
      };
    }
    
    this.dailyStreaks.set(updatedStreak.id, updatedStreak);
    return updatedStreak;
  }
  
  /**
   * Atualiza o streak do usuário automaticamente baseado em atividades na plataforma
   * @param userId ID do usuário
   * @param activityType Tipo de atividade (journal, meditation, selfhelp, etc)
   * @returns DailyStreak atualizado
   */
  async autoUpdateDailyStreak(userId: number, activityType: string): Promise<DailyStreak> {
    // Usar a mesma lógica do updateDailyStreak, mas sem necessidade de interação manual
    return this.updateDailyStreak(userId, activityType);
  }

  async resetDailyStreak(userId: number): Promise<DailyStreak> {
    const streak = await this.getDailyStreak(userId);
    
    if (!streak) {
      return this.createDailyStreak(userId);
    }
    
    const now = new Date();
    const resetStreak: DailyStreak = {
      ...streak,
      currentStreak: 0,
      lastCheckin: now,
      activities: [],
      updatedAt: now
    };
    
    this.dailyStreaks.set(resetStreak.id, resetStreak);
    return resetStreak;
  }

  // Notification related methods
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by most recent
  }

  async getUnreadNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((notification) => notification.userId === userId && !notification.read)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by most recent
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const createdAt = new Date();
    const notification: Notification = { 
      ...insertNotification, 
      id, 
      read: false, 
      createdAt,
      relatedId: insertNotification.relatedId || null
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = await this.getNotification(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, read: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const userNotifications = await this.getNotificationsByUser(userId);
    if (userNotifications.length === 0) return false;
    
    userNotifications.forEach(notification => {
      this.notifications.set(notification.id, { ...notification, read: true });
    });
    
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }
  
  // Therapist review related methods
  async getTherapistReview(id: number): Promise<TherapistReview | undefined> {
    return this.therapistReviews.get(id);
  }
  
  async getTherapistReviewsByTherapist(therapistId: number): Promise<TherapistReview[]> {
    return Array.from(this.therapistReviews.values())
      .filter((review) => review.therapistId === therapistId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by most recent
  }
  
  async getTherapistReviewsByUser(userId: number): Promise<TherapistReview[]> {
    return Array.from(this.therapistReviews.values())
      .filter((review) => review.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by most recent
  }
  
  async createTherapistReview(review: InsertTherapistReview): Promise<TherapistReview> {
    const id = this.notificationId++; // Reusing notificationId counter
    const createdAt = new Date();
    
    const therapistReview: TherapistReview = {
      ...review,
      id,
      createdAt,
      sessionId: review.sessionId || null,
      comment: review.comment || null
    };
    
    this.therapistReviews.set(id, therapistReview);
    return therapistReview;
  }
  
  async updateTherapistReview(id: number, reviewData: Partial<TherapistReview>): Promise<TherapistReview | undefined> {
    const review = await this.getTherapistReview(id);
    if (!review) return undefined;
    
    const updatedReview = { ...review, ...reviewData };
    this.therapistReviews.set(id, updatedReview);
    return updatedReview;
  }
  
  async deleteTherapistReview(id: number): Promise<boolean> {
    return this.therapistReviews.delete(id);
  }
  
  // Content recommendation related methods
  async getContentRecommendation(id: number): Promise<ContentRecommendation | undefined> {
    return this.contentRecommendations.get(id);
  }
  
  async getContentRecommendationsByUser(userId: number): Promise<ContentRecommendation[]> {
    return Array.from(this.contentRecommendations.values())
      .filter((recommendation) => recommendation.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by most recent
  }
  
  async getContentRecommendationsByCategory(category: string): Promise<ContentRecommendation[]> {
    return Array.from(this.contentRecommendations.values())
      .filter((recommendation) => recommendation.category.toLowerCase() === category.toLowerCase())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getUnreadContentRecommendationsByUser(userId: number): Promise<ContentRecommendation[]> {
    return Array.from(this.contentRecommendations.values())
      .filter((recommendation) => recommendation.userId === userId && !recommendation.isRead)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createContentRecommendation(recommendation: InsertContentRecommendation): Promise<ContentRecommendation> {
    const id = this.notificationId++; // Reusing notificationId counter
    const createdAt = new Date();
    
    const contentRecommendation: ContentRecommendation = {
      ...recommendation,
      id,
      createdAt,
      isRead: false,
      contentUrl: recommendation.contentUrl || null,
      imageUrl: recommendation.imageUrl || null,
      content: recommendation.content || null,
      tags: recommendation.tags || [],
      relatedJournalIds: recommendation.relatedJournalIds || []
    };
    
    this.contentRecommendations.set(id, contentRecommendation);
    return contentRecommendation;
  }
  
  async markContentRecommendationAsRead(id: number): Promise<ContentRecommendation | undefined> {
    const recommendation = await this.getContentRecommendation(id);
    if (!recommendation) return undefined;
    
    const updatedRecommendation = { ...recommendation, isRead: true };
    this.contentRecommendations.set(id, updatedRecommendation);
    return updatedRecommendation;
  }
  
  async deleteContentRecommendation(id: number): Promise<boolean> {
    return this.contentRecommendations.delete(id);
  }
  
  // Chat messages related methods
  private chatMessages: Map<number, ChatMessage> = new Map();
  private chatMessageId: number = 1;
  
  async getChatMessage(id: number): Promise<ChatMessage | undefined> {
    return this.chatMessages.get(id);
  }

  async getChatMessagesByUser(userId: number, limit?: number): Promise<ChatMessage[]> {
    // Obtém todas as mensagens do usuário
    let messages = Array.from(this.chatMessages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Ordenar por timestamp (mais antiga primeiro)
    
    // Aplicar limite se fornecido
    if (limit && limit > 0 && messages.length > limit) {
      // Retorna as mensagens mais recentes limitadas pelo parâmetro
      messages = messages.slice(messages.length - limit);
    }
    
    return messages;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.chatMessageId++;
    const chatMessage: ChatMessage = {
      ...message,
      id,
      timestamp: message.timestamp || new Date(),
      metadata: message.metadata || {}
    };
    
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }

  async deleteChatMessage(id: number): Promise<boolean> {
    return this.chatMessages.delete(id);
  }

  async clearChatHistory(userId: number): Promise<boolean> {
    // Encontrar todas as IDs de mensagens do usuário
    const userMessageIds = Array.from(this.chatMessages.entries())
      .filter(([_, message]) => message.userId === userId)
      .map(([id, _]) => id);
    
    // Excluir cada mensagem
    let allDeleted = true;
    for (const id of userMessageIds) {
      const success = await this.deleteChatMessage(id);
      if (!success) {
        allDeleted = false;
      }
    }
    
    return allDeleted;
  }

  // Initialize sample data
  // LGPD - User Consent related methods
  async getUserConsentById(id: number): Promise<UserConsent | undefined> {
    return this.userConsents.get(id);
  }

  async getUserConsentByType(userId: number, consentType: string): Promise<UserConsent | undefined> {
    return Array.from(this.userConsents.values()).find(
      (consent) => consent.userId === userId && consent.consentType === consentType
    );
  }

  async getUserConsentRecords(userId: number): Promise<UserConsent[]> {
    return Array.from(this.userConsents.values()).filter(
      (consent) => consent.userId === userId
    );
  }

  async createUserConsent(consent: InsertUserConsent): Promise<UserConsent> {
    const id = this.userConsentId++;
    const timestamp = new Date();
    
    const userConsent: UserConsent = {
      ...consent,
      id,
      timestamp,
      expiresAt: consent.expiresAt || null,
      userAgent: consent.userAgent || null,
      documentVersion: consent.documentVersion || null
    };
    
    this.userConsents.set(id, userConsent);
    return userConsent;
  }

  async updateUserConsent(id: number, consentData: Partial<UserConsent>): Promise<UserConsent> {
    const consent = await this.getUserConsentById(id);
    if (!consent) {
      throw new Error(`Consentimento com ID ${id} não encontrado`);
    }
    
    const updatedConsent = { ...consent, ...consentData };
    this.userConsents.set(id, updatedConsent);
    return updatedConsent;
  }

  async revokeConsent(userId: number, consentType: string): Promise<boolean> {
    const consent = await this.getUserConsentByType(userId, consentType);
    if (!consent) return false;
    
    const updatedConsent = { ...consent, granted: false };
    this.userConsents.set(consent.id, updatedConsent);
    return true;
  }
  
  // LGPD - Data Processing Logs operations
  async getDataProcessingLog(id: number): Promise<DataProcessingLog | undefined> {
    return this.dataProcessingLogs.get(id);
  }
  
  async getDataProcessingLogsByUser(userId: number): Promise<DataProcessingLog[]> {
    return Array.from(this.dataProcessingLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  async createDataProcessingLog(log: InsertDataProcessingLog): Promise<DataProcessingLog> {
    const id = this.dataProcessingLogId++;
    const timestamp = new Date();
    
    const processingLog: DataProcessingLog = {
      ...log,
      id,
      timestamp,
      performedBy: log.performedBy || null
    };
    
    this.dataProcessingLogs.set(id, processingLog);
    return processingLog;
  }
  
  // LGPD - Data Subject Requests operations
  async getDataSubjectRequest(id: number): Promise<DataSubjectRequest | undefined> {
    return this.dataSubjectRequests.get(id);
  }
  
  async getDataSubjectRequestsByUser(userId: number): Promise<DataSubjectRequest[]> {
    return Array.from(this.dataSubjectRequests.values())
      .filter(request => request.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createDataSubjectRequest(request: InsertDataSubjectRequest): Promise<DataSubjectRequest> {
    const id = this.dataSubjectRequestId++;
    const createdAt = new Date();
    
    const dataRequest: DataSubjectRequest = {
      ...request,
      id,
      createdAt,
      completedAt: null,
      responseDetails: null,
      status: 'Pendente',
      handledBy: null
    };
    
    this.dataSubjectRequests.set(id, dataRequest);
    return dataRequest;
  }
  
  async updateDataSubjectRequest(id: number, status: string, details?: string): Promise<DataSubjectRequest | undefined> {
    const request = await this.getDataSubjectRequest(id);
    if (!request) return undefined;
    
    const updatedRequest: DataSubjectRequest = {
      ...request,
      status,
      responseDetails: details || request.responseDetails,
      completedAt: ['Concluído', 'Rejeitado'].includes(status) ? new Date() : request.completedAt
    };
    
    this.dataSubjectRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  // LGPD - Legal Documents operations
  async getLegalDocument(id: number): Promise<LegalDocument | undefined> {
    return this.legalDocuments.get(id);
  }
  
  async getLegalDocumentByType(type: string, active: boolean = true): Promise<LegalDocument | undefined> {
    return Array.from(this.legalDocuments.values())
      .filter(doc => doc.type === type && (active ? doc.active : true))
      .sort((a, b) => b.version - a.version)[0]; // Retorna a versão mais recente
  }
  
  async getLegalDocumentsByType(type: string): Promise<LegalDocument[]> {
    return Array.from(this.legalDocuments.values())
      .filter(doc => doc.type === type)
      .sort((a, b) => b.version - a.version); // Ordenar por versão mais recente
  }
  
  async createLegalDocument(document: InsertLegalDocument): Promise<LegalDocument> {
    const id = this.legalDocumentId++;
    const createdAt = new Date();
    
    // Verificar se já existe um documento ativo do mesmo tipo e desativá-lo
    if (document.active) {
      const existingDocs = await this.getLegalDocumentsByType(document.type);
      for (const doc of existingDocs) {
        if (doc.active) {
          await this.deactivateLegalDocument(doc.id);
        }
      }
    }
    
    const legalDoc: LegalDocument = {
      ...document,
      id,
      createdAt,
      updatedAt: createdAt
    };
    
    this.legalDocuments.set(id, legalDoc);
    return legalDoc;
  }
  
  async activateLegalDocument(id: number): Promise<LegalDocument | undefined> {
    const document = await this.getLegalDocument(id);
    if (!document) return undefined;
    
    // Desativar outros documentos do mesmo tipo
    const existingDocs = await this.getLegalDocumentsByType(document.type);
    for (const doc of existingDocs) {
      if (doc.id !== id && doc.active) {
        await this.deactivateLegalDocument(doc.id);
      }
    }
    
    const updatedDoc: LegalDocument = {
      ...document,
      active: true,
      updatedAt: new Date()
    };
    
    this.legalDocuments.set(id, updatedDoc);
    return updatedDoc;
  }
  
  async deactivateLegalDocument(id: number): Promise<LegalDocument | undefined> {
    const document = await this.getLegalDocument(id);
    if (!document) return undefined;
    
    const updatedDoc: LegalDocument = {
      ...document,
      active: false,
      updatedAt: new Date()
    };
    
    this.legalDocuments.set(id, updatedDoc);
    return updatedDoc;
  }
  
  // LGPD - User deletion and anonymization
  async deleteUser(userId: number): Promise<boolean> {
    // Registrar a operação nos logs LGPD
    await this.createDataProcessingLog({
      userId,
      action: 'delete',
      dataCategory: 'personal',
      description: 'Exclusão completa de conta de usuário',
      ipAddress: '127.0.0.1', // Em produção, usar o IP real do requisitante
      authorized: true
    });
    
    return this.users.delete(userId);
  }
  
  async anonymizeUserData(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    // Criar uma versão anonimizada do usuário
    const anonymizedUser: User = {
      ...user,
      username: `anon_${user.id}`,
      password: `$ANONYMIZED_${Date.now()}`,
      email: `anon_${user.id}@anonymized.local`,
      firstName: 'Anonimizado',
      lastName: 'Anonimizado',
      dateOfBirth: null,
      profilePicture: null,
      bio: null,
      preferences: {},
      gender: null,
      phone: null,
      location: null
    };
    
    // Sobrescrever dados do usuário com versão anonimizada
    this.users.set(userId, anonymizedUser);
    
    // Registrar a operação nos logs LGPD
    await this.createDataProcessingLog({
      userId,
      action: 'anonymize',
      dataCategory: 'personal',
      description: 'Anonimização de dados de usuário',
      ipAddress: '127.0.0.1', // Em produção, usar o IP real do requisitante
      authorized: true
    });
    
    return true;
  }

  private initializeSelfHelpTools() {
    const tools: InsertSelfHelpTool[] = [
      {
        name: "Meditação Guiada para Foco",
        description: "Meditação curta e eficaz para melhorar o foco e reduzir a ansiedade.",
        category: "Meditação",
        duration: 10,
        imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
        content: `1. Apresentação e Objetivos (1-2 minutos)
⸻
Nesta sessão, vamos trabalhar técnicas de relaxamento e atenção plena para melhorar seu foco mental. Concentre-se no presente momento e siga as instruções conforme se sentir confortável.

2. Exercícios de Respiração e Atenção Plena (3-5 minutos)
⸻
Encontre uma posição confortável. Mantenha sua coluna ereta, mas relaxada.

Comece inspirando lentamente pelo nariz, contando até quatro.
Segure o ar por dois segundos.
Agora expire lentamente pela boca, contando até quatro.
Repita este ciclo por mais algumas respirações, focando apenas no ritmo da sua respiração.

Perceba como o ar entra frio e sai aquecido.
Observe como seu abdômen se expande e contrai com cada respiração.

3. Meditação Guiada Focada em Mindfulness (5-10 minutos)
⸻
Continue respirando naturalmente.

Agora, direcione sua atenção para seu corpo, começando pelos pés e subindo lentamente.
Observe qualquer sensação nos seus pés, nas suas pernas, no seu tronco, nos seus braços, nas suas mãos, e finalmente na sua cabeça.

Se notar alguma tensão, apenas observe-a sem tentar mudar. Reconheça sua presença com gentileza.

Se sua mente divagar, simplesmente note os pensamentos e traga sua atenção de volta à respiração.

Este é um momento para estar presente, sem julgamentos.`
      },
      {
        name: "Técnica de Respiração 4-7-8",
        description: "Método cientificamente comprovado para reduzir ansiedade e induzir relaxamento.",
        category: "Respiração",
        duration: 5,
        imageUrl: "https://images.unsplash.com/photo-1551655510-555dc3be8633?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
        content: `1. Apresentação e Objetivos (1 minuto)
⸻
Esta técnica de respiração, desenvolvida pelo Dr. Andrew Weil, é cientificamente comprovada para acalmar o sistema nervoso e é utilizada para reduzir a ansiedade, facilitar o sono e gerenciar reações ao estresse. Praticaremos o método 4-7-8, uma forma simples mas poderosa de trazer calma rapidamente.

2. Posicionamento Inicial (1 minuto)
⸻
Encontre uma posição confortável, sentado ou deitado.
Relaxe os ombros e mantenha as costas retas, mas sem tensão.
Se sentir-se confortável, feche os olhos.
Libere qualquer tensão em sua mandíbula e relaxe a língua.

3. Respiração 4-7-8 (3 minutos)
⸻
Para começar, expire completamente pela boca, fazendo um som suave de vento.
Agora, feche a boca e inspire silenciosamente pelo nariz enquanto conta mentalmente até 4.
Segure a respiração e conte mentalmente até 7.
Expire completamente pela boca, fazendo um som de vento, enquanto conta mentalmente até 8.

Esse é um ciclo completo. Vamos repetir mais três vezes.

Inspire... 2, 3, 4.
Segure... 2, 3, 4, 5, 6, 7.
Expire... 2, 3, 4, 5, 6, 7, 8.

[Repetir mais duas vezes]

4. Reflexão Final (1 minuto)
⸻
Observe como você se sente agora. Note qualquer diferença em sua tensão muscular, ritmo cardíaco ou estado mental.
Esta técnica pode ser usada a qualquer momento que você precisar se acalmar ou se centrar.
Para resultados ideais, pratique este exercício pelo menos duas vezes ao dia.`
      },
      {
        name: "Técnica de Ancoragem 5-4-3-2-1",
        description: "Método eficaz de grounding para ansiedade, ataques de pânico e pensamentos intrusivos.",
        category: "Grounding",
        duration: 7,
        imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f7d292c44?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
        content: `1. Apresentação e Objetivos (1 minuto)
⸻
A técnica 5-4-3-2-1 é uma estratégia de ancoragem que utiliza seus cinco sentidos para ajudar a reconectar com o presente. Esta prática é especialmente útil durante momentos de ansiedade, ataques de pânico, ou quando você se sente sobrecarregado por pensamentos intrusivos ou preocupações.

2. Preparação (1 minuto)
⸻
Comece encontrando uma posição confortável.
Respire profundamente algumas vezes, inspirando pelo nariz e expirando pela boca.
Tente relaxar os ombros e liberar qualquer tensão em seu corpo.

3. Prática da Técnica 5-4-3-2-1 (4 minutos)
⸻
Observe 5 coisas que você pode VER ao seu redor. Nomeie cada uma mentalmente ou em voz baixa. Observe detalhes como cores, formas e texturas.

Perceba 4 coisas que você pode TOCAR ou SENTIR. Pode ser a textura da sua roupa, a temperatura do ar, a sensação da cadeira onde está sentado, ou a pressão dos seus pés no chão.

Identifique 3 coisas que você pode OUVIR. Concentre-se em sons distantes como o tráfego, pássaros, ou o vento, e sons próximos como sua respiração ou um relógio.

Note 2 coisas que você pode CHEIRAR ou que gosta do cheiro. Se não sentir nenhum cheiro no momento, pense em aromas que você aprecia, como café fresco, flores ou um perfume favorito.

Finalmente, identifique 1 coisa que você pode PROVAR. Se não estiver provando nada agora, lembre-se de um sabor que você gosta.

4. Conclusão e Reflexão (1 minuto)
⸻
Respire profundamente mais algumas vezes.
Observe como você se sente agora, após ter reconectado com seus sentidos e com o momento presente.
Lembre-se que você pode usar esta técnica a qualquer momento e em qualquer lugar quando precisar se ancorar no presente.`
      },
      {
        name: "Relaxamento Muscular Progressivo",
        description: "Técnica para relaxar grupos musculares específicos e aliviar a tensão física.",
        category: "Relaxamento",
        duration: 12,
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
        content: `1. Introdução (1 minuto)
⸻
O Relaxamento Muscular Progressivo é uma técnica desenvolvida pelo Dr. Edmund Jacobson nos anos 1920, que envolve tensionar e depois relaxar grupos musculares específicos. Este exercício ajuda a reconhecer a diferença entre tensão e relaxamento muscular, promovendo uma redução da ansiedade, estresse e insônia. Estudos mostram que essa prática regular pode reduzir significativamente os sintomas físicos da ansiedade.

2. Preparação (1 minuto)
⸻
Encontre uma posição confortável, de preferência sentado ou deitado.
Respire lenta e profundamente algumas vezes.
Comece notando como seu corpo se sente neste momento.

3. Relaxamento Muscular Progressivo (8-10 minutos)
⸻
Vamos começar com as mãos e braços.
Feche as mãos com força, tensionando todos os músculos. Mantenha por 5 segundos... e agora solte completamente, deixando suas mãos relaxarem. Observe a diferença entre tensão e relaxamento.

Agora, dobre os pulsos para trás, tensionando o antebraço. Mantenha por 5 segundos... e relaxe.

Dobre os cotovelos e tensione os bíceps. Segure por 5 segundos... e relaxe, deixando seus braços caírem suavemente.

Vamos agora para os ombros. Levante os ombros em direção às orelhas, como se estivesse dando de ombros. Segure a tensão... e solte, deixando os ombros caírem.

Agora, tensione os músculos do rosto. Aperte os olhos, franza a testa, e aperte os lábios. Mantenha por 5 segundos... e relaxe completamente.

Tensione o pescoço, inclinando a cabeça para trás ligeiramente. Segure... e depois relaxe, trazendo a cabeça para uma posição neutra e confortável.

Contraia os músculos do peito, respirando profundamente e segurando o ar. Mantenha por 5 segundos... e solte lentamente, exalando e relaxando.

Tensione o abdômen, como se estivesse se preparando para receber um soco. Segure... e relaxe.

Agora, aperte os glúteos. Segure... e relaxe.

Tensione as coxas, contraindo os músculos. Segure por 5 segundos... e relaxe.

Por fim, aponte os dedos dos pés para o seu rosto, tensionando as panturrilhas. Segure... e relaxe.

Agora, aponte os dedos dos pés para longe de você, tensionando a parte superior dos pés. Segure... e relaxe.

4. Integração e Conclusão (1-2 minutos)
⸻
Respire profundamente e perceba como seu corpo se sente agora, depois de tensionar e relaxar cada grupo muscular.
Observe áreas que ainda podem estar tensas e dê a elas uma atenção extra, permitindo que relaxem ainda mais.
Lembre-se que você pode usar esta técnica em qualquer momento, focando em áreas específicas onde sente mais tensão.`
      },
      {
        name: "Visualização de Local Seguro",
        description: "Exercício de visualização para criar um refúgio mental e reduzir o estresse.",
        category: "Visualização",
        duration: 8,
        imageUrl: "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
        content: `1. Introdução (1 minuto)
⸻
A visualização de um local seguro é uma técnica poderosa usada em terapias como a cognitivo-comportamental para ajudar a reduzir o estresse e a ansiedade. Ela utiliza a imaginação para criar um refúgio mental, um espaço onde você se sente completamente seguro e em paz. Pesquisas em neurociência mostram que visualizar experiências positivas pode ativar áreas do cérebro semelhantes às que são ativadas durante experiências reais.

2. Preparação (1-2 minutos)
⸻
Encontre uma posição confortável e feche os olhos.
Respire profundamente algumas vezes, inspirando pelo nariz e expirando pela boca.
Permita que seu corpo comece a relaxar, liberando qualquer tensão a cada expiração.

3. Visualização Guiada (4-5 minutos)
⸻
Agora, imagine um lugar onde você se sente completamente seguro, calmo e feliz. Pode ser um lugar real que você conhece, ou um lugar completamente imaginário.

Comece a construir este lugar em sua mente com o máximo de detalhes possível.

Observe o ambiente ao seu redor. É um espaço interno ou externo? Como é a iluminação? É dia ou noite?

Veja as cores deste lugar. Quais são as cores predominantes? São cores vibrantes ou suaves?

Agora, perceba os sons presentes neste local seguro. Talvez seja o som de ondas quebrando na praia, o canto de pássaros, o crepitar de uma fogueira, ou talvez seja um silêncio reconfortante.

Sinta a temperatura deste lugar. Está quente como um dia de verão, ou fresco como uma manhã de primavera?

Perceba os cheiros presentes. Talvez o aroma de flores, o cheiro do mar, ou o perfume de comida caseira.

Se você estendesse a mão, o que você tocaria? Sinta a textura dos objetos ao seu redor.

Você está sozinho neste lugar ou há outras presenças reconfortantes com você?

Permita-se explorar este local seguro, absorvendo todos os seus aspectos reconfortantes.

4. Conclusão (1 minuto)
⸻
Saiba que este local seguro está sempre disponível para você, em qualquer momento que precisar de conforto ou calma.

Antes de retornar sua atenção para o presente, considere criar uma palavra ou frase que possa ajudá-lo a acessar rapidamente este local seguro no futuro.

Lentamente, comece a trazer sua consciência de volta para o aqui e agora. Perceba sua respiração, os sons ao seu redor, e quando estiver pronto, abra os olhos.`
      },
      {
        name: "Escaneamento Corporal Mindfulness",
        description: "Prática de atenção plena focada nas sensações corporais para reduzir tensão e aumentar autoconsciência.",
        category: "Mindfulness",
        duration: 10,
        imageUrl: "https://images.unsplash.com/photo-1560252759-1f30e4920759?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
        content: `1. Introdução à Prática (1 minuto)
⸻
O escaneamento corporal é uma técnica de mindfulness ou atenção plena que nos ajuda a desenvolver consciência das sensações físicas em todo o corpo. Esta prática foi popularizada por Jon Kabat-Zinn através do programa MBSR (Redução de Estresse Baseada em Mindfulness) e tem sido cientificamente comprovada para reduzir ansiedade, dor crônica e melhorar a qualidade do sono.

2. Posicionamento e Preparação (1 minuto)
⸻
Encontre uma posição confortável, sentado ou deitado, onde você possa ficar imóvel por alguns minutos.
Feche os olhos suavemente para minimizar distrações visuais.
Permita que seu corpo comece a relaxar naturalmente, sem forçar nada.
Respire naturalmente, observando o ritmo da sua respiração sem tentar controlá-la.

3. Prática do Escaneamento Corporal (7 minutos)
⸻
Comece direcionando sua atenção para os seus pés. Observe quaisquer sensações presentes - talvez calor, frio, formigamento, pressão ou talvez nenhuma sensação específica. Não julgue o que percebe, apenas observe.

Lentamente, mova sua atenção para os tornozelos, panturrilhas e joelhos, observando as sensações em cada área.

Continue subindo para as coxas, notando se há tensão, relaxamento ou outras sensações presentes.

Agora, traga sua atenção para os quadris e região pélvica. Observe qualquer desconforto ou tensão e, com uma expiração, imagine essa área relaxando.

Mova sua atenção para o abdômen, notando o movimento suave da respiração. Observe como o abdômen se expande na inspiração e contrai na expiração.

Dirija sua atenção para as costas, começando pela parte inferior e movendo-se gradualmente para cima, notando quaisquer áreas de tensão ou desconforto.

Observe o peito, notando o movimento da respiração nesta área também.

Agora, dirija sua atenção para as mãos, antebraços e braços, observando quaisquer sensações presentes.

Continue para os ombros, notando se estão tensos ou relaxados. Com cada expiração, imagine qualquer tensão se dissolvendo.

Observe o pescoço, a garganta e depois o rosto - testa, têmporas, olhos, bochechas, nariz, boca, mandíbula.

Finalmente, observe toda a cabeça, notando qualquer sensação presente.

4. Integração e Conclusão (1 minuto)
⸻
Para concluir, amplie sua consciência para incluir todo o seu corpo, sentindo-o como uma unidade completa.
Observe como você se sente agora em comparação com o início da prática.
Lembre-se que você pode trazer esta consciência para qualquer momento do seu dia, não apenas durante práticas formais de meditação.
Quando estiver pronto, comece a mover suavemente os dedos das mãos e dos pés, trazendo mais consciência para o corpo.
Abra os olhos lentamente, mantendo a calma e a consciência que desenvolveu durante a prática.`
      }
    ];
    
    return this.initializeData(schema.selfHelpTools, tools);
  }

  private initializeTherapists() {
    const therapists: InsertTherapist[] = [
      {
        firstName: "Rebecca",
        lastName: "Johnson",
        specialization: "Cognitive Behavioral Therapist",
        bio: "Dr. Rebecca Johnson is a licensed psychologist specializing in cognitive behavioral therapy. With over 10 years of experience, she helps clients overcome anxiety, depression, and stress.",
        imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
        rating: 49, // 4.9 out of 5
        tags: ["Anxiety", "Depression", "Stress"],
        availability: { domingo: false, segunda: true, terça: true, quarta: true, quinta: false, sexta: true, sábado: false },
        location: "São Paulo, SP",
        hourlyRate: 150,
        email: "rebecca.johnson@mentehealthy.com",
        phone: "(11) 98765-4321"
      },
      {
        firstName: "Michael",
        lastName: "Chen",
        specialization: "Psychologist",
        bio: "Dr. Michael Chen is a licensed psychologist with expertise in trauma, PTSD, and relationship issues. He combines evidence-based approaches with compassionate care.",
        imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
        rating: 47, // 4.7 out of 5
        tags: ["Trauma", "PTSD", "Relationships"],
        availability: { domingo: false, segunda: false, terça: true, quarta: true, quinta: true, sexta: true, sábado: false },
        location: "Rio de Janeiro, RJ",
        hourlyRate: 170,
        email: "michael.chen@mentehealthy.com",
        phone: "(21) 99876-5432"
      },
      {
        firstName: "Sarah",
        lastName: "Wilson",
        specialization: "Family Therapist",
        bio: "Sarah Wilson is a licensed family therapist dedicated to helping families improve communication and resolve conflicts. She creates a supportive environment for all family members.",
        imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
        rating: 48, // 4.8 out of 5
        tags: ["Family", "Parenting", "Communication"],
        availability: { domingo: false, segunda: true, terça: false, quarta: true, quinta: true, sexta: false, sábado: false },
        location: "Belo Horizonte, MG",
        hourlyRate: 130,
        email: "sarah.wilson@mentehealthy.com",
        phone: "(31) 98765-4321"
      }
    ];

    therapists.forEach(therapist => {
      this.createTherapist(therapist);
    });
  }

  private initializeDailyTips() {
    const tips: InsertDailyTip[] = [
      {
        title: "Practice Mindfulness",
        content: "Take 5 minutes today to practice mindfulness. Sit quietly and focus on your breath, acknowledging any thoughts without judgment and letting them pass.",
        category: "Mindfulness"
      },
      {
        title: "Get Moving",
        content: "Even a short 10-minute walk can boost your mood and energy levels. Try to incorporate some movement into your day.",
        category: "Physical Health"
      },
      {
        title: "Express Gratitude",
        content: "Write down three things you're grateful for today. Practicing gratitude can help shift your focus to the positive aspects of your life.",
        category: "Positivity"
      },
      {
        title: "Connect with Others",
        content: "Reach out to a friend or family member today. Social connections are vital for mental wellbeing.",
        category: "Social Health"
      },
      {
        title: "Limit Screen Time",
        content: "Try to reduce screen time before bed to improve your sleep quality. Consider reading a book or practicing relaxation techniques instead.",
        category: "Sleep"
      }
    ];

    tips.forEach(tip => {
      this.createDailyTip(tip);
    });
  }
  
  private initializeTherapySessions() {
    // Verificar se já existem usuários e terapeutas
    if (this.users.size === 0 || this.therapists.size === 0) {
      // Se não existirem, criar um usuário de exemplo se não existir
      if (this.users.size === 0) {
        this.createUser({
          username: "usuario_teste",
          password: "senha123",
          email: "teste@email.com",
          firstName: "Usuário",
          lastName: "Teste",
          dateOfBirth: new Date("1990-01-01"),
          profilePicture: null,
          bio: "Usuário de teste para demonstração da plataforma",
          preferences: {},
          isTherapist: false,
          therapistId: null
        });
      }
    }
    
    // Obter o primeiro usuário e o primeiro terapeuta
    const user = Array.from(this.users.values())[0];
    const therapist = Array.from(this.therapists.values())[0];
    
    if (!user || !therapist) return;
    
    // Criar sessões de exemplo para o usuário
    const sessionsData = [
      {
        userId: user.id,
        therapistId: therapist.id,
        therapistName: `Dr. ${therapist.firstName} ${therapist.lastName}`,
        scheduledFor: new Date(Date.now() + 1000 * 60 * 10), // 10 minutos no futuro
        duration: 50,
        status: "Agendada",
        notes: "Primeira consulta para avaliação inicial",
        type: "Video"
      },
      {
        userId: user.id,
        therapistId: therapist.id,
        therapistName: `Dr. ${therapist.firstName} ${therapist.lastName}`,
        scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 dias no futuro
        duration: 50,
        status: "Agendada",
        notes: "Continuação do trabalho em técnicas de gerenciamento de ansiedade",
        type: "Video"
      },
      {
        userId: user.id,
        therapistId: therapist.id,
        therapistName: `Dr. ${therapist.firstName} ${therapist.lastName}`,
        scheduledFor: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 dias no passado
        duration: 50,
        status: "Concluída",
        notes: "Sessão inicial de avaliação",
        type: "Video"
      }
    ];
    
    for (const sessionData of sessionsData) {
      this.createSession(sessionData);
    }
  }
  
  // Therapist availability related methods
  async getTherapistAvailability(id: number): Promise<TherapistAvailability | undefined> {
    return this.therapistAvailabilities.get(id);
  }
  
  async getTherapistAvailabilitiesByTherapist(therapistId: number): Promise<TherapistAvailability[]> {
    return Array.from(this.therapistAvailabilities.values())
      .filter((availability) => availability.therapistId === therapistId);
  }
  
  async createTherapistAvailability(insertAvailability: InsertTherapistAvailability): Promise<TherapistAvailability> {
    const id = this.availabilityId++;
    const createdAt = new Date();
    
    const availability: TherapistAvailability = {
      ...insertAvailability,
      id,
      createdAt,
      specificDate: insertAvailability.specificDate || null
    };
    
    this.therapistAvailabilities.set(id, availability);
    return availability;
  }
  
  async updateTherapistAvailability(id: number, availabilityData: Partial<TherapistAvailability>): Promise<TherapistAvailability | undefined> {
    const availability = await this.getTherapistAvailability(id);
    if (!availability) return undefined;
    
    const updatedAvailability = { ...availability, ...availabilityData };
    this.therapistAvailabilities.set(id, updatedAvailability);
    return updatedAvailability;
  }
  
  async deleteTherapistAvailability(id: number): Promise<boolean> {
    return this.therapistAvailabilities.delete(id);
  }
  
  // Therapist urgency status related methods
  async getTherapistUrgencyStatus(therapistId: number): Promise<TherapistUrgencyStatus | undefined> {
    return Array.from(this.therapistUrgencyStatuses.values())
      .find((status) => status.therapistId === therapistId);
  }
  
  async getAllAvailableTherapistsForUrgent(): Promise<number[]> {
    const now = new Date();
    
    return Array.from(this.therapistUrgencyStatuses.values())
      .filter((status) => {
        // Verifica se o terapeuta está disponível para urgência
        if (!status.isAvailableForUrgent) return false;
        
        // Verifica se existe um tempo de expiração e se ele já passou
        if (status.availableUntil && status.availableUntil < now) return false;
        
        return true;
      })
      .map((status) => status.therapistId);
  }
  
  async updateTherapistUrgencyStatus(therapistId: number, statusData: Partial<InsertTherapistUrgencyStatus>): Promise<TherapistUrgencyStatus> {
    // Verifica se já existe um status para este terapeuta
    let urgencyStatus = await this.getTherapistUrgencyStatus(therapistId);
    const now = new Date();
    
    if (!urgencyStatus) {
      // Cria um novo registro se não existir
      const id = this.urgencyStatusId++;
      
      urgencyStatus = {
        id,
        therapistId,
        isAvailableForUrgent: statusData.isAvailableForUrgent || false,
        lastUpdated: now,
        availableUntil: statusData.availableUntil || null,
        maxWaitingTime: statusData.maxWaitingTime || null
      };
      
      this.therapistUrgencyStatuses.set(id, urgencyStatus);
    } else {
      // Atualiza o registro existente
      const updatedStatus = { 
        ...urgencyStatus,
        ...statusData,
        lastUpdated: now
      };
      
      this.therapistUrgencyStatuses.set(urgencyStatus.id, updatedStatus);
      urgencyStatus = updatedStatus;
    }
    
    return urgencyStatus;
  }
  
  // Voice check-in operations
  async getVoiceCheckinsByUserId(userId: number): Promise<VoiceCheckin[]> {
    return Array.from(this.voiceCheckins.values())
      .filter(checkin => checkin.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getVoiceCheckinById(id: number): Promise<VoiceCheckin | null> {
    const checkin = this.voiceCheckins.get(id);
    return checkin || null;
  }

  async createVoiceCheckin(data: InsertVoiceCheckin): Promise<VoiceCheckin> {
    const id = this.voiceCheckinId++;
    const createdAt = new Date();
    
    const voiceCheckin: VoiceCheckin = {
      ...data,
      id,
      createdAt,
      transcription: null,
      moodAnalysis: null,
      emotionalTone: null,
      dominantEmotions: null,
      transcriptionAnalysis: null
    };
    
    this.voiceCheckins.set(id, voiceCheckin);
    return voiceCheckin;
  }
  
  // Medical Records (Prontuários Eletrônicos) operations
  async getMedicalRecordById(id: number): Promise<MedicalRecord | null> {
    const record = this.medicalRecords.get(id);
    return record || null;
  }
  
  async getMedicalRecordsByPatientId(patientId: number): Promise<MedicalRecord[]> {
    return Array.from(this.medicalRecords.values())
      .filter(record => record.patientId === patientId && !record.isDeleted)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Mais recentes primeiro
  }
  
  async getMedicalRecordsByTherapistId(therapistId: number): Promise<MedicalRecord[]> {
    return Array.from(this.medicalRecords.values())
      .filter(record => record.therapistId === therapistId && !record.isDeleted)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Mais recentes primeiro
  }
  
  async getMedicalRecordsBySessionId(sessionId: number): Promise<MedicalRecord | null> {
    const record = Array.from(this.medicalRecords.values())
      .find(record => record.sessionId === sessionId && !record.isDeleted);
    return record || null;
  }
  
  async createMedicalRecord(data: InsertMedicalRecord): Promise<MedicalRecord> {
    const id = this.medicalRecordId++;
    const now = new Date();
    
    const record: MedicalRecord = {
      ...data,
      id,
      date: now,
      mentalStatusExam: data.mentalStatusExam || {},
      diagnosis: data.diagnosis || [],
      treatmentPlan: data.treatmentPlan || null,
      recommendations: data.recommendations || null,
      observations: data.observations || null,
      nextSessionGoals: data.nextSessionGoals || null,
      riskFactors: data.riskFactors || {},
      medications: data.medications || {},
      attachments: data.attachments || [],
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    };
    
    this.medicalRecords.set(id, record);
    return record;
  }
  
  async updateMedicalRecord(id: number, data: Partial<MedicalRecord>): Promise<MedicalRecord | null> {
    const record = await this.getMedicalRecordById(id);
    if (!record) return null;
    
    const updatedRecord = {
      ...record,
      ...data,
      updatedAt: new Date()
    };
    
    this.medicalRecords.set(id, updatedRecord);
    return updatedRecord;
  }
  
  async deleteMedicalRecord(id: number): Promise<boolean> {
    const record = await this.getMedicalRecordById(id);
    if (!record) return false;
    
    // Soft delete - apenas marcar como excluído
    const deletedRecord = {
      ...record,
      isDeleted: true,
      updatedAt: new Date()
    };
    
    this.medicalRecords.set(id, deletedRecord);
    return true;
  }
  
  // Therapist briefing methods
  async getTherapistBriefingById(id: number): Promise<TherapistBriefing | null> {
    return this.therapistBriefings.get(id) || null;
  }
  
  async getTherapistBriefingsByTherapistId(therapistId: number): Promise<TherapistBriefing[]> {
    return Array.from(this.therapistBriefings.values())
      .filter(briefing => briefing.therapistId === therapistId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getTherapistBriefingsByPatientId(patientId: number): Promise<TherapistBriefing[]> {
    return Array.from(this.therapistBriefings.values())
      .filter(briefing => briefing.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getTherapistBriefingBySessionId(sessionId: number): Promise<TherapistBriefing | null> {
    return Array.from(this.therapistBriefings.values())
      .find(briefing => briefing.sessionId === sessionId) || null;
  }
  
  async createTherapistBriefing(data: InsertTherapistBriefing): Promise<TherapistBriefing> {
    const id = this.therapistBriefingId++;
    const now = new Date();
    
    const briefing: TherapistBriefing = {
      ...data,
      id,
      createdAt: now,
      hasBeenViewed: false
    };
    
    this.therapistBriefings.set(id, briefing);
    return briefing;
  }
  
  async markTherapistBriefingAsViewed(id: number): Promise<TherapistBriefing | null> {
    const briefing = await this.getTherapistBriefingById(id);
    if (!briefing) return null;
    
    const updatedBriefing = {
      ...briefing,
      hasBeenViewed: true
    };
    
    this.therapistBriefings.set(id, updatedBriefing);
    return updatedBriefing;
  }
  
  async deleteTherapistBriefing(id: number): Promise<boolean> {
    return this.therapistBriefings.delete(id);
  }
  
  // Emergency Call methods
  async getEmergencyCall(id: number): Promise<EmergencyCall | undefined> {
    return this.emergencyCalls.get(id);
  }

  async getEmergencyCallByRoomName(roomName: string): Promise<EmergencyCall | undefined> {
    return Array.from(this.emergencyCalls.values()).find(call => call.roomName === roomName);
  }

  async getEmergencyCallsByUser(userId: number): Promise<EmergencyCall[]> {
    return Array.from(this.emergencyCalls.values())
      .filter(call => call.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getEmergencyCallsByTherapist(therapistId: number): Promise<EmergencyCall[]> {
    return Array.from(this.emergencyCalls.values())
      .filter(call => call.therapistId === therapistId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async createEmergencyCall(call: InsertEmergencyCall): Promise<EmergencyCall> {
    const id = this.emergencyCallId++;
    const emergencyCall: EmergencyCall = {
      id,
      ...call,
      startedAt: call.startedAt || new Date(),
      endedAt: null,
      duration: null,
      feedback: null,
      rating: null,
      notes: null,
      metadata: call.metadata || {}
    };
    this.emergencyCalls.set(id, emergencyCall);
    return emergencyCall;
  }

  async updateEmergencyCall(call: Partial<EmergencyCall> & { id: number }): Promise<EmergencyCall | undefined> {
    const emergencyCall = await this.getEmergencyCall(call.id);
    if (!emergencyCall) return undefined;
    
    const updatedCall = { ...emergencyCall, ...call };
    this.emergencyCalls.set(call.id, updatedCall);
    return updatedCall;
  }

  async completeEmergencyCall(id: number, endedAt: Date, feedback?: string, rating?: number): Promise<EmergencyCall | undefined> {
    const emergencyCall = await this.getEmergencyCall(id);
    if (!emergencyCall) return undefined;
    
    const duration = emergencyCall.startedAt && endedAt ? 
      Math.round((endedAt.getTime() - emergencyCall.startedAt.getTime()) / 1000) : null;
    
    const updatedCall: EmergencyCall = {
      ...emergencyCall,
      status: 'completed',
      endedAt,
      duration,
      feedback: feedback || emergencyCall.feedback,
      rating: rating !== undefined ? rating : emergencyCall.rating
    };
    
    this.emergencyCalls.set(id, updatedCall);
    console.log(`[Storage] Chamada de emergência ${id} marcada como completa`);
    return updatedCall;
  }
  
  async getSessionsBetweenTherapistAndPatient(therapistId: number, patientId: number): Promise<Session[]> {
    return Array.from(this.therapySessions.values())
      .filter(session => session.therapistId === therapistId && session.userId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export class DatabaseStorage implements IStorage {
  // Inicializa o sessionStore para conexão do PostgreSQL
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // Implementação do método getSessions adicionado à interface
  async getSessions(): Promise<Session[]> {
    try {
      return await db.select().from(schema.sessions);
    } catch (error) {
      console.error("Database error in getSessions:", error);
      return [];
    }
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
      return user;
    } catch (error) {
      console.error("Database error in getUser:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
      return user;
    } catch (error) {
      console.error("Database error in getUserByUsername:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
      return user;
    } catch (error) {
      console.error("Database error in getUserByEmail:", error);
      return undefined;
    }
  }
  
  // Stripe integration methods - User
  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.stripeCustomerId, stripeCustomerId));
      return user;
    } catch (error) {
      console.error("Database error in getUserByStripeCustomerId:", error);
      return undefined;
    }
  }
  
  async updateUserStripeInfo(userId: number, stripeInfo: { 
    stripeCustomerId?: string, 
    stripeSubscriptionId?: string,
    stripeSubscriptionStatus?: string 
  }): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(schema.users)
        .set(stripeInfo)
        .where(eq(schema.users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Database error in updateUserStripeInfo:", error);
      return undefined;
    }
  }
  
  // Payment records methods
  async getPaymentRecord(id: number): Promise<PaymentRecord | undefined> {
    try {
      const [record] = await db
        .select()
        .from(schema.paymentRecords)
        .where(eq(schema.paymentRecords.id, id));
      return record;
    } catch (error) {
      console.error("Database error in getPaymentRecord:", error);
      return undefined;
    }
  }
  
  async getPaymentRecordsByUser(userId: number): Promise<PaymentRecord[]> {
    try {
      return await db
        .select()
        .from(schema.paymentRecords)
        .where(eq(schema.paymentRecords.userId, userId))
        .orderBy(desc(schema.paymentRecords.createdAt));
    } catch (error) {
      console.error("Database error in getPaymentRecordsByUser:", error);
      return [];
    }
  }
  
  async getPaymentRecordsBySession(sessionId: number): Promise<PaymentRecord[]> {
    try {
      return await db
        .select()
        .from(schema.paymentRecords)
        .where(eq(schema.paymentRecords.sessionId, sessionId))
        .orderBy(desc(schema.paymentRecords.createdAt));
    } catch (error) {
      console.error("Database error in getPaymentRecordsBySession:", error);
      return [];
    }
  }
  
  async createPaymentRecord(record: InsertPaymentRecord): Promise<PaymentRecord> {
    try {
      const [paymentRecord] = await db
        .insert(schema.paymentRecords)
        .values(record)
        .returning();
      return paymentRecord;
    } catch (error) {
      console.error("Database error in createPaymentRecord:", error);
      throw new Error(`Failed to create payment record: ${error.message}`);
    }
  }
  
  async updateSessionPaymentStatus(sessionId: number, status: string): Promise<boolean> {
    try {
      await db
        .update(schema.sessions)
        .set({ paymentStatus: status })
        .where(eq(schema.sessions.id, sessionId));
      return true;
    } catch (error) {
      console.error("Database error in updateSessionPaymentStatus:", error);
      return false;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await db.select().from(schema.users);
      return users;
    } catch (error) {
      console.error("Database error in getAllUsers:", error);
      return [];
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(schema.users)
        .values(insertUser)
        .returning();
      return user;
    } catch (error) {
      console.error("Database error in createUser:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(schema.users)
        .set(userData)
        .where(eq(schema.users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Database error in updateUser:", error);
      return undefined;
    }
  }

  // Therapist related methods
  async getTherapist(id: number): Promise<Therapist | undefined> {
    try {
      const [therapist] = await db.select().from(schema.therapists).where(eq(schema.therapists.id, id));
      return therapist;
    } catch (error) {
      console.error("Database error in getTherapist:", error);
      return undefined;
    }
  }

  async getAllTherapists(): Promise<Therapist[]> {
    try {
      return await db.select().from(schema.therapists);
    } catch (error) {
      console.error("Database error in getAllTherapists:", error);
      return [];
    }
  }

  async getTherapistsAvailableForEmergency(): Promise<Therapist[]> {
    try {
      console.log("[DEBUG] Iniciando busca por terapeutas disponíveis para emergência");
      
      // Buscar diretamente os status de urgência para therapists disponíveis
      const statuses = await db.execute(
        `SELECT * FROM therapist_urgency_status WHERE is_available_for_urgent = true`
      );
      
      console.log("[DEBUG] Status encontrados:", statuses.rowCount || 0);
      
      if (!statuses.rowCount || statuses.rowCount === 0) {
        console.log("[DEBUG] Nenhum terapeuta marcou disponibilidade para emergência");
        return [];
      }
      
      // Extrair IDs dos terapeutas disponíveis
      const rows = statuses.rows as { therapist_id: number }[];
      const therapistIds = rows.map(row => row.therapist_id);
      
      console.log("[DEBUG] IDs de terapeutas disponíveis:", therapistIds);
      
      if (therapistIds.length === 0) {
        return [];
      }
      
      // Obter todos os terapeutas que correspondem a esses IDs
      const availableTherapists: Therapist[] = [];
      
      for (const id of therapistIds) {
        try {
          // Primeiro buscar o usuário
          const users = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, id));
            
          if (users.length === 0) {
            console.log(`[DEBUG] Usuário ${id} não encontrado`);
            continue;
          }
          
          const user = users[0];
          
          if (!user.isTherapist) {
            console.log(`[DEBUG] Usuário ${id} não é um terapeuta`);
            continue;
          }
          
          // Buscar o terapeuta associado ao usuário
          const therapists = await db
            .select()
            .from(schema.therapists)
            .where(eq(schema.therapists.id, user.therapistId || 0));
            
          if (therapists.length > 0) {
            console.log(`[DEBUG] Terapeuta encontrado para usuário ${id}`);
            availableTherapists.push(therapists[0]);
          } else {
            console.log(`[DEBUG] Nenhum terapeuta associado ao usuário ${id}`);
            
            // Para usuários que são terapeutas mas não têm therapistId (dados de migração)
            // Vamos buscar por correspondência de email
            if (user.email) {
              const therapistsByEmail = await db
                .select()
                .from(schema.therapists)
                .where(eq(schema.therapists.email, user.email));
                
              if (therapistsByEmail.length > 0) {
                console.log(`[DEBUG] Terapeuta encontrado pelo email para usuário ${id}`);
                availableTherapists.push(therapistsByEmail[0]);
              }
            }
          }
        } catch (error) {
          console.error(`[ERROR] Erro ao processar terapeuta ${id}:`, error);
        }
      }
      
      console.log("[DEBUG] Total de terapeutas disponíveis encontrados:", availableTherapists.length);
      return availableTherapists;
    } catch (error) {
      console.error("[ERROR] Database error in getTherapistsAvailableForEmergency:", error);
      return [];
    }
  }

  async getTherapistsBySpecialization(specialization: string): Promise<Therapist[]> {
    try {
      return await db
        .select()
        .from(schema.therapists)
        .where(like(schema.therapists.specialization, `%${specialization}%`));
    } catch (error) {
      console.error("Database error in getTherapistsBySpecialization:", error);
      return [];
    }
  }

  async createTherapist(insertTherapist: InsertTherapist): Promise<Therapist> {
    try {
      const [therapist] = await db
        .insert(schema.therapists)
        .values(insertTherapist)
        .returning();
      return therapist;
    } catch (error) {
      console.error("Database error in createTherapist:", error);
      throw error;
    }
  }

  async updateTherapist(id: number, therapistData: Partial<Therapist>): Promise<Therapist | undefined> {
    try {
      const [updatedTherapist] = await db
        .update(schema.therapists)
        .set(therapistData)
        .where(eq(schema.therapists.id, id))
        .returning();
      return updatedTherapist;
    } catch (error) {
      console.error("Database error in updateTherapist:", error);
      return undefined;
    }
  }

  async getPatientsByTherapistId(therapistId: number): Promise<User[]> {
    try {
      // Buscar sessões para este terapeuta
      const sessions = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.therapistId, therapistId));
      
      // Extrair IDs únicos de usuários
      const userIds = [...new Set(sessions.map(session => session.userId))];
      
      if (userIds.length === 0) return [];
      
      // Buscar informações dos usuários
      const patients = await db
        .select()
        .from(schema.users)
        .where(
          or(...userIds.map(id => eq(schema.users.id, id)))
        );
      
      return patients;
    } catch (error) {
      console.error("Database error in getPatientsByTherapistId:", error);
      return [];
    }
  }

  // Session related methods
  async getSession(id: number): Promise<Session | undefined> {
    try {
      const [session] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id));
      return session;
    } catch (error) {
      console.error("Database error in getSession:", error);
      return undefined;
    }
  }



  /**
   * Conta o número total de sessões de um usuário, com opção de filtros
   * @param userId ID do usuário
   * @param options Opções de filtro
   * @returns Número total de sessões
   */
  async countSessionsByUser(userId: number, options: SessionQueryOptions = {}): Promise<number> {
    try {
      const { status, fromDate, toDate } = options;
      
      let query = db
        .select({ count: sql`COUNT(*)` })
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, userId));
      
      // Aplicar filtros adicionais se fornecidos
      if (status) {
        query = query.where(eq(schema.sessions.status, status));
      }
      
      if (fromDate) {
        query = query.where(gte(schema.sessions.scheduledFor, fromDate));
      }
      
      if (toDate) {
        query = query.where(lte(schema.sessions.scheduledFor, toDate));
      }
      
      const result = await query;
      return parseInt(result[0].count as string) || 0;
    } catch (error) {
      console.error("Database error in countSessionsByUser:", error);
      return 0;
    }
  }

  /**
   * Obtém as sessões de um usuário com paginação e filtros
   * @param userId ID do usuário
   * @param options Opções de filtro e paginação
   * @returns Lista de sessões
   */
  async getSessionsByUser(userId: number, options: SessionQueryOptions = {}): Promise<Session[]> {
    try {
      const { status, fromDate, toDate, offset = 0, limit = 100 } = options;
      
      let query = db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, userId));
      
      // Aplicar filtros adicionais se fornecidos
      if (status) {
        query = query.where(eq(schema.sessions.status, status));
      }
      
      if (fromDate) {
        query = query.where(gte(schema.sessions.scheduledFor, fromDate));
      }
      
      if (toDate) {
        query = query.where(lte(schema.sessions.scheduledFor, toDate));
      }
      
      // Adicionar ordenação, offset e limit
      query = query
        .orderBy(desc(schema.sessions.scheduledFor))
        .offset(offset)
        .limit(limit);
      
      return await query;
    } catch (error) {
      console.error("Database error in getSessionsByUser:", error);
      return [];
    }
  }

  async getSessionsByTherapist(therapistId: number): Promise<Session[]> {
    try {
      return await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.therapistId, therapistId));
    } catch (error) {
      console.error("Database error in getSessionsByTherapist:", error);
      return [];
    }
  }

  // Alias para getSessionsByTherapist para manter compatibilidade
  async getSessionsByTherapistId(therapistId: number): Promise<Session[]> {
    return this.getSessionsByTherapist(therapistId);
  }
  
  async getSessionsByTherapistAndDate(therapistId: number, date: Date): Promise<Session[]> {
    try {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const startDate = new Date(`${dateStr}T00:00:00.000Z`);
      const endDate = new Date(`${dateStr}T23:59:59.999Z`);
      
      return await db
        .select()
        .from(schema.sessions)
        .where(
          and(
            eq(schema.sessions.therapistId, therapistId),
            gte(schema.sessions.scheduledFor, startDate),
            lte(schema.sessions.scheduledFor, endDate)
          )
        );
    } catch (error) {
      console.error("Database error in getSessionsByTherapistAndDate:", error);
      return [];
    }
  }
  
  async cancelSession(id: number, reason: string): Promise<Session | undefined> {
    try {
      // Primeiro buscar a sessão atual para obter as notas existentes
      const [session] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id));
      
      if (!session) return undefined;
      
      // Atualizar o status e adicionar o motivo de cancelamento às notas
      const updatedNotes = session.notes 
        ? `${session.notes} | Cancelamento: ${reason}`
        : `Cancelamento: ${reason}`;
        
      const [updatedSession] = await db
        .update(schema.sessions)
        .set({
          status: "Cancelada",
          notes: updatedNotes
        })
        .where(eq(schema.sessions.id, id))
        .returning();
      return updatedSession;
    } catch (error) {
      console.error("Database error in cancelSession:", error);
      return undefined;
    }
  }
  
  async confirmSession(id: number, by: 'user' | 'therapist'): Promise<Session | undefined> {
    try {
      // Primeiro buscar a sessão atual
      const [session] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id));
      
      if (!session) return undefined;
      
      // Atualizar status para "Confirmada" diretamente
      // Como não temos mais os campos de confirmação
      const updateData: Partial<Session> = {
        status: "Confirmada"
      };
      
      const [updatedSession] = await db
        .update(schema.sessions)
        .set(updateData)
        .where(eq(schema.sessions.id, id))
        .returning();
      
      return updatedSession;
    } catch (error) {
      console.error("Database error in confirmSession:", error);
      return undefined;
    }
  }
  
  async rescheduleSession(id: number, newDate: Date): Promise<Session | undefined> {
    try {
      // Primeiro, buscar a sessão atual
      const [session] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id));
      
      if (!session) return undefined;
      
      // Marcar a sessão existente como reagendada
      await db
        .update(schema.sessions)
        .set({
          status: "Reagendada"
        })
        .where(eq(schema.sessions.id, id));
      
      // Criar nova sessão com referência à anterior (sem campos que não existem no banco)
      const insertData = {
        userId: session.userId,
        therapistId: session.therapistId,
        therapistName: session.therapistName,
        scheduledFor: newDate,
        duration: session.duration,
        status: "Confirmada", // Definir status como confirmada diretamente
        notes: session.notes,
        type: session.type
      };
      
      const [newSession] = await db
        .insert(schema.sessions)
        .values(insertData)
        .returning();
      
      return newSession;
    } catch (error) {
      console.error("Database error in rescheduleSession:", error);
      return undefined;
    }
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    try {
      const [session] = await db
        .insert(schema.sessions)
        .values(insertSession)
        .returning();
      return session;
    } catch (error) {
      console.error("Database error in createSession:", error);
      throw error;
    }
  }

  async updateSession(id: number, sessionData: Partial<Session>): Promise<Session | undefined> {
    try {
      const [updatedSession] = await db
        .update(schema.sessions)
        .set(sessionData)
        .where(eq(schema.sessions.id, id))
        .returning();
      return updatedSession;
    } catch (error) {
      console.error("Database error in updateSession:", error);
      return undefined;
    }
  }

  // Journal entry methods
  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    try {
      const [entry] = await db
        .select()
        .from(schema.journalEntries)
        .where(eq(schema.journalEntries.id, id));
      return entry;
    } catch (error) {
      console.error("Database error in getJournalEntry:", error);
      return undefined;
    }
  }

  async getJournalEntriesByUser(userId: number, options?: { limit?: number }): Promise<JournalEntry[]> {
    try {
      // Selecionar campos específicos para evitar problemas com colunas que possam estar faltando no banco de dados
      let query = db
        .select({
          id: schema.journalEntries.id,
          userId: schema.journalEntries.userId,
          content: schema.journalEntries.content,
          date: schema.journalEntries.date,
          mood: schema.journalEntries.mood,
          category: schema.journalEntries.category,
          tags: schema.journalEntries.tags,
          summary: schema.journalEntries.summary,
          colorHex: schema.journalEntries.colorHex,
          audioUrl: schema.journalEntries.audioUrl,
          audioDuration: schema.journalEntries.audioDuration,
          position: schema.journalEntries.position,
          title: schema.journalEntries.title,
          moodAnalysis: schema.journalEntries.moodAnalysis,
          emotionalTone: schema.journalEntries.emotionalTone,
          sentimentScore: schema.journalEntries.sentimentScore,
          dominantEmotions: schema.journalEntries.dominantEmotions,
          recommendedActions: schema.journalEntries.recommendedActions,
          processingStatus: schema.journalEntries.processingStatus,
          processingProgress: schema.journalEntries.processingProgress
        })
        .from(schema.journalEntries)
        .where(eq(schema.journalEntries.userId, userId))
        .orderBy(desc(schema.journalEntries.date));
      
      // Aplicar limite se especificado
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const entries = await query;
      
      // Adicionar título padrão para entradas que não têm um
      return entries.map(entry => ({
        ...entry,
        title: entry.title || "Entrada de diário" // Usar título existente ou adicionar um padrão
      }));
    } catch (error) {
      console.error("Database error in getJournalEntriesByUser:", error);
      return [];
    }
  }
  
  async getRecentJournalEntries(limit: number = 10): Promise<JournalEntry[]> {
    try {
      // Selecionar campos específicos para evitar problemas com colunas que possam estar faltando no banco de dados
      const query = db
        .select({
          id: schema.journalEntries.id,
          userId: schema.journalEntries.userId,
          content: schema.journalEntries.content,
          date: schema.journalEntries.date,
          mood: schema.journalEntries.mood,
          category: schema.journalEntries.category,
          tags: schema.journalEntries.tags,
          summary: schema.journalEntries.summary,
          colorHex: schema.journalEntries.colorHex,
          audioUrl: schema.journalEntries.audioUrl,
          audioDuration: schema.journalEntries.audioDuration,
          position: schema.journalEntries.position,
          title: schema.journalEntries.title,
          moodAnalysis: schema.journalEntries.moodAnalysis,
          emotionalTone: schema.journalEntries.emotionalTone,
          sentimentScore: schema.journalEntries.sentimentScore,
          dominantEmotions: schema.journalEntries.dominantEmotions,
          recommendedActions: schema.journalEntries.recommendedActions,
          processingStatus: schema.journalEntries.processingStatus,
          processingProgress: schema.journalEntries.processingProgress
        })
        .from(schema.journalEntries)
        .orderBy(desc(schema.journalEntries.date))
        .limit(limit);

      const entries = await query;
      
      // Adicionar título padrão para entradas que não têm um
      return entries.map(entry => ({
        ...entry,
        title: entry.title || "Entrada de diário" // Usar título existente ou adicionar um padrão
      }));
    } catch (error) {
      console.error("Database error in getRecentJournalEntries:", error);
      return [];
    }
  }

  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    try {
      const [entry] = await db
        .insert(schema.journalEntries)
        .values(insertEntry)
        .returning();
      return entry;
    } catch (error) {
      console.error("Database error in createJournalEntry:", error);
      throw error;
    }
  }

  async updateJournalEntry(id: number, entryData: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    try {
      const [updatedEntry] = await db
        .update(schema.journalEntries)
        .set(entryData)
        .where(eq(schema.journalEntries.id, id))
        .returning();
      return updatedEntry;
    } catch (error) {
      console.error("Database error in updateJournalEntry:", error);
      return undefined;
    }
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    try {
      console.log(`[DATABASE] Iniciando exclusão da entrada do diário ID: ${id}`);
      
      // Primeiro, verificar se a entrada existe
      const [entry] = await db
        .select()
        .from(schema.journalEntries)
        .where(eq(schema.journalEntries.id, id));
      
      if (!entry) {
        console.log(`[DATABASE] Entrada ID ${id} não encontrada para exclusão`);
        return false;
      }
      
      console.log(`[DATABASE] Entrada ID ${id} encontrada, prosseguindo com exclusão`);
      
      // Executar a exclusão
      const result = await db
        .delete(schema.journalEntries)
        .where(eq(schema.journalEntries.id, id));
      
      console.log(`[DATABASE] Entrada ID ${id} excluída com sucesso`);
      return true;
    } catch (error) {
      console.error(`[DATABASE] Erro ao excluir entrada ID ${id}:`, error);
      return false;
    }
  }

  // Self-help tools methods
  async getSelfHelpTool(id: number): Promise<SelfHelpTool | undefined> {
    try {
      const [tool] = await db
        .select()
        .from(schema.selfHelpTools)
        .where(eq(schema.selfHelpTools.id, id));
      return tool;
    } catch (error) {
      console.error("Database error in getSelfHelpTool:", error);
      return undefined;
    }
  }

  async getAllSelfHelpTools(): Promise<SelfHelpTool[]> {
    try {
      return await db.select().from(schema.selfHelpTools);
    } catch (error) {
      console.error("Database error in getAllSelfHelpTools:", error);
      return [];
    }
  }

  async getSelfHelpToolsByCategory(category: string): Promise<SelfHelpTool[]> {
    try {
      return await db
        .select()
        .from(schema.selfHelpTools)
        .where(eq(schema.selfHelpTools.category, category));
    } catch (error) {
      console.error("Database error in getSelfHelpToolsByCategory:", error);
      return [];
    }
  }

  async createSelfHelpTool(insertTool: InsertSelfHelpTool): Promise<SelfHelpTool> {
    try {
      const [tool] = await db
        .insert(schema.selfHelpTools)
        .values(insertTool)
        .returning();
      return tool;
    } catch (error) {
      console.error("Database error in createSelfHelpTool:", error);
      throw error;
    }
  }

  // Progress tracking methods
  async getProgressTracking(id: number): Promise<ProgressTracking | undefined> {
    try {
      const [tracking] = await db
        .select()
        .from(schema.progressTrackings)
        .where(eq(schema.progressTrackings.id, id));
      return tracking;
    } catch (error) {
      console.error("Database error in getProgressTracking:", error);
      return undefined;
    }
  }

  async getProgressTrackingsByUser(userId: number): Promise<ProgressTracking[]> {
    try {
      return await db
        .select()
        .from(schema.progressTrackings)
        .where(eq(schema.progressTrackings.userId, userId))
        .orderBy(desc(schema.progressTrackings.date));
    } catch (error) {
      console.error("Database error in getProgressTrackingsByUser:", error);
      return [];
    }
  }

  async createProgressTracking(insertTracking: InsertProgressTracking): Promise<ProgressTracking> {
    try {
      const [tracking] = await db
        .insert(schema.progressTrackings)
        .values(insertTracking)
        .returning();
      return tracking;
    } catch (error) {
      console.error("Database error in createProgressTracking:", error);
      throw error;
    }
  }

  // Daily tips methods
  async getDailyTip(id: number): Promise<DailyTip | undefined> {
    try {
      const [tip] = await db
        .select()
        .from(schema.dailyTips)
        .where(eq(schema.dailyTips.id, id));
      return tip;
    } catch (error) {
      console.error("Database error in getDailyTip:", error);
      return undefined;
    }
  }

  async getAllDailyTips(): Promise<DailyTip[]> {
    try {
      return await db
        .select()
        .from(schema.dailyTips)
        .orderBy(desc(schema.dailyTips.createdAt));
    } catch (error) {
      console.error("Database error in getAllDailyTips:", error);
      return [];
    }
  }

  async getDailyTipsByCategory(category: string): Promise<DailyTip[]> {
    try {
      return await db
        .select()
        .from(schema.dailyTips)
        .where(eq(schema.dailyTips.category, category))
        .orderBy(desc(schema.dailyTips.createdAt));
    } catch (error) {
      console.error("Database error in getDailyTipsByCategory:", error);
      return [];
    }
  }
  
  async getDailyTipsByUser(userId: number): Promise<DailyTip[]> {
    try {
      return await db
        .select()
        .from(schema.dailyTips)
        .where(eq(schema.dailyTips.userId, userId))
        .orderBy(desc(schema.dailyTips.createdAt));
    } catch (error) {
      console.error("Database error in getDailyTipsByUser:", error);
      return [];
    }
  }

  async createDailyTip(insertTip: InsertDailyTip): Promise<DailyTip> {
    try {
      const [tip] = await db
        .insert(schema.dailyTips)
        .values(insertTip)
        .returning();
      return tip;
    } catch (error) {
      console.error("Database error in createDailyTip:", error);
      throw error;
    }
  }
  
  async getDailyTipById(id: number): Promise<DailyTip | undefined> {
    return this.getDailyTip(id);
  }
  
  async getLatestDailyTip(userId: number): Promise<DailyTip | undefined> {
    try {
      // Buscar a dica mais recente relevante para o usuário
      const [tip] = await db
        .select()
        .from(schema.dailyTips)
        .where(or(
          eq(schema.dailyTips.userId, userId),
          isNull(schema.dailyTips.userId)
        ))
        .orderBy(desc(schema.dailyTips.createdAt))
        .limit(1);
      
      return tip;
    } catch (error) {
      console.error("Database error in getLatestDailyTip:", error);
      return undefined;
    }
  }
  
  async getRandomDailyTip(userId: number): Promise<DailyTip | undefined> {
    try {
      // Buscar todas as dicas relevantes para o usuário
      const tips = await db
        .select()
        .from(schema.dailyTips)
        .where(or(
          eq(schema.dailyTips.userId, userId),
          isNull(schema.dailyTips.userId)
        ));
      
      if (tips.length === 0) {
        return undefined;
      }
      
      // Selecionar uma dica aleatória
      const randomIndex = Math.floor(Math.random() * tips.length);
      return tips[randomIndex];
    } catch (error) {
      console.error("Database error in getRandomDailyTip:", error);
      return undefined;
    }
  }
  
  async hasViewedDailyTip(userId: number, tipId: number): Promise<boolean> {
    try {
      // Verificar se existe um registro na tabela viewedDailyTips
      const [result] = await db
        .select()
        .from(schema.viewedDailyTips)
        .where(and(
          eq(schema.viewedDailyTips.userId, userId),
          eq(schema.viewedDailyTips.tipId, tipId)
        ));
      
      return !!result;
    } catch (error) {
      console.error("Database error in hasViewedDailyTip:", error);
      return false;
    }
  }
  
  async markDailyTipAsViewed(userId: number, tipId: number): Promise<boolean> {
    try {
      // Verificar se a dica existe
      const tip = await this.getDailyTip(tipId);
      if (!tip) {
        return false;
      }
      
      // Verificar se já foi visualizada
      const alreadyViewed = await this.hasViewedDailyTip(userId, tipId);
      if (alreadyViewed) {
        return true; // Já está marcada como visualizada
      }
      
      // Marcar como visualizada
      await db
        .insert(schema.viewedDailyTips)
        .values({
          userId,
          tipId,
          viewedAt: new Date()
        });
      
      return true;
    } catch (error) {
      console.error("Database error in markDailyTipAsViewed:", error);
      return false;
    }
  }
  
  async getViewedDailyTips(userId: number): Promise<number[]> {
    try {
      // Buscar todos os IDs de dicas visualizadas pelo usuário
      const viewed = await db
        .select({ tipId: schema.viewedDailyTips.tipId })
        .from(schema.viewedDailyTips)
        .where(eq(schema.viewedDailyTips.userId, userId));
      
      return viewed.map(v => v.tipId);
    } catch (error) {
      console.error("Database error in getViewedDailyTips:", error);
      return [];
    }
  }

  // Daily streak methods
  async getDailyStreak(userId: number): Promise<DailyStreak | undefined> {
    try {
      const [streak] = await db
        .select()
        .from(schema.dailyStreaks)
        .where(eq(schema.dailyStreaks.userId, userId));
      return streak;
    } catch (error) {
      console.error("Database error in getDailyStreak:", error);
      return undefined;
    }
  }

  async createDailyStreak(userId: number): Promise<DailyStreak> {
    try {
      const now = new Date();
      const [streak] = await db
        .insert(schema.dailyStreaks)
        .values({
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastCheckin: now,
          activities: ['initial_checkin']
        })
        .returning();
      return streak;
    } catch (error) {
      console.error("Database error in createDailyStreak:", error);
      throw error;
    }
  }

  async updateDailyStreak(userId: number, activity: string): Promise<DailyStreak> {
    try {
      // Tenta obter o streak existente
      let streak = await this.getDailyStreak(userId);
      
      const now = new Date();
      
      if (!streak) {
        // Se não existir, cria um novo
        return this.createDailyStreak(userId);
      }
      
      // Verificar se faz mais de 24h desde o último checkin
      const lastCheckin = streak.lastCheckin ? new Date(streak.lastCheckin) : null;
      const isNewDay = lastCheckin ? 
        (now.getTime() - lastCheckin.getTime() > 24 * 60 * 60 * 1000) &&
        (now.toDateString() !== lastCheckin.toDateString()) : 
        true;
      
      // Se for um novo dia, incrementar o streak
      if (isNewDay) {
        const currentStreak = streak.currentStreak + 1;
        const longestStreak = Math.max(currentStreak, streak.longestStreak);
        const activities = [...(streak.activities || []), activity];
        
        // Atualizar o streak
        const [updatedStreak] = await db
          .update(schema.dailyStreaks)
          .set({
            currentStreak,
            longestStreak,
            lastCheckin: now,
            activities
          })
          .where(eq(schema.dailyStreaks.userId, userId))
          .returning();
        
        return updatedStreak;
      } else {
        // Atualizar apenas as atividades e o timestamp
        const activities = streak.activities ? 
          (streak.activities.includes(activity) ? 
            streak.activities : [...streak.activities, activity]) : 
          [activity];
        
        const [updatedStreak] = await db
          .update(schema.dailyStreaks)
          .set({
            lastCheckin: now,
            activities
          })
          .where(eq(schema.dailyStreaks.userId, userId))
          .returning();
        
        return updatedStreak;
      }
    } catch (error) {
      console.error("Database error in updateDailyStreak:", error);
      throw error;
    }
  }
  
  /**
   * Atualizar automaticamente o streak do usuário quando ele realiza uma atividade na plataforma
   * Este método utiliza a mesma lógica do updateDailyStreak
   * 
   * @param userId ID do usuário
   * @param activityType Tipo de atividade realizada (ex: journal, assistant, self-help)
   * @returns Objeto DailyStreak atualizado
   */
  async autoUpdateDailyStreak(userId: number, activityType: string): Promise<DailyStreak> {
    try {
      // Usar a mesma lógica do updateDailyStreak
      return this.updateDailyStreak(userId, activityType);
    } catch (error) {
      console.error("Database error in autoUpdateDailyStreak:", error);
      throw error;
    }
  }

  async resetDailyStreak(userId: number): Promise<DailyStreak> {
    try {
      const now = new Date();
      
      const [updatedStreak] = await db
        .update(schema.dailyStreaks)
        .set({
          currentStreak: 0,
          lastCheckin: now,
          activities: ['reset']
        })
        .where(eq(schema.dailyStreaks.userId, userId))
        .returning();
      
      if (!updatedStreak) {
        return this.createDailyStreak(userId);
      }
      
      return updatedStreak;
    } catch (error) {
      console.error("Database error in resetDailyStreak:", error);
      throw error;
    }
  }

  // Implementações para os outros métodos seguiriam o mesmo padrão...
  // Aqui estou implementando apenas os principais métodos para exemplificar
  // o padrão de implementação usando Drizzle ORM
  
  // É possível implementar os demais métodos conforme necessário, seguindo a mesma estrutura
  
  // Vamos adicionar stubs para os métodos que faltam
  
  // Notifications
  async getNotification(id: number): Promise<Notification | undefined> {
    // Implementação futura
    return undefined;
  }
  
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    // Implementação futura
    return [];
  }
  
  async getUnreadNotificationsByUser(userId: number): Promise<Notification[]> {
    // Implementação futura
    return [];
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db
        .insert(schema.notifications)
        .values({
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          relatedId: notification.relatedId || null,
          read: false
        })
        .returning();
        
      return newNotification;
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
      throw new Error("Falha ao criar notificação");
    }
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    // Implementação futura
    return undefined;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    // Implementação futura
    return false;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    // Implementação futura
    return false;
  }
  
  // Therapist reviews
  async getTherapistReview(id: number): Promise<TherapistReview | undefined> {
    // Implementação futura
    return undefined;
  }
  
  async getTherapistReviewsByTherapist(therapistId: number): Promise<TherapistReview[]> {
    // Implementação futura
    return [];
  }
  
  async getTherapistReviewsByUser(userId: number): Promise<TherapistReview[]> {
    // Implementação futura
    return [];
  }
  
  async createTherapistReview(review: InsertTherapistReview): Promise<TherapistReview> {
    // Implementação futura
    throw new Error("Method not implemented.");
  }
  
  async updateTherapistReview(id: number, review: Partial<TherapistReview>): Promise<TherapistReview | undefined> {
    // Implementação futura
    return undefined;
  }
  
  async deleteTherapistReview(id: number): Promise<boolean> {
    // Implementação futura
    return false;
  }
  
  // Content recommendations
  async getContentRecommendation(id: number): Promise<ContentRecommendation | undefined> {
    // Implementação futura
    return undefined;
  }
  
  async getContentRecommendationsByUser(userId: number): Promise<ContentRecommendation[]> {
    // Implementação futura
    return [];
  }
  
  async getContentRecommendationsByCategory(category: string): Promise<ContentRecommendation[]> {
    // Implementação futura
    return [];
  }
  
  async getUnreadContentRecommendationsByUser(userId: number): Promise<ContentRecommendation[]> {
    // Implementação futura
    return [];
  }
  
  async createContentRecommendation(recommendation: InsertContentRecommendation): Promise<ContentRecommendation> {
    try {
      console.log(`[DatabaseStorage] Criando recomendação de conteúdo para usuário ${recommendation.userId}`);
      
      const [newRecommendation] = await db
        .insert(contentRecommendations)
        .values({
          ...recommendation,
          // Definir valores padrão para campos opcionais ou ausentes
          contentUrl: recommendation.contentUrl || null,
          imageUrl: recommendation.imageUrl || null,
          content: recommendation.content || null,
          tags: recommendation.tags || [],
          relatedJournalIds: recommendation.relatedJournalIds || [],
          priority: recommendation.priority || 0,
          isRead: false,
          createdAt: new Date()
        })
        .returning();
        
      console.log(`[DatabaseStorage] Recomendação de conteúdo criada com ID ${newRecommendation.id}`);
      return newRecommendation;
    } catch (error) {
      console.error(`[DatabaseStorage] Erro ao criar recomendação de conteúdo:`, error);
      // Criar versão em memória para evitar falhas críticas
      const fallbackRecommendation: ContentRecommendation = {
        ...recommendation,
        id: Math.floor(Math.random() * 10000),
        contentUrl: recommendation.contentUrl || null,
        imageUrl: recommendation.imageUrl || null,
        content: recommendation.content || null,
        tags: recommendation.tags || [],
        relatedJournalIds: recommendation.relatedJournalIds || [],
        priority: recommendation.priority || 0,
        isRead: false,
        createdAt: new Date()
      };
      
      console.log(`[DatabaseStorage] Criada recomendação fallback com ID ${fallbackRecommendation.id}`);
      return fallbackRecommendation;
    }
  }
  
  async markContentRecommendationAsRead(id: number): Promise<ContentRecommendation | undefined> {
    try {
      const [updatedRecommendation] = await db
        .update(contentRecommendations)
        .set({ isRead: true })
        .where(eq(contentRecommendations.id, id))
        .returning();
        
      if (updatedRecommendation) {
        console.log(`[DatabaseStorage] Marcada recomendação ${id} como lida`);
        return updatedRecommendation;
      } else {
        console.log(`[DatabaseStorage] Recomendação ${id} não encontrada`);
        return undefined;
      }
    } catch (error) {
      console.error(`[DatabaseStorage] Erro ao marcar recomendação ${id} como lida:`, error);
      return undefined;
    }
  }
  
  async deleteContentRecommendation(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(contentRecommendations)
        .where(eq(contentRecommendations.id, id));
        
      const success = result.rowCount > 0;
      if (success) {
        console.log(`[DatabaseStorage] Recomendação ${id} excluída com sucesso`);
      } else {
        console.log(`[DatabaseStorage] Recomendação ${id} não encontrada para exclusão`);
      }
      
      return success;
    } catch (error) {
      console.error(`[DatabaseStorage] Erro ao excluir recomendação ${id}:`, error);
      return false;
    }
  }
  
  // Chat messages
  async getChatMessage(id: number): Promise<ChatMessage | undefined> {
    // Implementação futura
    return undefined;
  }
  
  async getChatMessagesByUser(userId: number, limit?: number): Promise<ChatMessage[]> {
    const query = db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(asc(chatMessages.timestamp));
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }
  
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    
    return newMessage;
  }
  
  async deleteChatMessage(id: number): Promise<boolean> {
    const result = await db
      .delete(chatMessages)
      .where(eq(chatMessages.id, id));
    
    return result.rowCount > 0;
  }
  
  async clearChatHistory(userId: number): Promise<boolean> {
    try {
      await db
        .delete(chatMessages)
        .where(eq(chatMessages.userId, userId));
      return true;
    } catch (error) {
      console.error("Erro ao limpar histórico de chat:", error);
      return false;
    }
  }
  
  // Therapist availability
  async getTherapistAvailability(id: number): Promise<TherapistAvailability | undefined> {
    try {
      const [availability] = await db
        .select()
        .from(schema.therapistAvailability)
        .where(eq(schema.therapistAvailability.id, id));
      
      return availability;
    } catch (error) {
      console.error("Database error in getTherapistAvailability:", error);
      return undefined;
    }
  }
  
  async getTherapistAvailabilitiesByTherapist(therapistId: number): Promise<TherapistAvailability[]> {
    try {
      const availabilities = await db
        .select()
        .from(schema.therapistAvailability)
        .where(eq(schema.therapistAvailability.therapistId, therapistId));
      
      return availabilities;
    } catch (error) {
      console.error("Database error in getTherapistAvailabilitiesByTherapist:", error);
      return [];
    }
  }
  
  async createTherapistAvailability(availability: InsertTherapistAvailability): Promise<TherapistAvailability> {
    try {
      const [newAvailability] = await db
        .insert(schema.therapistAvailability)
        .values({
          ...availability,
          specificDate: availability.specificDate || null,
        })
        .returning();
      
      return newAvailability;
    } catch (error) {
      console.error("Database error in createTherapistAvailability:", error);
      throw new Error("Falha ao criar disponibilidade do terapeuta.");
    }
  }
  
  async updateTherapistAvailability(id: number, availability: Partial<TherapistAvailability>): Promise<TherapistAvailability | undefined> {
    try {
      const [updatedAvailability] = await db
        .update(schema.therapistAvailability)
        .set(availability)
        .where(eq(schema.therapistAvailability.id, id))
        .returning();
      
      return updatedAvailability;
    } catch (error) {
      console.error("Database error in updateTherapistAvailability:", error);
      return undefined;
    }
  }
  
  async deleteTherapistAvailability(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(schema.therapistAvailability)
        .where(eq(schema.therapistAvailability.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error("Database error in deleteTherapistAvailability:", error);
      return false;
    }
  }
  
  // Therapist urgency status
  async getTherapistUrgencyStatus(therapistId: number): Promise<TherapistUrgencyStatus | undefined> {
    try {
      const [status] = await db.select()
        .from(schema.therapistUrgencyStatus)
        .where(eq(schema.therapistUrgencyStatus.therapistId, therapistId));
      
      return status;
    } catch (error) {
      console.error("Erro ao buscar status de urgência do terapeuta:", error);
      return undefined;
    }
  }
  
  async getAllAvailableTherapistsForUrgent(): Promise<number[]> {
    try {
      const now = new Date();
      
      // Buscar no banco de dados todos os terapeutas com status de urgência ativo
      const result = await db.select({ therapistId: schema.therapistUrgencyStatus.therapistId })
        .from(schema.therapistUrgencyStatus)
        .where(and(
          eq(schema.therapistUrgencyStatus.isAvailableForUrgent, true),
          or(
            isNull(schema.therapistUrgencyStatus.availableUntil),
            gt(schema.therapistUrgencyStatus.availableUntil, now)
          )
        ));
      
      // Retorna apenas os IDs dos terapeutas disponíveis
      return result.map(row => row.therapistId);
    } catch (error) {
      console.error("Erro ao buscar terapeutas disponíveis para urgência:", error);
      return [];
    }
  }
  
  async updateTherapistUrgencyStatus(therapistId: number, status: Partial<InsertTherapistUrgencyStatus>): Promise<TherapistUrgencyStatus> {
    try {
      // Verificando se já existe um status para esse terapeuta
      const existingStatus = await this.getTherapistUrgencyStatus(therapistId);
      
      if (existingStatus) {
        // Atualizar status existente
        const [updatedStatus] = await db
          .update(schema.therapistUrgencyStatus)
          .set({
            ...status,
            lastUpdated: new Date()
          })
          .where(eq(schema.therapistUrgencyStatus.therapistId, therapistId))
          .returning();
        
        return updatedStatus;
      } else {
        // Criar um novo status
        const [newStatus] = await db
          .insert(schema.therapistUrgencyStatus)
          .values({
            therapistId,
            isAvailableForUrgent: status.isAvailableForUrgent || false,
            availableUntil: status.availableUntil || null,
            maxWaitingTime: status.maxWaitingTime || null
          })
          .returning();
        
        return newStatus;
      }
    } catch (error) {
      console.error("Erro ao atualizar status de urgência do terapeuta:", error);
      throw error;
    }
  }
  
  // Voice check-in
  async getVoiceCheckinsByUserId(userId: number): Promise<VoiceCheckin[]> {
    // Implementação futura
    return [];
  }
  
  async getVoiceCheckinById(id: number): Promise<VoiceCheckin | null> {
    // Implementação futura
    return null;
  }
  
  async createVoiceCheckin(data: InsertVoiceCheckin): Promise<VoiceCheckin> {
    // Implementação futura
    throw new Error("Method not implemented.");
  }
  
  // Therapist briefing methods
  async getTherapistBriefingById(id: number): Promise<TherapistBriefing | null> {
    try {
      const [briefing] = await db
        .select()
        .from(schema.therapistBriefings)
        .where(eq(schema.therapistBriefings.id, id));
      return briefing || null;
    } catch (error) {
      console.error("Database error in getTherapistBriefingById:", error);
      return null;
    }
  }
  
  async getTherapistBriefingsByTherapistId(therapistId: number): Promise<TherapistBriefing[]> {
    try {
      return await db
        .select()
        .from(schema.therapistBriefings)
        .where(eq(schema.therapistBriefings.therapistId, therapistId))
        .orderBy(desc(schema.therapistBriefings.createdAt));
    } catch (error) {
      console.error("Database error in getTherapistBriefingsByTherapistId:", error);
      return [];
    }
  }
  
  async getTherapistBriefingsByPatientId(patientId: number): Promise<TherapistBriefing[]> {
    try {
      return await db
        .select()
        .from(schema.therapistBriefings)
        .where(eq(schema.therapistBriefings.patientId, patientId))
        .orderBy(desc(schema.therapistBriefings.createdAt));
    } catch (error) {
      console.error("Database error in getTherapistBriefingsByPatientId:", error);
      return [];
    }
  }
  
  async getTherapistBriefingBySessionId(sessionId: number): Promise<TherapistBriefing | null> {
    try {
      const [briefing] = await db
        .select()
        .from(schema.therapistBriefings)
        .where(eq(schema.therapistBriefings.sessionId, sessionId));
      return briefing || null;
    } catch (error) {
      console.error("Database error in getTherapistBriefingBySessionId:", error);
      return null;
    }
  }
  
  async createTherapistBriefing(data: InsertTherapistBriefing): Promise<TherapistBriefing> {
    try {
      const [briefing] = await db
        .insert(schema.therapistBriefings)
        .values(data)
        .returning();
      return briefing;
    } catch (error) {
      console.error("Database error in createTherapistBriefing:", error);
      throw error;
    }
  }
  
  async markTherapistBriefingAsViewed(id: number): Promise<TherapistBriefing | null> {
    try {
      const [briefing] = await db
        .update(schema.therapistBriefings)
        .set({ hasBeenViewed: true })
        .where(eq(schema.therapistBriefings.id, id))
        .returning();
      return briefing || null;
    } catch (error) {
      console.error("Database error in markTherapistBriefingAsViewed:", error);
      return null;
    }
  }
  
  async deleteTherapistBriefing(id: number): Promise<boolean> {
    try {
      await db
        .delete(schema.therapistBriefings)
        .where(eq(schema.therapistBriefings.id, id));
      return true;
    } catch (error) {
      console.error("Database error in deleteTherapistBriefing:", error);
      return false;
    }
  }
  
  async getSessionsBetweenTherapistAndPatient(therapistId: number, patientId: number): Promise<Session[]> {
    try {
      return await db
        .select()
        .from(schema.sessions)
        .where(
          and(
            eq(schema.sessions.therapistId, therapistId),
            eq(schema.sessions.userId, patientId)
          )
        )
        .orderBy(desc(schema.sessions.createdAt));
    } catch (error) {
      console.error("Database error in getSessionsBetweenTherapistAndPatient:", error);
      return [];
    }
  }
  
  // Emergency Call methods para DatabaseStorage
  async getEmergencyCall(id: number): Promise<EmergencyCall | undefined> {
    try {
      const [call] = await db
        .select()
        .from(schema.emergencyCalls)
        .where(eq(schema.emergencyCalls.id, id));
      return call;
    } catch (error) {
      console.error("Database error in getEmergencyCall:", error);
      return undefined;
    }
  }

  async getEmergencyCallByRoomName(roomName: string): Promise<EmergencyCall | undefined> {
    try {
      const [call] = await db
        .select()
        .from(schema.emergencyCalls)
        .where(eq(schema.emergencyCalls.roomName, roomName));
      return call;
    } catch (error) {
      console.error("Database error in getEmergencyCallByRoomName:", error);
      return undefined;
    }
  }

  async getEmergencyCallsByUser(userId: number): Promise<EmergencyCall[]> {
    try {
      return await db
        .select()
        .from(schema.emergencyCalls)
        .where(eq(schema.emergencyCalls.userId, userId))
        .orderBy(desc(schema.emergencyCalls.startedAt));
    } catch (error) {
      console.error("Database error in getEmergencyCallsByUser:", error);
      return [];
    }
  }

  async getEmergencyCallsByTherapist(therapistId: number): Promise<EmergencyCall[]> {
    try {
      return await db
        .select()
        .from(schema.emergencyCalls)
        .where(eq(schema.emergencyCalls.therapistId, therapistId))
        .orderBy(desc(schema.emergencyCalls.startedAt));
    } catch (error) {
      console.error("Database error in getEmergencyCallsByTherapist:", error);
      return [];
    }
  }

  async createEmergencyCall(call: InsertEmergencyCall): Promise<EmergencyCall> {
    try {
      const [emergencyCall] = await db
        .insert(schema.emergencyCalls)
        .values({
          ...call,
          startedAt: call.startedAt || new Date(),
          endedAt: null,
          duration: null
        })
        .returning();
      return emergencyCall;
    } catch (error) {
      console.error("Database error in createEmergencyCall:", error);
      throw new Error(`Failed to create emergency call: ${error.message}`);
    }
  }

  async updateEmergencyCall(call: Partial<EmergencyCall> & { id: number }): Promise<EmergencyCall | undefined> {
    try {
      const [updatedCall] = await db
        .update(schema.emergencyCalls)
        .set(call)
        .where(eq(schema.emergencyCalls.id, call.id))
        .returning();
      return updatedCall;
    } catch (error) {
      console.error("Database error in updateEmergencyCall:", error);
      return undefined;
    }
  }

  async completeEmergencyCall(id: number, endedAt: Date, feedback?: string, rating?: number): Promise<EmergencyCall | undefined> {
    try {
      // Primeiro buscar a chamada existente para calcular a duração
      const [existingCall] = await db
        .select()
        .from(schema.emergencyCalls)
        .where(eq(schema.emergencyCalls.id, id));
      
      if (!existingCall) {
        return undefined;
      }
      
      // Calcular a duração em segundos
      const duration = existingCall.startedAt ? 
        Math.round((endedAt.getTime() - existingCall.startedAt.getTime()) / 1000) : null;
      
      // Atualizar a chamada com status de completada e duração
      const [updatedCall] = await db
        .update(schema.emergencyCalls)
        .set({
          status: 'completed',
          endedAt,
          duration,
          feedback: feedback || existingCall.feedback,
          rating: rating !== undefined ? rating : existingCall.rating
        })
        .where(eq(schema.emergencyCalls.id, id))
        .returning();
      
      return updatedCall;
    } catch (error) {
      console.error("Database error in completeEmergencyCall:", error);
      return undefined;
    }
  }
  
  // Medical Records
  async getMedicalRecordById(id: number): Promise<MedicalRecord | null> {
    // Implementação futura
    return null;
  }
  
  async getMedicalRecordsByPatientId(patientId: number): Promise<MedicalRecord[]> {
    // Implementação futura
    return [];
  }
  
  async getMedicalRecordsByTherapistId(therapistId: number): Promise<MedicalRecord[]> {
    // Implementação futura
    return [];
  }
  
  async getMedicalRecordsBySessionId(sessionId: number): Promise<MedicalRecord | null> {
    // Implementação futura
    return null;
  }
  
  async createMedicalRecord(data: InsertMedicalRecord): Promise<MedicalRecord> {
    // Implementação futura
    throw new Error("Method not implemented.");
  }
  
  async updateMedicalRecord(id: number, data: Partial<MedicalRecord>): Promise<MedicalRecord | null> {
    // Implementação futura
    return null;
  }
  
  async deleteMedicalRecord(id: number): Promise<boolean> {
    // Implementação futura
    return false;
  }
}

// Alterar de MemStorage para DatabaseStorage para usar o banco PostgreSQL
export const storage = new DatabaseStorage();
