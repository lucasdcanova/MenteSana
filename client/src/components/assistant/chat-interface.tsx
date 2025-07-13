import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, RefreshCw, X, Bot, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Tipo de mensagem no chat
interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  role: 'system' | 'user' | 'assistant';
  timestamp: string;
  metadata: {
    emotionalTone?: string;
    suggestedResources?: string[];
    followUpQuestions?: string[];
  };
}

// Resposta do assistente com todas as informações extras
interface AssistantResponse {
  message: string;
  emotionalTone?: string;
  suggestedResources?: string[];
  followUpQuestions?: string[];
}

export function AssistantChatInterface() {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  // Função para ajustar altura do textarea automaticamente
  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Resetar a altura para calcular corretamente
    textarea.style.height = 'auto';
    // Definir a nova altura com base no scrollHeight
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);
  
  // Ajustar altura sempre que o texto mudar
  useEffect(() => {
    autoResizeTextarea();
  }, [message, autoResizeTextarea]);
  
  // Buscar histórico de mensagens
  const { 
    data: chatHistory, 
    isLoading: isLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['/api/assistant/history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/assistant/history');
      const data = await res.json();
      return data as ChatMessage[];
    }
  });

  // Buscar saudação personalizada quando o componente é montado
  const { 
    data: greeting, 
    isLoading: isLoadingGreeting 
  } = useQuery({
    queryKey: ['/api/assistant/greeting'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/assistant/greeting');
      const data = await res.json();
      return data as { message: string };
    }
  });

  // Mutação para enviar mensagem ao assistente
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      try {
        const res = await apiRequest('POST', '/api/assistant/message', { message: content });
        return res.json() as Promise<AssistantResponse>;
      } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/history'] });
    },
    onError: (error) => {
      console.error('Erro ao processar mensagem:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível processar sua mensagem. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  });

  // Mutação para limpar o histórico de mensagens
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/assistant/history');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/history'] });
      toast({
        title: "Histórico limpo",
        description: "Todas as mensagens anteriores foram removidas."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao limpar histórico",
        description: String(error),
        variant: "destructive"
      });
    }
  });

  // Rolar para o final da conversa sempre que novas mensagens são carregadas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, sendMessageMutation.isSuccess]);

  // Manipular envio de mensagem
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Adicionar mensagem do usuário localmente para feedback imediato
    const userMessage = {
      content: message,
      role: 'user' as const,
    };
    
    // Enviar a mensagem à API
    sendMessageMutation.mutate(message);
    
    // Limpar o campo de texto e redefinir sua altura
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Focar no textarea após enviar
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  // Manipular tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mostrar uma saudação quando não há histórico
  const showGreeting = (!chatHistory || chatHistory.length === 0) && greeting;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header - Cabeçalho do chat */}
      <header className="flex justify-between items-center px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 bg-primary/10">
            <AvatarFallback className="bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-sm font-medium">Sana - Assistente</h2>
            <p className="text-xs text-muted-foreground">Sua assistente de saúde mental</p>
          </div>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-primary/10"
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending || (!chatHistory || chatHistory.length === 0)}
              >
                {clearHistoryMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Limpar conversa</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>

      {/* Main Content - Área de mensagens */}
      <div className="flex-1 overflow-y-auto bg-gray-50/80 px-4 py-4 space-y-4">
        {isLoadingHistory ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="h-14 w-2/3 ml-auto" />
            <Skeleton className="h-14 w-2/3" />
          </div>
        ) : (
          <>
            {showGreeting && (
              <div className="flex items-start gap-2 max-w-3/4 animate-fade-in">
                <Avatar className="h-8 w-8 mt-1 bg-white ring-2 ring-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white shadow-sm p-3 rounded-lg rounded-tl-none">
                  <p className="text-sm leading-relaxed">{isLoadingGreeting ? "Carregando..." : greeting.message}</p>
                </div>
              </div>
            )}

            {chatHistory && chatHistory.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${
                  msg.role === "user" ? "justify-end" : ""
                } ${index === chatHistory.length - 1 ? "animate-fade-in" : ""}`}
              >
                {msg.role !== "user" && (
                  <Avatar className="h-8 w-8 mt-1 bg-white ring-2 ring-primary/10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`p-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-none max-w-[75%]"
                      : "bg-white shadow-sm rounded-tl-none max-w-[80%]"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Mostrar metadados apenas para mensagens do assistente */}
                  {msg.role === "assistant" && msg.metadata && (
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                      {msg.metadata.emotionalTone && (
                        <div>
                          <Badge variant="outline" className="text-xs font-normal py-0.5 px-2 h-5">
                            <Sparkles className="h-3 w-3 mr-1 text-primary/70" /> 
                            {msg.metadata.emotionalTone}
                          </Badge>
                        </div>
                      )}
                      
                      {msg.metadata.suggestedResources && msg.metadata.suggestedResources.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Recursos sugeridos:</p>
                          <ul className="list-disc list-inside text-xs space-y-1 pl-1 text-slate-700">
                            {msg.metadata.suggestedResources.map((resource, i) => (
                              <li key={i}>{resource}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {msg.metadata.followUpQuestions && msg.metadata.followUpQuestions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Perguntas para refletir:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.metadata.followUpQuestions.map((question, i) => (
                              <Badge 
                                key={i}
                                variant="secondary"
                                className="text-xs py-0.5 px-2 cursor-pointer hover:bg-primary hover:text-white transition-colors"
                                onClick={() => setMessage(question)}
                              >
                                {question}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {msg.role === "user" && (
                  <Avatar className="h-8 w-8 mt-1 bg-primary/10">
                    <AvatarFallback className="bg-primary text-white">EU</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {/* Indicador de digitação */}
            {sendMessageMutation.isPending && (
              <div className="flex items-start gap-2 animate-fade-in">
                <Avatar className="h-8 w-8 mt-1 bg-white ring-2 ring-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white shadow-sm p-3 rounded-lg rounded-tl-none">
                  <div className="flex space-x-1.5 items-center">
                    <div className="h-2 w-2 bg-primary/40 rounded-full animate-pulse"></div>
                    <div className="h-2 w-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="h-2 w-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input de mensagem */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-end gap-2 bg-gray-50 rounded-[1.5rem] pl-4 pr-2 py-2 shadow-sm border border-gray-200">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem para Sana..."
            className="flex-1 resize-none text-sm py-0 min-h-[40px] max-h-[120px] border-0 focus-visible:ring-0 bg-transparent focus-visible:ring-offset-0 overflow-hidden"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0 bg-primary hover:bg-primary/90"
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}