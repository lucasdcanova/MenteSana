import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { 
  insertSupportGroupSchema, 
  insertSupportGroupMemberSchema, 
  insertSupportGroupMessageSchema,
  insertGroupMeetingSchema,
  supportGroups,
  supportGroupMembers,
  supportGroupMessages,
  groupMeetings,
  users
} from "@shared/schema";
import { eq, and, desc, asc, inArray, like, or, sql } from "drizzle-orm";
import { cacheService } from "../cache-service";

// Configurações de paginação
const DEFAULT_PAGE_SIZE = 20;

// Lista de tópicos disponíveis para grupos
const SUPPORT_GROUP_TOPICS = [
  { id: "ansiedade", name: "Ansiedade", icon: "Brain" },
  { id: "depressao", name: "Depressão", icon: "Cloud" },
  { id: "estresse", name: "Controle de Estresse", icon: "Zap" },
  { id: "autoestima", name: "Autoestima", icon: "Star" },
  { id: "relacionamentos", name: "Relacionamentos", icon: "Heart" },
  { id: "luto", name: "Processo de Luto", icon: "Heart" },
  { id: "trauma", name: "Superação de Trauma", icon: "Shield" },
  { id: "carreira", name: "Desenvolvimento Profissional", icon: "Briefcase" },
  { id: "familia", name: "Questões Familiares", icon: "Users" },
  { id: "fobias", name: "Medos e Fobias", icon: "AlertCircle" },
  { id: "habitos", name: "Mudança de Hábitos", icon: "Calendar" },
  { id: "insonia", name: "Problemas de Sono", icon: "Moon" },
  { id: "toc", name: "TOC", icon: "RotateCw" },
  { id: "bipolar", name: "Transtorno Bipolar", icon: "ArrowUpDown" },
  { id: "tdah", name: "TDAH", icon: "Activity" },
  { id: "lgbt", name: "LGBTQIA+", icon: "Flag" }
];

