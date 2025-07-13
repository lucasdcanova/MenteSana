import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, time, date, real, primaryKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum para tipos de consentimento
export const ConsentTypes = {
  ESSENTIAL: 'essential',
  MARKETING: 'marketing',
  THIRD_PARTY: 'third_party',
  ANALYTICS: 'analytics',
  PERSONALIZATION: 'personalization'
} as const;

// Enum para tipos de processamento de dados
export const DataProcessingActionTypes = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  EXPORT: 'export',
  ANONYMIZE: 'anonymize',
  SHARE: 'share'
} as const;

// Users table com campos expandidos para o perfil
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  dateOfBirth: timestamp("date_of_birth"),
  profilePicture: text("profile_picture"),
  bio: text("bio"),
  preferences: json("preferences").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isTherapist: boolean("is_therapist").default(false).notNull(),
  therapistId: integer("therapist_id"),
  // Novos campos para o perfil
  gender: text("gender"),
  location: text("location"),
  phone: text("phone"),
  occupation: text("occupation"),
  fears: jsonb("fears").default([]),
  anxieties: jsonb("anxieties").default([]),
  goals: jsonb("goals").default([]),
  medicalHistory: jsonb("medical_history").default({}),
  emergencyContact: jsonb("emergency_contact").default({}),
  privacySettings: jsonb("privacy_settings").default({
    allowJournalDataCollection: true,
    allowAssistantDataCollection: true,
    allowDataSharingWithTherapist: true
  }),
  // Campos para integração com Stripe
  stripeCustomerId: text("stripe_customer_id"), // ID do cliente no Stripe
  stripeSubscriptionId: text("stripe_subscription_id"), // ID da assinatura ativa no Stripe
  stripeSubscriptionStatus: text("stripe_subscription_status"), // Status da assinatura (active, canceled, etc)
  stripePaymentMethods: jsonb("stripe_payment_methods").default([]), // Métodos de pagamento salvos
});

// Esquema de inserção de usuário com validações melhoradas
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres").max(30, "Nome de usuário deve ter no máximo 30 caracteres"),
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  isTherapist: z.boolean().default(false),
  // Os campos opcionais continuam como padrão
}).omit({
  id: true,
  createdAt: true,
});

// Therapists table expandida com mais detalhes do perfil profissional
export const therapists = pgTable("therapists", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  specialization: text("specialization").notNull(),
  bio: text("bio").notNull(),
  imageUrl: text("image_url"),
  rating: real("rating"),
  tags: text("tags").array().notNull(),
  availability: json("availability").notNull(),
  location: text("location"),
  hourlyRate: real("hourly_rate"),
  email: text("email"),
  phone: text("phone"),
  // Campos adicionais para o perfil profissional
  education: text("education"),
  graduationYear: integer("graduation_year"), // Ano de formatura
  diplomaUrl: text("diploma_url"), // URL para o diploma enviado
  universityName: text("university_name"), // Nome da universidade
  licenseNumber: text("license_number"), // Número da licença profissional
  experience: text("experience").array(),
  certifications: text("certifications").array(),
  languages: text("languages").array(),
  approachDescription: text("approach_description"),
  treatmentMethods: text("treatment_methods").array(),
  professionalBio: text("professional_bio"),
  videoIntroUrl: text("video_intro_url"),
  availableForEmergency: boolean("available_for_emergency").default(false),
  yearsOfExperience: integer("years_of_experience"),
  patientCount: integer("patient_count").default(0),
  successRate: real("success_rate"), // percentagem de pacientes que apresentaram melhoria
});

