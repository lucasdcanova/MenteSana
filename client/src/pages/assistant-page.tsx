import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, ChevronLeft, Trash2, Send, WifiOff } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import "../styles/assistant-page.css";
import { ErrorHandler, WithErrorHandling, useNetworkStatus } from "@/components/ui/error-handler";
import { withErrorHandling, withAIErrorHandling, NetworkError, AIServiceError } from "@/lib/error-handling";

// Interface para mensagem do chat
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

export default function AssistantPage() {
  const [message, setMessage] = useState("");
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Auto-scroll para o fim do chat quando a página carregar
  useEffect(() => {
    scrollToBottom(false);
  }, []);
  
  // Função de scroll para o fim do chat
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  };

  // Mutação para enviar mensagem ao assistente
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', '/api/assistant/message', { message: content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/history'] });
      setTimeout(() => scrollToBottom(), 100);
    },
    onError: () => {
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível processar sua mensagem.",
        variant: "destructive"
      });
    }
  });
  
  // Verificar status da rede
  const { isOnline } = useNetworkStatus();

  // Buscar histórico de mensagens com tratamento de erro aprimorado
  const { 
    data: messages, 
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['/api/assistant/history'],
    queryFn: async () => {
      return await withErrorHandling(
        async () => {
          const res = await apiRequest('GET', '/api/assistant/history');
          return await res.json() as ChatMessage[];
        },
        {
          networkErrorMessage: 'Não foi possível carregar o histórico de mensagens devido a problemas de conexão.',
          errorMessage: 'Erro ao carregar o histórico de mensagens.'
        }
      );
    },
    retry: 2,
    // Desativar a busca automática se estiver offline
    enabled: isOnline
  });

  // Buscar saudação inicial com tratamento de erro aprimorado
  const { 
    data: greeting, 
    isLoading: isLoadingGreeting,
    error: greetingError,
    refetch: refetchGreeting
  } = useQuery({
    queryKey: ['/api/assistant/greeting'],
    queryFn: async () => {
      return await withErrorHandling(
        async () => {
          const res = await apiRequest('GET', '/api/assistant/greeting');
          return await res.json() as { message: string };
        },
        {
          networkErrorMessage: 'Não foi possível carregar a saudação inicial devido a problemas de conexão.',
          errorMessage: 'Erro ao carregar a saudação do assistente.'
        }
      );
    },
    retry: 2,
    // Desativar a busca automática se estiver offline
    enabled: isOnline
  });

  // Scrollar para o fim quando mensagens forem carregadas
  useEffect(() => {
    if (!isLoadingMessages && !isLoadingGreeting) {
      scrollToBottom();
    }
  }, [messages, isLoadingMessages, isLoadingGreeting]);

  // Limpar histórico de conversa
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/assistant/history");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/history"] });
      setShowConfirmClear(false);
      toast({
        title: "Conversa limpa",
        description: "O histórico foi apagado.",
      });
    }
  });

  // Enviar mensagem com tratamento de erro aprimorado
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    // Verificar status de rede primeiro
    if (!isOnline) {
      toast({
        title: "Sem conexão",
        description: "Você está offline. Conecte-se à internet para enviar mensagens.",
        variant: "destructive"
      });
      return;
    }
    
    const trimmedMessage = message.trim();
    setMessage("");
    
    try {
      // Usar withErrorHandling para tratar erros
      await withErrorHandling(
        async () => {
          await sendMessageMutation.mutateAsync(trimmedMessage);
        },
        {
          networkErrorMessage: "Não foi possível enviar sua mensagem devido a problemas de conexão.",
          errorMessage: "Não foi possível processar sua mensagem. Tente novamente."
        }
      );
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      // Restaurar a mensagem no campo se houve erro
      setMessage(trimmedMessage);
      
      // Toast já será exibido pelo sistema de erro, então não precisamos adicionar outro aqui
    }
  }, [message, sendMessageMutation, isOnline, toast]);

  // Formatar conteúdo da mensagem
  const formatMessage = (content: string) => {
    if (!content) return '';
    
    let formattedText = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n\n/g, '<br><br>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    return formattedText;
  };

  // Selecionar uma pergunta sugerida
  const selectSuggestedQuestion = (question: string) => {
    setMessage(question);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative flex flex-col w-full h-[100dvh] bg-gray-50 overflow-hidden">
      
      {/* Área de chat com scroll */}
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto"
        style={{ 
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))"
        }}
      >
        <div className="px-3 py-2">
          {isLoadingMessages || isLoadingGreeting ? (
            <div className="flex justify-center items-center h-32">
              <div className="flex space-x-2">
                <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse" 
                     style={{animationDelay: "200ms"}}></div>
                <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse"
                     style={{animationDelay: "400ms"}}></div>
              </div>
            </div>
          ) : messagesError || greetingError ? (
            // Estado de erro - usando nosso novo componente
            <ErrorHandler 
              error={messagesError || greetingError} 
              errorType={!isOnline ? 'network' : messagesError?.name === 'AIServiceError' ? 'ai' : 'api'} 
              retry={() => {
                // Tentar carregar novamente ambos os recursos
                refetchMessages();
                refetchGreeting();
              }}
              customMessage={
                !isOnline 
                  ? "Você está offline. Conecte-se à internet para conversar com o assistente." 
                  : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {/* Saudação inicial */}
              {(!messages?.length && greeting?.message) && (
                <div className="flex items-start space-x-2">
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div 
                    className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm text-sm max-w-[80%]"
                    dangerouslySetInnerHTML={{ __html: formatMessage(greeting.message) }}
                  />
                </div>
              )}
              
              {/* Mensagens */}
              {Array.isArray(messages) && messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex items-start space-x-2 ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse justify-start ml-auto' : ''
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      {msg.userId.toString().charAt(0)}
                    </div>
                  )}
                  
                  <div 
                    className={`p-3 rounded-2xl shadow-sm text-sm max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-primary/10 rounded-tr-sm text-gray-800' 
                        : 'bg-white rounded-tl-sm text-gray-700'
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                </div>
              ))}
              
              {/* Sugestões de perguntas */}
              {(() => {
                // Abordagem mais segura para evitar erros de tipo
                const lastMessage = Array.isArray(messages) && messages.length > 0 
                  ? messages[messages.length - 1] 
                  : null;
                
                // Verificação de segurança para as perguntas de acompanhamento
                const followUpQuestions = lastMessage?.metadata?.followUpQuestions;
                
                if (lastMessage?.role === 'assistant' && 
                    Array.isArray(followUpQuestions) && 
                    followUpQuestions.length > 0) {
                  return (
                    <div className="ml-10 my-2 flex flex-wrap gap-2">
                      {followUpQuestions.map((q: string, i: number) => (
                        <button 
                          key={i}
                          className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-gray-700 hover:bg-gray-200"
                          onClick={() => selectSuggestedQuestion(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  );
                }
                
                // Se não tiver perguntas de acompanhamento, não renderiza nada
                return null;
              })()}
              
              {/* Indicador de digitação */}
              {sendMessageMutation.isPending && (
                <div className="flex items-start space-x-2">
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <div className="flex space-x-1.5">
                      <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse"></div>
                      <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse" 
                           style={{animationDelay: "300ms"}}></div>
                      <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse"
                           style={{animationDelay: "600ms"}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      

      
      {/* Barra de mensagem fixa */}
      <div className="absolute bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="bg-white border-t border-gray-200 p-3">
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Mensagem..."
              className="flex-1 h-12 rounded-full border border-gray-200 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              size="icon"
              className="ml-2 h-12 w-12 rounded-full bg-primary text-white shadow-sm hover:bg-primary/90 active:scale-95 transition-transform"
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Modal de confirmação */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-4 w-full max-w-[280px] shadow-lg">
            <p className="text-center font-medium mb-4">
              Limpar esta conversa?
            </p>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 text-sm h-10 rounded-xl"
                onClick={() => setShowConfirmClear(false)}
              >
                Cancelar
              </Button>
              
              <Button 
                variant="destructive" 
                className="flex-1 text-sm h-10 rounded-xl"
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}