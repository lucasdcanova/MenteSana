import { Router } from "express";
import { processAssistantMessage, generatePersonalizedGreeting } from "../assistant-service";

const router = Router();

// Rota para obter uma saudação personalizada do assistente
router.get("/greeting", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const userId = (req.user as Express.User).id;
    const greeting = await generatePersonalizedGreeting(userId);
    res.json({ message: greeting });
  } catch (error) {
    console.error("Erro ao gerar saudação do assistente:", error);
    res.status(500).json({ 
      message: "Erro ao gerar saudação do assistente",
      error: String(error)
    });
  }
});

// Rota para enviar uma mensagem para o assistente
router.post("/message", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const userId = (req.user as Express.User).id;
    const { message, historyLimit } = req.body;
    
    if (!message || typeof message !== "string") {
      return res.status(400).json({ 
        message: "Campo 'message' é obrigatório e deve ser uma string" 
      });
    }
    
    // Sincronizar componentes de IA primeiro para garantir contexto atualizado
    try {
      console.log(`[Assistant] Sincronizando componentes de IA para usuário ${userId} antes de processar mensagem`);
      const { updateAllAIComponents } = await import('../ai-integration-service');
      await updateAllAIComponents(userId, 'assistant');
      console.log(`[Assistant] Sincronização de IA concluída para usuário ${userId}`);
    } catch (syncError) {
      console.error(`[Assistant] Erro na sincronização de IA para usuário ${userId}:`, syncError);
      // Continuar mesmo com erro na sincronização
    }
    
    const assistantResponse = await processAssistantMessage(
      userId, 
      message,
      historyLimit || 10
    );
    
    // Atualizar automaticamente o streak quando o usuário conversa com a assistente
    await req.app.locals.storage.updateDailyStreak(userId, "assistant-chat");
    
    res.json(assistantResponse);
  } catch (error) {
    console.error("Erro ao processar mensagem para o assistente:", error);
    res.status(500).json({ 
      message: "Erro ao processar mensagem para o assistente",
      error: String(error)
    });
  }
});

// Rota para obter o histórico de mensagens
router.get("/history", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const userId = (req.user as Express.User).id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    const history = await req.app.locals.storage.getChatMessagesByUser(userId, limit);
    res.json(history);
  } catch (error) {
    console.error("Erro ao buscar histórico de mensagens:", error);
    res.status(500).json({ 
      message: "Erro ao buscar histórico de mensagens",
      error: String(error)
    });
  }
});

// Rota para limpar o histórico de mensagens
router.delete("/history", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const userId = (req.user as Express.User).id;
    const success = await req.app.locals.storage.clearChatHistory(userId);
    
    if (success) {
      res.json({ message: "Histórico de mensagens limpo com sucesso" });
    } else {
      res.status(500).json({ message: "Erro ao limpar histórico de mensagens" });
    }
  } catch (error) {
    console.error("Erro ao limpar histórico de mensagens:", error);
    res.status(500).json({ 
      message: "Erro ao limpar histórico de mensagens",
      error: String(error)
    });
  }
});

export default router;