export const insertTherapistSchema = createInsertSchema(therapists, {
  id: z.number().optional(),
  firstName: z.string(),
  lastName: z.string(),
  specialization: z.string(),
  bio: z.string(),
  imageUrl: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  tags: z.array(z.string()),
  availability: z.record(z.string(), z.boolean()),
  location: z.string().nullable().optional(),
  hourlyRate: z.number().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  // Campos adicionais para o perfil profissional
  education: z.string().nullable().optional(),
  graduationYear: z.number().nullable().optional(), // Ano de formatura
  diplomaUrl: z.string().nullable().optional(), // URL para o diploma enviado
  universityName: z.string().nullable().optional(), // Nome da universidade
  licenseNumber: z.string().nullable().optional(), // Número da licença profissional 
  experience: z.array(z.string()).nullable().optional(),
  certifications: z.array(z.string()).nullable().optional(),
  languages: z.array(z.string()).nullable().optional(),
  approachDescription: z.string().nullable().optional(),
  treatmentMethods: z.array(z.string()).nullable().optional(),
  professionalBio: z.string().nullable().optional(),
  videoIntroUrl: z.string().nullable().optional(),
  availableForEmergency: z.boolean().nullable().optional(),
  yearsOfExperience: z.number().nullable().optional(),
  patientCount: z.number().nullable().optional(),
  successRate: z.number().nullable().optional(),
}).omit({ id: true });

// Sessions table (therapy sessions)
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  therapistId: integer("therapist_id").notNull(),
  therapistName: text("therapist_name"), // Nome do terapeuta para exibição
  scheduledFor: timestamp("scheduled_for").notNull(), // Data e hora agendada
  duration: integer("duration").default(50).notNull(), // Duração em minutos
  status: text("status").notNull(), // Agendada, Confirmada, Concluída, Cancelada, Reagendada
  notes: text("notes"),
  type: text("type").notNull(), // Video, Chat, Presencial
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions, {
  scheduledFor: z.date(),
}).omit({
  id: true,
  createdAt: true,
});

// Journal entries
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title"), // Título gerado por IA
  content: text("content").notNull(),
  mood: text("mood").notNull(),
  category: text("category"),
  summary: text("summary"),
  tags: text("tags").array(),
  colorHex: text("color_hex"), // Para representação visual por cores
  position: json("position"), // Para visualização 3D {x, y, z}
  date: timestamp("date").defaultNow().notNull(),
  audioUrl: text("audio_url"), // URL para gravação de áudio associada à entrada
  processingStatus: text("processing_status").default("pending"), // Status do processamento: pending, transcribing, analyzing, completed, error
  processingProgress: integer("processing_progress").default(0), // Progresso em porcentagem (0-100)
  audioDuration: integer("audio_duration"), // Duração da gravação em segundos (se houver)
  needsProcessing: boolean("needs_processing").default(false), // Flag para indicar se a entrada precisa de processamento posterior (categoria, título, etc)
  // Campos para análise de humor com IA
  moodAnalysis: json("mood_analysis"), // Objeto com análise detalhada do humor
  emotionalTone: text("emotional_tone"), // Tom emocional predominante
  sentimentScore: integer("sentiment_score"), // Pontuação de sentimento (-100 a 100)
  dominantEmotions: text("dominant_emotions").array(), // Emoções dominantes detectadas
  recommendedActions: text("recommended_actions").array(), // Ações recomendadas baseadas no humor
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries, {
  audioUrl: z.string().nullable().optional(),
  audioDuration: z.number().nullable().optional(),
  title: z.string().optional(), // Título opcional, pode ser gerado pela IA
  needsProcessing: z.boolean().optional().default(false), // Flag para processamento posterior
}).omit({
  id: true,
  date: true,
  category: true, // Será preenchido automaticamente pela IA
  summary: true,  // Será preenchido automaticamente pela IA
  position: true, // Será calculado automaticamente
  moodAnalysis: true, // Será preenchido automaticamente pela IA
  emotionalTone: true, // Será preenchido automaticamente pela IA
  sentimentScore: true, // Será preenchido automaticamente pela IA
  dominantEmotions: true, // Será preenchido automaticamente pela IA
  recommendedActions: true, // Será preenchido automaticamente pela IA
});

// Self-help tools
export const selfHelpTools = pgTable("self_help_tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  duration: integer("duration").notNull(), // in minutes
  imageUrl: text("image_url"),
  content: text("content").notNull(),
});

export const insertSelfHelpToolSchema = createInsertSchema(selfHelpTools).omit({
  id: true,
});

// Progress tracking
export const progressTrackings = pgTable("progress_trackings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull(), // anxiety, stress, sleep, etc.
  value: integer("value").notNull(), // percentage value
  date: timestamp("date").defaultNow().notNull(),
});