export function setupSupportGroupsRoutes(router: Router) {
  // Rota para obter os tópicos disponíveis para grupos
  router.get("/support-groups/topics", async (req: Request, res: Response) => {
    try {
      // Retorna a lista pré-definida de tópicos
      return res.status(200).json(SUPPORT_GROUP_TOPICS);
    } catch (error) {
      console.error("GET /api/support-groups/topics - Erro na consulta:", error);
      return res.status(500).json({ 
        message: "Falha ao buscar tópicos de grupos de apoio", 
        error: (error as Error).message 
      });
    }
  });
  // Rota para obter todos os grupos de apoio (com filtros)
  router.get("/support-groups", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE;
      const topic = req.query.topic as string;
      const searchTerm = req.query.search as string;
      const offset = (page - 1) * limit;

      // Construir a consulta base
      let query = db.select({
        id: supportGroups.id,
        name: supportGroups.name,
        description: supportGroups.description,
        topic: supportGroups.topic,
        imageUrl: supportGroups.imageUrl,
        maxMembers: supportGroups.maxMembers,
        isPrivate: supportGroups.isPrivate,
        therapistId: supportGroups.therapistId,
        rules: supportGroups.rules,
        meetingFrequency: supportGroups.meetingFrequency,
        createdAt: supportGroups.createdAt,
      })
      .from(supportGroups);

      // Aplicar filtros se existirem
      if (topic) {
        query = query.where(eq(supportGroups.topic, topic));
      }

      if (searchTerm) {
        query = query.where(
          or(
            like(supportGroups.name, `%${searchTerm}%`),
            like(supportGroups.description, `%${searchTerm}%`)
          )
        );
      }

      // Obter contagem total para paginação
      let totalCount = 0;
      
      try {
        // Usado count() da drizzle
        const result = await db.select({
          count: sql`COUNT(*)`.mapWith(Number)
        })
        .from(supportGroups);
        
        console.log("Resultado da contagem:", result);
        
        // Usar o primeiro resultado e forçar para número
        totalCount = result[0]?.count || 0;
      } catch (error) {
        console.error("Erro ao contar grupos:", error);
        // Valor padrão em caso de erro
        totalCount = 0;
      }

      // Aplicar paginação
      query = query.limit(limit).offset(offset).orderBy(desc(supportGroups.createdAt));

      // Executar a consulta
      const groups = await query;

      // Processar os resultados para incluir a contagem de membros
      const enhancedGroups = await Promise.all(groups.map(async (group) => {
        const [memberCountResult] = await db.select({
          count: sql`COUNT(*)`.mapWith(Number)
        })
        .from(supportGroupMembers)
        .where(eq(supportGroupMembers.groupId, group.id));
        
        const memberCount = memberCountResult?.count || 0;

        // Se houver um terapeuta moderador, obter suas informações
        let therapist = null;
        if (group.therapistId) {
          const [therapistData] = await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profilePicture: users.profilePicture
          })
          .from(users)
          .where(eq(users.id, group.therapistId));

          therapist = therapistData;
        }

        return {
          ...group,
          memberCount,
          therapist
        };
      }));

      return res.status(200).json({
        data: enhancedGroups,
        pagination: {
          total: totalCount,
          page,
          pageSize: limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("Erro ao buscar grupos de apoio:", error);
      return res.status(500).json({ 
        message: "Falha ao buscar grupos de apoio", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para obter um grupo específico por ID
  router.get("/support-groups/:id", async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      // Buscar dados do grupo
      const [group] = await db.select().from(supportGroups).where(eq(supportGroups.id, groupId));
      
      if (!group) {
        return res.status(404).json({ message: "Grupo não encontrado" });
      }

      // Buscar contagem de membros
      const [memberCountResult] = await db.select({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(supportGroupMembers)
      .where(eq(supportGroupMembers.groupId, groupId));
      
      const memberCount = memberCountResult?.count || 0;

      // Buscar informações do terapeuta moderador, se houver
      let therapist = null;
      if (group.therapistId) {
        const [therapistData] = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
          specialization: users.preferences, // Pode conter informações da especialização
        })
        .from(users)
        .where(eq(users.id, group.therapistId));

        therapist = therapistData;
      }

      // Buscar próximas reuniões do grupo
      const upcomingMeetings = await db.select()
        .from(groupMeetings)
        .where(and(
          eq(groupMeetings.groupId, groupId),
          sql`${groupMeetings.scheduledFor} > NOW()`
        ))
        .orderBy(asc(groupMeetings.scheduledFor))
        .limit(5);

      return res.status(200).json({
        ...group,
        memberCount,
        therapist,
        upcomingMeetings
      });
    } catch (error) {
      console.error("Erro ao buscar detalhes do grupo:", error);
      return res.status(500).json({ 
        message: "Falha ao buscar detalhes do grupo", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para criar um novo grupo de apoio
  router.post("/support-groups", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Validar dados de entrada
      const validatedData = insertSupportGroupSchema.parse(req.body);
      
      // Verificar se o usuário é terapeuta
      if (validatedData.therapistId && !req.user.isTherapist) {
        return res.status(403).json({ message: "Apenas terapeutas podem criar grupos com suporte profissional" });
      }
      
      // Log para depuração
      console.log("Criando grupo de apoio com dados:", {
        ...validatedData,
        userId: req.user.id
      });
      
      // Criar o grupo
      const [newGroup] = await db.insert(supportGroups)
        .values({
          ...validatedData,
          // Garantir que o therapistId seja o ID do usuário se ele for terapeuta
          therapistId: req.user.isTherapist ? req.user.id : null
        })
        .returning();
      
      if (!newGroup) {
        throw new Error("Falha ao criar grupo de apoio");
      }

      // Adicionar o criador como membro admin do grupo
      await db.insert(supportGroupMembers).values({
        groupId: newGroup.id,
        userId: req.user.id,
        role: "admin",
        status: "active"
      });

      return res.status(201).json(newGroup);
    } catch (error) {
      console.error("Erro ao criar grupo de apoio:", error);
      return res.status(500).json({ 
        message: "Falha ao criar grupo de apoio", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para atualizar um grupo
  router.put("/support-groups/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      // Verificar se o usuário é admin do grupo
      const [membership] = await db.select()
        .from(supportGroupMembers)
        .where(and(
          eq(supportGroupMembers.groupId, groupId),
          eq(supportGroupMembers.userId, req.user.id)
        ));

      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Você não tem permissão para editar este grupo" });
      }

      // Validar dados de entrada
      const validatedData = insertSupportGroupSchema.partial().parse(req.body);
      
      // Atualizar o grupo
      const [updatedGroup] = await db.update(supportGroups)
        .set(validatedData)
        .where(eq(supportGroups.id, groupId))
        .returning();
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Grupo não encontrado" });
      }

      return res.status(200).json(updatedGroup);
    } catch (error) {
      console.error("Erro ao atualizar grupo de apoio:", error);
      return res.status(500).json({ 
        message: "Falha ao atualizar grupo de apoio", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para entrar em um grupo
  router.post("/support-groups/:id/join", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      // Verificar se o grupo existe
      const [group] = await db.select().from(supportGroups).where(eq(supportGroups.id, groupId));
      if (!group) {
        return res.status(404).json({ message: "Grupo não encontrado" });
      }

      // Verificar se o usuário já é membro
      const [existingMembership] = await db.select()
        .from(supportGroupMembers)
        .where(and(
          eq(supportGroupMembers.groupId, groupId),
          eq(supportGroupMembers.userId, req.user.id)
        ));

      if (existingMembership) {
        // Se estava inativo, reativar. Caso contrário, informar que já é membro
        if (existingMembership.status === "inactive") {
          await db.update(supportGroupMembers)
            .set({ status: "active" })
            .where(eq(supportGroupMembers.id, existingMembership.id));
          
          return res.status(200).json({ message: "Sua participação no grupo foi reativada" });
        } else {
          return res.status(400).json({ message: "Você já é membro deste grupo" });
        }
      }

      // Verificar se o grupo atingiu o número máximo de membros
      const [memberCountResult] = await db.select({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(supportGroupMembers)
      .where(and(
        eq(supportGroupMembers.groupId, groupId),
        eq(supportGroupMembers.status, "active")
      ));
      
      const memberCount = memberCountResult?.count || 0;
      if (group.maxMembers && memberCount >= group.maxMembers) {
        return res.status(400).json({ message: "Este grupo já atingiu o número máximo de membros" });
      }

      // Adicionar usuário ao grupo
      const [membership] = await db.insert(supportGroupMembers)
        .values({
          groupId,
          userId: req.user.id,
          role: "member",
          status: "active"
        })
        .returning();

      return res.status(201).json(membership);
    } catch (error) {
      console.error("Erro ao entrar no grupo:", error);
      return res.status(500).json({ 
        message: "Falha ao entrar no grupo", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para sair de um grupo
  router.post("/support-groups/:id/leave", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      // Verificar se o usuário é membro do grupo
      const [membership] = await db.select()
        .from(supportGroupMembers)
        .where(and(
          eq(supportGroupMembers.groupId, groupId),
          eq(supportGroupMembers.userId, req.user.id),
          eq(supportGroupMembers.status, "active")
        ));

      if (!membership) {
        return res.status(400).json({ message: "Você não é membro deste grupo" });
      }

      // Se o usuário é admin e o único admin, impedir que saia
      if (membership.role === "admin") {
        const [adminCountResult] = await db.select({
          count: sql`COUNT(*)`.mapWith(Number)
        })
        .from(supportGroupMembers)
        .where(and(
          eq(supportGroupMembers.groupId, groupId),
          eq(supportGroupMembers.role, "admin"),
          eq(supportGroupMembers.status, "active")
        ));
        
        const adminCount = adminCountResult?.count || 0;
        if (adminCount <= 1) {
          return res.status(400).json({ 
            message: "Você é o único administrador deste grupo. Por favor, promova outro membro a administrador antes de sair."
          });
        }
      }

      // Atualizar status para inativo (soft delete)
      await db.update(supportGroupMembers)
        .set({ status: "inactive" })
        .where(eq(supportGroupMembers.id, membership.id));

      return res.status(200).json({ message: "Você saiu do grupo com sucesso" });
    } catch (error) {
      console.error("Erro ao sair do grupo:", error);
      return res.status(500).json({ 
        message: "Falha ao sair do grupo", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para verificar se o usuário atual é membro do grupo e qual seu papel
  router.get("/support-groups/:id/membership", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      // Verificar se o grupo existe
      const [group] = await db.select().from(supportGroups).where(eq(supportGroups.id, groupId));
      if (!group) {
        return res.status(404).json({ message: "Grupo não encontrado" });
      }

      // Buscar informações de associação do usuário atual
      const [membership] = await db.select()
        .from(supportGroupMembers)
        .where(and(
          eq(supportGroupMembers.groupId, groupId),
          eq(supportGroupMembers.userId, req.user.id),
          eq(supportGroupMembers.status, "active")
        ));

      // Log para depuração
      console.log(`[API] GET /api/support-groups/${groupId}/membership - Usuário ${req.user.id} - Associação:`, membership);

      return res.status(200).json({
        isMember: !!membership,
        role: membership?.role || null,
        status: membership?.status || null,
        joinedAt: membership?.createdAt || null
      });
    } catch (error) {
      console.error(`Erro ao verificar associação ao grupo:`, error);
      return res.status(500).json({ 
        message: "Falha ao verificar associação ao grupo", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para listar membros de um grupo
  router.get("/support-groups/:id/members", async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE;
      const offset = (page - 1) * limit;

      // Verificar se o grupo existe
      const [group] = await db.select().from(supportGroups).where(eq(supportGroups.id, groupId));
      if (!group) {
        return res.status(404).json({ message: "Grupo não encontrado" });
      }

      // Buscar membros ativos do grupo com informações dos usuários
      const members = await db.select({
        membership: {
          id: supportGroupMembers.id,
          role: supportGroupMembers.role,
          joinedAt: supportGroupMembers.joinedAt,
          status: supportGroupMembers.status
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture
        }
      })
      .from(supportGroupMembers)
      .innerJoin(users, eq(supportGroupMembers.userId, users.id))
      .where(and(
        eq(supportGroupMembers.groupId, groupId),
        eq(supportGroupMembers.status, "active")
      ))
      .orderBy(
        desc(eq(supportGroupMembers.role, "admin")), // Administradores primeiro
        asc(users.firstName)
      )
      .limit(limit)
      .offset(offset);

      // Obter contagem total para paginação
      const [totalResult] = await db.select({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(supportGroupMembers)
      .where(and(
        eq(supportGroupMembers.groupId, groupId),
        eq(supportGroupMembers.status, "active")
      ));

      const total = totalResult?.count || 0;

      return res.status(200).json({
        data: members,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Erro ao listar membros do grupo:", error);
      return res.status(500).json({ 
        message: "Falha ao listar membros do grupo", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para listar mensagens do grupo
  router.get("/support-groups/:id/messages", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE;
      const offset = (page - 1) * limit;

      // Verificar se o usuário é membro do grupo
      const [membership] = await db.select()
        .from(supportGroupMembers)
        .where(and(
          eq(supportGroupMembers.groupId, groupId),
          eq(supportGroupMembers.userId, req.user.id),
          eq(supportGroupMembers.status, "active")
        ));

      if (!membership) {
        return res.status(403).json({ message: "Você não tem permissão para ver as mensagens deste grupo" });
      }

      // Buscar mensagens
      const messages = await db.select({
        message: {
          id: supportGroupMessages.id,
          content: supportGroupMessages.content,
          attachmentUrl: supportGroupMessages.attachmentUrl,
          createdAt: supportGroupMessages.createdAt,
          reactionsSummary: supportGroupMessages.reactionsSummary
        },
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture
        }
      })
      .from(supportGroupMessages)
      .innerJoin(users, eq(supportGroupMessages.userId, users.id))
      .where(and(
        eq(supportGroupMessages.groupId, groupId),
        eq(supportGroupMessages.isDeleted, false)
      ))
      .orderBy(desc(supportGroupMessages.createdAt))
      .limit(limit)
      .offset(offset);

      // Obter contagem total para paginação
      const [totalResult] = await db.select({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(supportGroupMessages)
      .where(and(
        eq(supportGroupMessages.groupId, groupId),
        eq(supportGroupMessages.isDeleted, false)
      ));

      const total = totalResult?.count || 0;

      return res.status(200).json({
        data: messages,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Erro ao buscar mensagens do grupo:", error);
      return res.status(500).json({ 
        message: "Falha ao buscar mensagens do grupo", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para enviar uma mensagem no grupo
  router.post("/support-groups/:id/messages", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      // Verificar se o usuário é membro do grupo
      const [membership] = await db.select()
        .from(supportGroupMembers)
        .where(and(
          eq(supportGroupMembers.groupId, groupId),
          eq(supportGroupMembers.userId, req.user.id),
          eq(supportGroupMembers.status, "active")
        ));

      if (!membership) {
        return res.status(403).json({ message: "Você não tem permissão para enviar mensagens neste grupo" });
      }

      // Validar dados da mensagem
      const messageData = {
        ...req.body,
        groupId,
        userId: req.user.id
      };
      
      const validatedData = insertSupportGroupMessageSchema.parse(messageData);
      
      // Inserir a mensagem
      const [newMessage] = await db.insert(supportGroupMessages)
        .values(validatedData)
        .returning();

      if (!newMessage) {
        throw new Error("Falha ao enviar mensagem");
      }

      // Buscar dados do autor para retornar junto com a mensagem
      const [author] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePicture: users.profilePicture
      })
      .from(users)
      .where(eq(users.id, req.user.id));

      return res.status(201).json({
        message: newMessage,
        author
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      return res.status(500).json({ 
        message: "Falha ao enviar mensagem", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para excluir uma mensagem
  router.delete("/support-groups/:groupId/messages/:messageId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const groupId = parseInt(req.params.groupId);
      const messageId = parseInt(req.params.messageId);
      
      if (isNaN(groupId) || isNaN(messageId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }

      // Buscar a mensagem
      const [message] = await db.select()
        .from(supportGroupMessages)
        .where(and(
          eq(supportGroupMessages.id, messageId),
          eq(supportGroupMessages.groupId, groupId)
        ));

      if (!message) {
        return res.status(404).json({ message: "Mensagem não encontrada" });
      }

      // Verificar permissão (autor da mensagem ou admin do grupo)
      const isAuthor = message.userId === req.user.id;
      let isAdmin = false;

      if (!isAuthor) {
        const [membership] = await db.select()
          .from(supportGroupMembers)
          .where(and(
            eq(supportGroupMembers.groupId, groupId),
            eq(supportGroupMembers.userId, req.user.id),
            eq(supportGroupMembers.role, "admin"),
            eq(supportGroupMembers.status, "active")
          ));
        
        isAdmin = !!membership;
      }

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ message: "Você não tem permissão para excluir esta mensagem" });
      }

      // Soft delete da mensagem
      await db.update(supportGroupMessages)
        .set({ isDeleted: true })
        .where(eq(supportGroupMessages.id, messageId));

      return res.status(200).json({ message: "Mensagem excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error);
      return res.status(500).json({ 
        message: "Falha ao excluir mensagem", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para agendar uma reunião de grupo
  router.post("/support-groups/:id/meetings", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      // Verificar se o usuário é admin do grupo
      const [membership] = await db.select()
        .from(supportGroupMembers)
        .where(and(
          eq(supportGroupMembers.groupId, groupId),
          eq(supportGroupMembers.userId, req.user.id),
          eq(supportGroupMembers.status, "active")
        ));

      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Você não tem permissão para agendar reuniões neste grupo" });
      }

      // Validar dados da reunião
      const meetingData = {
        ...req.body,
        groupId,
        createdBy: req.user.id
      };
      
      const validatedData = insertGroupMeetingSchema.parse(meetingData);
      
      // Inserir a reunião
      const [newMeeting] = await db.insert(groupMeetings)
        .values(validatedData)
        .returning();

      if (!newMeeting) {
        throw new Error("Falha ao agendar reunião");
      }

      return res.status(201).json(newMeeting);
    } catch (error) {
      console.error("Erro ao agendar reunião:", error);
      return res.status(500).json({ 
        message: "Falha ao agendar reunião", 
        error: (error as Error).message 
      });
    }
  });

  // Rota para obter as reuniões de um grupo
  router.get("/support-groups/:id/meetings", async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "ID do grupo inválido" });
      }

      // Parâmetros opcionais
      const includeHistory = req.query.includeHistory === "true";
      const upcoming = req.query.upcoming === "true";
      const limit = parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE;

      // Construir a consulta
      let query = db.select({
        meeting: groupMeetings,
        creator: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(groupMeetings)
      .leftJoin(users, eq(groupMeetings.createdBy, users.id))
      .where(eq(groupMeetings.groupId, groupId))
      .limit(limit);

      // Filtrar por status se necessário
      if (upcoming) {
        query = query.where(db.sql`${groupMeetings.scheduledFor} > NOW()`);
      } else if (!includeHistory) {
        // Por padrão, excluir reuniões passadas a menos que solicitado explicitamente
        query = query.where(
          db.or(
            db.sql`${groupMeetings.scheduledFor} > NOW()`,
            eq(groupMeetings.status, "ongoing")
          )
        );
      }

      // Ordenar por data (próximas primeiro)
      query = query.orderBy(asc(groupMeetings.scheduledFor));

      const meetings = await query;

      return res.status(200).json(meetings);
    } catch (error) {
      console.error("Erro ao buscar reuniões do grupo:", error);
      return res.status(500).json({ 
        message: "Falha ao buscar reuniões do grupo", 
        error: (error as Error).message 
      });
    }
  });

  // Removido: rota duplicada para tópicos de grupos

  return router;
}