export const insertProgressTrackingSchema = createInsertSchema(progressTrackings).omit({
  id: true,
  date: true,
});

// Daily tips
export const dailyTips = pgTable("daily_tips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sources: text("sources").array(),
  tags: text("tags").array(),
  evidenceLevel: text("evidence_level"),
  imageUrl: text("image_url"),
  aiGenerated: boolean("ai_generated").default(true).notNull(),
});

export const insertDailyTipSchema = createInsertSchema(dailyTips).omit({
  id: true,
});

// Tabela para rastrear dicas do dia visualizadas pelo usuário
export const viewedDailyTips = pgTable("viewed_daily_tips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tipId: integer("tip_id").notNull(), 
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
}, (table) => {
  return {
    unique_view: primaryKey({ columns: [table.userId, table.tipId] }), // Garante que cada dica seja marcada apenas uma vez por usuário
  }
});

export const insertViewedDailyTipSchema = createInsertSchema(viewedDailyTips).omit({
  id: true,
  viewedAt: true,
});

// Daily Streaks
export const dailyStreaks = pgTable("daily_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastCheckin: timestamp("last_checkin"),
  activities: text("activities").array().default([]).notNull(), // Lista de atividades realizadas (journaling, exercícios, etc.)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDailyStreakSchema = createInsertSchema(dailyStreaks).omit({
  id: true,
  currentStreak: true,
  longestStreak: true,
  updatedAt: true,
});

// Content Recommendations table
export const contentRecommendations = pgTable("content_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // article, exercise, video, audio, etc.
  contentUrl: text("content_url"), // URL para conteúdo externo
  imageUrl: text("image_url"), // URL para imagem de preview
  content: text("content"), // Conteúdo textual completo quando aplicável
  tags: text("tags").array(), // Tags relevantes para o conteúdo
  priority: integer("priority").default(0), // Prioridade de recomendação (0-100)
  category: text("category").notNull(), // Categoria do conteúdo
  relatedJournalIds: integer("related_journal_ids").array(), // IDs das entradas de diário relacionadas
  aiGenerated: boolean("ai_generated").default(false).notNull(), // Se foi gerado por AI
  isRead: boolean("is_read").default(false).notNull(), // Se o usuário já leu/concluiu
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentRecommendationSchema = createInsertSchema(contentRecommendations).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Therapist = typeof therapists.$inferSelect;
export type InsertTherapist = z.infer<typeof insertTherapistSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

// Definição dos status de processamento
export type ProcessingStatus = 'pending' | 'transcribing' | 'analyzing' | 'completed' | 'error';

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export type SelfHelpTool = typeof selfHelpTools.$inferSelect;
export type InsertSelfHelpTool = z.infer<typeof insertSelfHelpToolSchema>;

export type ProgressTracking = typeof progressTrackings.$inferSelect;
export type InsertProgressTracking = z.infer<typeof insertProgressTrackingSchema>;

export type DailyTip = typeof dailyTips.$inferSelect;
export type InsertDailyTip = z.infer<typeof insertDailyTipSchema>;

export type ViewedDailyTip = typeof viewedDailyTips.$inferSelect;
export type InsertViewedDailyTip = z.infer<typeof insertViewedDailyTipSchema>;

export type DailyStreak = typeof dailyStreaks.$inferSelect;
export type InsertDailyStreak = z.infer<typeof insertDailyStreakSchema>;

export type ContentRecommendation = typeof contentRecommendations.$inferSelect;
export type InsertContentRecommendation = z.infer<typeof insertContentRecommendationSchema>;

// Registros de pagamento
export const paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  paymentIntentId: text("payment_intent_id"),
  amount: real("amount").notNull(),
  currency: text("currency").default("brl").notNull(),
  status: text("status").notNull(), // succeeded, pending, failed, refunded
  description: text("description"),
  sessionId: integer("session_id"), // ID da sessão relacionada, se aplicável
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({
  id: true,
  createdAt: true,
});

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // appointment, exercise, feedback
  read: boolean("read").default(false).notNull(),
  relatedId: integer("related_id"), // ID relacionado (sessão, entrada do diário, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Avaliações de terapeutas
export const therapistReviews = pgTable("therapist_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  therapistId: integer("therapist_id").notNull(),
  sessionId: integer("session_id"),
  rating: integer("rating").notNull(), // 1-5 estrelas
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTherapistReviewSchema = createInsertSchema(therapistReviews).omit({
  id: true,
  createdAt: true,
});

export type TherapistReview = typeof therapistReviews.$inferSelect;
export type InsertTherapistReview = z.infer<typeof insertTherapistReviewSchema>;

// Mensagens de chat com o assistente virtual
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'system', 'user', ou 'assistant'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata").default({}).notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Disponibilidade do terapeuta
export const therapistAvailability = pgTable(
  "therapist_availability",
  {
    id: serial("id").primaryKey(),
    therapistId: integer("therapist_id").notNull().references(() => users.id),
    dayOfWeek: integer("day_of_week").notNull(), // 0-6 (domingo-sábado)
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    isRecurring: boolean("is_recurring").default(true).notNull(),
    specificDate: date("specific_date"), // Para disponibilidade em datas específicas, não recorrentes
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

export type TherapistAvailability = typeof therapistAvailability.$inferSelect;
export const insertTherapistAvailabilitySchema = createInsertSchema(therapistAvailability).omit({
  id: true,
  createdAt: true
});
export type InsertTherapistAvailability = z.infer<typeof insertTherapistAvailabilitySchema>;

// Status de disponibilidade do terapeuta para atendimentos de urgência
export const therapistUrgencyStatus = pgTable(
  "therapist_urgency_status",
  {
    id: serial("id").primaryKey(),
    therapistId: integer("therapist_id").notNull().references(() => users.id),
    isAvailableForUrgent: boolean("is_available_for_urgent").default(false).notNull(),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
    availableUntil: timestamp("available_until"), // Até quando estará disponível (opcional)
    maxWaitingTime: integer("max_waiting_time"), // Tempo máximo de espera em minutos
  }
);

export type TherapistUrgencyStatus = typeof therapistUrgencyStatus.$inferSelect;
export const insertTherapistUrgencyStatusSchema = createInsertSchema(therapistUrgencyStatus).omit({
  id: true,
  lastUpdated: true
});
export type InsertTherapistUrgencyStatus = z.infer<typeof insertTherapistUrgencyStatusSchema>;

// Voice Check-in
export const voiceCheckins = pgTable("voice_checkins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  audioUrl: text("audio_url").notNull(), // URL para o arquivo de áudio
  transcription: text("transcription"), // Texto transcrito do áudio
  duration: integer("duration").notNull(), // Duração em segundos
  moodAnalysis: json("mood_analysis"), // Análise de humor baseada no tom de voz
  emotionalTone: text("emotional_tone"), // Tom emocional detectado na voz
  dominantEmotions: text("dominant_emotions").array(), // Emoções dominantes detectadas na voz
  transcriptionAnalysis: json("transcription_analysis"), // Análise do conteúdo transcrito
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVoiceCheckinSchema = createInsertSchema(voiceCheckins, {
  audioUrl: z.string(),
  duration: z.number(),
  userId: z.number(),
}).omit({
  id: true,
  createdAt: true,
  transcription: true,
  moodAnalysis: true,
  emotionalTone: true,
  dominantEmotions: true,
  transcriptionAnalysis: true,
});

export type VoiceCheckin = typeof voiceCheckins.$inferSelect;
export type InsertVoiceCheckin = z.infer<typeof insertVoiceCheckinSchema>;

// Briefings de Terapeutas para consultas
export const therapistBriefings = pgTable("therapist_briefings", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => sessions.id),
  mainIssues: text("main_issues").array(),
  emotionalState: text("emotional_state"), 
  recentProgress: text("recent_progress"),
  suggestedTopics: text("suggested_topics").array(),
  recommendedApproaches: text("recommended_approaches").array(),
  warningFlags: text("warning_flags").array(),
  moodTrends: text("mood_trends"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  hasBeenViewed: boolean("has_been_viewed").default(false).notNull(),
});

export const insertTherapistBriefingSchema = createInsertSchema(therapistBriefings).omit({
  id: true,
  createdAt: true,
  hasBeenViewed: true,
});

export type TherapistBriefing = typeof therapistBriefings.$inferSelect;
export type InsertTherapistBriefing = z.infer<typeof insertTherapistBriefingSchema>;

// Prontuários Eletrônicos
export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  therapistId: integer("therapist_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => sessions.id),
  date: timestamp("date").defaultNow().notNull(),
  mainComplaint: text("main_complaint").notNull(),
  evolution: text("evolution").notNull(), // Evolução do caso desde a última sessão
  mentalStatusExam: json("mental_status_exam"), // Exame do estado mental
  diagnosis: text("diagnosis").array(), // Diagnósticos atuais
  treatmentPlan: text("treatment_plan"), // Plano de tratamento
  recommendations: text("recommendations"), // Recomendações para o paciente
  observations: text("observations"), // Observações adicionais
  nextSessionGoals: text("next_session_goals"), // Objetivos para a próxima sessão
  riskFactors: json("risk_factors"), // Fatores de risco identificados
  medications: json("medications"), // Medicações atuais
  accessLevel: text("access_level").default("private").notNull(), // private, team, patient
  attachments: text("attachments").array(), // URLs para documentos anexados
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords, {
  patientId: z.number(),
  therapistId: z.number(),
  sessionId: z.number().optional(),
  mainComplaint: z.string(),
  evolution: z.string(),
  mentalStatusExam: z.record(z.string(), z.any()).optional(),
  diagnosis: z.array(z.string()).optional(),
  treatmentPlan: z.string().optional(),
  recommendations: z.string().optional(),
  observations: z.string().optional(),
  nextSessionGoals: z.string().optional(),
  riskFactors: z.record(z.string(), z.any()).optional(),
  medications: z.record(z.string(), z.any()).optional(),
  accessLevel: z.enum(["private", "team", "patient"]).default("private"),
  attachments: z.array(z.string()).optional(),
}).omit({
  id: true,
  date: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

// Grupos de Apoio
export const supportGroups = pgTable("support_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  topic: text("topic").notNull(), // ansiedade, depressão, relacionamentos, etc.
  imageUrl: text("image_url"),
  maxMembers: integer("max_members").default(20),
  isPrivate: boolean("is_private").default(false),
  therapistId: integer("therapist_id").references(() => users.id), // ID do terapeuta moderador (opcional)
  rules: text("rules"), // Regras do grupo
  meetingFrequency: text("meeting_frequency"), // diária, semanal, mensal
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSupportGroupSchema = createInsertSchema(supportGroups).omit({
  id: true,
  createdAt: true,
});

export type SupportGroup = typeof supportGroups.$inferSelect;
export type InsertSupportGroup = z.infer<typeof insertSupportGroupSchema>;

// Membros do Grupo de Apoio
export const supportGroupMembers = pgTable("support_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => supportGroups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").default("member").notNull(), // member, moderator, admin
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  status: text("status").default("active").notNull(), // active, inactive, banned
});

export const insertSupportGroupMemberSchema = createInsertSchema(supportGroupMembers).omit({
  id: true,
  joinedAt: true,
});

export type SupportGroupMember = typeof supportGroupMembers.$inferSelect;
export type InsertSupportGroupMember = z.infer<typeof insertSupportGroupMemberSchema>;

// Mensagens do Grupo de Apoio
export const supportGroupMessages = pgTable("support_group_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => supportGroups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  reactionsSummary: json("reactions_summary").default({}),
});

export const insertSupportGroupMessageSchema = createInsertSchema(supportGroupMessages).omit({
  id: true,
  createdAt: true,
  isDeleted: true,
  reactionsSummary: true,
});

export type SupportGroupMessage = typeof supportGroupMessages.$inferSelect;
export type InsertSupportGroupMessage = z.infer<typeof insertSupportGroupMessageSchema>;

// Agendamentos de Reuniões de Grupo
export const groupMeetings = pgTable("group_meetings", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => supportGroups.id),
  title: text("title").notNull(),
  description: text("description"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  duration: integer("duration").notNull(), // Duração em minutos
  meetingUrl: text("meeting_url"), // URL para a videochamada
  status: text("status").default("scheduled").notNull(), // scheduled, ongoing, completed, canceled
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGroupMeetingSchema = createInsertSchema(groupMeetings).omit({
  id: true,
  createdAt: true,
});

export type GroupMeeting = typeof groupMeetings.$inferSelect;
export type InsertGroupMeeting = z.infer<typeof insertGroupMeetingSchema>;

// Tabelas relacionadas à LGPD (Lei Geral de Proteção de Dados)

// Tabela de consentimentos do usuário
export const userConsents = pgTable("user_consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  consentType: text("consent_type").notNull(), // Tipos definidos em ConsentTypes
  granted: boolean("granted").notNull(),
  documentVersion: text("document_version"), // Versão do termo de uso ou política de privacidade
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at"), // Data de expiração do consentimento, se aplicável
  additionalData: json("additional_data"), // Dados adicionais relevantes para o consentimento
});

export const insertUserConsentSchema = createInsertSchema(userConsents).omit({
  id: true,
});

export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;

// Logs de processamento de dados (para auditoria LGPD)
export const dataProcessingLogs = pgTable("data_processing_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // read, write, delete, export, etc.
  dataCategory: text("data_category").notNull(), // personal, health, preferences, etc.
  description: text("description").notNull(),
  ipAddress: text("ip_address").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  authorized: boolean("authorized").default(true).notNull(),
  performedBy: integer("performed_by"), // ID do usuário ou sistema que realizou a ação
  requestId: text("request_id"), // ID de rastreamento da solicitação
  requestDetails: json("request_details"), // Detalhes da solicitação
});

export const insertDataProcessingLogSchema = createInsertSchema(dataProcessingLogs).omit({
  id: true,
});

export type DataProcessingLog = typeof dataProcessingLogs.$inferSelect;
export type InsertDataProcessingLog = z.infer<typeof insertDataProcessingLogSchema>;

// Tabela de solicitações de titulares de dados (direitos LGPD)
export const dataSubjectRequests = pgTable("data_subject_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  requestType: text("request_type").notNull(), // access, delete, correct, portability, etc.
  requestDate: timestamp("request_date").defaultNow().notNull(),
  status: text("status").notNull(), // pending, completed, denied
  completionDate: timestamp("completion_date"),
  handledBy: integer("handled_by"), // Quem processou a solicitação
  requestDetails: text("request_details"),
  responseDetails: text("response_details"),
  evidenceFile: text("evidence_file"), // URL para arquivo de evidência de atendimento
});

export const insertDataSubjectRequestSchema = createInsertSchema(dataSubjectRequests).omit({
  id: true,
  completionDate: true,
});

export type DataSubjectRequest = typeof dataSubjectRequests.$inferSelect;
export type InsertDataSubjectRequest = z.infer<typeof insertDataSubjectRequestSchema>;

// Tabela de documentos legais (políticas, termos, etc.)
export const legalDocuments = pgTable("legal_documents", {
  id: serial("id").primaryKey(),
  documentType: text("document_type").notNull(), // privacy_policy, terms_of_service, etc.
  version: text("version").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  documentText: text("document_text").notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  changeDescription: text("change_description"),
});

export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({
  id: true,
  createdAt: true,
});

export type LegalDocument = typeof legalDocuments.$inferSelect;
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;

// Tabela para chamadas de emergência
export const emergencyCalls = pgTable("emergency_calls", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  therapistId: integer("therapist_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  roomName: text("room_name").notNull(),
  status: text("status").notNull(), // initiated, connected, completed, cancelled
  duration: integer("duration"), // em segundos
  feedback: text("feedback"),
  rating: integer("rating"), // 1-5
  notes: text("notes"),
  metadata: json("metadata").default({}).notNull(),
});

export const insertEmergencyCallSchema = createInsertSchema(emergencyCalls).omit({
  id: true,
  endedAt: true,
  duration: true,
});

export type EmergencyCall = typeof emergencyCalls.$inferSelect;
export type InsertEmergencyCall = z.infer<typeof insertEmergencyCallSchema>;
